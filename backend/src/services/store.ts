import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LaminateItem, StockTransaction, DashboardAnalytics } from '../types';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// Path to catalog extracted from PDF
const catalogPath = path.resolve(__dirname, '../../../database/catalog.json');
const snapshotPath = path.resolve(__dirname, '../../data_snapshot.json');

class StockStore {
  private items: Map<string, LaminateItem> = new Map();
  private transactions: StockTransaction[] = [];
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
          console.log(`📦 Loaded ${this.items.size} stock items from local snapshot.`);
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

  private saveSnapshot() {
    try {
      const data = {
        items: Array.from(this.items.values()),
        transactions: this.transactions,
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
    return this.items.get(id) || null;
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
}

export const stockStore = new StockStore();
