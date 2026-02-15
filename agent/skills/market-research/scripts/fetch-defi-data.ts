/**
 * Market Research script — fetches DeFi data from DefiLlama
 *
 * Usage:
 *   tsx fetch-defi-data.ts --query "top 5 arbitrum protocols"
 *   tsx fetch-defi-data.ts --chain arbitrum --top 5
 */

import { fetchProtocols, filterByChain, topByTvl, type Protocol } from "../../lib/defillama.js";
import { sha256 } from "../../lib/ipfs.js";

interface ResearchResult {
  summary: string;
  data: Array<{
    name: string;
    tvl: number;
    change_1d: number | null;
    category: string;
  }>;
  dataHash: string;
  source: string;
  timestamp: string;
}

async function main() {
  const args = process.argv.slice(2);
  const chainIdx = args.indexOf("--chain");
  const topIdx = args.indexOf("--top");
  const queryIdx = args.indexOf("--query");

  let chain = chainIdx >= 0 ? args[chainIdx + 1] : "arbitrum";
  let topN = topIdx >= 0 ? parseInt(args[topIdx + 1], 10) : 5;

  // Parse natural language query if provided
  if (queryIdx >= 0) {
    const query = args.slice(queryIdx + 1).join(" ").toLowerCase();
    const chainMatch = query.match(/(?:on\s+)?(\w+)(?:\s+protocols?)?/);
    const numMatch = query.match(/top\s+(\d+)/);
    if (chainMatch) chain = chainMatch[1];
    if (numMatch) topN = parseInt(numMatch[1], 10);
  }

  console.log(`Fetching top ${topN} protocols on ${chain}...`);

  const allProtocols = await fetchProtocols();
  const chainProtocols = filterByChain(allProtocols, chain);
  const top = topByTvl(chainProtocols, topN);

  const rawJson = JSON.stringify(top);
  const hash = sha256(rawJson);

  const data = top.map((p) => ({
    name: p.name,
    tvl: Math.round(p.tvl),
    change_1d: p.change_1d,
    category: p.category,
  }));

  const summaryLines = data.map(
    (p, i) => `${i + 1}. ${p.name} — $${(p.tvl / 1e6).toFixed(1)}M TVL (${p.category})`
  );

  const result: ResearchResult = {
    summary: `Top ${topN} ${chain} protocols by TVL:\n${summaryLines.join("\n")}`,
    data,
    dataHash: `sha256:${hash}`,
    source: "defillama",
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
