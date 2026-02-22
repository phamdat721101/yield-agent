//! YieldRouter — Arbitrum Stylus Smart Contract (Rust/WASM)
//!
//! On-chain risk scoring and yield route calculation for the LionHeart
//! Agentic Yield Farmer. Deployed to Arbitrum Sepolia via `cargo stylus deploy`.
//!
//! Functions:
//!   - score_pool(tvl, apy_base, apy_reward, audit_count) → risk_score (0–100)
//!   - get_route(amount, risk_tolerance) → (pool_index, estimated_apy)

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*, storage::StorageU256};

sol_storage! {
    #[entrypoint]
    pub struct YieldRouter {
        /// Total pools scored
        StorageU256 total_scored;
    }
}

#[public]
impl YieldRouter {
    /// Calculate a risk score (0–100) for a yield pool.
    ///
    /// Scoring formula:
    ///   - base_score = 50 (neutral)
    ///   - TVL > $100M → -20 (safer)
    ///   - TVL > $10M  → -10
    ///   - TVL < $1M   → +20 (riskier)
    ///   - audit_count >= 3 → -15
    ///   - audit_count == 0 → +25
    ///   - reward_ratio > 50% of total APY → +10 (subsidy-dependent)
    ///   - reward_ratio > 80% → +15
    ///   - Clamped to [0, 100]
    ///
    /// Parameters (all as U256 for EVM compat):
    ///   tvl_usd:     TVL in USD (no decimals, raw integer)
    ///   apy_base:    Base/organic APY × 100 (e.g., 350 = 3.50%)
    ///   apy_reward:  Reward/subsidy APY × 100
    ///   audit_count: Number of completed audits
    pub fn score_pool(
        &mut self,
        tvl_usd: U256,
        apy_base: U256,
        apy_reward: U256,
        audit_count: U256,
    ) -> U256 {
        let mut score: i64 = 50; // neutral baseline

        // TVL factor
        let tvl = tvl_usd.try_into().unwrap_or(0u64);
        if tvl >= 100_000_000 {
            score -= 20;
        } else if tvl >= 10_000_000 {
            score -= 10;
        } else if tvl < 1_000_000 {
            score += 20;
        }

        // Audit factor
        let audits = audit_count.try_into().unwrap_or(0u64);
        if audits >= 3 {
            score -= 15;
        } else if audits == 0 {
            score += 25;
        }

        // Reward dependency factor
        let base: u64 = apy_base.try_into().unwrap_or(0);
        let reward: u64 = apy_reward.try_into().unwrap_or(0);
        let total = base + reward;
        if total > 0 {
            let reward_ratio = (reward * 100) / total;
            if reward_ratio > 80 {
                score += 15;
            } else if reward_ratio > 50 {
                score += 10;
            }
        }

        // Clamp 0–100
        score = score.max(0).min(100);

        // Increment counter
        let prev = self.total_scored.get();
        self.total_scored.set(prev + U256::from(1));

        U256::from(score as u64)
    }

    /// Get the total number of pools scored (on-chain counter).
    pub fn total_scored(&self) -> U256 {
        self.total_scored.get()
    }

    /// Simple route recommendation based on amount and risk tolerance.
    ///
    /// Parameters:
    ///   amount:          Deposit amount in USD (no decimals)
    ///   risk_tolerance:  0=conservative, 1=moderate, 2=aggressive
    ///
    /// Returns: recommended_pool_type
    ///   0 = Lending (Aave/Fluid), 1 = LP (Curve/Camelot), 2 = Leveraged (GMX/Jones)
    pub fn get_route(&self, _amount: U256, risk_tolerance: U256) -> U256 {
        let tol: u64 = risk_tolerance.try_into().unwrap_or(0);
        match tol {
            0 => U256::from(0), // Conservative → Lending
            1 => U256::from(1), // Moderate → LP
            _ => U256::from(2), // Aggressive → Leveraged
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_score_safe_pool() {
        // High TVL, 3 audits, low reward ratio → should score < 30 (Green)
        let mut router = YieldRouter::default();
        let score = router.score_pool(
            U256::from(200_000_000u64), // $200M TVL
            U256::from(500u64),          // 5% base
            U256::from(100u64),          // 1% rewards
            U256::from(3u64),            // 3 audits
        );
        let s: u64 = score.try_into().unwrap();
        assert!(s <= 30, "Safe pool should be Green tier, got {s}");
    }

    #[test]
    fn test_score_risky_pool() {
        // Low TVL, 0 audits, high reward ratio → should score > 60 (Red)
        let mut router = YieldRouter::default();
        let score = router.score_pool(
            U256::from(500_000u64),      // $500K TVL
            U256::from(100u64),          // 1% base
            U256::from(900u64),          // 9% rewards (90%)
            U256::from(0u64),            // 0 audits
        );
        let s: u64 = score.try_into().unwrap();
        assert!(s > 60, "Risky pool should be Red tier, got {s}");
    }
}
