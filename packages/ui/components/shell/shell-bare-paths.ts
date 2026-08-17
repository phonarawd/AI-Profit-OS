export const SHELL_BARE_PATHS = ["/dev/home-clean-v1"] as const;

export type ShellBarePath = (typeof SHELL_BARE_PATHS)[number];

export function isShellBarePath(
  pathname: string | null | undefined,
): pathname is ShellBarePath {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return false;
  }
  return (SHELL_BARE_PATHS as readonly string[]).includes(pathname);
}
