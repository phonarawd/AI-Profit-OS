import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { MiningService } from "./mining.service";

const MINING_WRITE_LOCK_NAMESPACE = 1_347_769_165;
const MINING_WRITE_LOCK_KEY = 4;

@Injectable()
export class MiningOperationCoordinatorService {
  constructor(
    private readonly db: PostgresService,
    private readonly mining: MiningService,
  ) {}

  async startPosition(input: {
    userId: string;
    mineId: string;
    principalAmount: unknown;
    assetCode: unknown;
    idempotencyKey: unknown;
  }): Promise<{ positionId: string }> {
    return this.withWriteLock(async () => {
      await this.assertMineAssetCode(input.mineId, input.assetCode);
      const result = await this.mining.startPosition({
        userId: input.userId,
        mineId: input.mineId,
        principalUsdt: input.principalAmount,
        idempotencyKey: input.idempotencyKey,
      });
      return { positionId: this.resultPositionId(result) };
    });
  }

  async increasePosition(input: {
    userId: string;
    positionId: string;
    principalAmount: unknown;
    assetCode: unknown;
    idempotencyKey: unknown;
  }): Promise<void> {
    await this.withWriteLock(async () => {
      await this.assertPositionAssetCode(
        input.userId,
        input.positionId,
        input.assetCode,
      );
      await this.mining.increasePosition({
        userId: input.userId,
        positionId: input.positionId,
        amountUsdt: input.principalAmount,
        idempotencyKey: input.idempotencyKey,
      });
    });
  }

  async decreasePosition(input: {
    userId: string;
    positionId: string;
    principalAmount: unknown;
    assetCode: unknown;
    idempotencyKey: unknown;
  }): Promise<void> {
    await this.withWriteLock(async () => {
      await this.assertPositionAssetCode(
        input.userId,
        input.positionId,
        input.assetCode,
      );
      await this.mining.decreasePosition({
        userId: input.userId,
        positionId: input.positionId,
        amountUsdt: input.principalAmount,
        idempotencyKey: input.idempotencyKey,
      });
    });
  }

  async endPosition(input: {
    userId: string;
    positionId: string;
    idempotencyKey: unknown;
  }): Promise<void> {
    await this.withWriteLock(async () => {
      await this.mining.endPosition({
        userId: input.userId,
        positionId: input.positionId,
        idempotencyKey: input.idempotencyKey,
      });
    });
  }

  async settleDueDaily(now = new Date(), limit?: number) {
    return this.withWriteLock(() => this.mining.settleDueDaily(now, limit));
  }

  private async withWriteLock<T>(work: () => Promise<T>): Promise<T> {
    return this.db.withTransaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
        [MINING_WRITE_LOCK_NAMESPACE, MINING_WRITE_LOCK_KEY],
      );
      return work();
    });
  }

  private async assertMineAssetCode(mineId: string, rawAssetCode: unknown) {
    const assetCode = this.assetCode(rawAssetCode);
    const result = await this.db.query<{ asset_code: string }>(
      `SELECT asset_code
         FROM public.mines
        WHERE id=$1::uuid AND published_at IS NOT NULL`,
      [mineId],
    );
    const row = result.rows[0];
    if (!row) throw new BadRequestException("광산을 확인해 주세요.");
    if (row.asset_code.trim().toUpperCase() !== assetCode) {
      throw new BadRequestException("자산 코드를 확인해 주세요.");
    }
  }

  private async assertPositionAssetCode(
    userId: string,
    positionId: string,
    rawAssetCode: unknown,
  ) {
    const assetCode = this.assetCode(rawAssetCode);
    const result = await this.db.query<{ asset_code: string }>(
      `SELECT m.asset_code
         FROM public.mine_positions p
         JOIN public.mines m ON m.id=p.mine_id
        WHERE p.id=$1::uuid AND p.user_id=$2::uuid`,
      [positionId, userId],
    );
    const row = result.rows[0];
    if (!row) throw new BadRequestException("운용 내역을 확인해 주세요.");
    if (row.asset_code.trim().toUpperCase() !== assetCode) {
      throw new BadRequestException("자산 코드를 확인해 주세요.");
    }
  }

  private assetCode(raw: unknown): string {
    const assetCode = String(raw ?? "").trim().toUpperCase();
    if (!assetCode || assetCode.length > 64) {
      throw new BadRequestException("자산 코드를 확인해 주세요.");
    }
    return assetCode;
  }

  private resultPositionId(result: unknown): string {
    if (
      result &&
      typeof result === "object" &&
      "id" in result &&
      typeof (result as { id?: unknown }).id === "string" &&
      (result as { id: string }).id.length > 0
    ) {
      return (result as { id: string }).id;
    }
    throw new ServiceUnavailableException("운용 결과를 확인할 수 없습니다.");
  }
}
