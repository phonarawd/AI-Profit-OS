use engine_rust::{calculate_mining_profit, MiningProfitInput, RoundingMode};
use std::collections::HashMap;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut values = HashMap::new();
    let mut i = 0;
    while i + 1 < args.len() {
        values.insert(args[i].as_str(), args[i + 1].as_str());
        i += 2;
    }
    let required = |key: &str| values.get(key).copied().unwrap_or_else(|| fail("missing argument"));
    let rounding = match required("--rounding") {
        "truncate" => RoundingMode::Truncate,
        "half-up" => RoundingMode::HalfUp,
        "half-even" => RoundingMode::HalfEven,
        _ => fail("invalid rounding"),
    };
    let input = MiningProfitInput {
        principal: required("--principal"),
        daily_rate: required("--daily-rate"),
        period_start_unix_micros: required("--start-micros").parse().unwrap_or_else(|_| fail("invalid start")),
        period_end_unix_micros: required("--end-micros").parse().unwrap_or_else(|_| fail("invalid end")),
        output_scale: required("--scale").parse().unwrap_or_else(|_| fail("invalid scale")),
        rounding_mode: rounding,
    };
    match calculate_mining_profit(&input) {
        Ok(out) => println!("{{\"accrued_profit\":\"{}\",\"calc_version\":\"{}\"}}", out.accrued_profit, out.calc_version),
        Err(err) => fail(&err.to_string()),
    }
}

fn fail(message: &str) -> ! {
    eprintln!("{}", message.replace('"', "'"));
    std::process::exit(2)
}
