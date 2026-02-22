import type { PrivyClientConfig } from "@privy-io/react-auth";
import { arbitrumSepolia } from "viem/chains";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["google", "email", "wallet"],
  defaultChain: arbitrumSepolia,
  supportedChains: [arbitrumSepolia],
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
};
