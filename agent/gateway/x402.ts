/**
 * x402 Middleware
 * Intercepts value-added requests and enforces payment.
 */

export interface x402Request {
    resourceId: string; // e.g. "premium-news-analytics"
    price: {
        amount: number;
        currency: string;
        tokenAddress: string;
    };
}

/** Set X402_ENFORCE=true to block premium skills without payment. Default: false (dev mode). */
const ENFORCE = process.env.X402_ENFORCE === "true";

export class x402Middleware {

    /**
     * Check if a request requires payment and if the user/agent has authorized it.
     * @returns Payment metadata OR null if free / enforcement disabled.
     */
    static checkPaymentRequirement(skillName: string): x402Request | null {
        if (!ENFORCE) return null;

        // Configuration: Which skills are premium?
        const premiumSkills: Record<string, x402Request> = {
            "news-analytics": {
                resourceId: "news-analytics-v1",
                price: {
                    amount: 0.5,
                    currency: "USDC",
                    tokenAddress: "0x...USDC"
                }
            },
            "tutor-premium": {
                resourceId: "tutor-premium-v1",
                price: {
                    amount: 0.5,
                    currency: "USDC",
                    tokenAddress: "0x...USDC"
                }
            }
        };

        return premiumSkills[skillName] || null;
    }

    /**
     * Generates the 402 Payment Required response payload.
     */
    static generate402Response(req: x402Request) {
        return {
            status: 402,
            error: "Payment Required",
            message: `Access to ${req.resourceId} requires a payment of ${req.price.amount} ${req.price.currency}.`,
            payment_details: {
                receiver: "0x...AGENT_VAULT", // The service provider's vault
                ...req.price
            }
        };
    }
}
