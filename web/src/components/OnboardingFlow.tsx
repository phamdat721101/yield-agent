"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { WalletConnect } from "./WalletConnect";
import { useWriteContract } from "wagmi";
import { simulateContract } from "@wagmi/core";
import { config } from "@/lib/wagmi-config";
import { IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_ABI } from "@/lib/contracts";

export interface UserProfile {
  userLevel: "newbie" | "intermediate" | "advanced";
  agentStyle: "yield_sentry" | "defi_researcher" | "btcfi_hunter" | "stable_guardian";
  minApy: number;
  protocols: string[];
}

type WizardStep = "connect" | "level" | "style" | "rules" | "launch";

const DEFAULT_PROFILE: UserProfile = {
  userLevel: "intermediate",
  agentStyle: "yield_sentry",
  minApy: 1.5,
  protocols: ["aave-v3", "dolomite", "pendle"],
};

const PROTOCOL_OPTIONS = [
  { id: "aave-v3", label: "Aave V3", emoji: "👻", risk: "Safe" },
  { id: "dolomite", label: "Dolomite", emoji: "💎", risk: "Safe" },
  { id: "pendle", label: "Pendle", emoji: "🌀", risk: "Moderate" },
  { id: "camelot", label: "Camelot", emoji: "⚔️", risk: "Moderate" },
  { id: "gmx", label: "GMX", emoji: "📊", risk: "Moderate" },
  { id: "morpho", label: "Morpho", emoji: "🔵", risk: "Safe" },
];

