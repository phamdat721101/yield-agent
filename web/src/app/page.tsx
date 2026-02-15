"use client";

import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative">
      <OnboardingFlow onComplete={() => router.push("/chat")} />

      {/* Quick-access link to chat (bypasses wallet requirement for testing) */}
      <div className="fixed bottom-6 left-0 right-0 text-center">
        <Link
          href="/chat"
          className="text-xs text-zinc-600 underline transition-colors hover:text-zinc-400"
        >
          Skip to chat (dev mode)
        </Link>
      </div>
    </div>
  );
}
