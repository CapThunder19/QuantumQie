 'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getWorkerCost, useGameStore } from '../../store/gameStore';
import { getBuildingDef } from '../../game/buildings';
import { loadBuildings } from '../../game/persistence';
import './workers.css';
import PixelArt from '../../components/PixelArt';

export default function WorkersPage() {
  const { address } = useAccount();
  const router = useRouter();
  const { inventory, workers, buyWorker, hydrateFromSupabase, isHydrated, isHydrating } = useGameStore();
  const [storageLoading, setStorageLoading] = React.useState(true);
  const [storageList, setStorageList] = React.useState<{ total: number; items: { id: string; name: string; count: number }[] }>(
    { total: 0, items: [] }
  );

  React.useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address, router]);

  React.useEffect(() => {
    const loadHubData = async () => {
      await hydrateFromSupabase();

      const buildings = await loadBuildings();
      const counts = new Map<string, number>();

      for (const building of buildings) {
        counts.set(building.defId, (counts.get(building.defId) ?? 0) + 1);
      }

      const items = Array.from(counts.entries())
        .map(([id, count]) => {
          const def = getBuildingDef(id);
          return { id, name: def?.name ?? id, count };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setStorageList({ total: buildings.length, items });
      setStorageLoading(false);
    };

    void loadHubData();
  }, [hydrateFromSupabase]);

  if (!isHydrated && isHydrating) {
    return (
      <div className="workers-page">
        <h1 className="page-title">Factory Navigation</h1>
        <p className="empty-roster">Loading factory data...</p>
      </div>
    );
  }

  const handleBuyFarmer = () => buyWorker('farmer');
  const handleBuyMiner = () => buyWorker('miner');
  const availableWorkers = workers.filter((worker) => !worker.assignedBuildingId);
  const farmerCost = getWorkerCost('farmer', workers);
  const minerCost = getWorkerCost('miner', workers);

  return (
    <div className="workers-page">
      <div className="workers-header">
        <PixelArt scale={6} />
      </div>
      <h1 className="page-title">Factory Navigation</h1>

      <div className="dashboard-grid">
        {/* Shop Section */}
        <section className="dashboard-card shop-card">
          <h2>Hiring Bay</h2>
          <div className="shop-grid">
            <div className="shop-item">
              <div className="shop-icon farmer-icon">👨‍🌾</div>
              <div className="shop-info">
                <h3>Farmer</h3>
                <p>Produces Wheat, Potato, Rice at Farms</p>
                <button 
                  className="buy-btn" 
                  onClick={handleBuyFarmer}
                  disabled={inventory.money < farmerCost}
                >
                  Buy for ${farmerCost.toLocaleString()}
                </button>
              </div>
            </div>
            
            <div className="shop-item">
              <div className="shop-icon miner-icon">⛏️</div>
              <div className="shop-info">
                <h3>Miner</h3>
                <p>Extracts Ores at Mines</p>
                <button 
                  className="buy-btn" 
                  onClick={handleBuyMiner}
                  disabled={inventory.money < minerCost}
                >
                  Buy for ${minerCost.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Available Workers */}
        <section className="dashboard-card available-card">
          <h2>Available Workers ({availableWorkers.length})</h2>
          {availableWorkers.length === 0 ? (
            <p className="empty-roster">No idle workers right now.</p>
          ) : (
            <ul className="worker-list">
              {availableWorkers.map((w) => (
                <li key={w.id} className="worker-list-item">
                  <div className="worker-type">
                    {w.type === 'farmer' ? '👨‍🌾 Farmer' : '⛏️ Miner'}
                  </div>
                  <div className="worker-status idle">Available</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Storage Houses */}
        <section className="dashboard-card storage-card">
          <h2>Storage Houses ({storageList.total})</h2>
          {storageLoading ? (
            <p className="empty-roster">Loading storage list...</p>
          ) : storageList.items.length === 0 ? (
            <p className="empty-roster">No farms or mines placed yet.</p>
          ) : (
            <ul className="storage-list">
              {storageList.items.map((item) => (
                <li key={item.id} className="storage-item">
                  <span className="storage-name">{item.name}</span>
                  <span className="storage-count">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Roster Section */}
        <section className="dashboard-card roster-card">
          <h2>Workers ({workers.length})</h2>
          {workers.length === 0 ? (
            <p className="empty-roster">You have no workers yet. Buy some from the shop!</p>
          ) : (
            <ul className="worker-list worker-list-scroll">
              {workers.map((w) => (
                <li key={w.id} className="worker-list-item">
                  <div className="worker-type">
                    {w.type === 'farmer' ? '👨‍🌾 Farmer' : '⛏️ Miner'}
                  </div>
                  <div className={`worker-status ${w.assignedBuildingId ? 'assigned' : 'idle'}`}>
                    {w.assignedBuildingId ? 'Working on Grid' : 'Idle (Waiting for assignment)'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
