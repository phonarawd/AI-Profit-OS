import { HOME_CLEAN_COPY } from "./home-clean-copy";
import type { HomeCleanViewerIdentity } from "./home-clean.types";

/** 저장소에 있는 필드만. 없는 키는 호출측에서 생략. API 발명 0 */
export type HomeCleanProfileSource = HomeCleanViewerIdentity;

function nonempty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveHomeCleanProfileLabel(
  source: HomeCleanProfileSource,
): string {
  const named =
    nonempty(source.nickname) ??
    nonempty(source.displayName) ??
    nonempty(source.name);
  if (named) return named;
  const email = nonempty(source.email);
  if (email?.includes("@")) {
    const local = email.slice(0, email.indexOf("@")).trim();
    if (local) return local;
  }
  return HOME_CLEAN_COPY.profile.fallback;
}

export type HomeCleanAvatarView =
  | { kind: "photo"; src: string }
  | { kind: "initial"; initial: string }
  | { kind: "fallback" };

export function resolveHomeCleanAvatar(
  source: HomeCleanProfileSource,
): HomeCleanAvatarView {
  const photo = nonempty(source.avatarUrl);
  if (photo) return { kind: "photo", src: photo };
  const label = resolveHomeCleanProfileLabel(source);
  if (label !== HOME_CLEAN_COPY.profile.fallback) {
    const initial = [...label.normalize("NFC")][0];
    if (initial) return { kind: "initial", initial };
  }
  return { kind: "fallback" };
}
