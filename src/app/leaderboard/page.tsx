import React from 'react';
import { headers } from 'next/headers';
import Leaderboard from '../../components/Leaderboard';

type Row = {
  save_id: string;
  score: number;
  updated_at?: string;
};

async function loadLeaderboard(): Promise<{ rows: Row[]; error: string | null }> {
  try {
    const headerList = await headers();
    const host = headerList.get('host');
    if (!host) return { rows: [], error: 'Unable to determine host for leaderboard fetch.' };
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const url = `${protocol}://${host}/api/leaderboard`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { rows: [], error: data?.error ?? 'Failed to load leaderboard.' };
    }
    if (!Array.isArray(data?.rows)) {
      return { rows: [], error: 'No leaderboard data returned.' };
    }
    return { rows: data.rows as Row[], error: data.rows.length === 0 ? 'No registered wallets found yet.' : null };
  } catch (error) {
    console.warn('Leaderboard server fetch failed', error);
    return { rows: [], error: 'Failed to load leaderboard.' };
  }
}

export default async function LeaderboardPage() {
  const { rows, error } = await loadLeaderboard();

  return (
    <main className="page-content">
      <section style={{ maxWidth: 920, margin: '24px auto' }}>
        <Leaderboard initialRows={rows} initialError={error} />
      </section>
    </main>
  );
}
