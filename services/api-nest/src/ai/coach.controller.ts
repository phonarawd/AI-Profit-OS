/**
 * POST /api/v1/me/peotteok/chat · GET /api/v1/me/peotteok/chips
 * GET/PATCH/DELETE /api/v1/me/peotteok/conversations
 * SSE contract · JWT audience peotteok-user
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CoachOrchestrator } from "./coach.orchestrator";
import { COACH_USER_ROUTES } from "./coach.routes";
import { PeotteokHistoryService } from "./peotteok-history.service";

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
  constructor(
    private readonly coach: CoachOrchestrator,
    private readonly history: PeotteokHistoryService,
  ) {}

  @Get(COACH_USER_ROUTES.chips)
  chips(@Req() req: SessionReq) {
    return this.coach.chips(this.sessionUserId(req));
  }

  @Get(COACH_USER_ROUTES.conversations)
  async listConversations(@Req() req: SessionReq) {
    const conversations = await this.history.list(this.sessionUserId(req));
    return { conversations };
  }

  @Get(COACH_USER_ROUTES.conversation)
  getConversation(@Req() req: SessionReq, @Param("id") id: string) {
    return this.history.get(this.sessionUserId(req), String(id || ""));
  }

  @Patch(COACH_USER_ROUTES.conversation)
  renameConversation(
    @Req() req: SessionReq,
    @Param("id") id: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    return this.history.rename(
      this.sessionUserId(req),
      String(id || ""),
      String(body.title ?? ""),
    );
  }

  @Delete(COACH_USER_ROUTES.conversation)
  removeConversation(@Req() req: SessionReq, @Param("id") id: string) {
    return this.history.remove(this.sessionUserId(req), String(id || ""));
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
      const out = await this.coach.chatOnce(userId, {
        text,
        stream: false,
        llm,
        conversationId,
      });
      return res.status(200).json(out);
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
    } catch {
      // 예외 원문(사용자 입력·내부 스택)을 SSE에 투사하지 않는다.
      // GHAS js/xss-through-exception — 상수 코드만 허용.
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "coach_error" })}\n\n`);
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
