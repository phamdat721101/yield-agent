# Tutor Mode

## Description
Interactive DeFi education with curriculum-based lessons, quizzes, and progressive difficulty. Premium content is gated via x402 (HTTP 402 payment).

## Trigger
- "Teach me about DeFi"
- "What is impermanent loss?"
- "Quiz me on AMMs"
- "Start lesson 3"

## Curriculum
See `references/defi-curriculum.md` for the full curriculum outline.

### Free Tier (Lessons 1-3)
1. What is DeFi? — Centralized vs Decentralized Finance
2. Wallets & Tokens — ERC-20, gas, transactions
3. DEXs & AMMs — Uniswap, constant product formula

### Premium Tier (Lessons 4-8, 0.50 USDC via x402)
4. Lending & Borrowing — Aave, Compound, liquidations
5. Yield Farming — LP tokens, APY vs APR, compounding
6. Impermanent Loss — Math, mitigation, real examples
7. Bridges & Cross-chain — How bridges work, risks
8. Advanced DeFi — Flash loans, MEV, governance

## Steps
1. Identify which lesson/topic the user is asking about
2. Check if the content is premium (lesson >= 4)
3. If premium, verify x402 payment or return 402 with payment details
4. Deliver the lesson content with interactive examples
5. After each lesson, offer a 3-question quiz
6. Track progress and suggest next lesson

## Quiz Format
```
Q: In a constant product AMM (x * y = k), what happens to the price of token Y when you buy a large amount of token X?
A) Price of Y decreases
B) Price of Y increases  ✓
C) Price of Y stays the same
D) The pool is drained
```
