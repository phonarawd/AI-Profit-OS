"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import {
  asRecordList,
  isUuid,
  readText,
} from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["traces", "pick", "eval", "coach", "spotcheck"] as const;
type AiLogsTab = (typeof TABS)[number];

const TAB_LABEL: Record<AiLogsTab, string> = {
  traces: "답변 기록",
  pick: "AI 추천 점수",
  eval: "평가 게이트",
  coach: "퍼뜩 코치",
  spotcheck: "이용성 점검",
};

const LANE_LABEL: Record<string, string> = {
  P: "사실",
  G: "일반",
  S: "거절",
};

const GUARD_LABEL: Record<string, string> = {
  pass: "통과",
  block: "차단",
  refresh: "새로고침",
  reroute_p: "사실 경로",
  ungrounded: "근거 없음",
};

const PATH_LABEL: Record<string, string> = {
  template: "안내문",
  fact: "사실",
  rag: "도움말",
  llm_p: "사실 생성",
  llm_g: "일반 생성",
  refuse_s: "거절",
  scope_redirect: "범위 안내",
};

const TRACES_API = "/api/v1/admin/ai-logs";
const PICK_API = "/api/v1/admin/ai-pick/recent";
const EVAL_API = "/api/v1/admin/ai-logs/eval/status";
const COACH_API = "/api/v1/admin/ai-logs/coach";

function field(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null) return row[key];
  }
  return null;
}

function labeled(value: string | null, map: Record<string, string>): string | null {
  if (!value) return null;
  return map[value] ? `${map[value]} (${value})` : value;
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return value;
}

type EvalStatus = {
  autoLearningEnabled?: unknown;
};

type CoachCatalog = {
  factTools?: unknown;
  evalSets?: unknown;
  answerTraceFields?: unknown;
  autoLearningEnabled?: unknown;
  moneyHallucinationRateMax?: unknown;
};

/**
 * Admin §9.1.1 — `/admin/ai-logs`
 * Trace SoT = existing public.ai_logs via AiLogsAdminService
 * GET /api/v1/admin/ai-logs · Admin JWT only · 잔액 UPDATE 0
 */

function AiLogsContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): AiLogsTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as AiLogsTab;
    }
    return "traces";
  }, [searchParams]);

  const [traces, setTraces] = useState<AdminResult<unknown> | null>(null);
  const [picks, setPicks] = useState<AdminResult<unknown> | null>(null);
  const [evalStatus, setEvalStatus] = useState<AdminResult<EvalStatus> | null>(
    null,
  );
  const [coach, setCoach] = useState<AdminResult<CoachCatalog> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [t, p, e, c] = await Promise.all([
        adminGet<unknown>(TRACES_API),
        adminGet<unknown>(PICK_API),
        adminGet<EvalStatus>(EVAL_API),
        adminGet<CoachCatalog>(COACH_API),
      ]);
      if (cancelled) return;
      setTraces(t);
      setPicks(p);
      setEvalStatus(e);
      setCoach(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const traceItems = traces?.ok ? asRecordList(traces.data) : null;
  const pickItems = picks?.ok ? asRecordList(picks.data) : null;
  const factTools = coach?.ok ? asStringList(coach.data.factTools) : null;
  const evalSets = coach?.ok ? asStringList(coach.data.evalSets) : null;
  const traceFields =
    coach?.ok ? asStringList(coach.data.answerTraceFields) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-canon="admin-ai-logs"
      data-testid="admin-ai-logs"
      data-forbid="fake-ai-log-truth"
    >
      <h1 className="text-xl font-semibold">AI 분석 기록</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버에 남은 퍼뜩 답변·거절 기록만 봅니다. 이 화면은 잔액·정산 원장이
        아닙니다.
      </p>
      <p className="mt-1 text-xs text-lux-text-muted" data-forbid="l3_money_execute">
        출금·지급 실행 경로 없음 · 관리자 점수 수정 없음 · 자동 학습 꺼짐
      </p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="AI 로그 탭">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ai-logs?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded px-3 py-1 text-sm bg-lux-surface-elevated"
                : "rounded px-3 py-1 text-sm text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "traces" && (
        <section
          className="mt-6"
          data-panel="answer_traces"
          data-testid="ai-logs-traces-panel"
          data-traces-api={TRACES_API}
        >
          <h2 className="text-base font-medium">답변 추적</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            레인 · 제공자 · 경로 · 가드 · 도구 · 미리보기
          </p>
          {!traces ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !traces.ok ? (
            <AdminFetchNote failure={traces.failure} />
          ) : traceItems == null ? (
            <AdminTruth value={null} testId="ai-logs-traces-list" />
          ) : traceItems.length === 0 ? (
            <p
              className="mt-3 text-sm text-lux-text-muted"
              data-testid="ai-logs-traces-empty"
            >
              기록 없음
            </p>
          ) : (
            <ul className="mt-3 space-y-3" data-testid="ai-logs-traces-list">
              {traceItems.map((row, idx) => {
                const id = readText(field(row, "id"));
                const createdAt = readText(field(row, "createdAt", "created_at"));
                const userId = readText(field(row, "userId", "user_id"));
                const lane = readText(field(row, "lane"));
                const provider = readText(
                  field(row, "providerId", "provider_id"),
                );
                const answerPath = readText(
                  field(row, "answerPath", "answer_path"),
                );
                const guardRaw = field(row, "guardResult", "guard_result");
                const guardStatus =
                  guardRaw && typeof guardRaw === "object"
                    ? readText(
                        (guardRaw as { status?: unknown }).status,
                      )
                    : null;
                const tools = asStringList(
                  field(row, "toolsCalled", "tools_called"),
                );
                const preview = readText(
                  field(row, "answerPreview", "answer_preview"),
                );
                const facts = asRecordList(
                  field(row, "factsUsed", "facts_used"),
                );
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      시각 <AdminTruth value={createdAt} />
                    </p>
                    <p>
                      레인 <AdminTruth value={labeled(lane, LANE_LABEL)} />
                    </p>
                    <p>
                      경로{" "}
                      <AdminTruth value={labeled(answerPath, PATH_LABEL)} />
                    </p>
                    <p>
                      가드{" "}
                      <AdminTruth value={labeled(guardStatus, GUARD_LABEL)} />
                    </p>
                    <p>
                      제공자 <AdminTruth value={provider} />
                    </p>
                    <p>
                      도구{" "}
                      <AdminTruth
                        value={
                          tools == null
                            ? null
                            : tools.length === 0
                              ? "없음"
                              : tools.join(", ")
                        }
                      />
                    </p>
                    <p>
                      사실 출처{" "}
                      <AdminTruth
                        value={
                          facts == null
                            ? null
                            : facts.length === 0
                              ? "없음"
                              : facts
                                  .map((fact) => readText(fact.source))
                                  .filter(Boolean)
                                  .join(", ") || "없음"
                        }
                      />
                    </p>
                    <p>
                      회원{" "}
                      {userId && isUuid(userId) ? (
                        <a
                          href={`/admin/users/${userId}`}
                          className="text-lux-text-muted underline"
                        >
                          {userId}
                        </a>
                      ) : (
                        <AdminTruth value={userId} />
                      )}
                    </p>
                    <p>
                      미리보기 <AdminTruth value={preview} />
                    </p>
                    <p className="mt-1 text-xs text-lux-text-muted">
                      미리보기는 퍼뜩이 말한 내용이지 잔액 증거가 아닙니다.
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "pick" && (
        <section
          className="mt-6"
          data-panel="ai_pick_readonly"
          data-testid="ai-logs-pick-panel"
          data-pick-api={PICK_API}
          data-forbid="ai_score_admin_override"
        >
          <h2 className="text-base font-medium">AI 추천 점수</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            저장된 엔진 점수만 봅니다. 화면에서 점수를 고치지 않습니다.
          </p>
          {!picks ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !picks.ok ? (
            <AdminFetchNote failure={picks.failure} />
          ) : pickItems == null ? (
            <AdminTruth value={null} testId="ai-logs-pick-list" />
          ) : pickItems.length === 0 ? (
            <p
              className="mt-3 text-sm text-lux-text-muted"
              data-testid="ai-logs-pick-empty"
            >
              기록 없음
            </p>
          ) : (
            <ul className="mt-3 space-y-3" data-testid="ai-logs-pick-list">
              {pickItems.map((row, idx) => {
                const id = readText(field(row, "id"));
                const formula = readText(
                  field(row, "formula_id", "formulaId"),
                );
                const createdAt = readText(
                  field(row, "created_at", "createdAt"),
                );
                const isPick = field(row, "is_ai_pick", "isAiPick");
                return (
                  <li
                    key={id ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      공식 <AdminTruth value={formula} />
                    </p>
                    <p>
                      추천{" "}
                      <AdminTruth
                        value={
                          typeof isPick === "boolean"
                            ? isPick
                              ? "해당"
                              : "해당 없음"
                            : null
                        }
                      />
                    </p>
                    <p>
                      시각 <AdminTruth value={createdAt} />
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "eval" && (
        <section
          className="mt-6"
          data-panel="eval_gate"
          data-testid="ai-logs-eval-panel"
          data-eval-api={EVAL_API}
          data-auto-learning="false"
          data-forbid="auto_learning_on"
        >
          <h2 className="text-base font-medium">평가 게이트</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            서버가 준 자동 학습 잠금만 봅니다. 없는 비율 숫자는 만들지
            않습니다.
          </p>
          {!evalStatus ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !evalStatus.ok ? (
            <AdminFetchNote failure={evalStatus.failure} />
          ) : (
            <p className="mt-3 text-sm">
              자동 학습{" "}
              <AdminTruth
                value={
                  typeof evalStatus.data.autoLearningEnabled === "boolean"
                    ? evalStatus.data.autoLearningEnabled
                      ? "켜짐"
                      : "꺼짐"
                    : null
                }
              />
            </p>
          )}
        </section>
      )}

      {tab === "coach" && (
        <section
          className="mt-6"
          data-panel="coach"
          data-testid="ai-logs-coach-panel"
          data-coach-api={COACH_API}
          data-forbid="money_hallucination"
        >
          <h2 className="text-base font-medium">퍼뜩 코치</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            서버 카탈로그만 봅니다. 평가 결과를 여기서 다시 돌리지 않습니다.
          </p>
          {!coach ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !coach.ok ? (
            <AdminFetchNote failure={coach.failure} />
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                사실 도구{" "}
                <AdminTruth
                  value={
                    factTools == null
                      ? null
                      : factTools.length === 0
                        ? "없음"
                        : factTools.join(", ")
                  }
                />
              </li>
              <li>
                추적 필드{" "}
                <AdminTruth
                  value={
                    traceFields == null
                      ? null
                      : traceFields.length === 0
                        ? "없음"
                        : traceFields.join(", ")
                  }
                />
              </li>
              <li>
                평가 세트{" "}
                <AdminTruth
                  value={
                    evalSets == null
                      ? null
                      : evalSets.length === 0
                        ? "없음"
                        : evalSets.join(", ")
                  }
                />
              </li>
              <li>
                자동 학습{" "}
                <AdminTruth
                  value={
                    typeof coach.data.autoLearningEnabled === "boolean"
                      ? coach.data.autoLearningEnabled
                        ? "켜짐"
                        : "꺼짐"
                      : null
                  }
                />
              </li>
            </ul>
          )}
        </section>
      )}

      {tab === "spotcheck" && (
        <section
          className="mt-6"
          data-panel="spotcheck"
          data-testid="ai-logs-spotcheck-panel"
        >
          <h2 className="text-base font-medium">이용성 점검</h2>
          <p
            className="mt-3 text-sm text-lux-text-muted"
            data-testid="ai-logs-spotcheck-empty"
          >
            기록 없음
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <AiLogsContent />
    </SearchParamsBoundary>
  );
}
