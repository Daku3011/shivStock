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
      <div className="flex items-center justify-center p-12 text-slate-500">
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
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Stock</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{analytics.totalSheets}</div>
          <span className="text-[11px] text-slate-500">Total Laminate Sheets</span>
        </div>

        {/* Total SKUs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Active SKUs</span>
            <Tag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{analytics.totalSKUs}</div>
          <span className="text-[11px] text-slate-500">Across All Finishes</span>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">
            {analytics.lowStockCount}
          </div>
          <span className="text-[11px] text-amber-600">&le; 5 sheets threshold</span>
        </div>

        {/* Out of Stock */}
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-semibold uppercase">Out of Stock</span>
            <PackageX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700">
            {analytics.outOfStockCount}
          </div>
          <span className="text-[11px] text-rose-600">0 sheets available</span>
        </div>

        {/* Today's Inward */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase">Today In</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            +{analytics.todayInward}
          </div>
          <span className="text-[11px] text-emerald-600">Sheets received</span>
        </div>

        {/* Today's Outward */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Today Out</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            -{analytics.todayOutward}
          </div>
          <span className="text-[11px] text-slate-500">Sheets dispatched</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finish-wise Inventory Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Stock by Laminate Finish</h3>
              <p className="text-xs text-slate-500">Total sheets stocked in each surface finish</p>
            </div>
            <span className="text-xs font-semibold text-sky-600">Click bar to filter</span>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="finish" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#0369a1', fontWeight: 'bold' }}
                />
                <Bar dataKey="totalSheets" fill="#0284c7" radius={[6, 6, 0, 0]} name="Sheets in Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Inward vs Outward Movement */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">7-Day Stock Flow</h3>
              <p className="text-xs text-slate-500">Inward additions vs Outward dispatches</p>
            </div>
            <TrendingUp className="w-5 h-5 text-sky-600" />
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="inward"
                  stroke="#059669"
                  strokeWidth={2.5}
                  name="Inward (Sheets)"
                  dot={{ r: 4, fill: '#059669' }}
                />
                <Line
                  type="monotone"
                  dataKey="outward"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  name="Outward (Sheets)"
                  dot={{ r: 4, fill: '#dc2626' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Low Stock Reorder List & Top Moving Shades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reorder Alerts */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Immediate Reorder Watchlist</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
              {lowStockItems.length} items
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">All SKUs are above reorder threshold.</p>
            ) : (
              lowStockItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      {item.finish}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-slate-900">#{item.code}</span>
                      <span className="text-xs text-slate-500 ml-2 font-mono">({item.sku})</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-black ${
                        item.quantity === 0 ? 'text-rose-600' : 'text-amber-600'
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
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-bold text-slate-900">Fastest Moving Shades</h3>
            </div>
            <span className="text-xs text-slate-500">Total volume moved</span>
          </div>

          <div className="space-y-3">
            {analytics.topMovingShades.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No movement recorded yet.</p>
            ) : (
              analytics.topMovingShades.map((shade, idx) => (
                <div
                  key={shade.code}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-base font-bold text-slate-900">Shade #{shade.code}</span>
                      <span className="text-xs text-slate-500 block">Shiv Laminate Series</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-600">
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
