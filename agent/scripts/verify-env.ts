import dotenv from 'dotenv';
import https from 'https';

// Load env from correct path (assuming running from agent dir or with correct cwd)
dotenv.config();

const key = process.env.GEMINI_KEY;

console.log("--- Environment Check ---");
if (!key) {
    console.error("❌ GEMINI_KEY is missing or empty.");
} else {
    console.log(`✅ GEMINI_KEY is present (Length: ${key.length})`);
    console.log(`Prefix: ${key.substring(0, 4)}...`);
}

console.log("\n--- Raw API ListModels Check ---");
if (key) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            if (res.statusCode === 200) {
                const json = JSON.parse(data);
                console.log("✅ Models found:");
                json.models?.forEach((m: any) => {
                    if (m.name.includes("gemini")) {
                        console.log(` - ${m.name} (${m.supportedGenerationMethods?.join(', ')})`);
                    }
                });
            } else {
                console.error("❌ API Request Failed:");
                console.error(data);
            }
        });
    }).on('error', (err) => {
        console.error("❌ Network Error:", err.message);
    });
}
