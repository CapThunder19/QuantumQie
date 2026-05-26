import { getSupabaseClient } from '../lib/supabaseClient';

export type ProduceKey = 'wheat' | 'potato' | 'rice' | 'iron_ore' | 'copper_ore' | 'diamond';

export type SepoliaListingStatus = 'open' | 'reserved' | 'sold' | 'cancelled';

export interface SepoliaListing {
  id: string;
  seller_address: string;
  item_key: ProduceKey;
  quantity: number;
  unit_price_wei: string;
  total_price_wei: string;
  status: SepoliaListingStatus;
  buyer_address: string | null;
  payment_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

type SepoliaListingRow = {
  id: string;
  seller_address: string;
  item_key: ProduceKey;
  quantity: number;
  unit_price_wei: string;
  total_price_wei: string;
  status: SepoliaListingStatus;
  buyer_address: string | null;
  payment_tx_hash: string | null;
  created_at: string;
  updated_at: string;
};

function getClient() {
  return getSupabaseClient();
}

function mapListingRow(row: SepoliaListingRow): SepoliaListing {
  return {
    ...row,
    quantity: Number(row.quantity),
    unit_price_wei: String(row.unit_price_wei),
    total_price_wei: String(row.total_price_wei),
  };
}

export function createSepoliaListingDraft(params: {
  sellerAddress: string;
  itemKey: ProduceKey;
  amount: number;
  unitPriceWei: string;
}): Omit<SepoliaListing, 'created_at' | 'updated_at'> {
  const totalPriceWei = (BigInt(params.unitPriceWei) * BigInt(params.amount)).toString();

  return {
    id: crypto.randomUUID(),
    seller_address: params.sellerAddress.toLowerCase(),
    item_key: params.itemKey,
    quantity: params.amount,
    unit_price_wei: params.unitPriceWei,
    total_price_wei: totalPriceWei,
    status: 'open',
    buyer_address: null,
    payment_tx_hash: null,
  };
}

export async function loadSepoliaListings(): Promise<SepoliaListing[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('market_listings')
    .select('id, seller_address, item_key, quantity, unit_price_wei, total_price_wei, status, buyer_address, payment_tx_hash, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase sepolia listings load failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapListingRow(row as SepoliaListingRow));
}

export async function createSepoliaListing(
  listing: Omit<SepoliaListing, 'created_at' | 'updated_at'>,
): Promise<SepoliaListing | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('market_listings')
    .insert(listing)
    .select('id, seller_address, item_key, quantity, unit_price_wei, total_price_wei, status, buyer_address, payment_tx_hash, created_at, updated_at')
    .single();

  if (error) {
    console.warn('Supabase sepolia listing create failed:', error.message);
    return null;
  }

  return mapListingRow(data as SepoliaListingRow);
}

export async function reserveSepoliaListing(listingId: string, buyerAddress: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { data, error } = await client
    .from('market_listings')
    .update({ status: 'reserved', buyer_address: buyerAddress.toLowerCase() })
    .eq('id', listingId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('Supabase sepolia listing reserve failed:', error.message);
    return false;
  }

  return Boolean(data);
}

export async function releaseSepoliaListing(listingId: string, buyerAddress: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { error } = await client
    .from('market_listings')
    .update({ status: 'open', buyer_address: null })
    .eq('id', listingId)
    .eq('status', 'reserved')
    .eq('buyer_address', buyerAddress.toLowerCase());

  if (error) {
    console.warn('Supabase sepolia listing release failed:', error.message);
  }
}

export async function completeSepoliaListingSale(
  listingId: string,
  buyerAddress: string,
  txHash: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const { error } = await client
    .from('market_listings')
    .update({ status: 'sold', buyer_address: buyerAddress.toLowerCase(), payment_tx_hash: txHash })
    .eq('id', listingId)
    .eq('status', 'reserved');

  if (error) {
    console.warn('Supabase sepolia listing completion failed:', error.message);
  }
}

export async function cancelSepoliaListing(listingId: string, sellerAddress: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { data, error } = await client
    .from('market_listings')
    .update({ status: 'cancelled' })
    .eq('id', listingId)
    .eq('seller_address', sellerAddress.toLowerCase())
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('Supabase sepolia listing cancel failed:', error.message);
    return false;
  }

  return Boolean(data);
}