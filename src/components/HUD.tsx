'use client';

import React from 'react';

interface HUDProps {
  gridCol: number;
  gridRow: number;
  zoom: number;
  fps: number;
}

export default function HUD({ gridCol, gridRow, zoom, fps }: HUDProps) {
  return (
    <div className="hud">
      <div className="hud-panel">
        <span className="hud-label">POS</span>
        <span className="hud-value">
          {gridCol}, {gridRow}
        </span>
      </div>
      
      <div className="hud-panel">
        <span className="hud-label">ZOOM</span>
        <span className="hud-value">{zoom.toFixed(2)}x</span>
        
        <div className="hud-separator"></div>
        
        <span className="hud-label">FPS</span>
        <span className="hud-value" style={{ color: fps < 30 ? 'var(--accent-red)' : fps < 50 ? 'var(--accent-amber)' : 'var(--accent-cyan)' }}>
          {fps}
        </span>
      </div>
    </div>
  );
}
