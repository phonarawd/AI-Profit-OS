/**
 * Phase0 transactional outbox drain — Money committed-event-publication-durability.
 * emit() 반환값은 ack가 아니다. published_at은 delivery 시도 기록 후에만 설정.
 */
import { Injectable } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";

@Injectable()
export class LedgerOutboxService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * Best-effort drain after commit. Failures leave row unpublished for replay.
   * NEVER treat EventEmitter.emit boolean as durable ack.
   */
  async drain(limit = 50): Promise<{ drained: number; failed: number }> {
    if (!this.db.configured()) return { drained: 0, failed: 0 };

    const pending = await this.db.query<{
      id: string;
      event_name: string;
      payload: unknown;
    }>(
      `SELECT id::text, event_name, payload
         FROM public.ledger_outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at ASC
        LIMIT $1`,
      [limit],
    );

    let drained = 0;
    let failed = 0;
    for (const row of pending.rows) {
      try {
        // Delivery attempt — return value intentionally ignored (≠ ack)
        void this.bus.emit(row.event_name, row.payload);
        await this.db.query(
          `UPDATE public.ledger_outbox_events
              SET published_at = now(),
                  attempts = attempts + 1,
                  last_error = NULL
            WHERE id = $1::uuid
              AND published_at IS NULL`,
          [row.id],
        );
        drained += 1;
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : "outbox_drain_failed";
        await this.db.query(
          `UPDATE public.ledger_outbox_events
              SET attempts = attempts + 1,
                  last_error = $2
            WHERE id = $1::uuid`,
          [row.id, msg.slice(0, 500)],
        );
      }
    }
    return { drained, failed };
  }
}
