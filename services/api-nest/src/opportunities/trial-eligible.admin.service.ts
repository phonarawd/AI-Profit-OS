/**
 * 체험 상품 스위치. 가격·장부를 바꾸지 않는다.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

@Injectable()
export class TrialEligibleAdminService {
  constructor(private readonly db: PostgresService) {}

  async patch(
    id: string,
    trialEligible: boolean,
  ): Promise<{ id: string; trialEligible: boolean }> {
    const { rows } = await this.db.query<{
      id: string;
      trial_eligible: boolean;
    }>(
      `UPDATE public.opportunities
          SET trial_eligible = $2,
              updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, trial_eligible`,
      [id, trialEligible],
    );
    if (!rows[0]) {
      throw new NotFoundException("opportunity not found");
    }
    return { id: rows[0].id, trialEligible: rows[0].trial_eligible === true };
  }
}
