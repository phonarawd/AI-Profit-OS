/**
 * POST /api/v1/me/peotteok/chat · GET /api/v1/me/peotteok/chips
 * SSE contract · JWT audience peotteok-user
 */

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { CoachOrchestrator } from "./coach.orchestrator";
import { COACH_USER_ROUTES } from "./coach.routes";

type SseRes = {
  status: (code: number) => SseRes;
  setHeader: (k: string, v: string) => void;
  flushHeaders?: () => void;
  write: (chunk: string) => void;
  end: () => void;
  json: (body: unknown) => unknown;
};

@Controller()
export class CoachController {
  constructor(private readonly coach: CoachOrchestrator) {}

  @Get(COACH_USER_ROUTES.chips)
  chips(
    @Query("userId") userIdQ?: string,
    @Req() req?: { user?: { userId?: string; sub?: string } },
  ) {
    const userId = String(
      req?.user?.userId ?? req?.user?.sub ?? userIdQ ?? "",
    );
    return this.coach.chips(userId);
  }

  @Post(COACH_USER_ROUTES.chat)
  async chat(
    @Body() body: Record<string, unknown> = {},
    @Req() req: { user?: { userId?: string; sub?: string } },
    @Res() res: SseRes,
  ) {
    const userId = String(
      body.userId ?? req.user?.userId ?? req.user?.sub ?? "",
    );
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
}
