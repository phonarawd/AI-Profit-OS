use engine_rust::{calculate_mining_profit, MiningProfitInput, RoundingMode};
use std::env;
use std::process;

fn fail(message: &str) -> ! {
    eprintln!("{message}");
    process::exit(2);
}

fn parse_i64(raw: Option<String>, name: &str) -> i64 {
    raw.unwrap_or_else(|| fail(name))
        .parse::<i64>()
        .unwrap_or_else(|_| fail(name))
}

fn parse_u32(raw: Option<String>, name: &str) -> u32 {
    raw.unwrap_or_else(|| fail(name))
        .parse::<u32>()
        .unwrap_or_else(|_| fail(name))
}

fn main() {
    let mut args = env::args().skip(1);
    let principal = args.next().unwrap_or_else(|| fail("principal required"));
    let daily_rate = args.next().unwrap_or_else(|| fail("daily_rate required"));
    let period_start_unix_micros = parse_i64(args.next(), "period_start_unix_micros required");
    let period_end_unix_micros = parse_i64(args.next(), "period_end_unix_micros required");
    let output_scale = parse_u32(args.next(), "output_scale required");
    let rounding_mode = match args.next().as_deref() {
        Some("truncate") => RoundingMode::Truncate,
        Some("half-up") => RoundingMode::HalfUp,
        Some("half-even") => RoundingMode::HalfEven,
        _ => fail("rounding_mode must be truncate|half-up|half-even"),
    };
    if args.next().is_some() {
        fail("unexpected extra argument");
    }

    let result = calculate_mining_profit(&MiningProfitInput {
        principal: &principal,
        daily_rate: &daily_rate,
        period_start_unix_micros,
        period_end_unix_micros,
        output_scale,
        rounding_mode,
    })
    .unwrap_or_else(|err| fail(&err.to_string()));

    println!("{}", result.accrued_profit);
}
