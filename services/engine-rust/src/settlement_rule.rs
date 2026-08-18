//! §48.13 MATCH_SUCCESS Rule Engine (deterministic · SSOT)
//! Soft60 / Hard90 · REQUEUE · MATCH_TIMEOUT · P0b matchBlocked
//! FORBIDDEN: RNG · percent-success knobs · presentation timer → credit

/// Soft wall target seconds from T0=`participateAcceptedAt` (UX goal · not terminal).
pub const SOFT_SEC: i64 = 60;
/// Hard wall seconds from T0 — running/requeue → `MATCH_TIMEOUT` (safe_stop · credit 0).
pub const HARD_SEC: i64 = 90;

/// Default price hard-stale gate for participate P5 (seconds).
pub const DEFAULT_PRICE_STALE_MAX_SEC: i64 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionResultCode {
    MatchSuccess,
    Requeue,
    PriceMoved,
    BelowMinProfit,
    CircuitOpen,
    SystemFailed,
    MatchTimeout,
}

impl ExecutionResultCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::MatchSuccess => "MATCH_SUCCESS",
            Self::Requeue => "REQUEUE",
            Self::PriceMoved => "PRICE_MOVED",
            Self::BelowMinProfit => "BELOW_MIN_PROFIT",
            Self::CircuitOpen => "CIRCUIT_OPEN",
            Self::SystemFailed => "SYSTEM_FAILED",
            Self::MatchTimeout => "MATCH_TIMEOUT",
        }
    }

    /// Rematch-eligible failures (price legs / stale). BELOW_MIN from R10 is not retryable
    /// because rematch_count > max fails the rematch budget check.
    pub fn is_retryable(self) -> bool {
        matches!(self, Self::PriceMoved)
    }
}

/// Participate preflight codes (§48.13.1 P0b / P1 / P5) — trade not created on Err.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParticipateGuardCode {
    Ok,
    /// Admin §9.8.4a · HTTP 403 MATCH_BLOCKED
    MatchBlocked,
    /// R4 compareReady false
    CompareNotReady,
    /// P5 age(staleAt) > priceStaleMaxSec
    PriceStaleData,
}

