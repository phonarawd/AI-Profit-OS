import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ProfitInput = {
  principal: string;
  dailyRate: string;
  periodStartUnixMicros: string;
  periodEndUnixMicros: string;
};

export type ProfitOutput = { accruedProfit: string; calcVersion: string };

@Injectable()
export class MiningProfitEngineService {
  async calculate(input: ProfitInput): Promise<ProfitOutput> {
    const binary = process.env.MINING_PROFIT_ENGINE_BIN;
    if (!binary) throw new ServiceUnavailableException("MINING_ENGINE_UNAVAILABLE");
    try {
      const { stdout } = await execFileAsync(binary, [
        "--principal", input.principal,
        "--daily-rate", input.dailyRate,
        "--start-micros", input.periodStartUnixMicros,
        "--end-micros", input.periodEndUnixMicros,
        "--scale", "18",
        "--rounding", "half-even",
      ], { timeout: 5_000, maxBuffer: 64 * 1024 });
      const parsed = JSON.parse(stdout) as { accrued_profit?: unknown; calc_version?: unknown };
      if (typeof parsed.accrued_profit !== "string" || parsed.calc_version !== "mine-profit-v1") {
        throw new Error("invalid engine response");
      }
      return { accruedProfit: parsed.accrued_profit, calcVersion: parsed.calc_version };
    } catch {
      throw new ServiceUnavailableException("MINING_ENGINE_UNAVAILABLE");
    }
  }
}
