import { db } from "../lib/db";

async function main() {
    console.log("🧪 Testing Supabase Connection...");

    try {
        await db.init();

        console.log("📝 Inserting dummy insight...");
        const res = await db.saveInsight("Test Insight", "This is a test.");
        console.log("✅ Inserted:", res.rows[0]);

        console.log("✅ DB Test Passed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ DB Test Failed:", err);
        process.exit(1);
    }
}

main();
