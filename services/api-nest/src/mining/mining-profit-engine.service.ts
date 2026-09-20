import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { parseAmount, formatAmount } from "../ledger/ledger.money";

const execFileAsync = promisify(execFile);

@Injectable()
export class MiningProfitEngineService {
  private resolveBinary(): string {
    const configured = String(process.env.MINING_PROFIT_ENGINE_BIN ?? "").trim();
    const candidates = [
      configured,
      join(process.cwd(), "services", "engine-rust", "target", "release", "mining_profit_cli"),
      join(process.cwd(), "..", "engine-rust", "target", "release", "mining_profit_cli"),
    ].filter(Boolean);
    const binary = candidates.find((candidate) => existsSync(candidate));
    if (!binary) {
      throw new ServiceUnavailableException("수익 계산 서비스를 사용할 수 없습니다.");
    }
    return binary;
  }

  async calculate(input: {
    principalUsdt: string;
    dailyRate: string;
    periodStartMicros: bigint;
    periodEndMicros: bigint;
  }): Promise<string> {
    const binary = this.resolveBinary();
    try {
      const { stdout } = await execFileAsync(
        binary,
        [
          input.principalUsdt,
          input.dailyRate,
          input.periodStartMicros.toString(),
          input.periodEndMicros.toString(),
          "18",
          "half-even",
        ],
        { timeout: 10_000, maxBuffer: 64 * 1024 },
      );
      const raw = String(stdout).trim();
      const scaled = parseAmount(raw);
      if (scaled < 0n) throw new Error("negative mining profit");
      return formatAmount(scaled);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("수익 계산을 완료할 수 없습니다.");
    }
  }
}
