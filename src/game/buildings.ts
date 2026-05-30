// ── Building Definitions & Procedural Rendering ──────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface BuildingDef {
  id: string;
  name: string;
  size: number; // NxN tiles
  color: string; // primary fill color
  accentColor: string; // detail/icon color
  hotkey: string; // '1' through '8'
  description: string;
  cost: number;
}

export interface PlacedBuilding {
  id: string; // unique instance id
  defId: string; // references BuildingDef.id
  col: number; // grid column (top-left corner)
  row: number; // grid row (top-left corner)
  direction: Direction;
  assignedWorkerId: string | null;
  productionProgress: number; // 0 to 100
  readyToHarvest: boolean;
}

type SpriteCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// ── 8 Building Definitions ───────────────────────────────────────────────────

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'farm-wheat',
    name: 'Carrot Farm',
    size: 3,
    color: '#7b6a2e',
    accentColor: '#f5d06a',
    hotkey: '1',
    description: 'Grows carrots for food and trade',
    cost: 40,
  },
  {
    id: 'farm-potato',
    name: 'Rice Farm',
    size: 3,
    color: '#5a3f24',
    accentColor: '#d7b58c',
    hotkey: '2',
    description: 'Grows rice for staples',
    cost: 50,
  },
  {
    id: 'farm-rice',
    name: 'Cabbage Farm',
    size: 3,
    color: '#214a3e',
    accentColor: '#b9f4c8',
    hotkey: '3',
    description: 'Grows cabbage in wet fields',
    cost: 60,
  },
  {
    id: 'mine-copper',
    name: 'Copper Mine',
    size: 3,
    color: '#7a3f1f',
    accentColor: '#f0a24a',
    hotkey: '4',
    description: 'Extracts copper ore',
    cost: 90,
  },
  {
    id: 'mine-iron',
    name: 'Iron Mine',
    size: 3,
    color: '#4a4f5a',
    accentColor: '#c2c7d2',
    hotkey: '5',
    description: 'Extracts iron ore',
    cost: 110,
  },
  {
    id: 'mine-diamond',
    name: 'Diamond Mine',
    size: 3,
    color: '#17384f',
    accentColor: '#7ed1ff',
    hotkey: '6',
    description: 'Extracts rare diamonds',
    cost: 180,
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    size: 4,
    color: '#3d3d45',
    accentColor: '#b4b4c8',
    hotkey: '7',
    description: 'Stores and displays your global resources',
    cost: 0,
  },
];

// ── Lookup Helper ────────────────────────────────────────────────────────────