impl ParticipateGuardCode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ok => "OK",
            Self::MatchBlocked => "MATCH_BLOCKED",
            Self::CompareNotReady => "COMPARE_NOT_READY",
            Self::PriceStaleData => "PRICE_STALE_DATA",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExecutionPolicy {
    pub min_profit_usdt: String,
    pub stale_allowance_sec: i64,
    pub max_rematch_count: u32,
    pub retry_wait_sec: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuleContext {
    /// Wall-clock evaluation instant (ms epoch).
    pub now_ms: i64,
    /// T0 participate accept (ms epoch). Soft=T0+60s · Hard=T0+90s.
    pub participate_accepted_at_ms: i64,
    /// R1 — must be `"closed"`.
    pub circuit_status: String,
    /// R2 — forbidden: frozen | banned.
    pub user_status: String,
    /// R3 — must be `"available"`.
    pub opportunity_status: String,
    /// R4 — pre-trade gate; if false during execute → PRICE_MOVED.
    pub compare_ready: bool,
    /// R5 — pricing.staleAt (ms epoch).
    pub stale_at_ms: i64,
    /// R6 / R7 soft branch — expected profit USDT decimal string.
    pub expected_profit_usdt: String,
    /// R7 — trade snapshot pricing version.
    pub trade_pricing_version: u64,
    /// R7 — live opportunity pricing version.
    pub opportunity_pricing_version: u64,
    /// R8 — simulation.payoutFeasible(opportunityId).
    pub simulation_payout_feasible: bool,
    /// R9 — listing legs within adapter TTL.
    pub listing_legs_fresh: bool,
    /// R10 / REQUEUE budget.
    pub rematch_count: u32,
    pub policy: ExecutionPolicy,
    /// Presentation-only — MUST NOT affect result (verify:presentation-cannot-credit).
    pub presentation_duration_sec: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParticipateContext {
    pub match_blocked: bool,
    pub compare_ready: bool,
    pub now_ms: i64,
    pub stale_at_ms: i64,
    pub price_stale_max_sec: i64,
}

#[inline]
pub fn soft_deadline_ms(participate_accepted_at_ms: i64) -> i64 {
    participate_accepted_at_ms + SOFT_SEC * 1000
}

#[inline]
pub fn hard_deadline_ms(participate_accepted_at_ms: i64) -> i64 {
    participate_accepted_at_ms + HARD_SEC * 1000
}

/// §48.13.1 participate preflight — P0b / P1 / P5.
pub fn guard_participate(ctx: &ParticipateContext) -> ParticipateGuardCode {
    // P0b
    if ctx.match_blocked {
        return ParticipateGuardCode::MatchBlocked;
    }
    // P1 / R4
    if !ctx.compare_ready {
        return ParticipateGuardCode::CompareNotReady;
    }
    // P5 priceHardStale (≠ Hard90 wall)
    let age_sec = ((ctx.now_ms - ctx.stale_at_ms).max(0)) / 1000;
    if age_sec > ctx.price_stale_max_sec {
        return ParticipateGuardCode::PriceStaleData;
    }
    ParticipateGuardCode::Ok
}

/// §48.13 evaluateExecution — R1~R10 + Soft60/Hard90/REQUEUE/MATCH_TIMEOUT.
/// Presentation duration is ignored (orchestrate ≠ timer credit).
pub fn evaluate_execution(ctx: &RuleContext) -> ExecutionResultCode {
    let hard = hard_deadline_ms(ctx.participate_accepted_at_ms);
    // Hard wall first — membership-uniform · credit 0 · ≠ SYSTEM_FAILED
    if ctx.now_ms >= hard {
        return ExecutionResultCode::MatchTimeout;
    }

    match evaluate_rules(ctx) {
        None => ExecutionResultCode::MatchSuccess,
        Some(code) => {
            let can_requeue = code.is_retryable()
                && ctx.rematch_count < ctx.policy.max_rematch_count
                && ctx.now_ms + ctx.policy.retry_wait_sec * 1000 < hard;
            if can_requeue {
                ExecutionResultCode::Requeue
            } else {
                code
            }
        }
    }
}

/// Backward-compat name used by skeleton / scaffold.
pub fn evaluate_match_success(ctx: &RuleContext) -> ExecutionResultCode {
    evaluate_execution(ctx)
}

fn evaluate_rules(ctx: &RuleContext) -> Option<ExecutionResultCode> {
    // R1
    if ctx.circuit_status != "closed" {
        return Some(ExecutionResultCode::CircuitOpen);
    }
    // R2
    if ctx.user_status == "frozen" || ctx.user_status == "banned" {
        return Some(ExecutionResultCode::SystemFailed);
    }
    // R3
    if ctx.opportunity_status != "available" {
        return Some(ExecutionResultCode::PriceMoved);
    }
    // R4 (execute-time: treat as price moved; participate uses guard_participate)
    if !ctx.compare_ready {
        return Some(ExecutionResultCode::PriceMoved);
    }
    // R5
    let stale_sec = ((ctx.now_ms - ctx.stale_at_ms).max(0)) / 1000;
    if stale_sec > ctx.policy.stale_allowance_sec {
        return Some(ExecutionResultCode::PriceMoved);
    }
    // R6
    if !usdt_ge(&ctx.expected_profit_usdt, &ctx.policy.min_profit_usdt) {
        return Some(ExecutionResultCode::BelowMinProfit);
    }
    // R7 — version match OR priceSoftAccept (recalc expected ≥ minProfit)
    let version_ok = ctx.trade_pricing_version == ctx.opportunity_pricing_version;
    let soft_accept = usdt_ge(&ctx.expected_profit_usdt, &ctx.policy.min_profit_usdt);
    if !version_ok && !soft_accept {
        return Some(ExecutionResultCode::PriceMoved);
    }
    // R8
    if !ctx.simulation_payout_feasible {
        return Some(ExecutionResultCode::BelowMinProfit);
    }
    // R9
    if !ctx.listing_legs_fresh {
        return Some(ExecutionResultCode::PriceMoved);
    }
    // R10 — rematch exhausted → terminal BELOW_MIN_PROFIT (not REQUEUE)
    if ctx.rematch_count > ctx.policy.max_rematch_count {
        return Some(ExecutionResultCode::BelowMinProfit);
    }
    None
}

/// Decimal USDT string compare without float money (micros · 6dp).
fn usdt_ge(a: &str, b: &str) -> bool {
    parse_usdt_micros(a) >= parse_usdt_micros(b)
}

fn parse_usdt_micros(s: &str) -> i128 {
    let s = s.trim();
    if s.is_empty() {
        return 0;
    }
    let neg = s.starts_with('-');
    let s = if neg { &s[1..] } else { s };
    let mut parts = s.split('.');
    let whole: i128 = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let frac = parts.next().unwrap_or("");
    let bytes = frac.as_bytes();
    let mut micros: i128 = 0;
    for i in 0..6 {
        let d = if i < bytes.len() && bytes[i].is_ascii_digit() {
            (bytes[i] - b'0') as i128
        } else {
            0
        };
        micros = micros * 10 + d;
    }
    let v = whole * 1_000_000 + micros;
    if neg {
        -v
    } else {
        v
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_ctx() -> RuleContext {
        RuleContext {
            now_ms: 1_000_000,
            participate_accepted_at_ms: 1_000_000,
            circuit_status: "closed".into(),
            user_status: "active".into(),
            opportunity_status: "available".into(),
            compare_ready: true,
            stale_at_ms: 999_000,
            expected_profit_usdt: "10".into(),
            trade_pricing_version: 1,
            opportunity_pricing_version: 1,
            simulation_payout_feasible: true,
            listing_legs_fresh: true,
            rematch_count: 0,
            policy: ExecutionPolicy {
                min_profit_usdt: "5".into(),
                stale_allowance_sec: 3,
                max_rematch_count: 2,
                retry_wait_sec: 4,
            },
            presentation_duration_sec: 12,
        }
    }

    #[test]
    fn walls_locked() {
        assert_eq!(SOFT_SEC, 60);
        assert_eq!(HARD_SEC, 90);
    }

    #[test]
    fn match_success() {
        assert_eq!(
            evaluate_execution(&base_ctx()),
            ExecutionResultCode::MatchSuccess
        );
    }

    #[test]
    fn hard_wall_timeout() {
        let mut ctx = base_ctx();
        ctx.now_ms = ctx.participate_accepted_at_ms + HARD_SEC * 1000;
        assert_eq!(
            evaluate_execution(&ctx),
            ExecutionResultCode::MatchTimeout
        );
    }

    #[test]
    fn presentation_ignored() {
        let mut a = base_ctx();
        let mut b = base_ctx();
        a.presentation_duration_sec = 8;
        b.presentation_duration_sec = 15;
        assert_eq!(evaluate_execution(&a), evaluate_execution(&b));
    }

    #[test]
    fn p0b_match_blocked() {
        let g = guard_participate(&ParticipateContext {
            match_blocked: true,
            compare_ready: true,
            now_ms: 1_000_000,
            stale_at_ms: 999_000,
            price_stale_max_sec: DEFAULT_PRICE_STALE_MAX_SEC,
        });
        assert_eq!(g, ParticipateGuardCode::MatchBlocked);
    }

    #[test]
    fn requeue_on_stale_legs() {
        let mut ctx = base_ctx();
        ctx.listing_legs_fresh = false;
        assert_eq!(evaluate_execution(&ctx), ExecutionResultCode::Requeue);
    }
}
