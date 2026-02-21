"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow, type UserProfile } from "@/components/OnboardingFlow";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [, setUserProfile] = useState<UserProfile | null>(null);

  const handleComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("userProfile", JSON.stringify(profile));
    }
    router.push("/chat");
  };

  return (
    <div className="relative">
      <OnboardingFlow onComplete={handleComplete} />

      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-6 left-0 right-0 text-center">
          <Link
            href="/chat"
            className="text-xs text-zinc-600 underline transition-colors hover:text-zinc-400"
          >
            Skip to chat (dev mode)
          </Link>
        </div>
      )}
    </div>
  );
}
