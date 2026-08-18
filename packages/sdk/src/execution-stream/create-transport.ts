/**
 * Single factory — Phase0→Phase1 swap = change kind / DEFAULT only.
 */

import { createPollingTransport } from "./polling-transport";
import { createSseTransport } from "./sse-transport";
import {
  DEFAULT_EXECUTION_TRANSPORT,
  type TradeExecutionTransport,
} from "./transport";
import type { ExecutionTransportKind } from "./types";

export function createExecutionTransport(
  kind: ExecutionTransportKind = DEFAULT_EXECUTION_TRANSPORT,
): TradeExecutionTransport {
  if (kind === "sse") return createSseTransport();
  return createPollingTransport();
}
