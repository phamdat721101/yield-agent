"use client";

import { createConfig } from "@privy-io/wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { http } from "wagmi";

export const config = createConfig({
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});
