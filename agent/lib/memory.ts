import { readFileSync, appendFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEMORY_PATH = join(__dirname, "..", "memory.md");

/**
 * File-based memory system — OpenClawd's learning loop.
 * Reads/writes to agent/memory.md for persistent agent learnings.
 */
export const memory = {
    read(): string {
        if (!existsSync(MEMORY_PATH)) return "";
        return readFileSync(MEMORY_PATH, "utf-8");
    },

    append(entry: string): void {
        const timestamp = new Date().toISOString();
        const line = `\n- [${timestamp}] ${entry}`;
        if (!existsSync(MEMORY_PATH)) {
            writeFileSync(MEMORY_PATH, `# Agent Memory\n${line}\n`);
        } else {
            appendFileSync(MEMORY_PATH, line + "\n");
        }
    },
};
