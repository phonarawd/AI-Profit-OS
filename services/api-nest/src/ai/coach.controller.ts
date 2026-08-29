/**
 * POST /api/v1/me/peotteok/chat · GET /api/v1/me/peotteok/chips
 * SSE contract · JWT audience peotteok-user
 */

import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CoachOrchestrator } from "./coach.orchestrator";
import { COACH_USER_ROUTES } from "./coach.routes";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

type SseRes = {
  status: (code: number) => SseRes;
  setHeader: (k: string, v: string) => void;
  flushHeaders?: () => void;
  write: (chunk: string) => void;
  end: () => void;
  json: (body: unknown) => unknown;
};

/** P0-1 fix — JwtAuthGuard populates req.user; body/query userId no longer trusted */
@UseGuards(JwtAuthGuard)
@Controller()
export class CoachController {
  constructor(private readonly coach: CoachOrchestrator) {}

  @Get(COACH_USER_ROUTES.chips)
  chips(@Req() req: SessionReq) {
    return this.coach.chips(this.sessionUserId(req));
  }

  @Post(COACH_USER_ROUTES.chat)
  async chat(
    @Body() body: Record<string, unknown> = {},
    @Req() req: SessionReq,
    @Res() res: SseRes,
  ) {
    const userId = this.sessionUserId(req);
    const text = String(body.text ?? body.message ?? "");
    const stream = body.stream !== false;
    const llm = body.llm !== false;
    // Engine §47.16.2 — additive/optional; omit to start a new conversation
    const conversationId =
      body.conversationId != null ? String(body.conversationId) : undefined;

    if (!stream) {
      // P_HELP_FAIL_CLOSED — chatOnce 예외를 HTTP 500으로 올리지 않는다
      try {
        const out = await this.coach.chatOnce(userId, {
          text,
          stream: false,
          llm,
          conversationId,
        });
        return res.status(200).json(out);
      } catch {
        try {
          const out = await this.coach.chatOnce(userId, {
            text,
            stream: false,
            llm: false,
            conversationId,
          });
          return res.status(200).json({
            ...out,
            fail_closed: true,
            degraded: true,
          });
        } catch {
          return res.status(200).json({
            answer_text:
              "지금 그 답은 안전하게 안내할 수 없어요. 다른 질문을 해 주세요.",
            fail_closed: true,
            degraded: true,
            lane: "P",
            answer_path: "template",
            provider_id: "none",
            provider_effective: "none",
            tools_called: [],
          });
        }
      }
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      for await (const ev of this.coach.chat(userId, {
        text,
        stream: true,
        llm,
        conversationId,
      })) {
        res.write(`event: ${ev.event}\n`);
        res.write(`data: ${JSON.stringify(ev.data)}\n\n`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "coach_error";
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message })}\n\n`);
    }
    res.end();
  }

  /** §0.9.3 — never trust query/body userId */
  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
