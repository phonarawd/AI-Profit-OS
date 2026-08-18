import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to repo-root schemas/ (SSOT) */
export const schemasRoot = path.resolve(here, "../../../schemas");

export function schemaPath(name: string): string {
  const file = name.endsWith(".json") ? name : `${name}.json`;
  return path.join(schemasRoot, file);
}
