export interface LaminateItem {
  id: string;
  sku: string;
  code: string;
  finish: string;
  finish_name?: string;
  name: string;
  category: string;
  brand: string;
  quantity: number;
  min_threshold: number;
  unit_price: number;
  location: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockTransaction {
  id: string;
  item_id: string;
  sku: string;
  type: TransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference?: string;
  reason?: string;
  created_at: string;
}

export interface DashboardAnalytics {
  totalSheets: number;
  totalSKUs: number;
  lowStockCount: number;
  outOfStockCount: number;
  finishBreakdown: { finish: string; finish_name: string; count: number; totalSheets: number }[];
  todayInward: number;
  todayOutward: number;
  weeklyTrends: { date: string; inward: number; outward: number }[];
  recentTransactions: StockTransaction[];
  topMovingShades: { code: string; totalMoved: number }[];
}

export interface Folder {
  id: string;
  name: string;
  finishes: string[];
  createdAt: string;
}

