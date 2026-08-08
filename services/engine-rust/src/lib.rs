//! engine-rust — Phase0 skeleton
//! Settlement / MATCH_SUCCESS rules land in domain Engine todos.

pub mod settlement_rule;

pub fn engine_name() -> &'static str {
    "engine-rust"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_locked() {
        assert_eq!(engine_name(), "engine-rust");
    }
}
