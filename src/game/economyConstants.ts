// Shared economy constants — imported by both client (gameStore, marketplace, engine)
// and server (API routes) so validation can never drift from what the client actually does.

export type ProduceKey =
  | 'wheat'
  | 'potato'
  | 'rice'
  | 'iron_ore'
  | 'copper_ore'
  | 'diamond'
  | 'iron_bar'
  | 'copper_bar';

export const PRODUCE_KEYS: ProduceKey[] = [
  'wheat',
  'potato',
  'rice',
  'iron_ore',
  'copper_ore',
  'diamond',
  'iron_bar',
  'copper_bar',
];

/** Seconds for an assigned worker to fill one building's production bar (engine.ts tick loop). */
export const PRODUCTION_CYCLE_SECONDS = 5;

/** Resource yielded per harvest of a ready building, by building defId. */
export const HARVEST_YIELD: Record<string, { resource: ProduceKey; amount: number }> = {
  'farm-wheat': { resource: 'wheat', amount: 10 },
  'farm-potato': { resource: 'potato', amount: 10 },
  'farm-rice': { resource: 'rice', amount: 10 },
  'mine-iron': { resource: 'iron_ore', amount: 10 },
  'mine-copper': { resource: 'copper_ore', amount: 10 },
  'mine-diamond': { resource: 'diamond', amount: 5 },
};

/** Money yielded per harvest of a ready building with no dedicated resource (e.g. warehouse). */
export const GENERIC_BUILDING_MONEY_YIELD = 5;

/** Smelter crafting recipes — consume `inputAmount` of `input` to produce `outputAmount` of `output`. */
export type RecipeKey = 'iron' | 'copper';

export const RECIPES: Record<RecipeKey, { input: ProduceKey; inputAmount: number; output: ProduceKey; outputAmount: number }> = {
  iron: { input: 'iron_ore', inputAmount: 4, output: 'iron_bar', outputAmount: 1 },
  copper: { input: 'copper_ore', inputAmount: 4, output: 'copper_bar', outputAmount: 1 },
};

export const BASE_WORKER_COSTS: Record<'farmer' | 'miner' | 'engineer', number> = {
  farmer: 50,
  miner: 100,
  engineer: 150,
};

export const LEVEL_UPGRADE_COST: Record<2 | 3, number> = {
  2: 5000,
  3: 10000,
};

/** NPC sell-to-house pricing curve (marketplace/page.tsx) — single source of truth so the
 * server-side sell-price ceiling can never drift from what the market page actually pays out. */
export type MarketPriceConfig = {
  basePrice: number;
  targetStock: number;
  minMultiplier: number;
  maxMultiplier: number;
  step: number;
};

export const MARKET_PRICE_CONFIG: Record<ProduceKey, MarketPriceConfig> = {
  wheat: { basePrice: 6, targetStock: 140, minMultiplier: 0.6, maxMultiplier: 1.6, step: 1 },
  potato: { basePrice: 7, targetStock: 120, minMultiplier: 0.6, maxMultiplier: 1.7, step: 1 },
  rice: { basePrice: 8, targetStock: 110, minMultiplier: 0.6, maxMultiplier: 1.7, step: 1 },
  iron_ore: { basePrice: 12, targetStock: 80, minMultiplier: 0.6, maxMultiplier: 1.7, step: 1 },
  copper_ore: { basePrice: 14, targetStock: 60, minMultiplier: 0.6, maxMultiplier: 1.8, step: 1 },
  diamond: { basePrice: 30, targetStock: 40, minMultiplier: 0.7, maxMultiplier: 2.2, step: 1 },
  iron_bar: { basePrice: 70, targetStock: 30, minMultiplier: 0.6, maxMultiplier: 1.8, step: 1 },
  copper_bar: { basePrice: 85, targetStock: 25, minMultiplier: 0.6, maxMultiplier: 1.9, step: 1 },
};

/** basePrice * maxMultiplier — the ceiling price a single unit could ever legitimately sell for. */
export const MAX_MARKET_SELL_PRICE: Record<ProduceKey, number> = PRODUCE_KEYS.reduce(
  (acc, key) => {
    acc[key] = MARKET_PRICE_CONFIG[key].basePrice * MARKET_PRICE_CONFIG[key].maxMultiplier;
    return acc;
  },
  {} as Record<ProduceKey, number>,
);
