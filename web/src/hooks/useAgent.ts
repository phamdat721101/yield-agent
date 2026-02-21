"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  createOpenClawConnection,
  type AgentMessage,
} from "@/lib/openclaw-ws";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// "http" uses /api/agent proxy -> EC2 gateway (default, most reliable)
// "ws" uses direct WebSocket to gateway
// "mock" uses local fake responses
const AGENT_MODE = (process.env.NEXT_PUBLIC_AGENT_MODE || "http") as
  | "http"
  | "ws"
  | "mock";

function mockResponse(content: string): string {
  const lc = content.toLowerCase();
  if (lc.includes("top") && lc.includes("protocol")) {
    return `Here are the top Arbitrum protocols by TVL:\n\n1. **GMX** - $543M TVL (Derivatives)\n2. **Aave V3** - $412M TVL (Lending)\n3. **Uniswap V3** - $321M TVL (DEX)\n\nData verified with SHA-256 hash.`;
  }
  if (lc.includes("teach") || lc.includes("lesson") || lc.includes("defi")) {
    return `Welcome to **Lesson 1: What is DeFi?**\n\nDeFi replaces traditional financial intermediaries with smart contracts.\n\n**Key properties:**\n- Permissionless\n- Transparent\n- Composable\n\nSay "quiz me" to test your knowledge!`;
  }
  return `I'm OpenClaw, your DeFi mentor. Try:\n\n- "Top 5 Arbitrum protocols"\n- "Teach me about DeFi"\n- "Give me today's brief"`;
}

export function useAgent(walletAddress?: string, userLevel?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("chat_history");
      if (!raw) return [];
      return JSON.parse(raw).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch { return []; }
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const connRef = useRef<ReturnType<typeof createOpenClawConnection> | null>(
    null
  );

  const addMessage = useCallback(
    (
      role: "user" | "agent",
      content: string,
      metadata?: Record<string, unknown>
    ) => {
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            role,
            content,
            timestamp: new Date(),
            metadata,
          },
        ];
        if (typeof window !== "undefined") {
          localStorage.setItem("chat_history", JSON.stringify(next.slice(-50)));
        }
        return next;
      });
    },
    []
  );

  const connect = useCallback(() => {
    if (AGENT_MODE === "mock" || AGENT_MODE === "http") {
      setIsConnected(true);
      return;
    }

    // WebSocket mode
    connRef.current = createOpenClawConnection(
      (msg: AgentMessage) => {
        setIsLoading(false);
        addMessage("agent", msg.content, msg.metadata);
      },
      () => setIsConnected(false),
      () => setIsConnected(false)
    );
    setIsConnected(true);
  }, [addMessage]);

  const sendMessage = useCallback(
    async (content: string) => {
      addMessage("user", content);
      setIsLoading(true);

      if (AGENT_MODE === "mock") {
        setTimeout(() => {
          addMessage("agent", mockResponse(content));
          setIsLoading(false);
        }, 600);
        return;
      }

      if (AGENT_MODE === "http") {
        try {
          const res = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content, walletAddress, agentId: 1, userLevel }),
          });
          const data = await res.json();
          addMessage("agent", data.response || data.error, data.metadata);
        } catch (err: any) {
          addMessage("agent", `Connection error: ${err.message}. The agent gateway may be unreachable.`);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // WebSocket mode
      connRef.current?.send({
        type: "chat",
        content,
        walletAddress,
      });
    },
    [addMessage, walletAddress, userLevel]
  );

  const disconnect = useCallback(() => {
    connRef.current?.close();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      connRef.current?.close();
    };
  }, []);

  return {
    messages,
    isConnected,
    isLoading,
    connect,
    disconnect,
    sendMessage,
  };
}
