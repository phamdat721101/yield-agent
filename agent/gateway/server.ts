/**
 * LionHeart Agent Gateway
 *
 * HTTP + WebSocket server that routes chat messages to agent skills.
 * Runs on EC2, fronted by the Next.js API proxy.
 *
 * Endpoints:
 *   GET  /health        — health check
 *   POST /chat          — synchronous chat (JSON)
 *   WS   /ws            — WebSocket chat (streaming)
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "node:url";
import { routeMessage, type AgentResponse } from "./router.js";
import * as dotenv from "dotenv";

dotenv.config({ path: new URL("../../.env", import.meta.url).pathname });

const PORT = Number(process.env.GATEWAY_PORT || 18789);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// ── HTTP Server ──────────────────────────────────────────────────

function setCors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res: ServerResponse, status: number, data: unknown) {
  setCors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === "/health" && req.method === "GET") {
    json(res, 200, {
      status: "ok",
      agent: "LionHeart",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Chat endpoint
  if (url.pathname === "/chat" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      const { message, walletAddress, agentId } = body;

      if (!message) {
        json(res, 400, { error: "message is required" });
        return;
      }

      const result = await routeMessage(message, { walletAddress, agentId });
      json(res, 200, result);
    } catch (err: any) {
      console.error("[chat] Error:", err.message);
      json(res, 500, { error: err.message });
    }
    return;
  }

  // 404
  json(res, 404, { error: "not found" });
});

// ── WebSocket Server ─────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  console.log("[ws] Client connected");

  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type, content, walletAddress, agentId } = data;

      if (type === "chat" && content) {
        // Send "thinking" status
        ws.send(JSON.stringify({ type: "status", content: "Thinking..." }));

        const result = await routeMessage(content, { walletAddress, agentId });

        ws.send(
          JSON.stringify({
            type: "text",
            content: result.response,
            metadata: result.metadata,
          })
        );
      }
    } catch (err: any) {
      ws.send(
        JSON.stringify({ type: "error", content: err.message })
      );
    }
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
  });

  // Welcome message
  ws.send(
    JSON.stringify({
      type: "text",
      content:
        "Connected to LionHeart Agent. I'm your verifiable DeFi mentor. Ask me about markets, learn DeFi concepts, or request a daily brief.",
    })
  );
});

// ── Start ────────────────────────────────────────────────────────

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LionHeart Gateway running on http://0.0.0.0:${PORT}`);
  console.log(`  HTTP:  POST /chat, GET /health`);
  console.log(`  WS:    ws://0.0.0.0:${PORT}/ws`);
});
