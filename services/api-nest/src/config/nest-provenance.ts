/**
 * Nest production provenance — Render 공식 runtime env 만 사용.
 * https://render.com/docs/environment-variables · RENDER_GIT_COMMIT
 * hardcoded SHA 금지 · runtime git 명령 금지 · secret 필드 금지.
 */
export const NEST_GIT_SHA_ENV = "RENDER_GIT_COMMIT" as const;

const GIT_SHA_RE = /^[0-9a-f]{7,40}$/i;

export type NestProvenance = {
  gitSha: string | null;
  gitShaSource: typeof NEST_GIT_SHA_ENV | null;
};

export function readNestGitSha(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[NEST_GIT_SHA_ENV];
  if (raw == null) return null;
  const sha = String(raw).trim();
  if (!GIT_SHA_RE.test(sha)) return null;
  return sha.toLowerCase();
}

export function nestProvenance(
  env: NodeJS.ProcessEnv = process.env,
): NestProvenance {
  const gitSha = readNestGitSha(env);
  return {
    gitSha,
    gitShaSource: gitSha ? NEST_GIT_SHA_ENV : null,
  };
}
