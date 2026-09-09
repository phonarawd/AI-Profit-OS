import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import type { OnboardingPreferences } from "./product-onboarding.parse";
import {
  ProductOnboardingConflictError,
  ProductOnboardingUnavailableError,
  completeOnboardingForUser,
  readOnboardingForUser,
  unavailableView,
  writeProgressForUser,
  type ProductOnboardingView,
} from "./product-onboarding.store";

@Injectable()
export class ProductOnboardingService {
  constructor(private readonly db: PostgresService) {}

  async getForUser(userId: string): Promise<ProductOnboardingView> {
    try {
      return await readOnboardingForUser(this.db, userId);
    } catch (err) {
      if (err instanceof ProductOnboardingUnavailableError) {
        return unavailableView();
      }
      throw err;
    }
  }

  async progressForUser(
    userId: string,
    patch: { currentStep?: number; preferences?: OnboardingPreferences },
  ): Promise<ProductOnboardingView> {
    try {
      return await writeProgressForUser(this.db, userId, patch);
    } catch (err) {
      if (err instanceof ProductOnboardingConflictError) {
        throw new ConflictException(err.message);
      }
      if (err instanceof ProductOnboardingUnavailableError) {
        throw new ServiceUnavailableException("PRODUCT_ONBOARDING_UNAVAILABLE");
      }
      throw err;
    }
  }

  async completeForUser(userId: string): Promise<ProductOnboardingView> {
    try {
      return await completeOnboardingForUser(this.db, userId);
    } catch (err) {
      if (err instanceof ProductOnboardingConflictError) {
        throw new ConflictException(err.message);
      }
      if (err instanceof ProductOnboardingUnavailableError) {
        throw new ServiceUnavailableException("PRODUCT_ONBOARDING_UNAVAILABLE");
      }
      throw err;
    }
  }
}
