import { LaminateItem, DashboardAnalytics, StockTransaction } from '../types';

const rawBase = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('shiv_stock_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async loginWithPin(pin: string): Promise<{ success: boolean; token?: string; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return res.json();
  },

  async verifySession(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },

  async getStock(params?: {
    finish?: string;
    search?: string;
    status?: string;
  }): Promise<{ success: boolean; count: number; data: LaminateItem[] }> {
    const query = new URLSearchParams();
    if (params?.finish) query.append('finish', params.finish);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/stock?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch stock items');
    return res.json();
  },

  async getItemBySku(sku: string): Promise<LaminateItem> {
    const res = await fetch(`${API_BASE}/stock/sku/${encodeURIComponent(sku)}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(`Item ${sku} not found`);
    const data = await res.json();
    return data.data;
  },

  async stockIn(
    id: string,
    quantity: number,
    reference?: string,
    reason?: string
  ): Promise<{ success: boolean; data: { item: LaminateItem; transaction: StockTransaction }; message: string }> {
    const res = await fetch(`${API_BASE}/stock/${id}/in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ quantity, reference, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Stock In failed');
    return data;
  },

  async stockOut(
    id: string,
    quantity: number,
    reference?: string,
    reason?: string
  ): Promise<{ success: boolean; data: { item: LaminateItem; transaction: StockTransaction }; message: string }> {
    const res = await fetch(`${API_BASE}/stock/${id}/out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ quantity, reference, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Stock Out failed');
    return data;
  },

  async adjustStock(
    id: string,
    newQuantity: number,
    reason?: string
  ): Promise<{ success: boolean; data: { item: LaminateItem; transaction: StockTransaction }; message: string }> {
    const res = await fetch(`${API_BASE}/stock/${id}/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ newQuantity, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Adjustment failed');
    return data;
  },

  async getAnalytics(): Promise<DashboardAnalytics> {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    const data = await res.json();
    return data.data;
  },

  async getTransactions(limit = 50): Promise<StockTransaction[]> {
    const res = await fetch(`${API_BASE}/transactions?limit=${limit}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch transaction history');
    const data = await res.json();
    return data.data;
  },
};
