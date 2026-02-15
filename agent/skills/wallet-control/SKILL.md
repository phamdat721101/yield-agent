# Wallet Control

## Description
Reputation-gated transaction execution. The agent can propose and execute on-chain transactions only after achieving a reputation score >= 100. All transactions are simulated before execution, and the user must approve each one.

## Trigger
- "Swap 100 USDC for ETH"
- "Deposit into Aave"
- "Execute the trade we discussed"

## Gate
- Requires: reputation score >= 100 (via ReputationRegistry.getSummary)
- If score is below threshold, explain why and suggest how the user can help build trust

## Steps
1. Check agent's reputation score on-chain
2. If score < 100, return gating message
3. Parse the user's requested action (swap, deposit, withdraw, etc.)
4. Build the transaction calldata
5. Simulate via `eth_call` to check for revert
6. Present the transaction summary to the user for approval:
   - Action, token amounts, estimated gas, contract being called
7. On approval, submit the transaction
8. Return tx hash and explorer link

## Safety
- Maximum value per transaction: configurable, default 100 USDC equivalent
- Always simulate before executing
- Never execute without explicit user approval
- Log all transactions with trust-stamp for audit trail

## Output Format
```json
{
  "action": "swap",
  "status": "proposed",
  "details": {
    "from": "100 USDC",
    "to": "~0.04 ETH",
    "estimatedGas": "150000",
    "contract": "0x..."
  },
  "requiresApproval": true
}
```
