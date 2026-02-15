import cron from 'node-cron';
import { db } from '../lib/db';
import { fetchProtocols, topByTvl, filterByChain } from '../lib/defillama';
import { GeminiService } from '../lib/gemini';

export function startCron() {
    console.log('⏰ Starting 6-hour crawler job...');

    // Run every 6 hours: "0 */6 * * *"
    cron.schedule('0 */6 * * *', async () => {
        console.log('🕷️ Crawling DefiLlama data...');
        try {
            // 1. Fetch Data
            const protocols = await fetchProtocols();
            const arbitrumTop = topByTvl(filterByChain(protocols, "Arbitrum"), 10);

            // 2. Save Raw Snapshot
            await db.saveSnapshot(arbitrumTop);
            console.log('💾 Snapshot saved.');

            // 3. Generate Insight
            const report = await GeminiService.generateInsight(arbitrumTop);

            // 4. Save Insight
            await db.saveInsight("6-Hour Market Update", report);
            console.log('🧠 Insight generated & saved.');

        } catch (err) {
            console.error('❌ Crawler job failed:', err);
        }
    });
}