export function OnboardingFlow({
  onComplete,
}: {
  onComplete: (profile: UserProfile) => void;
}) {
  const { isConnected, address } = useWallet();
  const [step, setStep] = useState<WizardStep>("connect");
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const { writeContractAsync } = useWriteContract();

  // When wallet connects, check for existing profile
  useEffect(() => {
    if (!isConnected || !address) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/onboarding?wallet=${address}`);
        const data = await res.json();
        if (data.profile) {
          const p: UserProfile = {
            userLevel: data.profile.user_level,
            agentStyle: data.profile.agent_style,
            minApy: Number(data.profile.min_apy_threshold),
            protocols: data.profile.whitelisted_protocols,
          };
          setProfile(p);
          onComplete(p); // auto-redirect immediately for return visitors
        } else {
          setStep("level");
        }
      } catch {
        setStep("level");
      }
    };
    check();
  }, [isConnected, address]);

  const saveAndComplete = async (finalProfile: UserProfile) => {
    if (!address) return;
    setIsSaving(true);
    let tokenId: number | null = null;

    try {
      const agentURI = `data:application/json;base64,${btoa(JSON.stringify({
        name: `${finalProfile.agentStyle} Agent`,
        level: finalProfile.userLevel,
        style: finalProfile.agentStyle,
        protocols: finalProfile.protocols,
        min_apy: finalProfile.minApy,
        owner: address,
      }))}`;
      const { result } = await simulateContract(config, {
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [agentURI],
        account: address as `0x${string}`,
      });
      tokenId = Number(result);
      await writeContractAsync({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [agentURI],
      });
    } catch (err: any) {
      console.warn("[onboarding] mint skipped:", err.message);
      // Non-fatal — user can mint later via chat
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("userProfile", JSON.stringify(finalProfile));
      if (tokenId) localStorage.setItem("agentTokenId", String(tokenId));
    }
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_addr: address,
          user_level: finalProfile.userLevel,
          agent_style: finalProfile.agentStyle,
          risk_tolerance: "moderate",
          focus_assets: ["USDC", "USDT"],
          min_apy_threshold: finalProfile.minApy,
          whitelisted_protocols: finalProfile.protocols,
          agent_token_id: tokenId,
        }),
      });
    } catch {
      // localStorage is the fallback
    }
    setIsSaving(false);
    onComplete(finalProfile);
  };

  // ── Step: Connect ──────────────────────────────────────────────
  if (step === "connect" || !isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md w-full text-center px-4">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
            L
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">LionHeart</h1>
          <p className="mb-2 text-sm text-zinc-400">The Verifiable DeFi Mentor</p>
          <p className="mb-8 text-xs text-zinc-500">
            Connect your wallet to set up your personal AI DeFi agent.
          </p>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Level ───────────────────────────────────────────────
  if (step === "level") {
    const levels = [
      {
        id: "newbie" as const,
        emoji: "🌱",
        title: "Newbie",
        desc: "New to DeFi",
        detail: "Safe pools only",
        border: "border-green-500",
        bg: "bg-green-500/10",
      },
      {
        id: "intermediate" as const,
        emoji: "📈",
        title: "Intermediate",
        desc: "Used Aave/Uni",
        detail: "APY & IL basics",
        border: "border-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        id: "advanced" as const,
        emoji: "⚡",
        title: "Advanced",
        desc: "Pendle, Loops",
        detail: "Full metrics",
        border: "border-purple-500",
        bg: "bg-purple-500/10",
      },
    ];

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-lg w-full px-4">
          <StepIndicator current={1} total={4} />
          <h2 className="mb-2 text-xl font-bold text-white text-center">What&apos;s your DeFi level?</h2>
          <p className="mb-6 text-sm text-zinc-400 text-center">This helps your agent explain things at the right level.</p>
          <div className="grid grid-cols-3 gap-3">
            {levels.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setProfile((p) => ({ ...p, userLevel: l.id }));
                  setStep("style");
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all hover:scale-105 ${l.border} ${l.bg}`}
              >
                <span className="text-3xl">{l.emoji}</span>
                <span className="text-sm font-semibold text-white">{l.title}</span>
                <span className="text-xs text-zinc-400">{l.desc}</span>
                <span className="text-xs text-zinc-500">{l.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Style ───────────────────────────────────────────────
  if (step === "style") {
    const styles = [
      {
        id: "yield_sentry" as const,
        emoji: "🛡️",
        title: "Yield Sentry",
        tagline: "Silent 24/7 guardian",
        desc: "Conservative · Stables",
      },
      {
        id: "defi_researcher" as const,
        emoji: "🔬",
        title: "DeFi Researcher",
        tagline: "Your personal analyst",
        desc: "Moderate · All assets",
      },
      {
        id: "btcfi_hunter" as const,
        emoji: "₿",
        title: "BTCFi Hunter",
        tagline: "Best yield for Bitcoin",
        desc: "Moderate · wBTC/tBTC",
      },
      {
        id: "stable_guardian" as const,
        emoji: "🏦",
        title: "Stable Guardian",
        tagline: "Zero depeg tolerance",
        desc: "Conservative · Stables",
      },
    ];

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-lg w-full px-4">
          <StepIndicator current={2} total={4} />
          <h2 className="mb-2 text-xl font-bold text-white text-center">Choose your agent style</h2>
          <p className="mb-6 text-sm text-zinc-400 text-center">Your agent&apos;s personality and strategy.</p>
          <div className="grid grid-cols-2 gap-3">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setProfile((p) => ({ ...p, agentStyle: s.id }));
                  setStep("rules");
                }}
                className="flex flex-col items-start gap-1 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-left transition-all hover:border-blue-500 hover:bg-zinc-800"
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-sm font-semibold text-white">{s.title}</span>
                <span className="text-xs text-zinc-400 italic">&ldquo;{s.tagline}&rdquo;</span>
                <span className="text-xs text-zinc-500">{s.desc}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("level")} className="mt-4 w-full text-xs text-zinc-500 hover:text-white">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Rules ───────────────────────────────────────────────
  if (step === "rules") {
    const toggle = (id: string) => {
      setProfile((p) => ({
        ...p,
        protocols: p.protocols.includes(id)
          ? p.protocols.filter((x) => x !== id)
          : [...p.protocols, id],
      }));
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-lg w-full px-4">
          <StepIndicator current={3} total={4} />
          <h2 className="mb-2 text-xl font-bold text-white text-center">Configure your rules</h2>
          <p className="mb-6 text-sm text-zinc-400 text-center">Your agent follows these rules strictly.</p>

          {/* APY Slider */}
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="mb-2 block text-sm font-medium text-white">
              Minimum APY: <span className="text-blue-400">{profile.minApy.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={profile.minApy}
              onChange={(e) => setProfile((p) => ({ ...p, minApy: Number(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              ${((profile.minApy / 100) * 10000).toFixed(0)}/yr on $10,000
            </p>
          </div>

          {/* Protocol Whitelist */}
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-3 text-sm font-medium text-white">Whitelisted protocols</p>
            <div className="grid grid-cols-2 gap-2">
              {PROTOCOL_OPTIONS.map((opt) => {
                const checked = profile.protocols.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      checked
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <span className={`h-3 w-3 flex-shrink-0 rounded-sm border ${checked ? "border-blue-500 bg-blue-500" : "border-zinc-500"}`} />
                    <span>{opt.emoji} {opt.label}</span>
                    <span className="ml-auto text-zinc-500">{opt.risk}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setStep("launch")}
            className="w-full rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-500"
          >
            Next →
          </button>
          <button onClick={() => setStep("style")} className="mt-3 w-full text-xs text-zinc-500 hover:text-white">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Launch ──────────────────────────────────────────────
  const styleLabels: Record<string, string> = {
    yield_sentry: "🛡️ Yield Sentry",
    defi_researcher: "🔬 DeFi Researcher",
    btcfi_hunter: "₿ BTCFi Hunter",
    stable_guardian: "🏦 Stable Guardian",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="max-w-md w-full px-4">
        <StepIndicator current={4} total={4} />
        <h2 className="mb-6 text-xl font-bold text-white text-center">Your agent is ready</h2>
        <div className="mb-6 rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
          <Row label="Level" value={profile.userLevel} />
          <Row label="Style" value={styleLabels[profile.agentStyle]} />
          <Row label="Min APY" value={`${profile.minApy}%`} />
          <Row label="Protocols" value={profile.protocols.join(", ")} />
        </div>
        <button
          onClick={() => saveAndComplete(profile)}
          disabled={isSaving}
          className="w-full rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSaving ? "Registering on-chain..." : "Mint My Agent NFT"}
        </button>
        <button onClick={() => setStep("rules")} className="mt-3 w-full text-xs text-zinc-500 hover:text-white">
          ← Back
        </button>
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 <= current ? "w-8 bg-blue-500" : "w-4 bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs text-right font-medium text-white capitalize">{value}</span>
    </div>
  );
}
