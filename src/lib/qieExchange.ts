import { formatEther, parseEther } from 'viem';
import { getSupabaseClient } from './supabaseClient';

export type ExchangeItemKey = 'wheat' | 'potato' | 'rice' | 'iron_ore' | 'copper_ore' | 'diamond';

export type ExchangeListingStatus = 'open' | 'reserved' | 'sold' | 'cancelled';

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
];

export type ExchangeListing = {
  id: string;
  sellerAddress: string;
  itemKey: ExchangeItemKey;
  quantity: number;
  unitPriceQie: string;
  totalPriceQie: string;
  status: ExchangeListingStatus;
  buyerAddress: string | null;
  txHash: string | null;
  createdAt: string;
  soldAt: string | null;
};

type ExchangeListingRow = {
  id: string;
  seller_address: string;
  item_key: ExchangeItemKey;
  quantity: number;
  unit_price_wei: string;
  total_price_wei: string;
  status: ExchangeListingStatus;
  buyer_address: string | null;
  tx_hash: string | null;
  created_at: string;
  sold_at: string | null;
};

function mapRow(row: ExchangeListingRow): ExchangeListing {
  return {
    id: row.id,
    sellerAddress: row.seller_address,
    itemKey: row.item_key,
    quantity: row.quantity,
    unitPriceQie: formatEther(BigInt(row.unit_price_wei)),
    totalPriceQie: formatEther(BigInt(row.total_price_wei)),
    status: row.status,
    buyerAddress: row.buyer_address,
    txHash: row.tx_hash,
    createdAt: row.created_at,
    soldAt: row.sold_at,
  };
}

function toRow(listing: {
  id?: string;
  sellerAddress: string;
  itemKey: ExchangeItemKey;
  quantity: number;
  unitPriceQie: string;
}): ExchangeListingRow {
  const unitPriceWei = parseEther(listing.unitPriceQie).toString();
  const totalPriceWei = (parseEther(listing.unitPriceQie) * BigInt(listing.quantity)).toString();

  return {
    id: listing.id ?? `listing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    seller_address: listing.sellerAddress,
    item_key: listing.itemKey,
    quantity: listing.quantity,
    unit_price_wei: unitPriceWei,
    total_price_wei: totalPriceWei,
    status: 'open',
    buyer_address: null,
    tx_hash: null,
    created_at: new Date().toISOString(),
    sold_at: null,
  };
}

export async function loadExchangeListings(): Promise<ExchangeListing[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('market_listings')
    .select('id, seller_address, item_key, quantity, unit_price_wei, total_price_wei, status, buyer_address, tx_hash, created_at, updated_at, sold_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase market listings load failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as ExchangeListingRow));
}

export async function createExchangeListing(input: {
  sellerAddress: string;
  itemKey: ExchangeItemKey;
  quantity: number;
  unitPriceQie: string;
}): Promise<ExchangeListing | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const row = toRow(input);

  const { data, error } = await client
    .from('market_listings')
    .insert(row)
    .select('id, seller_address, item_key, quantity, unit_price_wei, total_price_wei, status, buyer_address, tx_hash, created_at, updated_at, sold_at')
    .single();

  if (error) {
    console.warn('Supabase market listing create failed:', error.message);
    return null;
  }

  return mapRow(data as ExchangeListingRow);
}

export async function markExchangeListingSold(input: {
  id: string;
  buyerAddress: string;
  txHash: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('market_listings')
    .update({
      status: 'sold',
      buyer_address: input.buyerAddress,
      tx_hash: input.txHash,
      sold_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) {
    console.warn('Supabase market listing sold update failed:', error.message);
  }
}
