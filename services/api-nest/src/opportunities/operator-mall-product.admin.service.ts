/**
 * 운영자 공용 상품 Admin 면.
 * 운영 PostgresService(mgsytcetsiecllmhcyox) + mall 스키마가 있으면 persist.
 * 격리 QA URL 은 시험용만. 격리 DB를 운영 persist로 쓰지 않는다.
 * 스키마 없으면 STORE_UNREADY. fake persist 를 runtime 으로 넣지 않는다.
 * S1 legacy writer 보호를 해제하지 않는다.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
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
  adminListProducts: (
    input: object,
    deps: object,
  ) => Promise<{
    ok: boolean;
    applied: boolean;
    code?: string;
    httpStatus: number;
    items?: object[];
    nextCursor?: string | null;
  }>;
  adminGetProduct: (
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
};
const persist = requireCjs(join(__dirname, "operator-mall-product.persist.cjs")) as {
  resolveRuntimeMallPersistStore: (
    env: NodeJS.ProcessEnv,
    opts?: { opsDb?: PostgresService },
  ) => Promise<{ ready: boolean; kind?: string }>;
};

@Injectable()
export class OperatorMallProductAdminService {
  constructor(@Optional() private readonly db?: PostgresService) {}

  private storePromise: Promise<{ ready: boolean; kind?: string }> | null = null;

  private async store() {
    if (!this.storePromise) {
      const opsDb =
        this.db && this.db.configured && this.db.configured() ? this.db : undefined;
      this.storePromise = persist.resolveRuntimeMallPersistStore(process.env, {
        opsDb,
      });
    }
    return this.storePromise;
  }

  private rejectMall(out: { code?: string; httpStatus?: number }) {
    if (out.code === "STORE_UNREADY") {
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    }
    const status = Number(out.httpStatus || 0);
    if (status === 409) throw new ConflictException(out);
    if (status === 404) throw new NotFoundException(out);
    if (status === 400) throw new BadRequestException(out);
    if (status === 401) throw new UnauthorizedException(out);
    if (status === 403) throw new ForbiddenException(out);
    return out;
  }

  async register(body: Record<string, unknown>, operatorId: string) {
    const out = await mall.registerProduct(
      { ...body, operatorId },
      { store: await this.store() },
    );
    return this.rejectMall(out);
  }

  async list(
    query: Record<string, unknown>,
    operatorId: string,
  ) {
    const out = await mall.adminListProducts(
      { ...query, operatorId },
      { store: await this.store() },
    );
    return this.rejectMall(out);
  }

  async get(id: string, operatorId: string) {
    const out = await mall.adminGetProduct(
      id,
      { operatorId },
      { store: await this.store() },
    );
    return this.rejectMall(out);
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
    return this.rejectMall(out);
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
    return this.rejectMall(out);
  }
}
