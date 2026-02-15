import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || "");

async function main() {
    console.log("Fetching models...");

    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-1.5-flash-latest"
    ];

    for (const m of models) {
        try {
            console.log(`\nAttempting '${m}'...`);
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent("Hello");
            console.log(`✅ SUCCESS with '${m}':`, res.response.text());
            break;
        } catch (e: any) {
            console.log(`❌ FAILED '${m}':`, e.message.split('\n')[0]);
        }
    }
}

main();
