export interface LaminateItem {
  id: string;
  sku: string;           // e.g. "SMT-1901"
  code: string;          // e.g. "1901"
  finish: string;        // e.g. "SMT"
  finish_name?: string;  // e.g. "Super Matt / Suede Matt"
  name: string;          // e.g. "Shiv Pastel 1901 (SMT)"
  category: string;      // e.g. "Pastel Colour"
  brand: string;         // "SHIV LAMINATE"
  quantity: number;      // current count in sheets
  min_threshold: number; // default: 5
  unit_price: number;    // estimated INR price per sheet
  location: string;      // Rack A-01
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
