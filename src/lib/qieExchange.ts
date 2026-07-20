export type ExchangeItemKey =
  | 'wheat'
  | 'potato'
  | 'rice'
  | 'iron_ore'
  | 'copper_ore'
  | 'diamond'
  | 'iron_bar'
  | 'copper_bar';

export type ExchangeItem = {
  key: ExchangeItemKey;
  label: string;
  description: string;
  toneClass: string;
  suggestedUnitPriceQie: string;
};

export const EXCHANGE_ITEMS: ExchangeItem[] = [
  {
    key: 'wheat',
    label: 'Wheat Bundles',
    description: 'Staple grain for hungry builders.',
    toneClass: 'tone-wheat',
    suggestedUnitPriceQie: '0.00001',
  },
  {
    key: 'potato',
    label: 'Potato Lots',
    description: 'Reliable food stock for long sessions.',
    toneClass: 'tone-potato',
    suggestedUnitPriceQie: '0.000012',
  },
  {
    key: 'rice',
    label: 'Rice Sacks',
    description: 'Compact food bundles for transport.',
    toneClass: 'tone-rice',
    suggestedUnitPriceQie: '0.000013',
  },
  {
    key: 'iron_ore',
    label: 'Iron Ore',
    description: 'Foundational material for industrial buyers.',
    toneClass: 'tone-iron',
    suggestedUnitPriceQie: '0.00002',
  },
  {
    key: 'copper_ore',
    label: 'Copper Ore',
    description: 'Useful for wiring and precision parts.',
    toneClass: 'tone-copper',
    suggestedUnitPriceQie: '0.000025',
  },
  {
    key: 'diamond',
    label: 'Diamond Crystals',
    description: 'Rare stock for premium orders.',
    toneClass: 'tone-diamond',
    suggestedUnitPriceQie: '0.00005',
  },
  {
    key: 'iron_bar',
    label: 'Iron Bars',
    description: 'Refined ingots, smelted from raw iron ore.',
    toneClass: 'tone-iron',
    suggestedUnitPriceQie: '0.0001',
  },
  {
    key: 'copper_bar',
    label: 'Copper Bars',
    description: 'Refined ingots, smelted from raw copper ore.',
    toneClass: 'tone-copper',
    suggestedUnitPriceQie: '0.00012',
  },
];
