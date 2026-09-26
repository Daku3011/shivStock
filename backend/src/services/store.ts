import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LaminateItem, StockTransaction, DashboardAnalytics, Folder } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// Path to catalog extracted from PDF
const catalogPath = path.resolve(__dirname, '../../../database/catalog.json');
const snapshotPath = path.resolve(__dirname, '../../data_snapshot.json');

const DEFAULT_FOLDERS: Folder[] = [
  {
    id: 'pastel-colour',
    name: 'Pastel Colour',
    finishes: ['SMT', 'HG', 'SF', 'MS', 'BO', 'FS', 'CP', 'BR', 'GW', 'STN', 'HGS'],
    createdAt: new Date().toISOString(),
  },
];

class StockStore {
  private items: Map<string, LaminateItem> = new Map();
  private transactions: StockTransaction[] = [];
  private folders: Folder[] = [...DEFAULT_FOLDERS];
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized) return;

    try {
      // 1. Try to load saved snapshot if present
      if (fs.existsSync(snapshotPath)) {
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
        if (Array.isArray(snapshot.items) && snapshot.items.length > 0) {
          snapshot.items.forEach((item: LaminateItem) => this.items.set(item.id, item));
          this.transactions = snapshot.transactions || [];
          if (Array.isArray(snapshot.folders) && snapshot.folders.length > 0) {
            this.folders = snapshot.folders;
          } else {
            this.folders = [...DEFAULT_FOLDERS];
          }
          this.syncFoldersFromItems();
          console.log(`📦 Loaded ${this.items.size} stock items and ${this.folders.length} folders from local snapshot.`);
          this.initialized = true;
          return;
        }
      }

      // 2. Load directly from extracted PDF catalog
      if (fs.existsSync(catalogPath)) {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
        const now = new Date().toISOString();
        catalog.forEach((catItem: any) => {
          const id = uuidv4();
          const item: LaminateItem = {
            id,
            sku: catItem.sku,
            code: catItem.code,
            finish: catItem.finish,
            finish_name: catItem.finish_name,
            name: catItem.name,
            category: catItem.category || 'Pastel Colour',
            brand: catItem.brand || 'SHIV LAMINATE',
            quantity: catItem.quantity ?? 12, // Sensible starter stock
            min_threshold: catItem.min_threshold ?? 5,
            unit_price: catItem.unit_price ?? 850,
            location: catItem.location || `Rack ${catItem.finish.slice(0, 2)}-01`,
            notes: '',
            created_at: now,
            updated_at: now,
          };
          this.items.set(id, item);
        });

        // Generate a few realistic starting sample transactions for initial dashboard visualization
        const sampleSkus = ['SMT-1901', 'HG-1903', 'SF-1905', 'MS-1914', 'CP-1922'];
        for (const sku of sampleSkus) {
          const found = Array.from(this.items.values()).find(i => i.sku === sku);
          if (found) {
            this.transactions.push({
              id: uuidv4(),
              item_id: found.id,
              sku: found.sku,
              type: 'IN',
              quantity_change: 15,
              previous_quantity: 0,
              new_quantity: 15,
              reference: 'Initial Factory Inward',
              reason: 'Shiv Laminate Production Batch #1',
              created_at: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)).toISOString(),
            });
          }
        }

        console.log(`📄 Seeded ${this.items.size} SKUs from extracted Shiv Laminate PDF catalog.`);
        this.saveSnapshot();
      }
    } catch (err) {
      console.error('Failed to initialize local stock store:', err);
    }
    this.initialized = true;
  }

  private syncFoldersFromItems() {
    const existingNames = new Set(this.folders.map(f => f.name.toLowerCase()));
    for (const item of this.items.values()) {
      const cat = (item.category || 'Pastel Colour').trim();
      if (cat && !existingNames.has(cat.toLowerCase())) {
        existingNames.add(cat.toLowerCase());
        const id = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `folder-${Date.now()}`;
        this.folders.push({
          id,
          name: cat,
          finishes: item.finish ? [item.finish] : ['MS', 'HT'],
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  private saveSnapshot() {
    try {
      this.syncFoldersFromItems();
      const data = {
        items: Array.from(this.items.values()),
        transactions: this.transactions,
        folders: this.folders,
      };
      fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving local snapshot:', e);
    }
  }

  public async getItems(params: {
    finish?: string;
    search?: string;
    status?: 'all' | 'low_stock' | 'out_of_stock' | 'in_stock';
  }): Promise<LaminateItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('laminate_items').select('*');
        if (params.finish && params.finish !== 'ALL') {
          query = query.eq('finish', params.finish.toUpperCase());
        }
        if (params.search) {
          query = query.or(`code.ilike.%${params.search}%,sku.ilike.%${params.search}%,name.ilike.%${params.search}%`);
        }
        const { data, error } = await query.order('code', { ascending: true });
        if (!error && data && data.length > 0) {
          let filtered = data as LaminateItem[];
          if (params.status === 'low_stock') {
            filtered = filtered.filter(i => i.quantity <= i.min_threshold && i.quantity > 0);
          } else if (params.status === 'out_of_stock') {
            filtered = filtered.filter(i => i.quantity === 0);
          } else if (params.status === 'in_stock') {
            filtered = filtered.filter(i => i.quantity > i.min_threshold);
          }
          return filtered;
        }
      } catch (e) {
        console.warn('Supabase query failed, falling back to local memory store:', e);
      }
    }

    // Local in-memory retrieval
    let list = Array.from(this.items.values());

    if (params.finish && params.finish !== 'ALL') {
      list = list.filter(i => i.finish.toUpperCase() === params.finish!.toUpperCase());
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        i =>
          i.code.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q)
      );
    }

    if (params.status === 'low_stock') {
      list = list.filter(i => i.quantity <= i.min_threshold && i.quantity > 0);
    } else if (params.status === 'out_of_stock') {
      list = list.filter(i => i.quantity === 0);
    } else if (params.status === 'in_stock') {
      list = list.filter(i => i.quantity > i.min_threshold);
    }

    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }

  public async getItemById(id: string): Promise<LaminateItem | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('laminate_items').select('*').eq('id', id).single();
        if (!error && data) return data as LaminateItem;
      } catch (e) {
        // fallback
      }
    }
    const local = this.items.get(id);
    if (local) return local;

    // Fallback to SKU lookup in case caller passed SKU
    return this.getItemBySku(id);
  }

  public async getItemBySku(sku: string): Promise<LaminateItem | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('laminate_items').select('*').eq('sku', sku.toUpperCase()).single();
        if (!error && data) return data as LaminateItem;
      } catch (e) {
        // fallback
      }
    }
    return Array.from(this.items.values()).find(i => i.sku.toUpperCase() === sku.toUpperCase()) || null;
  }

  public async createItem(data: {
    sku?: string;
    code: string;
    finish: string;
    finish_name?: string;
    name?: string;
    category?: string;
    brand?: string;
    quantity?: number;
    min_threshold?: number;
    unit_price?: number;
    location?: string;
    notes?: string;
  }): Promise<LaminateItem> {
    const finish = data.finish.trim().toUpperCase();
    const code = data.code.trim();
    const sku = (data.sku || `${finish}-${code}`).toUpperCase();

    const existing = await this.getItemBySku(sku);
    if (existing) {
      throw new Error(`Item with SKU "${sku}" already exists`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const qty = Math.max(0, data.quantity ?? 0);
    const category = data.category || 'Pastel Colour';
    const name = data.name?.trim() || `Shiv ${category} ${code} (${finish})`;

    const newItem: LaminateItem = {
      id,
      sku,
      code,
      finish,
      finish_name: data.finish_name || finish,
      name,
      category,
      brand: data.brand || 'SHIV LAMINATE',
      quantity: qty,
      min_threshold: data.min_threshold ?? 5,
      unit_price: data.unit_price ?? 850,
      location: data.location || 'Rack Main',
      notes: data.notes || '',
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('laminate_items').insert([newItem]);
      } catch (e) {
        console.warn('Supabase insert failed, keeping in local memory:', e);
      }
    }

    this.items.set(id, newItem);

    // Ensure target folder exists and includes this finish
    const targetFolder = this.folders.find(f => f.name.toLowerCase() === category.toLowerCase());
    if (targetFolder) {
      if (!targetFolder.finishes.includes(finish)) {
        targetFolder.finishes.push(finish);
      }
    } else {
      const folderId = category.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `folder-${Date.now()}`;
      this.folders.push({
        id: folderId,
        name: category,
        finishes: [finish],
        createdAt: now,
      });
    }

    if (qty > 0) {
      const transaction: StockTransaction = {
        id: uuidv4(),
        item_id: id,
        sku: newItem.sku,
        type: 'IN',
        quantity_change: qty,
        previous_quantity: 0,
        new_quantity: qty,
        reference: 'Initial Stock Addition',
        reason: 'New catalog entry created',
        created_at: now,
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('stock_transactions').insert([transaction]);
        } catch (e) {
          console.warn('Supabase transaction insert failed:', e);
        }
      }
      this.transactions.unshift(transaction);
    }

    this.saveSnapshot();
    return newItem;
  }

  public async stockIn(
    id: string,
    quantity: number,
    reference?: string,
    reason?: string
  ): Promise<{ item: LaminateItem; transaction: StockTransaction }> {
    if (quantity <= 0) {
      throw new Error('Quantity to add must be greater than 0');
    }

    const item = await this.getItemById(id);
    if (!item) throw new Error('Laminate item not found');

    const previousQty = item.quantity;
    const newQty = previousQty + quantity;
    const now = new Date().toISOString();

    const transaction: StockTransaction = {
      id: uuidv4(),
      item_id: item.id,
      sku: item.sku,
      type: 'IN',
      quantity_change: quantity,
      previous_quantity: previousQty,
      new_quantity: newQty,
      reference: reference || 'Stock Inward',
      reason: reason || 'Added to warehouse stock',
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('laminate_items')
          .update({ quantity: newQty, updated_at: now })
          .eq('id', id);

        await supabase.from('stock_transactions').insert([transaction]);
      } catch (e) {
        console.warn('Supabase update failed, keeping in local memory:', e);
      }
    }

    // Update in-memory
    item.quantity = newQty;
    item.updated_at = now;
    this.items.set(id, item);
    this.transactions.unshift(transaction);
    this.saveSnapshot();

    return { item, transaction };
  }

  public async stockOut(
    id: string,
    quantity: number,
    reference?: string,
    reason?: string
  ): Promise<{ item: LaminateItem; transaction: StockTransaction }> {
    if (quantity <= 0) {
      throw new Error('Quantity to remove must be greater than 0');
    }

    const item = await this.getItemById(id);
    if (!item) throw new Error('Laminate item not found');

    if (item.quantity < quantity) {
      throw new Error(`Insufficient stock. Current count is ${item.quantity}, cannot remove ${quantity}.`);
    }

    const previousQty = item.quantity;
    const newQty = previousQty - quantity;
    const now = new Date().toISOString();

    const transaction: StockTransaction = {
      id: uuidv4(),
      item_id: item.id,
      sku: item.sku,
      type: 'OUT',
      quantity_change: -quantity,
      previous_quantity: previousQty,
      new_quantity: newQty,
      reference: reference || 'Stock Outward',
      reason: reason || 'Dispatched from warehouse',
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('laminate_items')
          .update({ quantity: newQty, updated_at: now })
          .eq('id', id);

        await supabase.from('stock_transactions').insert([transaction]);
      } catch (e) {
        console.warn('Supabase update failed, keeping in local memory:', e);
      }
    }

    item.quantity = newQty;
    item.updated_at = now;
    this.items.set(id, item);
    this.transactions.unshift(transaction);
    this.saveSnapshot();

    return { item, transaction };
  }

  public async adjustStock(
    id: string,
    newQuantity: number,
    reason?: string
  ): Promise<{ item: LaminateItem; transaction: StockTransaction }> {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    const item = await this.getItemById(id);
    if (!item) throw new Error('Laminate item not found');

    const previousQty = item.quantity;
    const diff = newQuantity - previousQty;
    const now = new Date().toISOString();

    const transaction: StockTransaction = {
      id: uuidv4(),
      item_id: item.id,
      sku: item.sku,
      type: 'ADJUSTMENT',
      quantity_change: diff,
      previous_quantity: previousQty,
      new_quantity: newQuantity,
      reference: 'Manual Audit Count',
      reason: reason || 'Inventory audit adjustment',
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('laminate_items')
          .update({ quantity: newQuantity, updated_at: now })
          .eq('id', id);

        await supabase.from('stock_transactions').insert([transaction]);
      } catch (e) {
        console.warn('Supabase update failed, keeping in local memory:', e);
      }
    }

    item.quantity = newQuantity;
    item.updated_at = now;
    this.items.set(id, item);
    this.transactions.unshift(transaction);
    this.saveSnapshot();

    return { item, transaction };
  }

  public async getTransactions(limit = 50): Promise<StockTransaction[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('stock_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (!error && data) return data as StockTransaction[];
      } catch (e) {
        // fallback
      }
    }
    return this.transactions.slice(0, limit);
  }

  public async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const allItems = Array.from(this.items.values());
    const totalSheets = allItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const lowStockCount = allItems.filter(i => i.quantity <= i.min_threshold && i.quantity > 0).length;
    const outOfStockCount = allItems.filter(i => i.quantity === 0).length;

    // Finish breakdown
    const finishMap = new Map<string, { count: number; totalSheets: number; name: string }>();
    allItems.forEach(i => {
      const existing = finishMap.get(i.finish) || { count: 0, totalSheets: 0, name: i.finish_name || i.finish };
      existing.count += 1;
      existing.totalSheets += i.quantity;
      finishMap.set(i.finish, existing);
    });

    const finishBreakdown = Array.from(finishMap.entries()).map(([finish, stat]) => ({
      finish,
      finish_name: stat.name,
      count: stat.count,
      totalSheets: stat.totalSheets,
    })).sort((a, b) => b.totalSheets - a.totalSheets);

    // Today's inward/outward calculations
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let todayInward = 0;
    let todayOutward = 0;
    this.transactions.forEach(tx => {
      const txTime = new Date(tx.created_at);
      if (txTime >= startOfToday) {
        if (tx.type === 'IN') todayInward += tx.quantity_change;
        if (tx.type === 'OUT') todayOutward += Math.abs(tx.quantity_change);
      }
    });

    // Weekly trend (past 7 days)
    const weeklyTrends: { date: string; inward: number; outward: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date();
      day.setDate(day.getDate() - d);
      const dayStr = day.toISOString().split('T')[0];

      let dayIn = 0;
      let dayOut = 0;
      this.transactions.forEach(tx => {
        if (tx.created_at.startsWith(dayStr)) {
          if (tx.type === 'IN') dayIn += tx.quantity_change;
          if (tx.type === 'OUT') dayOut += Math.abs(tx.quantity_change);
        }
      });
      weeklyTrends.push({ date: dayStr.slice(5), inward: dayIn, outward: dayOut });
    }

    // Top moving shades
    const codeMovement = new Map<string, number>();
    this.transactions.forEach(tx => {
      const code = tx.sku.split('-')[1] || tx.sku;
      const count = codeMovement.get(code) || 0;
      codeMovement.set(code, count + Math.abs(tx.quantity_change));
    });

    const topMovingShades = Array.from(codeMovement.entries())
      .map(([code, totalMoved]) => ({ code, totalMoved }))
      .sort((a, b) => b.totalMoved - a.totalMoved)
      .slice(0, 5);

    return {
      totalSheets,
      totalSKUs: allItems.length,
      lowStockCount,
      outOfStockCount,
      finishBreakdown,
      todayInward,
      todayOutward,
      weeklyTrends,
      recentTransactions: this.transactions.slice(0, 10),
      topMovingShades,
    };
  }

  public async deleteItem(id: string): Promise<boolean> {
    const item = await this.getItemById(id);
    if (!item) {
      throw new Error('Laminate item not found');
    }

    const itemId = item.id;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('stock_transactions').delete().eq('item_id', itemId);
        await supabase.from('laminate_items').delete().eq('id', itemId);
      } catch (e) {
        console.warn('Supabase delete item failed:', e);
      }
    }

    // Record deletion in audit ledger
    this.transactions.unshift({
      id: uuidv4(),
      item_id: itemId,
      sku: item.sku,
      type: 'OUT',
      quantity_change: -item.quantity,
      previous_quantity: item.quantity,
      new_quantity: 0,
      reference: 'Catalog Deletion',
      reason: `Sheet ${item.sku} permanently removed from folder`,
      created_at: new Date().toISOString(),
    });

    this.items.delete(itemId);
    this.saveSnapshot();
    return true;
  }

  public async getFolders(): Promise<Folder[]> {
    this.syncFoldersFromItems();
    return [...this.folders];
  }

  public async createFolder(data: { name: string; finishes?: string[] }): Promise<Folder> {
    const name = data.name?.trim();
    if (!name) {
      throw new Error('Folder name is required');
    }

    const exists = this.folders.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      throw new Error(`A folder with name "${name}" already exists`);
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `folder-${Date.now()}`;
    const finishes = Array.isArray(data.finishes) && data.finishes.length > 0
      ? data.finishes.map(f => f.trim().toUpperCase())
      : ['MS', 'HT'];

    const newFolder: Folder = {
      id,
      name,
      finishes,
      createdAt: new Date().toISOString(),
    };

    this.folders.push(newFolder);
    this.saveSnapshot();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('app_settings').upsert({
          key: 'catalog_folders',
          value: this.folders,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Supabase app_settings update failed:', e);
      }
    }

    return newFolder;
  }

  public async updateFolder(id: string, data: { name?: string; finishes?: string[] }): Promise<Folder> {
    const index = this.folders.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error(`Folder with ID "${id}" not found`);
    }

    const current = this.folders[index];
    const oldName = current.name;
    const newName = data.name?.trim() || current.name;

    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      const exists = this.folders.some(f => f.id !== id && f.name.toLowerCase() === newName.toLowerCase());
      if (exists) {
        throw new Error(`Another folder with name "${newName}" already exists`);
      }
    }

    const finishes = Array.isArray(data.finishes) && data.finishes.length > 0
      ? data.finishes.map(f => f.trim().toUpperCase())
      : current.finishes;

    const updatedFolder: Folder = {
      ...current,
      name: newName,
      finishes,
    };

    this.folders[index] = updatedFolder;

    // If folder was renamed, update all items belonging to this folder
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const now = new Date().toISOString();
      for (const [itemId, item] of this.items.entries()) {
        if ((item.category || '').toLowerCase() === oldName.toLowerCase()) {
          item.category = newName;
          item.updated_at = now;
          this.items.set(itemId, item);
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('laminate_items')
            .update({ category: newName, updated_at: now })
            .ilike('category', oldName);
        } catch (e) {
          console.warn('Supabase folder rename items update failed:', e);
        }
      }
    }

    this.saveSnapshot();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('app_settings').upsert({
          key: 'catalog_folders',
          value: this.folders,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Supabase app_settings update failed:', e);
      }
    }

    return updatedFolder;
  }

  public async deleteFolder(id: string): Promise<{ success: boolean; message: string }> {
    if (this.folders.length <= 1) {
      throw new Error('Cannot delete the last remaining folder');
    }

    const folderToDelete = this.folders.find(f => f.id === id);
    if (!folderToDelete) {
      throw new Error(`Folder with ID "${id}" not found`);
    }

    const fallbackFolder = this.folders.find(f => f.id !== id) || DEFAULT_FOLDERS[0];
    const oldName = folderToDelete.name;

    // Reassign items from deleted folder to fallback folder
    const now = new Date().toISOString();
    for (const [itemId, item] of this.items.entries()) {
      if ((item.category || '').toLowerCase() === oldName.toLowerCase()) {
        item.category = fallbackFolder.name;
        item.updated_at = now;
        this.items.set(itemId, item);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('laminate_items')
          .update({ category: fallbackFolder.name, updated_at: now })
          .ilike('category', oldName);
      } catch (e) {
        console.warn('Supabase reassign items failed:', e);
      }
    }

    this.folders = this.folders.filter(f => f.id !== id);
    this.saveSnapshot();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('app_settings').upsert({
          key: 'catalog_folders',
          value: this.folders,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Supabase app_settings update failed:', e);
      }
    }

    return { success: true, message: `Folder "${oldName}" deleted successfully` };
  }
}

export const stockStore = new StockStore();
