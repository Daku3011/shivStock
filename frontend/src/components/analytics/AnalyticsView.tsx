import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Layers,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PackageX,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { DashboardAnalytics, LaminateItem } from '../../types';

interface AnalyticsViewProps {
  analytics: DashboardAnalytics | null;
  items: LaminateItem[];
  onSelectFinish: (finish: string) => void;
  onSelectItem: (item: LaminateItem) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  items,
  onSelectFinish,
  onSelectItem,
}) => {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Loading analytics...
      </div>
    );
  }

  const lowStockItems = items.filter((i) => i.quantity <= i.min_threshold);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Sheets */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Stock</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{analytics.totalSheets}</div>
          <span className="text-[11px] text-slate-400">Total Laminate Sheets</span>
        </div>

        {/* Total SKUs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Active SKUs</span>
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{analytics.totalSKUs}</div>
          <span className="text-[11px] text-slate-400">Across 11 Finishes</span>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase">Low Stock</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {analytics.lowStockCount}
          </div>
          <span className="text-[11px] text-amber-500/80">&le; 5 sheets threshold</span>
        </div>

        {/* Out of Stock */}
        <div className="bg-slate-900/90 border border-rose-900/40 rounded-2xl p-4">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase">Out of Stock</span>
            <PackageX className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400">
            {analytics.outOfStockCount}
          </div>
          <span className="text-[11px] text-rose-500/80">0 sheets available</span>
        </div>

        {/* Today's Inward */}
        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase">Today In</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            +{analytics.todayInward}
          </div>
          <span className="text-[11px] text-emerald-500/80">Sheets received</span>
        </div>

        {/* Today's Outward */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Today Out</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            -{analytics.todayOutward}
          </div>
          <span className="text-[11px] text-slate-400">Sheets dispatched</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finish-wise Inventory Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Stock by Laminate Finish</h3>
              <p className="text-xs text-slate-400">Total sheets stocked in each surface finish</p>
            </div>
            <span className="text-xs font-semibold text-sky-400">Click bar to filter</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.finishBreakdown}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    onSelectFinish(String(e.activeLabel));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="finish" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                />
                <Bar dataKey="totalSheets" fill="#0284c7" radius={[6, 6, 0, 0]} name="Sheets in Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Inward vs Outward Movement */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">7-Day Stock Flow</h3>
              <p className="text-xs text-slate-400">Inward additions vs Outward dispatches</p>
            </div>
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="inward"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  name="Inward (Sheets)"
                  dot={{ r: 4, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="outward"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  name="Outward (Sheets)"
                  dot={{ r: 4, fill: '#f43f5e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Low Stock Reorder List & Top Moving Shades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reorder Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Immediate Reorder Watchlist</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
              {lowStockItems.length} items
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">All SKUs are above reorder threshold.</p>
            ) : (
              lowStockItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">
                      {item.finish}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-white">#{item.code}</span>
                      <span className="text-xs text-slate-400 ml-2 font-mono">({item.sku})</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-black ${
                        item.quantity === 0 ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {item.quantity} sheets
                    </span>
                    <span className="text-[10px] text-slate-400 block">Min: {item.min_threshold}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Moving Design Codes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Fastest Moving Pastel Shades</h3>
            </div>
            <span className="text-xs text-slate-400">Total volume moved</span>
          </div>

          <div className="space-y-3">
            {analytics.topMovingShades.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No movement recorded yet.</p>
            ) : (
              analytics.topMovingShades.map((shade, idx) => (
                <div
                  key={shade.code}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-base font-bold text-white">Shade #{shade.code}</span>
                      <span className="text-xs text-slate-400 block">Shiv Pastel Collection</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">
                      {shade.totalMoved} sheets
                    </span>
                    <span className="text-[10px] text-slate-400 block">cumulative flow</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
