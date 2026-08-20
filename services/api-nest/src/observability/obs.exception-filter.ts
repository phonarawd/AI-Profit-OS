import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";

const req = createRequire(__filename);
const obs = req(
  join(__dirname, "../../../../packages/observability/observability.core.cjs"),
) as {
  emitObs: (event: Record<string, unknown>) => unknown;
};

@Catch()
export class ObsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      headersSent?: boolean;
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<{ method?: string; url?: string }>();
    const httpException =
      exception instanceof HttpException ? exception : null;
    const status =
      httpException?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const body = httpException?.getResponse() ?? {
      statusCode: status,
      message: "INTERNAL",
    };

    obs.emitObs({
      service: "api-nest",
      method: request.method,
      path: request.url,
      status,
      event: status >= 500 ? "http_5xx" : "http_error",
      message:
        exception instanceof Error ? exception.message : "exception",
      fields: {
        // 원본 머니/KYC 바디는 넣지 않는다. 경로만.
      },
    });

    if (!response.headersSent) {
      response.status(status).json(body);
    }
  }
}
