"use client";

import { useState, useRef, useEffect } from "react";
import { useAgent } from "@/hooks/useAgent";
import { MessageBubble } from "./MessageBubble";
import { TrustBadge } from "./TrustBadge";
import type { UserProfile } from "./OnboardingFlow";

const AGENT_ID = Number(process.env.NEXT_PUBLIC_AGENT_ID || "1");

export function ChatWindow({
  walletAddress,
  userProfile,
}: {
  walletAddress?: string;
  userProfile?: UserProfile | null;
}) {
  const { messages, isLoading, isConnected, connect, sendMessage } =
    useAgent(walletAddress, userProfile?.userLevel);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConnected) connect();
  }, [isConnected, connect]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
            L
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              OpenClaw LionHeart
            </h2>
            <p className="text-[11px] text-zinc-400">
              DeFi Mentor &amp; Portfolio Manager
            </p>
          </div>
        </div>
        <TrustBadge agentId={AGENT_ID} />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
                L
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Welcome to LionHeart
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                I&apos;m your verifiable DeFi mentor. Ask me about markets,
                learn DeFi concepts, or let me manage your portfolio once
                I&apos;ve earned your trust.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Show me yield opportunities",
                  "Top Arbitrum protocols",
                  "Teach me about DeFi",
                  "Today's brief",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} walletAddress={walletAddress} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-3 text-sm text-zinc-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800 px-4 py-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about DeFi markets, request a lesson, or give a command..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
