"use strict";
/**
 * PostgreSQL pool — Supabase Seoul (ADR-001) or optional Compose.
 * Supabase Auth clients are forbidden here (ADR-006).
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const phase0_env_1 = require("../config/phase0.env");
/** Strip `//user:password@` credentials from anything we are about to log. */
function redactCredentials(text) {
    return String(text).replace(/\/\/[^\s/@]*:[^\s/@]*@/g, "//[redacted]@");
}
let PostgresService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PostgresService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PostgresService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        pool = null;
        backgroundErrorCount = 0;
        lastBackgroundError = null;
        ensurePool() {
            if (this.pool)
                return this.pool;
            const url = (0, phase0_env_1.loadPhase0Env)().databaseUrl;
            if (!url)
                return null;
            const pool = new pg_1.Pool({
                connectionString: url,
                max: 3,
                idleTimeoutMillis: 10_000,
                connectionTimeoutMillis: 5_000,
                ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
            });
            // node-postgres emits 'error' on idle/background clients. Without a listener
            // that is an unhandled EventEmitter error and Node terminates the whole API
            // process whenever Postgres briefly disappears. Registered once per Pool.
            pool.on("error", (err) => this.recordBackgroundError(err));
            this.pool = pool;
            return pool;
        }
        /**
         * Observes a background connection failure. It must never mark an in-flight
         * request as succeeded — callers still receive the rejection from their own
         * query — and the pool stays usable, so the next `query()` acquires a fresh
         * connection once Postgres is back.
         */
        recordBackgroundError(err) {
            this.backgroundErrorCount += 1;
            const message = redactCredentials(err instanceof Error ? err.message : String(err));
            const code = err && typeof err === "object" && typeof err.code === "string"
                ? err.code
                : null;
            this.lastBackgroundError = {
                at: new Date().toISOString(),
                code,
                message,
            };
            // eslint-disable-next-line no-console
            console.error(`[postgres] background client error — pool retained, process alive (code=${code ?? "none"}): ${message}`);
        }
        /** Operational read-out — no connection string, no credentials. */
        poolHealth() {
            return {
                poolCreated: this.pool !== null,
                errorListenerCount: this.pool ? this.pool.listenerCount("error") : 0,
                backgroundErrorCount: this.backgroundErrorCount,
                lastBackgroundError: this.lastBackgroundError,
            };
        }
        configured() {
            return Boolean((0, phase0_env_1.loadPhase0Env)().databaseUrl);
        }
        async ping() {
            const pool = this.ensurePool();
            if (!pool)
                return { ok: false, detail: "DATABASE_URL unset" };
            try {
                const r = await pool.query("select 1 as ok");
                return r.rows[0]?.ok === 1
                    ? { ok: true, detail: "up" }
                    : { ok: false, detail: "unexpected" };
            }
            catch (e) {
                return {
                    ok: false,
                    detail: e instanceof Error ? e.message : "pg ping failed",
                };
            }
        }
        async query(text, params) {
            const pool = this.ensurePool();
            if (!pool)
                throw new Error("DATABASE_URL unset");
            return pool.query(text, params);
        }
        /** Serializable money TX helper — caller must set app.ledger_posting inside when mutating balances. */
        async withTransaction(fn) {
            const pool = this.ensurePool();
            if (!pool)
                throw new Error("DATABASE_URL unset");
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                const result = await fn(client);
                await client.query("COMMIT");
                return result;
            }
            catch (e) {
                try {
                    await client.query("ROLLBACK");
                }
                catch {
                    /* ignore rollback errors */
                }
                throw e;
            }
            finally {
                client.release();
            }
        }
        async onModuleDestroy() {
            if (this.pool) {
                const pool = this.pool;
                // Drop the reference first so a late background error during shutdown
                // cannot resurrect a half-ended pool, then detach the listener.
                this.pool = null;
                try {
                    await pool.end();
                }
                finally {
                    pool.removeAllListeners("error");
                }
            }
        }
    };
    return PostgresService = _classThis;
})();
exports.PostgresService = PostgresService;
