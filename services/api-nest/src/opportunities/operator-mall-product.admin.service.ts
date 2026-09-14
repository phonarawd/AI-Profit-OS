/**
 * 운영자 공용 상품 Admin 면. 스키마 미적용 시 persist 0 · STORE_UNREADY.
 * S1 legacy writer 보호를 해제하지 않는다.
 */
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";

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
  private store() {
    return mall.createUnreadyMallStore();
  }

  async register(body: Record<string, unknown>, operatorId: string) {
    const out = await mall.registerProduct(
      { ...body, operatorId },
      { store: this.store() },
    );
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

  async update(
    id: string,
    body: Record<string, unknown>,
    operatorId: string,
  ) {
    const out = await mall.updateProduct(
      id,
      { ...body, operatorId },
      { store: this.store() },
    );
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

  async listParticipations(
    id: string,
    operatorId: string,
    userId?: string,
  ) {
    const out = await mall.adminListParticipations(
      { operatorId, productId: id, userId },
      { store: this.store() },
    );
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
}
