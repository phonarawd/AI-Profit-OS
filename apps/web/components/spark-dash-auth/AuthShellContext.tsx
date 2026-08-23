"use client";

import { createContext, useContext } from "react";
import type { AuthShellVariant } from "./types";

export type AuthShellContextValue = {
  variant: AuthShellVariant;
  embedded: true;
};

export const AuthShellContext = createContext<AuthShellContextValue | null>(
  null,
);

export function useAuthShell() {
  return useContext(AuthShellContext);
}
