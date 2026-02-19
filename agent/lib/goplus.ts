/**
 * GoPlus Security API client — token risk scoring on Arbitrum.
 * Free API, no key needed. https://docs.gopluslabs.io/
 */

export interface TokenRisk {
  riskPoints: number; // 0-40
  details: Record<string, string>;
}

const ARBITRUM_CHAIN_ID = '42161';
const DEFAULT_RISK: TokenRisk = { riskPoints: 20, details: { note: 'default — lookup failed' } };

export async function fetchTokenRisk(address: string): Promise<TokenRisk> {
  try {
    const url = `https://api.gopluslabs.io/api/v1/token_security/${ARBITRUM_CHAIN_ID}?contract_addresses=${address}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return DEFAULT_RISK;

    const json = await res.json();
    const data = json.result?.[address.toLowerCase()];
    if (!data) return DEFAULT_RISK;

    let points = 0;
    const details: Record<string, string> = {};

    if (data.is_honeypot === '1') {
      points += 40;
      details.honeypot = 'true';
    }

    if (data.is_open_source === '0') {
      points += 10;
      details.closed_source = 'true';
    }

    const buyTax = parseFloat(data.buy_tax || '0');
    if (buyTax > 0.05) {
      points += Math.min(15, Math.round(buyTax * 100));
      details.buy_tax = `${(buyTax * 100).toFixed(1)}%`;
    }

    const sellTax = parseFloat(data.sell_tax || '0');
    if (sellTax > 0.05) {
      points += Math.min(15, Math.round(sellTax * 100));
      details.sell_tax = `${(sellTax * 100).toFixed(1)}%`;
    }

    return { riskPoints: Math.min(40, points), details };
  } catch {
    return DEFAULT_RISK;
  }
}
