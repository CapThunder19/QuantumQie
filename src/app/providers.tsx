'use client';

import React from 'react';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig, http, injected } from 'wagmi';
import { qie } from '../lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WalletBridge from '../components/WalletBridge';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  if (projectId) {
    const config = getDefaultConfig({
      appName: 'QuantumQie',
      projectId,
      chains: [qie],
      ssr: true,
    });

    return (
      <WagmiConfig config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <WalletBridge />
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiConfig>
    );
  }

  // Fallback: no WalletConnect project id — support injected wallets (MetaMask) only
  const wagmiConfig = createConfig({
    chains: [qie],
    connectors: [injected()],
    transports: {
      [qie.id]: http(),
    },
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletBridge />
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  );
}
