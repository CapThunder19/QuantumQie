'use client';

import React from 'react';
import { useGameStore } from '../store/gameStore';

export default function LevelUpgrade() {
  const { level, upgradeLevel, inventory } = useGameStore();

  const isMaxLevel = level >= 3;
  const upgradeCost = level === 1 ? 5000 : level === 2 ? 10000 : 0;
  const canAfford = inventory.money >= upgradeCost;

  return (
    <section className="hub-side-card level-upgrade-card">
      <div className="hub-panel-title">
        <span>Town Hall</span>
        <span className="hub-panel-subtitle">Level {level} / 3</span>
      </div>
      
      <div className="level-progress">
        <div className={`level-step ${level >= 1 ? 'active' : ''}`} />
        <div className={`level-step ${level >= 2 ? 'active' : ''}`} />
        <div className={`level-step ${level >= 3 ? 'active' : ''}`} />
      </div>

      {!isMaxLevel ? (
        <button 
          className={`btn level-upgrade-btn ${canAfford ? 'affordable' : ''}`} 
          onClick={() => upgradeLevel()} 
          disabled={!canAfford}
        >
          Upgrade (${upgradeCost.toLocaleString()})
        </button>
      ) : (
        <div className="level-maxed">Max Level Reached!</div>
      )}
    </section>
  );
}
