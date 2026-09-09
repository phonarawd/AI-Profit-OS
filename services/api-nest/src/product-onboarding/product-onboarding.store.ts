/**
 * product_onboarding SQL. Nest 데코레이터 없이 테스트 가능.
 */

import {
  EDUCATIONAL_LESSON_V1,
  PRODUCT_ONBOARDING_VERSION,
} from "./product-onboarding.lesson";
import {
  parsePreferencesLoose,
  type OnboardingPreferences,
} from "./product-onboarding.parse";

export type ProductOnboardingState = "in_progress" | "completed";

export type ProductOnboardingView = {
  version: number;
  currentStep: number;
  state: ProductOnboardingState;
  completedAt: string | null;
  preferences: OnboardingPreferences;
  persist: "ready" | "unavailable";
  lesson: typeof EDUCATIONAL_LESSON_V1;
};

export type OnboardingQuerier = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: OnboardingRow[]; rowCount: number | null }>;
};

export type OnboardingRow = {
  user_id: string;
  version: number;
  current_step: number;
  state: string;
  preferences: unknown;
  completed_at: Date | string | null;
  updated_at: Date | string;
};

export class ProductOnboardingUnavailableError extends Error {
  constructor() {
    super("PRODUCT_ONBOARDING_UNAVAILABLE");
    this.name = "ProductOnboardingUnavailableError";
  }
}

export class ProductOnboardingConflictError extends Error {
  constructor(message = "PRODUCT_ONBOARDING_STEP_CONFLICT") {
    super(message);
    this.name = "ProductOnboardingConflictError";
  }
}

function iso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

export function mapOnboardingRow(
  row: OnboardingRow | undefined,
  persist: "ready" | "unavailable",
): ProductOnboardingView | null {
  if (!row) return null;
  if (row.version !== PRODUCT_ONBOARDING_VERSION) return null;
  if (row.current_step < 1 || row.current_step > 7) return null;
  if (row.state !== "in_progress" && row.state !== "completed") return null;
  if (row.state === "completed" && !row.completed_at) return null;
  if (row.state === "in_progress" && row.completed_at) return null;
  return {
    version: PRODUCT_ONBOARDING_VERSION,
    currentStep: row.current_step,
    state: row.state,
    completedAt: iso(row.completed_at),
    preferences: parsePreferencesLoose(row.preferences),
    persist,
    lesson: EDUCATIONAL_LESSON_V1,
  };
}

export function unavailableView(): ProductOnboardingView {
  return {
    version: PRODUCT_ONBOARDING_VERSION,
    currentStep: 1,
    state: "in_progress",
    completedAt: null,
    preferences: { largeType: false, easyExplain: false },
    persist: "unavailable",
    lesson: EDUCATIONAL_LESSON_V1,
  };
}

export async function ensureOnboardingRow(
  db: OnboardingQuerier,
  userId: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO public.product_onboarding (user_id, version)
       VALUES ($1::uuid, $2)
       ON CONFLICT (user_id, version) DO NOTHING`,
      [userId, PRODUCT_ONBOARDING_VERSION],
    );
  } catch {
    throw new ProductOnboardingUnavailableError();
  }
}

async function selectRow(
  db: OnboardingQuerier,
  userId: string,
): Promise<OnboardingRow | undefined> {
  const res = await db.query(
    `SELECT user_id::text, version, current_step, state, preferences,
            completed_at, updated_at
       FROM public.product_onboarding
      WHERE user_id = $1::uuid AND version = $2`,
    [userId, PRODUCT_ONBOARDING_VERSION],
  );
  return res.rows[0];
}

export async function readOnboardingForUser(
  db: OnboardingQuerier,
  userId: string,
): Promise<ProductOnboardingView> {
  try {
    await ensureOnboardingRow(db, userId);
    const row = await selectRow(db, userId);
    const mapped = mapOnboardingRow(row, "ready");
    if (!mapped) throw new ProductOnboardingUnavailableError();
    return mapped;
  } catch (err) {
    if (err instanceof ProductOnboardingUnavailableError) throw err;
    throw new ProductOnboardingUnavailableError();
  }
}

export async function writeProgressForUser(
  db: OnboardingQuerier,
  userId: string,
  patch: { currentStep?: number; preferences?: OnboardingPreferences },
): Promise<ProductOnboardingView> {
  const current = await readOnboardingForUser(db, userId);
  if (current.state === "completed") return current;

  if (patch.currentStep != null) {
    const next = patch.currentStep;
    if (next > current.currentStep + 1) {
      throw new ProductOnboardingConflictError();
    }
  }

  const nextStep = patch.currentStep ?? current.currentStep;
  const nextPrefs = patch.preferences ?? current.preferences;
  try {
    await db.query(
      `UPDATE public.product_onboarding SET
         current_step = $3,
         preferences = $4::jsonb,
         updated_at = now()
       WHERE user_id = $1::uuid AND version = $2 AND state = 'in_progress'`,
      [userId, PRODUCT_ONBOARDING_VERSION, nextStep, JSON.stringify(nextPrefs)],
    );
  } catch {
    throw new ProductOnboardingUnavailableError();
  }
  return readOnboardingForUser(db, userId);
}

export async function completeOnboardingForUser(
  db: OnboardingQuerier,
  userId: string,
): Promise<ProductOnboardingView> {
  const current = await readOnboardingForUser(db, userId);
  if (current.state === "completed") return current;
  if (current.currentStep < 7) {
    throw new ProductOnboardingConflictError("PRODUCT_ONBOARDING_INCOMPLETE");
  }
  try {
    await db.query(
      `UPDATE public.product_onboarding SET
         state = 'completed',
         current_step = 7,
         completed_at = now(),
         updated_at = now()
       WHERE user_id = $1::uuid AND version = $2 AND state = 'in_progress'`,
      [userId, PRODUCT_ONBOARDING_VERSION],
    );
    await db.query(
      `UPDATE public.user_profiles
          SET beginner_onboarding_completed_at = COALESCE(beginner_onboarding_completed_at, now()),
              updated_at = now()
        WHERE user_id = $1::uuid`,
      [userId],
    );
  } catch {
    throw new ProductOnboardingUnavailableError();
  }
  return readOnboardingForUser(db, userId);
}
