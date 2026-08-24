# Implementation notes

The withdrawal operations surface added in this branch is read-only. It exposes the existing `withdraw_intents` state to authorized finance administrators but does not add approve, reject, broadcast, ledger-post or refund transitions. Money-owned state transitions must come from an existing verified contract rather than being invented in the admin UI.
