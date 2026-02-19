import cron from 'node-cron';
import { db } from '../lib/db.js';
import { fetchProtocols, topByTvl, filterByChain, fetchYields, filterYieldsByChain, topYieldsByApy } from '../lib/defillama.js';
import { GeminiService } from '../lib/gemini.js';
import { createNotifier } from '../lib/notify.js';
import { runAllConnectors } from '../lib/connectors.js';
import { scorePools, type ScoredPool } from '../lib/scoring.js';

/** Previous batch of scored pools for yield-change detection */
let previousPools: ScoredPool[] = [];

interface YieldChange {
    protocol: string;
    pool_name: string;
    prev_apy: number;
    new_apy: number;
    delta: number;
}

function detectYieldChanges(current: ScoredPool[]): YieldChange[] {
    if (previousPools.length === 0) return [];
    const prevMap = new Map(previousPools.map(p => [`${p.protocol}:${p.pool_id}`, p]));
    const changes: YieldChange[] = [];

    for (const pool of current) {
        const prev = prevMap.get(`${pool.protocol}:${pool.pool_id}`);
        if (!prev) continue;
        const prevApy = prev.apy_total ?? 0;
        const newApy = pool.apy_total ?? 0;
        const delta = newApy - prevApy;
        if (Math.abs(delta) >= 0.5) {
            changes.push({
                protocol: pool.protocol,
                pool_name: pool.pool_name,
                prev_apy: prevApy,
                new_apy: newApy,
                delta: Math.round(delta * 100) / 100,
            });
        }
    }
    return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function formatBossUpdate(change: YieldChange): string {
    const direction = change.delta > 0 ? 'jumped' : 'dropped';
    const gain = Math.abs(change.delta * 100).toFixed(0);
    return `Boss, ${change.pool_name} on ${change.protocol} ${direction} from ${change.prev_apy.toFixed(1)}% to ${change.new_apy.toFixed(1)}% APY. That's ${change.delta > 0 ? '+' : '-'}$${gain}/yr per $10K. Gas: ~$0.10.`;
}

export function startCron() {
    console.log('Starting 15-min crawler job (full report every 6h)...');

    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log('[crawler] Running quick scan...');
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

            // 3. Sanitize data
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

            // 5. Save Merged Stats
            await db.saveArbitrumStats(cleanProtocols, cleanYields);
            console.log('[crawler] Arbitrum stats saved.');

            // 6. Run connectors → score → save pool snapshots
            let scored: ScoredPool[] = [];
            try {
                const pools = await runAllConnectors();
                scored = scorePools(pools);
                await db.savePoolSnapshots(scored);
                console.log(`[crawler] Pool snapshots saved: ${scored.length} pools.`);
                await db.cleanOldSnapshots();
            } catch (connErr: any) {
                console.warn('[crawler] Connector pipeline failed, continuing:', connErr.message);
            }

            // 7. Detect yield changes & send Boss Updates
            const yieldChanges = detectYieldChanges(scored);
            previousPools = scored;

            if (yieldChanges.length > 0) {
                console.log(`[crawler] Detected ${yieldChanges.length} yield changes.`);
                const notifier = createNotifier();
                if (notifier) {
                    const topChanges = yieldChanges.slice(0, 3);
                    const bossMessages = topChanges.map(formatBossUpdate).join('\n\n');
                    await notifier.send(`*Yield Sentry Alert*\n\n${bossMessages}`);
                    console.log('[crawler] Boss Update sent.');
                }
            }

            // 8. Full report every 6 hours
            const hour = new Date().getHours();
            if (hour % 6 === 0 && new Date().getMinutes() < 15) {
                console.log('[crawler] Running full 6-hour report...');

                // Generate narration
                let topOpportunities: any[] = [];
                try {
                    topOpportunities = await db.getTopOpportunities(undefined, 5);
                } catch { /* ignore */ }

                try {
                    const narration = await GeminiService.generateNarration(yieldChanges, topOpportunities);
                    await db.saveNarration(narration, yieldChanges);
                    console.log('[crawler] Narration saved.');
                } catch (err: any) {
                    console.warn('[crawler] Narration generation failed:', err.message);
                }

                // Generate insight
                const mergedData = { protocols: arbitrumTop, yields: arbitrumYields, topOpportunities };
                const report = await GeminiService.generateInsight(mergedData);
                await db.saveInsight("6-Hour Market Update", report);
                console.log('[crawler] Insight generated & saved.');

                // Comprehensive notification
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
                        `*Yield Sentry 6h Report*\n\nTop gainers (24h): ${summary}\n\nProtocols tracked: ${arbitrumTop.length}\nPools scored: ${scored.length}`
                    );
                    console.log('[crawler] 6h notification sent.');
                }
            }

        } catch (err) {
            console.error('[crawler] Job failed:', err);
        }
    });
}