export function getBuildingDef(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

const FARM_SPRITE_SRC = '/assets/image.png';
const FARM_SPRITE_SCALE = 1.0;
const FARM_SPRITE_GRID = 1;
const FARM_SPRITE_CROPS: Record<'farm-wheat' | 'farm-potato' | 'farm-rice', SpriteCrop> = {
  'farm-wheat': { x: 304, y: 280, w: 128, h: 128 },
  'farm-potato': { x: 528, y: 224, w: 128, h: 128 },
  'farm-rice': { x: 416, y: 440, w: 128, h: 128 },
};

let farmSpriteImage: HTMLImageElement | null = null;
let farmSpriteReady = false;

function ensureFarmSprites(): void {
  if (farmSpriteImage || typeof Image === 'undefined') return;
  const img = new Image();
  img.src = FARM_SPRITE_SRC;
  img.decoding = 'async';
  img.onload = () => {
    farmSpriteReady = true;
  };
  farmSpriteImage = img;
}

function drawFarmSprite(
  ctx: CanvasRenderingContext2D,
  crop: SpriteCrop,
  sx: number,
  sy: number,
  s: number,
): boolean {
  ensureFarmSprites();
  if (!farmSpriteReady || !farmSpriteImage) return false;

  const size = s * FARM_SPRITE_SCALE;
  const pad = (s - size) / 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (FARM_SPRITE_GRID <= 1) {
    ctx.drawImage(
      farmSpriteImage,
      crop.x,
      crop.y,
      crop.w,
      crop.h,
      sx + pad,
      sy + pad,
      size,
      size,
    );
  } else {
    const inset = pad + size * 0.06;
    const gap = size * 0.06;
    const cell = (s - inset * 2 - gap) / FARM_SPRITE_GRID;
    for (let row = 0; row < FARM_SPRITE_GRID; row++) {
      for (let col = 0; col < FARM_SPRITE_GRID; col++) {
        const dx = sx + inset + col * (cell + gap);
        const dy = sy + inset + row * (cell + gap);
        ctx.drawImage(
          farmSpriteImage,
          crop.x,
          crop.y,
          crop.w,
          crop.h,
          dx,
          dy,
          cell,
          cell,
        );
      }
    }
  }
  ctx.restore();
  return true;
}

// ── Internal Drawing Utilities ───────────────────────────────────────────────

/** Draw a rounded rectangle path (does NOT stroke/fill). */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Darken a hex colour by a ratio (0‑1). */
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

/** Return the direction angle in radians (0 = up, clockwise). */
function directionAngle(dir: Direction): number {
  switch (dir) {
    case 'up':
      return 0;
    case 'right':
      return Math.PI / 2;
    case 'down':
      return Math.PI;
    case 'left':
      return -Math.PI / 2;
  }
}

// ── Base Shape (shared by all buildings) ─────────────────────────────────────

function drawBaseRect(
  ctx: CanvasRenderingContext2D,
  color: string,
  sx: number,
  sy: number,
  totalSize: number,
  radius: number,
): void {
  const pad = totalSize * 0.04; // small inset so buildings don't touch
  const x = sx + pad;
  const y = sy + pad;
  const w = totalSize - pad * 2;
  const h = totalSize - pad * 2;

  // Main fill
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = color;
  ctx.fill();

  // Subtle bottom‑darkened gradient overlay
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = grad;
  ctx.fill();

  // Dark border
  roundedRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = darken(color, 0.45);
  ctx.lineWidth = Math.max(1, totalSize * 0.03);
  ctx.stroke();
}

// ── Per‑building Detail Renderers ────────────────────────────────────────────

function drawBelt(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
  dir: Direction,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;
  const angle = directionAngle(dir);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Three chevron arrows pointing "up" (along the direction)
  const chevronW = s * 0.28;
  const chevronH = s * 0.14;
  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = -1; i <= 1; i++) {
    const offsetY = i * s * 0.22;
    ctx.beginPath();
    ctx.moveTo(-chevronW / 2, offsetY + chevronH / 2);
    ctx.lineTo(0, offsetY - chevronH / 2);
    ctx.lineTo(chevronW / 2, offsetY + chevronH / 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMinerIron(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(2, s * 0.04);
  ctx.lineCap = 'round';

  // Pickaxe icon – two diagonal lines forming an X with a handle
  const extent = s * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx - extent, cy - extent);
  ctx.lineTo(cx + extent, cy + extent);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + extent, cy - extent);
  ctx.lineTo(cx - extent, cy + extent);
  ctx.stroke();

  // Handle line (vertical down from centre)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + extent * 1.1);
  ctx.stroke();

  // Gear circles in corners
  const gr = s * 0.07;
  const offset = s * 0.18;
  ctx.fillStyle = def.accentColor;
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx + dx * (s / 2 - offset), cy + dy * (s / 2 - offset), gr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMinerCopper(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(2, s * 0.04);
  ctx.lineCap = 'round';

  // Diamond shapes (two rotated squares)
  const d = s * 0.18;
  for (const offset of [-s * 0.13, s * 0.13]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset, cy - d);
    ctx.lineTo(cx + offset + d, cy);
    ctx.lineTo(cx + offset, cy + d);
    ctx.lineTo(cx + offset - d, cy);
    ctx.closePath();
    ctx.stroke();
  }

  // Gear circles in corners
  const gr = s * 0.07;
  const gOffset = s * 0.18;
  ctx.fillStyle = def.accentColor;
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx + dx * (s / 2 - gOffset), cy + dy * (s / 2 - gOffset), gr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarmWheat(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  if (drawFarmSprite(ctx, FARM_SPRITE_CROPS['farm-wheat'], sx, sy, s)) return;
  const cx = sx + s / 2;
  const furrowColor = darken(def.color, 0.2);
  const pad = s * 0.12;
  const rowCount = 4;

  ctx.strokeStyle = furrowColor;
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let i = 1; i <= rowCount; i++) {
    const y = sy + pad + ((s - pad * 2) / (rowCount + 1)) * i;
    ctx.beginPath();
    ctx.moveTo(sx + pad, y);
    ctx.lineTo(sx + s - pad, y);
    ctx.stroke();
  }

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  for (const offset of [-s * 0.2, 0, s * 0.2]) {
    const x = cx + offset;
    const top = sy + s * 0.3;
    const bottom = sy + s * 0.72;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, top);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.05, top + s * 0.05);
    ctx.lineTo(x + s * 0.05, top + s * 0.05);
    ctx.stroke();
  }
}

