// Centralized API client for Shiv Stock Mobile connecting to Render backend & Supabase database
export const API_BASE_URL = 'https://shivstock.onrender.com/api';

export interface MobileStockItem {
  id: string;
  sku: string;
  code: string;
  finish: string;
  finish_name?: string;
  name: string;
  category: string;
  brand?: string;
  quantity: number;
  min_threshold: number;
  unit_price?: number;
  location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MobileTransaction {
  id: string;
  item_id?: string;
  sku: string;
  category?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference?: string;
  reason?: string;
  created_at: string;
}

export const mobileApi = {
  async fetchStock(): Promise<MobileStockItem[]> {
    const res = await fetch(`${API_BASE_URL}/stock`);
    if (!res.ok) throw new Error(`Failed to fetch stock from server (${res.status})`);
    const json = await res.json();
    return json.data || [];
  },

  async stockIn(
    idOrSku: string,
    quantity: number,
    reference?: string,
    reason?: string
  ): Promise<{ item: MobileStockItem; transaction: any }> {
    const res = await fetch(`${API_BASE_URL}/stock/${encodeURIComponent(idOrSku)}/in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, reference, reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Stock IN failed on server');
    return json.data;
  },

  async stockOut(
    idOrSku: string,
    quantity: number,
    reference?: string,
    reason?: string
  ): Promise<{ item: MobileStockItem; transaction: any }> {
    const res = await fetch(`${API_BASE_URL}/stock/${encodeURIComponent(idOrSku)}/out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, reference, reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Stock OUT failed on server');
    return json.data;
  },

  async adjustStock(
    idOrSku: string,
    newQuantity: number,
    reason?: string
  ): Promise<{ item: MobileStockItem; transaction: any }> {
    const res = await fetch(`${API_BASE_URL}/stock/${encodeURIComponent(idOrSku)}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newQuantity, reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Stock adjustment failed on server');
    return json.data;
  },

  async createSheet(sheet: {
    code: string;
    finish: string;
    name?: string;
    category?: string;
    quantity?: number;
    min_threshold?: number;
  }): Promise<MobileStockItem> {
    const res = await fetch(`${API_BASE_URL}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheet),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create sheet on server');
    return json.data;
  },

  async fetchTransactions(limit = 100): Promise<MobileTransaction[]> {
    const res = await fetch(`${API_BASE_URL}/transactions?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch transactions (${res.status})`);
    const json = await res.json();
    return json.data || [];
  },
};
