"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI } from "@/lib/contracts";
import type { ChatMessage } from "@/hooks/useAgent";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageBubble({
  message,
  walletAddress,
}: {
  message: ChatMessage;
  walletAddress?: string;
}) {
  const isUser = message.role === "user";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mintState, setMintState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [mintTokenId, setMintTokenId] = useState<number | null>(null);
  const [mintError, setMintError] = useState("");
  const [execState, setExecState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const { writeContractAsync } = useWriteContract();

  const isMintAction = !isUser && (message.metadata?.tool_result as any)?.type === "mint-erc8004";
  const mintAgentURI = (message.metadata?.tool_result as any)?.agentURI as string | undefined;

  const isExecuteTx = !isUser && (message.metadata?.tool_result as any)?.type === "execute-tx";
  const executeTxData = (message.metadata?.tool_result as any);

  const handleMint = async () => {
    if (!mintAgentURI || !walletAddress) return;
    if (IDENTITY_REGISTRY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setMintError("Contract address not configured. Check NEXT_PUBLIC_IDENTITY_REGISTRY.");
      setMintState("error");
      return;
    }
    setMintState("pending");
    setMintError("");
    try {
      await writeContractAsync({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [mintAgentURI],
      });
      setMintTokenId(null);
      setMintState("done");
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_addr: walletAddress }),
      }).catch(() => {});
    } catch (err: any) {
      setMintError(err.shortMessage || err.message || "Transaction rejected");
      setMintState("error");
    }
  };

  const handleExecuteTx = async () => {
    if (!executeTxData?.contractAddress || !walletAddress) return;
    setExecState("pending");
    try {
      await writeContractAsync({
        address: executeTxData.contractAddress,
        abi: [
          {
            name: executeTxData.functionName,
            type: "function",
            inputs: [
              { name: "asset", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [],
            stateMutability: "nonpayable",
          },
        ],
        functionName: executeTxData.functionName,
        args: executeTxData.args,
      });
      setExecState("done");
    } catch (err: any) {
      console.warn("[execute-tx] failed:", err.message);
      setExecState("error");
    }
  };

  // Detect HTML dashboard content
  const isHtml =
    !isUser &&
    (message.content.trimStart().toLowerCase().startsWith("<!doctype") ||
      message.content.trimStart().startsWith("<html"));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: message.content,
          title: `Yield Dashboard — ${new Date().toLocaleDateString("en-US")}`,
          wallet: walletAddress || null,
        }),
      });
      setSaved(true);
    } catch {
      // Fail silently — dashboard still visible
    } finally {
      setSaving(false);
    }
  };

  if (isHtml) {
    return (
      <div className="w-full">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          OpenClaw — Dashboard
        </div>
        <iframe
          srcDoc={message.content}
          className="w-full rounded-xl border border-zinc-700"
          style={{ height: "600px" }}
          sandbox="allow-scripts"
          title="Yield Dashboard"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
          <button
            onClick={handleSave}
            disabled={saved || saving}
            className="text-xs text-zinc-400 hover:text-white disabled:opacity-50 cursor-pointer transition-colors"
          >
            {saved ? "✓ Saved to Library" : saving ? "Saving..." : "+ Save to Library"}
          </button>
        </div>
      </div>
    );
  }

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
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose-invert prose-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:mb-0.5 [&_p]:mb-2 [&_strong]:font-semibold [&_code]:bg-zinc-700 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-zinc-700 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_a]:text-blue-400 [&_a]:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
        {isMintAction && mintState === "idle" && (
          <button
            onClick={handleMint}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Confirm Registration
          </button>
        )}
        {isMintAction && mintState === "pending" && (
          <div className="mt-3 text-xs text-zinc-400">Registering on-chain...</div>
        )}
        {isMintAction && mintState === "done" && (
          <div className="mt-3 text-xs text-green-400">
            Agent registered! Token ID: #{mintTokenId}
          </div>
        )}
        {isMintAction && mintState === "error" && (
          <div className="mt-3 space-y-1">
            <div className="text-xs text-red-400">{mintError || "Registration failed or cancelled."}</div>
            <button onClick={handleMint} className="text-xs text-zinc-400 underline">Try again</button>
          </div>
        )}
        {isExecuteTx && execState === "idle" && (
          <button
            onClick={handleExecuteTx}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Execute
          </button>
        )}
        {isExecuteTx && execState === "pending" && (
          <div className="mt-3 text-xs text-zinc-400">Submitting transaction...</div>
        )}
        {isExecuteTx && execState === "done" && (
          <div className="mt-3 text-xs text-green-400">Transaction submitted!</div>
        )}
        {isExecuteTx && execState === "error" && (
          <div className="mt-3 space-y-1">
            <div className="text-xs text-red-400">Transaction failed or cancelled.</div>
            <button onClick={handleExecuteTx} className="text-xs text-zinc-400 underline">Try again</button>
          </div>
        )}
        <div
          className={`mt-1 text-[10px] ${isUser ? "text-blue-200" : "text-zinc-500"}`}
        >
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
