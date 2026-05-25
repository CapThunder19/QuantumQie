import { create } from 'zustand';
import { getSupabaseClient } from '../lib/supabaseClient';

export type WorkerType = 'farmer' | 'miner';

export interface Worker {
  id: string;
  type: WorkerType;
  assignedBuildingId: string | null;
}

export interface Inventory {
  money: number;
  food: number;
  iron_ore: number;
  copper_ore: number;
}

interface GameState {
  userAddress: string | null;
  inventory: Inventory;
  workers: Worker[];
  isHydrated: boolean;
  isHydrating: boolean;
  
  // Actions
  setUserAddress: (address: string | null) => void;
  buyWorker: (type: WorkerType) => boolean;
  assignWorker: (workerId: string, buildingId: string) => void;
  unassignWorker: (workerId: string) => void;
  addResource: (type: keyof Inventory, amount: number) => void;
  hydrateFromSupabase: () => Promise<void>;
  flushToSupabase: () => Promise<void>;
  
  // Helpers
  getAvailableWorker: (type: WorkerType) => Worker | undefined;
}

const WORKER_COSTS: Record<WorkerType, number> = {
  farmer: 50,
  miner: 100,
};


const DEFAULT_INVENTORY: Inventory = {
  money: 500,
  food: 0,
  iron_ore: 0,
  copper_ore: 0,
};

type InventoryRow = {
  save_id: string;
  money: number;
  food: number;
  iron_ore: number;
  copper_ore: number;
};

type WorkerRow = {
  id: string;
  save_id: string;
  type: WorkerType;
  assigned_building_id: string | null;
};

function normalizeInventory(row?: Partial<InventoryRow> | null): Inventory {
  return {
    money: typeof row?.money === 'number' ? row.money : DEFAULT_INVENTORY.money,
    food: typeof row?.food === 'number' ? row.food : DEFAULT_INVENTORY.food,
    iron_ore: typeof row?.iron_ore === 'number' ? row.iron_ore : DEFAULT_INVENTORY.iron_ore,
    copper_ore: typeof row?.copper_ore === 'number' ? row.copper_ore : DEFAULT_INVENTORY.copper_ore,
  };
}

function mapWorkerRow(row: WorkerRow): Worker {
  return {
    id: row.id,
    type: row.type,
    assignedBuildingId: row.assigned_building_id ?? null,
  };
}

function formatSaveId(address: string | null): string | null {
  return address ? `wallet:${address.toLowerCase()}` : null;
}

export const useGameStore = create<GameState>((set, get) => {
  const getSaveId = () => formatSaveId(get().userAddress);

  const saveState = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const saveId = getSaveId();
    if (!saveId) return;

    const { inventory, workers } = get();
    const inventoryRow: InventoryRow = { save_id: saveId, ...inventory };

    const { error: inventoryError } = await client
      .from('inventory')
      .upsert(inventoryRow, { onConflict: 'save_id' });
    if (inventoryError) {
      console.warn('Supabase inventory save failed:', inventoryError.message);
    }

    if (workers.length === 0) return;

    const workerRows: WorkerRow[] = workers.map((worker) => ({
      id: worker.id,
      save_id: saveId,
      type: worker.type,
      assigned_building_id: worker.assignedBuildingId,
    }));

    const { error: workerError } = await client
      .from('workers')
      .upsert(workerRows, { onConflict: 'save_id,id' });
    if (workerError) {
      console.warn('Supabase worker save failed:', workerError.message);
    }
  };

  const hydrateFromSupabase = async () => {
    const { isHydrated, isHydrating } = get();
    if (isHydrated || isHydrating) return;

    set({ isHydrating: true });

    const client = getSupabaseClient();
    if (!client) {
      set({ isHydrated: true, isHydrating: false });
      return;
    }

    const saveId = getSaveId();
    if (!saveId) {
      set({ isHydrated: true, isHydrating: false });
      return;
    }

    const inventoryResponse = await client
      .from('inventory')
      .select('save_id, money, food, iron_ore, copper_ore')
      .eq('save_id', saveId)
      .maybeSingle();

    if (inventoryResponse.error) {
      console.warn('Supabase inventory load failed:', inventoryResponse.error.message);
    }

    const inventory = normalizeInventory(inventoryResponse.data ?? undefined);

    if (!inventoryResponse.data) {
      await client.from('inventory').upsert({ save_id: saveId, ...inventory }, { onConflict: 'save_id' });
    }

    const workersResponse = await client
      .from('workers')
      .select('id, type, assigned_building_id, save_id')
      .eq('save_id', saveId);

    if (workersResponse.error) {
      console.warn('Supabase worker load failed:', workersResponse.error.message);
    }

    const workers = (workersResponse.data ?? []).map(mapWorkerRow);

    set({ inventory, workers, isHydrated: true, isHydrating: false });
  };

  return {
    userAddress: null,
    inventory: { ...DEFAULT_INVENTORY },
    workers: [],
    isHydrated: false,
    isHydrating: false,
    hydrateFromSupabase,
    flushToSupabase: saveState,

    setUserAddress: (address: string | null) => {
      const normalized = address ? address.toLowerCase() : null;
      if (normalized === get().userAddress) return;

      set({
        userAddress: normalized,
        isHydrated: false,
        isHydrating: false,
        inventory: { ...DEFAULT_INVENTORY },
        workers: [],
      });

      if (normalized) {
        void get().hydrateFromSupabase();
      }
    },

    buyWorker: (type: WorkerType) => {
      const cost = WORKER_COSTS[type];
      const { inventory, workers } = get();
      
      if (inventory.money >= cost) {
        set({
          inventory: { ...inventory, money: inventory.money - cost },
          workers: [
            ...workers,
            {
              id: `worker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              type,
              assignedBuildingId: null,
            },
          ],
        });
        void saveState();
        return true;
      }
      return false;
    },

    assignWorker: (workerId: string, buildingId: string) => {
      set((state) => ({
        workers: state.workers.map((w) =>
          w.id === workerId ? { ...w, assignedBuildingId: buildingId } : w
        ),
      }));
      void saveState();
    },

    unassignWorker: (workerId: string) => {
      set((state) => ({
        workers: state.workers.map((w) =>
          w.id === workerId ? { ...w, assignedBuildingId: null } : w
        ),
      }));
      void saveState();
    },

    addResource: (type: keyof Inventory, amount: number) => {
      set((state) => ({
        inventory: {
          ...state.inventory,
          [type]: state.inventory[type] + amount,
        },
      }));
      void saveState();
    },

    getAvailableWorker: (type: WorkerType) => {
      return get().workers.find((w) => w.type === type && w.assignedBuildingId === null);
    },
  };
});

export function getActiveSaveId(): string | null {
  return formatSaveId(useGameStore.getState().userAddress);
}
