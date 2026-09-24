import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal, RefreshCw, Sparkles, Check, AlertCircle } from 'lucide-react';
import { LaminateItem, DashboardAnalytics, StockTransaction } from './types';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import { FinishTabs } from './components/stock/FinishTabs';
import { StockCard } from './components/stock/StockCard';
import { StockInModal } from './components/stock/StockInModal';
import { StockOutModal } from './components/stock/StockOutModal';
import { QrModal } from './components/stock/QrModal';
import { ScannerModal } from './components/stock/ScannerModal';
import { PinModal } from './components/stock/PinModal';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { TransactionTable } from './components/transactions/TransactionTable';

export function App() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'analytics' | 'history'>('inventory');
  const [items, setItems] = useState<LaminateItem[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [selectedFinish, setSelectedFinish] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');

  // Modals
  const [selectedItemForIn, setSelectedItemForIn] = useState<LaminateItem | null>(null);
  const [selectedItemForOut, setSelectedItemForOut] = useState<LaminateItem | null>(null);
  const [selectedItemForQr, setSelectedItemForQr] = useState<LaminateItem | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);

  // Security / Lock
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [stockRes, analyticsData, txData] = await Promise.all([
        api.getStock(),
        api.getAnalytics(),
        api.getTransactions(50),
      ]);
      setItems(stockRes.data);
      setAnalytics(analyticsData);
      setTransactions(txData);
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      showToast('Could not sync with backend. Using local data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stock count per finish map
  const stockCountsByFinish = useMemo(() => {
    const map: Record<string, number> = {};
    let totalAll = 0;
    items.forEach((item) => {
      map[item.finish] = (map[item.finish] || 0) + item.quantity;
      totalAll += item.quantity;
    });
    map['ALL'] = totalAll;
    return map;
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Finish filter
      if (selectedFinish !== 'ALL' && item.finish !== selectedFinish) {
        return false;
      }
      // 2. Status filter
      if (statusFilter === 'low_stock' && (item.quantity > item.min_threshold || item.quantity === 0)) {
        return false;
      }
      if (statusFilter === 'out_of_stock' && item.quantity !== 0) {
        return false;
      }
      if (statusFilter === 'in_stock' && item.quantity <= item.min_threshold) {
        return false;
      }
      // 3. Search query (matches code, sku, or finish)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesFinish = item.finish.toLowerCase().includes(q);
        if (!matchesCode && !matchesSku && !matchesName && !matchesFinish) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedFinish, statusFilter, searchQuery]);

  // Quick Increment / Decrement
  const handleQuickAdjust = async (item: LaminateItem, delta: number) => {
    if (isLocked) {
      setShowPinModal(true);
      return;
    }

    try {
      if (delta > 0) {
        const res = await api.stockIn(item.id, delta, 'Quick +1 Stepper', 'Single sheet addition');
        setItems((prev) => prev.map((i) => (i.id === item.id ? res.data.item : i)));
        showToast(`+${delta} sheet added to ${item.sku}`);
      } else {
        const removeCount = Math.abs(delta);
        if (item.quantity < removeCount) {
          showToast(`Cannot remove sheet. Current stock is 0.`, 'error');
          return;
        }
        const res = await api.stockOut(item.id, removeCount, 'Quick -1 Stepper', 'Single sheet reduction');
        setItems((prev) => prev.map((i) => (i.id === item.id ? res.data.item : i)));
        showToast(`-1 sheet removed from ${item.sku}`);
      }
      // Refresh analytics in background
      api.getAnalytics().then(setAnalytics).catch(console.error);
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  // Stock In Modal Submit
  const handleStockInSubmit = async (
    itemId: string,
    quantity: number,
    reference: string,
    reason: string
  ) => {
    const res = await api.stockIn(itemId, quantity, reference, reason);
    setItems((prev) => prev.map((i) => (i.id === itemId ? res.data.item : i)));
    showToast(`Successfully added ${quantity} sheets to ${res.data.item.sku}`);
    api.getAnalytics().then(setAnalytics).catch(console.error);
    api.getTransactions(50).then(setTransactions).catch(console.error);
  };

  // Stock Out Modal Submit
  const handleStockOutSubmit = async (
    itemId: string,
    quantity: number,
    reference: string,
    reason: string
  ) => {
    const res = await api.stockOut(itemId, quantity, reference, reason);
    setItems((prev) => prev.map((i) => (i.id === itemId ? res.data.item : i)));
    showToast(`Dispatched ${quantity} sheets of ${res.data.item.sku}`);
    api.getAnalytics().then(setAnalytics).catch(console.error);
    api.getTransactions(50).then(setTransactions).catch(console.error);
  };

  // PIN Unlock
  const handlePinUnlock = async (pin: string): Promise<boolean> => {
    const res = await api.loginWithPin(pin);
    if (res.success && res.token) {
      localStorage.setItem('shiv_stock_token', res.token);
      setIsLocked(false);
      setShowPinModal(false);
      showToast('System unlocked successfully');
      return true;
    }
    return false;
  };

  const handleToggleLock = () => {
    if (isLocked) {
      setShowPinModal(true);
    } else {
      setIsLocked(true);
      showToast('System locked. PIN required for stock changes.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={analytics?.lowStockCount || 0}
        onOpenScanner={() => setShowScanner(true)}
        isLocked={isLocked}
        onToggleLock={handleToggleLock}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-bounce">
          {toast.type === 'success' ? (
            <div className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 p-1 rounded-lg">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <div className="bg-rose-500/20 text-rose-300 border-rose-500/40 p-1 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-white">{toast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Search & Status Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code (e.g. 1903) or SKU..."
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filters & Refresh */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('low_stock')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'low_stock' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Low ({analytics?.lowStockCount || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter('out_of_stock')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'out_of_stock' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Out ({analytics?.outOfStockCount || 0})
                  </button>
                </div>

                <button
                  onClick={loadData}
                  disabled={refreshing}
                  title="Reload Stock Data"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Finish Category Pills (Extracted 11 Finishes) */}
            <FinishTabs
              selectedFinish={selectedFinish}
              onSelectFinish={setSelectedFinish}
              stockCountsByFinish={stockCountsByFinish}
            />

            {/* Results Count Banner */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing <strong className="text-white">{filteredItems.length}</strong> laminate items
                {selectedFinish !== 'ALL' && <span> in finish <strong className="text-sky-400">{selectedFinish}</strong></span>}
                {searchQuery && <span> matching "<strong className="text-white">{searchQuery}</strong>"</span>}
              </span>
              <span className="hidden sm:inline text-slate-400">Shiv Laminate &bull; Pastel Series</span>
            </div>

            {/* Inventory Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="h-44 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
                <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">No Laminate Found</h4>
                <p className="text-xs text-slate-400 mb-4">
                  No stock items match your current filter and search criteria.
                </p>
                <button
                  onClick={() => {
                    setSelectedFinish('ALL');
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredItems.map((item) => (
                  <StockCard
                    key={item.id}
                    item={item}
                    onStockIn={(i) => setSelectedItemForIn(i)}
                    onStockOut={(i) => setSelectedItemForOut(i)}
                    onQuickAdjust={handleQuickAdjust}
                    onViewQr={(i) => setSelectedItemForQr(i)}
                    isLocked={isLocked}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            analytics={analytics}
            items={items}
            onSelectFinish={(finish) => {
              setSelectedFinish(finish);
              setActiveTab('inventory');
            }}
            onSelectItem={(item) => {
              setSearchQuery(item.code);
              setActiveTab('inventory');
            }}
          />
        )}

        {activeTab === 'history' && (
          <TransactionTable
            transactions={transactions}
            onRefresh={() => api.getTransactions(50).then(setTransactions)}
          />
        )}
      </main>

      {/* Modals */}
      {selectedItemForIn && (
        <StockInModal
          item={selectedItemForIn}
          onClose={() => setSelectedItemForIn(null)}
          onSubmit={handleStockInSubmit}
        />
      )}

      {selectedItemForOut && (
        <StockOutModal
          item={selectedItemForOut}
          onClose={() => setSelectedItemForOut(null)}
          onSubmit={handleStockOutSubmit}
        />
      )}

      {selectedItemForQr && (
        <QrModal
          item={selectedItemForQr}
          onClose={() => setSelectedItemForQr(null)}
        />
      )}

      {showScanner && (
        <ScannerModal
          items={items}
          onClose={() => setShowScanner(false)}
          onItemFound={(item) => {
            setSearchQuery(item.code);
            setActiveTab('inventory');
            setSelectedItemForIn(item);
          }}
        />
      )}

      {showPinModal && (
        <PinModal
          onUnlock={handlePinUnlock}
          onClose={() => setShowPinModal(false)}
          canCancel={true}
        />
      )}
    </div>
  );
}

export default App;
