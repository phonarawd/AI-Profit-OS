import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  clearAdminRbacLookup,
  registerAdminRbacLookup,
} from "./admin-rbac.lookup";

@Injectable()
export class AdminRbacLookupService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly db: PostgresService) {}

  onModuleInit(): void {
    registerAdminRbacLookup((adminId) => this.lookup(adminId));
  }

  onModuleDestroy(): void {
    clearAdminRbacLookup();
  }

  private async lookup(adminId: string): Promise<
    | { status: "row"; row: { role: string; active: boolean } }
    | { status: "empty" }
    | { status: "unavailable" }
  > {
    if (!this.db.configured()) return { status: "unavailable" };
    try {
      const r = await this.db.query<{ role: string; active: boolean }>(
        `SELECT role, active
           FROM public.admin_rbac
          WHERE admin_id = $1::uuid`,
        [adminId],
      );
      const row = r.rows[0];
      if (!row) return { status: "empty" };
      return {
        status: "row",
        row: { role: String(row.role ?? ""), active: row.active === true },
      };
    } catch {
      return { status: "unavailable" };
    }
  }
}
