"use client";

import React from 'react';

type Row = {
  save_id: string;
  score: number;
  updated_at?: string;
};

type LeaderboardProps = {
  initialRows?: Row[];
  initialError?: string | null;
};

export default function Leaderboard({ initialRows = [], initialError = null }: LeaderboardProps) {
  const [rows, setRows] = React.useState<Row[]>(initialRows);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError);

  const fetchRows = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRows([]);
        setError(data?.error ?? 'Failed to load leaderboard.');
        return;
      }
      if (Array.isArray(data?.rows)) {
        setRows(data.rows as Row[]);
        if (data.rows.length === 0) {
          setError('No registered wallets found yet.');
        }
      } else {
        setRows([]);
        setError('No leaderboard data returned.');
      }
    } catch (e) {
      setRows([]);
      setError('Failed to load leaderboard.');
      console.warn('Failed to load leaderboard', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="leaderboard-panel">
      <div className="leaderboard-header">
        <h3>Leaderboard</h3>
        <div>
          <button onClick={fetchRows} disabled={loading} className="btn">Refresh</button>
        </div>
      </div>

      <div className="leaderboard-meta">Rows: {rows.length}</div>
      {error && !loading && <div className="leaderboard-error">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ol className="leaderboard-list">
          {rows.map((r, idx) => (
            <li key={r.save_id} className="leaderboard-row">
              <span className="rank">#{idx + 1}</span>
              <span className="name">{r.save_id}</span>
              <span className="score">{r.score.toLocaleString()}</span>
            </li>
          ))}
          {rows.length === 0 && !error && <li>Click Refresh to load the leaderboard.</li>}
        </ol>
      )}
    </div>
  );
}
