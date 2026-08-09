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

    if (!stream) {
      const out = await this.coach.chatOnce(userId, { text, stream: false, llm });
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
