/**
 * Phase0 event bus — Nest in-process only (CONSTITUTION §14 · Infra §51.13).
 * Phase1+: swap adapter to NATS JetStream; keep event names identical.
 */

import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";

export type Phase0EventHandler = (payload: unknown) => void | Promise<void>;

@Injectable()
export class InProcessEventBus {
  private readonly ee = new EventEmitter();
  readonly mode = "in-process" as const;
  readonly phase = 0 as const;

  constructor() {
    this.ee.setMaxListeners(50);
  }

  emit(event: string, payload: unknown): boolean {
    return this.ee.emit(event, payload);
  }

  on(event: string, handler: Phase0EventHandler): () => void {
    this.ee.on(event, handler);
    return () => this.ee.off(event, handler);
  }

  /** Introspection for health / verify — never expose to user UI */
  describe() {
    return {
      phase: this.phase,
      bus: this.mode,
      nats: false,
      temporal: false,
      eks: false,
    };
  }
}
