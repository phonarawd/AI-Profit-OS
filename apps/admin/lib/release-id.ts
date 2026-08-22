/** REL-403 — 배포 식별. 비밀 아님. 없으면 위조하지 않는다. */
export function readReleaseId(): string | null {
  const candidates = [
    process.env.NEXT_PUBLIC_RELEASE_ID,
    process.env.CF_PAGES_COMMIT_SHA,
    process.env.GITHUB_SHA,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
