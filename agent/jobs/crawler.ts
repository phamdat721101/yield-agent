import cron from 'node-cron';
import { db } from '../lib/db.js';
import { fetchProtocols, topByTvl, filterByChain, fetchYields, filterYieldsByChain, topYieldsByApy } from '../lib/defillama.js';
import { GeminiService } from '../lib/gemini.js';
import { createNotifier } from '../lib/notify.js';
import { runAllConnectors } from '../lib/connectors.js';
import { scorePools } from '../lib/scoring.js';

export function startCron() {
    console.log('Starting 6-hour crawler job...');

    // Run every 6 hours: "0 */6 * * *"
    cron.schedule('0 */6 * * *', async () => {
        console.log('[crawler] Running...');
        try {
            // 1. Fetch Protocol Data
            const protocols = await fetchProtocols();
            const arbitrumTop = topByTvl(filterByChain(protocols, "Arbitrum"), 10);

            // 2. Fetch Yield Data
            let arbitrumYields: any[] = [];
            try {
                const allYields = await fetchYields();
                arbitrumYields = topYieldsByApy(filterYieldsByChain(allYields, "Arbitrum"), 10);
            } catch (err) {
                console.warn('[crawler] Yields fetch failed, continuing without:', err);
            }

            // 3. Sanitize data (strip huge DefiLlama fields to what dashboard needs)
            const cleanProtocols = arbitrumTop.map((p: any) => ({
                name: p.name, symbol: p.symbol, chain: p.chain,
                tvl: p.tvl, change_1d: p.change_1d, change_7d: p.change_7d,
                category: p.category,
            }));
            const cleanYields = arbitrumYields.map((y: any) => ({
                project: y.project, symbol: y.symbol, chain: y.chain,
                apy: y.apy, apyBase: y.apyBase, apyReward: y.apyReward,
                tvlUsd: y.tvlUsd, pool: y.pool,
            }));

            // 4. Save Raw Snapshot
            await db.saveSnapshot(cleanProtocols);
            console.log('[crawler] Snapshot saved.');

            // 5. Save Merged Stats (protocols + yields)
            await db.saveArbitrumStats(cleanProtocols, cleanYields);
            console.log('[crawler] Arbitrum stats saved.');

            // 6. Run protocol connectors → score → save pool snapshots
            try {
                const pools = await runAllConnectors();
                const scored = scorePools(pools);
                await db.savePoolSnapshots(scored);
                console.log(`[crawler] Pool snapshots saved: ${scored.length} pools.`);
                await db.cleanOldSnapshots();
            } catch (connErr: any) {
                console.warn('[crawler] Connector pipeline failed, continuing:', connErr.message);
            }

            // 7. Generate Insight (enriched with top scored opportunities)
            let topOpportunities: any[] = [];
            try {
                topOpportunities = await db.getTopOpportunities(undefined, 5);
            } catch { /* ignore — DB may not have snapshots yet */ }
            const mergedData = { protocols: arbitrumTop, yields: arbitrumYields, topOpportunities };
            const report = await GeminiService.generateInsight(mergedData);

            // 8. Save Insight
            await db.saveInsight("6-Hour Market Update", report);
            console.log('[crawler] Insight generated & saved.');

            // 9. Send notification if configured
            const notifier = createNotifier();
            if (notifier) {
                const topGainers = arbitrumTop
                    .filter((p: any) => p.change_1d && p.change_1d > 0)
                    .sort((a: any, b: any) => (b.change_1d || 0) - (a.change_1d || 0))
                    .slice(0, 3);
                const summary = topGainers.length > 0
                    ? topGainers.map((p: any) => `${p.name}: +${p.change_1d?.toFixed(1)}%`).join(", ")
                    : "No gainers in this period";
                await notifier.send(
                    `*LionHeart Market Update*\n\nTop gainers (24h): ${summary}\n\nTotal protocols tracked: ${arbitrumTop.length}`
                );
                console.log('[crawler] Notification sent.');
            }

        } catch (err) {
            console.error('[crawler] Job failed:', err);
        }
    });
}
