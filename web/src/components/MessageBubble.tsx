"use client";

import type { ChatMessage } from "@/hooks/useAgent";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-zinc-800 text-zinc-100 rounded-bl-md"
        }`}
      >
        {!isUser && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            OpenClaw
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={i} className="font-semibold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </div>
        <div
          className={`mt-1 text-[10px] ${isUser ? "text-blue-200" : "text-zinc-500"}`}
        >
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
