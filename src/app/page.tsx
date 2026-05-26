 'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WalletButton from '../components/WalletButton';
import { useAccount } from 'wagmi';

export default function LandingPage() {
  const { address } = useAccount();
  const router = useRouter();

  React.useEffect(() => {
    if (address) {
      router.replace('/game');
    }
  }, [address, router]);

  return (
    <main className="landing-root">
      <div className="landing-card">
        <h1 className="landing-title">Welcome to QuantumQie</h1>
        <p className="landing-sub">Connect your wallet to enter the Factory Hub.</p>

        <div className="landing-actions">
          <WalletButton />
          <button
            className="btn-enter"
            onClick={() => router.push('/game')}
            disabled={!address}
            style={{ marginLeft: 12 }}
          >
            Enter Factory Hub
          </button>
        </div>

        <p className="landing-note">
          You can also visit the <Link href="/workers">Worker Hub</Link>, the <Link href="/marketplace">Marketplace</Link>, or the{' '}
          <Link href="/sepolia-exchange">Sepolia Exchange</Link>.
        </p>
      </div>
    </main>
  );
}