function drawFarmPotato(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  if (drawFarmSprite(ctx, FARM_SPRITE_CROPS['farm-potato'], sx, sy, s)) return;
  const furrowColor = darken(def.color, 0.25);
  const pad = s * 0.12;
  const rowCount = 3;

  ctx.strokeStyle = furrowColor;
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let i = 1; i <= rowCount; i++) {
    const y = sy + pad + ((s - pad * 2) / (rowCount + 1)) * i;
    ctx.beginPath();
    ctx.moveTo(sx + pad, y);
    ctx.lineTo(sx + s - pad, y);
    ctx.stroke();
  }

  ctx.fillStyle = def.accentColor;
  const cx = sx + s / 2;
  const cy = sy + s / 2;
  const r = s * 0.09;
  for (const [dx, dy] of [
    [-s * 0.18, -s * 0.05],
    [s * 0.05, s * 0.1],
    [s * 0.2, -s * 0.14],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy + dy, r * 1.1, r * 0.85, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarmRice(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  if (drawFarmSprite(ctx, FARM_SPRITE_CROPS['farm-rice'], sx, sy, s)) return;
  const waterColor = darken(def.color, 0.15);
  const pad = s * 0.12;
  const rowCount = 3;

  ctx.strokeStyle = waterColor;
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let i = 1; i <= rowCount; i++) {
    const y = sy + pad + ((s - pad * 2) / (rowCount + 1)) * i;
    ctx.beginPath();
    ctx.moveTo(sx + pad, y);
    ctx.lineTo(sx + s - pad, y);
    ctx.stroke();
  }

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(1, s * 0.035);
  const cx = sx + s / 2;
  for (const offset of [-s * 0.18, 0, s * 0.18]) {
    const x = cx + offset;
    ctx.beginPath();
    ctx.moveTo(x, sy + s * 0.7);
    ctx.quadraticCurveTo(x + s * 0.05, sy + s * 0.5, x, sy + s * 0.3);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - s * 0.04, sy + s * 0.32);
    ctx.lineTo(x + s * 0.04, sy + s * 0.32);
    ctx.stroke();
  }
}

function drawMineDiamond(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;
  const w = s * 0.26;
  const h = s * 0.18;

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - w, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + w, cy);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.6, cy - h * 0.9);
  ctx.lineTo(cx + w * 0.6, cy - h * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.4, cy - h * 0.65);
  ctx.lineTo(cx + w * 0.8, cy - h * 0.65);
  ctx.stroke();
}

