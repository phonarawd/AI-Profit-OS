/**
 * Admin boundary guard — deny-by-default authentication + RBAC for every
 * `/admin` route (§9.9 · CONSTITUTION 40 · ADR-006 issuer separation).
 *
 * Registered twice on purpose:
 *   1. globally via APP_GUARD in AppModule — a newly added admin controller is
 *      inside the boundary even when nobody remembers `@UseGuards`;
 *   2. explicitly on each `*.admin.controller.ts` — local, reviewable intent.
 * Both passes run the same pure verification, so double registration is safe.
 *
 * Route classification uses Nest's own `PATH_METADATA`, not the raw request URL:
 * a rewritten/encoded URL cannot walk a controller out of the boundary.
 *
 * Zero constructor deps (mirrors JwtAuthGuard) so `@UseGuards(AdminGuard)` works
 * in any module without provider registration.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants";
import { createRequire } from "node:module";
import { join } from "node:path";
import { requiredCapabilityFor } from "./admin-capabilities";
import { adminRoleAllows, isKnownAdminRole } from "./admin-rbac.policy";
import {
  AdminTokenError,
  verifyAdminAuthorizationHeader,
  type AdminPrincipal,
} from "./admin-token";

const requireCjs = createRequire(__filename);
const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  buildDeniedEvent: (input: Record<string, unknown>) => Record<string, unknown>;
  writeAuditEvent: (raw: unknown) => Promise<unknown>;
};

async function noteDenied(input: Record<string, unknown>): Promise<void> {
  try {
    await auditCore.writeAuditEvent(auditCore.buildDeniedEvent(input));
  } catch {
    // 권한 거부는 항상 403. audit persist 실패가 허용으로 바뀌면 안 된다.
  }
}

export const ADMIN_ROUTE_SEGMENT = "admin";

/** Populated only by this guard — never merged into `req.user` (trust domains stay split). */
export type RequestWithAdmin = {
  headers?: Record<string, string | string[] | undefined>;
  admin?: AdminPrincipal;
};

function metadataPaths(target: unknown): string[] {
  if (!target) return [];
  let raw: unknown;
  try {
    raw = Reflect.getMetadata(PATH_METADATA, target as object);
  } catch {
    return [];
  }
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((p) => typeof p === "string").map((p) => String(p));
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function firstSegment(value: string): string {
  return trimSlashes(value).split("/")[0]?.toLowerCase() ?? "";
}

/**
 * True when the controller path — or the controller+handler path pair — mounts
 * under the `admin` segment.
 */
export function isAdminHandler(
  controller: unknown,
  handler: unknown,
): boolean {
  const controllerPaths = metadataPaths(controller);
  const handlerPaths = metadataPaths(handler);

  for (const controllerPath of controllerPaths) {
    if (firstSegment(controllerPath) === ADMIN_ROUTE_SEGMENT) return true;
  }

  const prefixes = controllerPaths.length > 0 ? controllerPaths : [""];
  for (const controllerPath of prefixes) {
    for (const handlerPath of handlerPaths) {
      const joined = [trimSlashes(controllerPath), trimSlashes(handlerPath)]
        .filter(Boolean)
        .join("/");
      if (firstSegment(joined) === ADMIN_ROUTE_SEGMENT) return true;
    }
  }
  return false;
}

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Non-admin surfaces (including every user route) keep their prior behaviour.
    if (context.getType<string>() !== "http") return true;
    if (!isAdminHandler(context.getClass(), context.getHandler())) return true;

    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const action = `${controllerName}.${handlerName}`;

    let principal: AdminPrincipal;
    try {
      principal = verifyAdminAuthorizationHeader(
        request.headers?.authorization ?? request.headers?.Authorization,
      );
    } catch (e) {
      throw new UnauthorizedException(
        e instanceof AdminTokenError ? e.code : "ADMIN_AUTH_REQUIRED",
      );
    }

    // Role authority is the token claim; the *permissions* always come from the
    // server-side matrix. An unknown role can never resolve to a capability.
    if (!isKnownAdminRole(principal.role)) {
      await noteDenied({
        actorKey: principal.adminId,
        actorId: principal.adminId,
        role: principal.role,
        action,
        targetType: "admin_route",
        targetId: action,
        reason: "ADMIN_ROLE_UNKNOWN",
      });
      throw new ForbiddenException("ADMIN_ROLE_UNKNOWN");
    }

    const required = requiredCapabilityFor(controllerName, handlerName);
    if (!required) {
      await noteDenied({
        actorKey: principal.adminId,
        actorId: principal.adminId,
        role: principal.role,
        action,
        targetType: "admin_route",
        targetId: action,
        reason: "ADMIN_CAPABILITY_UNCLASSIFIED",
      });
      throw new ForbiddenException("ADMIN_CAPABILITY_UNCLASSIFIED");
    }
    if (!adminRoleAllows(principal.role, required.capability, required.level)) {
      await noteDenied({
        actorKey: principal.adminId,
        actorId: principal.adminId,
        role: principal.role,
        action,
        targetType: "admin_route",
        targetId: action,
        reason: "ADMIN_CAPABILITY_DENIED",
      });
      throw new ForbiddenException("ADMIN_CAPABILITY_DENIED");
    }

    request.admin = principal;
    return true;
  }
}
