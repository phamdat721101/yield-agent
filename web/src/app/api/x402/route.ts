import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Payment Gate — returns HTTP 402 for premium content
 *
 * In production, this integrates with @x402/server to verify
 * payment receipts. For now, it acts as a stub that checks
 * for a payment header.
 */

const PREMIUM_PRICE_USDC = "0.50";

export async function GET(req: NextRequest) {
  const paymentReceipt = req.headers.get("X-Payment-Receipt");

  if (!paymentReceipt) {
    return NextResponse.json(
      {
        error: "Payment required",
        price: PREMIUM_PRICE_USDC,
        currency: "USDC",
        description: "Premium DeFi curriculum content (Lessons 4-8)",
        paymentInstructions: {
          method: "x402",
          recipient: process.env.PAYMENT_RECIPIENT || "0x0000000000000000000000000000000000000000",
          amount: PREMIUM_PRICE_USDC,
          network: "arbitrum-sepolia",
        },
      },
      { status: 402 }
    );
  }

  // In production: verify the payment receipt on-chain
  // For now, any receipt header grants access
  return NextResponse.json({
    access: true,
    content: "premium",
    lessons: [4, 5, 6, 7, 8],
    message: "Premium content unlocked. Ask about any lesson 4-8.",
  });
}