function drawFurnace(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;

  // Brick‑like horizontal lines
  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(1, s * 0.015);
  const pad = s * 0.1;
  const lineCount = 5;
  for (let i = 1; i <= lineCount; i++) {
    const ly = sy + pad + ((s - pad * 2) / (lineCount + 1)) * i;
    ctx.beginPath();
    ctx.moveTo(sx + pad, ly);
    ctx.lineTo(sx + s - pad, ly);
    ctx.stroke();
  }

  // Flame icon – 3 teardrop shapes
  ctx.fillStyle = def.accentColor;
  const flameH = s * 0.18;
  const flameW = s * 0.07;
  for (const offsetX of [-s * 0.1, 0, s * 0.1]) {
    const fx = cx + offsetX;
    const fy = cy - s * 0.05;
    ctx.beginPath();
    ctx.moveTo(fx, fy - flameH);
    ctx.quadraticCurveTo(fx + flameW * 1.5, fy - flameH * 0.3, fx, fy + flameH * 0.5);
    ctx.quadraticCurveTo(fx - flameW * 1.5, fy - flameH * 0.3, fx, fy - flameH);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAssembler(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;

  // Large gear – circle with 6 rectangular teeth
  const outerR = s * 0.32;
  const innerR = s * 0.22;
  const toothW = s * 0.09;
  const toothH = s * 0.1;

  ctx.fillStyle = def.accentColor;

  // Teeth
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillRect(-toothW / 2, -(outerR + toothH * 0.3), toothW, toothH);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = def.accentColor;
  ctx.fill();

  // Inner circle (cut out)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();

  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = def.accentColor;
  ctx.fill();
}

function drawInserter(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
  dir: Direction,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;
  const angle = directionAngle(dir);

  // Pivot circle at centre
  ctx.fillStyle = def.accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Arm / arrow pointing in direction
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.lineCap = 'round';

  // Arm line
  ctx.beginPath();
  ctx.moveTo(0, s * 0.05);
  ctx.lineTo(0, -s * 0.34);
  ctx.stroke();

  // Arrow head
  const ah = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(-ah, -s * 0.22);
  ctx.lineTo(0, -s * 0.38);
  ctx.lineTo(ah, -s * 0.22);
  ctx.stroke();

  ctx.restore();
}

function drawPowerPole(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.lineCap = 'round';

  // Vertical pole
  ctx.beginPath();
  ctx.moveTo(cx, sy + s * 0.82);
  ctx.lineTo(cx, sy + s * 0.18);
  ctx.stroke();

  // Cross lines at top
  const crossY = sy + s * 0.26;
  const crossW = s * 0.3;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx - crossW, crossY);
  ctx.lineTo(cx + crossW, crossY);
  ctx.stroke();

  // Small circle connections at cross ends
  const cr = s * 0.045;
  ctx.fillStyle = def.accentColor;
  for (const dx of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.arc(cx + dx * crossW, crossY, cr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChest(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const pad = s * 0.08;
  const x = sx + pad;
  const w = s - pad * 2;
  const lidY = sy + pad + (s - pad * 2) * 0.3;

  // Lid line
  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath();
  ctx.moveTo(x, lidY);
  ctx.lineTo(x + w, lidY);
  ctx.stroke();

  // Small latch rectangle centred on lid line
  const latchW = s * 0.12;
  const latchH = s * 0.08;
  ctx.fillStyle = def.accentColor;
  ctx.fillRect(sx + s / 2 - latchW / 2, lidY - latchH / 2, latchW, latchH);
}

function drawWarehouse(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  sx: number,
  sy: number,
  s: number,
): void {
  const cx = sx + s / 2;
  const cy = sy + s / 2;

  // A large crate / building with an 'X' pattern on the front
  const w = s * 0.7;
  const h = s * 0.5;
  const bx = cx - w / 2;
  const by = cy - h * 0.3;

  ctx.strokeStyle = def.accentColor;
  ctx.lineWidth = Math.max(2, s * 0.02);
  
  // Outer box
  ctx.strokeRect(bx, by, w, h);
  
  // X crossing
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + w, by + h);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(bx + w, by);
  ctx.lineTo(bx, by + h);
  ctx.stroke();
  
  // Roof
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.05, by);
  ctx.lineTo(cx, by - s * 0.2);
  ctx.lineTo(bx + w + s * 0.05, by);
  ctx.stroke();
}

// ── Public Drawing API ───────────────────────────────────────────────────────

/**
 * Draw a building at screen position.
 * @param tileScreenSize  pixel size of a single tile at current zoom
 * @param alpha  opacity (1.0 placed, 0.6 ghost preview)
 */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  screenX: number,
  screenY: number,
  tileScreenSize: number,
  direction: Direction,
  alpha: number,
): void {
  const totalSize = tileScreenSize * def.size;
  const radius = Math.max(2, totalSize * 0.06);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Base rectangle shared by all
  drawBaseRect(ctx, def.color, screenX, screenY, totalSize, radius);

  // Per‑building details
  switch (def.id) {
    case 'farm-wheat':
      drawFarmWheat(ctx, def, screenX, screenY, totalSize);
      break;
    case 'farm-potato':
      drawFarmPotato(ctx, def, screenX, screenY, totalSize);
      break;
    case 'farm-rice':
      drawFarmRice(ctx, def, screenX, screenY, totalSize);
      break;
    case 'mine-copper':
      drawMinerCopper(ctx, def, screenX, screenY, totalSize);
      break;
    case 'mine-iron':
      drawMinerIron(ctx, def, screenX, screenY, totalSize);
      break;
    case 'mine-diamond':
      drawMineDiamond(ctx, def, screenX, screenY, totalSize);
      break;
    case 'warehouse':
      drawWarehouse(ctx, def, screenX, screenY, totalSize);
      break;
  }

  ctx.restore();
}

/**
 * Draw a simplified icon for the toolbar.
 * Just the main shape + primary icon detail, no direction.
 */
export function drawBuildingIcon(
  ctx: CanvasRenderingContext2D,
  def: BuildingDef,
  x: number,
  y: number,
  size: number,
): void {
  ctx.save();

  const radius = Math.max(2, size * 0.1);
  drawBaseRect(ctx, def.color, x, y, size, radius);

  switch (def.id) {
    case 'farm-wheat': {
      drawFarmWheat(ctx, def, x, y, size);
      break;
    }
    case 'farm-potato': {
      drawFarmPotato(ctx, def, x, y, size);
      break;
    }
    case 'farm-rice': {
      drawFarmRice(ctx, def, x, y, size);
      break;
    }
    case 'mine-copper': {
      drawMinerCopper(ctx, def, x, y, size);
      break;
    }
    case 'mine-iron': {
      drawMinerIron(ctx, def, x, y, size);
      break;
    }
    case 'mine-diamond': {
      drawMineDiamond(ctx, def, x, y, size);
      break;
    }
    case 'warehouse': {
      drawWarehouse(ctx, def, x, y, size);
      break;
    }
  }

  ctx.restore();
}
