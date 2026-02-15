import { GeminiService } from "../lib/gemini";

async function main() {
    console.log("🧪 Testing Gemini AI Integration...");

    const prompt = "Explain the concept of 'Yield Farming' in one sentence.";
    console.log(`\n📝 Prompt: "${prompt}"`);

    const start = Date.now();
    const response = await GeminiService.generate(prompt);
    const duration = Date.now() - start;

    console.log(`\n🤖 Response (${duration}ms):`);
    console.log(response);

    if (response.includes("trouble thinking")) {
        console.error("\n❌ AI Test Failed.");
        process.exit(1);
    } else {
        console.log("\n✅ AI Test Passed.");
    }
}

main();
