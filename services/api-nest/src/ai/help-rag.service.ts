/**
 * Help RAG — Engine §47.6 / §47.15
 * Seed from copy/ko guides · keyword rank (pgvector path when embeddings present)
 * Money Fact numbers MUST NOT live in Help corpus
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { buildHelpChunk, rankHelpChunks } from "./ai.engine";

export type HelpChunk = {
  schema: string;
  id: string | null;
  kind: string;
  text: string;
  tags: readonly string[];
};

const SEED: Array<{
  id: string;
  kind: "guide" | "legal" | "glossary" | "faq";
  text: string;
  tags: string[];
}> = [
  {
    id: "help-deposit-usdt",
    kind: "guide",
    text: "테더(USDT)는 트론 네트워크로만 보내 주세요. 다른 네트워크로 보내면 찾을 수 없을 수 있어요.",
    tags: ["입금", "테더", "USDT", "트론"],
  },
  {
    id: "help-deposit-krw",
    kind: "guide",
    text: "원화 충전은 신청 후 운영자가 통장 입금을 확인하면 잔액에 반영돼요. 결제대행 창은 쓰지 않아요.",
    tags: ["입금", "원화", "충전"],
  },
  {
    id: "help-withdraw-guide",
    kind: "guide",
    text: "출금은 수익만 보내는 것이 기본이에요. 퍼뜩이 대신 출금·지급을 실행하지는 않아요. 출금 화면에서 직접 진행해 주세요.",
    tags: ["출금", "수익", "안내"],
  },
  {
    id: "help-kyc",
    kind: "guide",
    text: "출금하려면 본인 확인이 한 번 필요해요. 서류는 안전하게 보관되며 외부에 공개되지 않아요.",
    tags: ["KYC", "본인확인", "출금"],
  },
  {
    id: "help-practice",
    kind: "guide",
    text: "연습 잔액은 미리 써보는 금액이에요. 출금하거나 실제 수익으로 바꿀 수 없어요.",
    tags: ["연습", "체험"],
  },
  {
    id: "help-invite",
    kind: "guide",
    text: "친구 초대 혜택은 초대 화면에서 조건을 확인할 수 있어요. 초대 횟수 상한은 없어요.",
    tags: ["초대", "친구", "추천"],
  },
  {
    id: "help-benefits",
    kind: "guide",
    text: "받을 혜택·미션은 혜택 화면에서 확인할 수 있어요. 보너스는 지갑 수익·연습·수수료 할인으로 들어와요.",
    tags: ["혜택", "미션"],
  },
  {
    id: "help-lane",
    kind: "faq",
    text: "플랫폼 숫자는 원장 기준이고, 일상 답은 참고용이에요. 잔액·기회는 Fact로만 안내해요.",
    tags: ["퍼뜩", "이용법", "FAQ"],
  },
  {
    id: "help-terms",
    kind: "legal",
    text: "약관·개인정보 안내는 설정·이용약관 메뉴에서 확인할 수 있어요.",
    tags: ["약관", "이용법", "legal"],
  },
  {
    id: "help-glossary-profit",
    kind: "glossary",
    text: "수익 버킷은 출금 기본 대상이에요. 순유입(입금−출금)을 수익이라고 말하지 않아요.",
    tags: ["용어", "수익", "버킷"],
  },
];

@Injectable()
export class HelpRagService {
  private readonly corpus: HelpChunk[];

  constructor(private readonly db: PostgresService) {
    this.corpus = SEED.map((s) =>
      buildHelpChunk({
        id: s.id,
        kind: s.kind,
        text: s.text,
        tags: s.tags,
      }) as HelpChunk,
    );
  }

  /** In-memory seed used when PG help rows empty */
  seedCorpus(): readonly HelpChunk[] {
    return this.corpus;
  }

  async search(query: string, limit = 3): Promise<HelpChunk[]> {
    const q = String(query || "").trim();
    if (!q) return [];

    if (this.db.configured()) {
      try {
        const res = await this.db.query<{
          id: string;
          content: string;
          metadata: { kind?: string; tags?: string[] };
        }>(
          `SELECT id::text, content, metadata
             FROM public.ai_memory
            WHERE kind = 'help_chunk'
            ORDER BY created_at DESC
            LIMIT 200`,
        );
        if (res.rows.length > 0) {
          const chunks = res.rows.map(
            (r) =>
              buildHelpChunk({
                id: r.id,
                kind: r.metadata?.kind || "guide",
                text: r.content,
                tags: Array.isArray(r.metadata?.tags) ? r.metadata.tags : [],
              }) as HelpChunk,
          );
          return rankHelpChunks(q, chunks, limit) as HelpChunk[];
        }
      } catch {
        /* fall through to seed */
      }
    }

    return rankHelpChunks(q, this.corpus, limit) as HelpChunk[];
  }
}
