import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type InventoryRow = {
  save_id: string;
  money: number;
  wheat: number;
  potato: number;
  rice: number;
  iron_ore: number;
  copper_ore: number;
  diamond: number;
  food?: number | null;
  updated_at?: string;
};

type LeaderboardRow = {
  save_id: string;
  score: number;
  updated_at?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function computeScore(row: Partial<InventoryRow>): number {
  const money = toNumber(row.money);
  const wheat = toNumber(row.wheat);
  const potato = toNumber(row.potato);
  const rice = toNumber(row.rice);
  const iron = toNumber(row.iron_ore);
  const copper = toNumber(row.copper_ore);
  const diamond = toNumber(row.diamond);
  const legacyFood = toNumber(row.food);
  const food = wheat + potato + rice;
  const totalFood = food > 0 ? food : legacyFood;

  return money + iron * 10 + copper * 8 + diamond * 50 + totalFood;
}

function isMissingColumnError(message?: string): boolean {
  return typeof message === 'string' && /column .* does not exist/i.test(message);
}

function getServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey ?? anonKey;

  if (!supabaseUrl || !key) return null;

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  const client = getServerClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Supabase keys not configured. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
      { status: 500 }
    );
  }

  const fullSelect = 'save_id, money, wheat, potato, rice, iron_ore, copper_ore, diamond, food, updated_at';
  let { data, error } = await client.from<InventoryRow>('inventory').select(fullSelect);

  if (error && isMissingColumnError(error.message)) {
    const legacySelect = 'save_id, money, food, updated_at';
    const legacyResponse = await client.from<InventoryRow>('inventory').select(legacySelect);
    data = legacyResponse.data;
    error = legacyResponse.error;

    if (error && isMissingColumnError(error.message)) {
      const minimalSelect = 'save_id, money, updated_at';
      const minimalResponse = await client.from<InventoryRow>('inventory').select(minimalSelect);
      data = minimalResponse.data;
      error = minimalResponse.error;
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: LeaderboardRow[] = (data ?? [])
    .map((row) => ({
      save_id: row.save_id,
      score: computeScore(row),
      updated_at: row.updated_at,
    }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ ok: true, rows });
}
