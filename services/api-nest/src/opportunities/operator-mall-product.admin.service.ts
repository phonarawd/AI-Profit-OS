/**
 * 운영자 공용 상품 Admin 면.
 * 앱 PostgresService(DATABASE_URL)로 persist 하지 않는다. 운영 쓰기 0.
 * persist 는 adapter + fake isolation. Nest HTTP 는 STORE_UNREADY.
 * S1 legacy writer 보호를 해제하지 않는다.
 */
import { Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const requireCjs = createRequire(__filename);
const mall = requireCjs(join(__dirname, "operator-mall-product.core.cjs")) as {
  registerProduct: (input: object, deps: object) => Promise<{
    ok: boolean;
    applied: boolean;
    code?: string;
    httpStatus: number;
    product?: object;
  }>;
  updateProduct: (
    id: string,
    input: object,
    deps: object,
  ) => Promise<{
    ok: boolean;
    applied: boolean;
    code?: string;
    httpStatus: number;
    product?: object;
  }>;
  adminListParticipations: (
    input: object,
    deps: object,
  ) => Promise<{
    ok: boolean;
    applied: boolean;
    code?: string;
    httpStatus: number;
    items?: object[];
  }>;
  createUnreadyMallStore: () => { ready: false };
};

@Injectable()
export class OperatorMallProductAdminService {
  constructor(@Optional() private readonly db?: PostgresService) {}

  private async store() {
    // this.db = 앱 DATABASE_URL. mall persist 대상이 아니다.
    void this.db;
    return mall.createUnreadyMallStore();
  }

  private rejectUnready(out: { code?: string }) {
    if (out.code === "STORE_UNREADY") {
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    }
    return out;
  }

  async register(body: Record<string, unknown>, operatorId: string) {
    const out = await mall.registerProduct(
      { ...body, operatorId },
      { store: await this.store() },
    );
    return this.rejectUnready(out);
  }

  async update(
    id: string,
    body: Record<string, unknown>,
    operatorId: string,
  ) {
    const out = await mall.updateProduct(
      id,
      { ...body, operatorId },
      { store: await this.store() },
    );
    return this.rejectUnready(out);
  }

  async listParticipations(
    id: string,
    operatorId: string,
    userId?: string,
  ) {
    const out = await mall.adminListParticipations(
      { operatorId, productId: id, userId },
      { store: await this.store() },
    );
    return this.rejectUnready(out);
  }
}
