/**
 * `@AdminOperator()` — the only trustworthy source of the acting operator id.
 *
 * Resolves to the `sub` of the admin JWT that AdminGuard already verified, so a
 * request body can never name a different operator in an audit record.
 * Fail-closed: if no verified principal is on the request the call is rejected
 * rather than falling back to anything client-supplied.
 */

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { RequestWithAdmin } from "./admin.guard";

export const AdminOperator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const adminId = request.admin?.adminId;
    if (typeof adminId !== "string" || !adminId.trim()) {
      throw new UnauthorizedException("ADMIN_AUTH_REQUIRED");
    }
    return adminId;
  },
);
