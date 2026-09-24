import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal, RefreshCw, Sparkles, Check, AlertCircle, FolderPlus, Plus, Folder as FolderIcon } from 'lucide-react';
import { LaminateItem, DashboardAnalytics, StockTransaction } from './types';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import { FinishTabs } from './components/stock/FinishTabs';
import { StockCard } from './components/stock/StockCard';
import { StockInModal } from './components/stock/StockInModal';
import { StockOutModal } from './components/stock/StockOutModal';
import { QrModal } from './components/stock/QrModal';
import { ScannerModal } from './components/stock/ScannerModal';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { TransactionTable } from './components/transactions/TransactionTable';

export interface Folder {
  id: string;
  name: string;
  finishes: string[];
  createdAt: string;
}

const DEFAULT_FOLDERS: Folder[] = [
  {
    id: 'pastel-colour',
    name: 'Pastel Colour',
    finishes: ['SMT', 'HG', 'SF', 'MS', 'BO', 'FS', 'CP', 'BR', 'GW', 'STN', 'HGS'],
    createdAt: new Date().toISOString(),
  },
];

const COMMON_FINISHES = ['MS', 'HT', 'HG', 'SF', 'SMT', 'BO', 'FS', 'CP', 'BR', 'GW', 'STN', 'GLOSS', 'MATT'];

export function App() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'analytics' | 'history'>('inventory');
  const [items, setItems] = useState<LaminateItem[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Folder management
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('shiv_folders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved folders', e);
      }
    }
    return DEFAULT_FOLDERS;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  // Modals for Folder & Sheet
  const [showAddFolderModal, setShowAddFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedFolderFinishes, setSelectedFolderFinishes] = useState<string[]>(['MS', 'HT']);
  const [customFinishInput, setCustomFinishInput] = useState<string>('');

  const [showAddSheetModal, setShowAddSheetModal] = useState<boolean>(false);
  const [newSheetFolder, setNewSheetFolder] = useState<string>('Pastel Colour');
  const [newSheetFinish, setNewSheetFinish] = useState<string>('MS');
  const [newSheetCode, setNewSheetCode] = useState<string>('');
  const [newSheetQty, setNewSheetQty] = useState<number>(12);
  const [newSheetMin, setNewSheetMin] = useState<number>(5);

  // Filters
  const [selectedFinish, setSelectedFinish] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');

  // Stock Modals
  const [selectedItemForIn, setSelectedItemForIn] = useState<LaminateItem | null>(null);
  const [selectedItemForOut, setSelectedItemForOut] = useState<LaminateItem | null>(null);
  const [selectedItemForQr, setSelectedItemForQr] = useState<LaminateItem | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

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

      // Merge local newly added items if any
      const localStockRaw = localStorage.getItem('shiv_custom_stock');
      let customItems: LaminateItem[] = [];
      if (localStockRaw) {
        try {
          customItems = JSON.parse(localStockRaw);
        } catch (e) {
          console.error(e);
        }
      }

      const merged = [...stockRes.data.map((i) => ({ ...i, category: i.category || 'Pastel Colour' }))];
      customItems.forEach((ci) => {
        if (!merged.some((m) => m.sku === ci.sku)) {
          merged.unshift(ci);
        }
      });

      setItems(merged);
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

  // Active folder object
  const activeFolder = useMemo(() => {
    if (selectedFolderId === 'all') return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Dynamic available finishes for the active view
  const availableFinishes = useMemo(() => {
    if (activeFolder) {
      const set = new Set<string>(activeFolder.finishes);
      items.filter((i) => i.category === activeFolder.name).forEach((i) => set.add(i.finish));
      return ['ALL', ...Array.from(set)];
    }
    const set = new Set<string>();
    items.forEach((item) => set.add(item.finish));
    return ['ALL', ...Array.from(set)];
  }, [activeFolder, items]);

  useEffect(() => {
    if (selectedFinish !== 'ALL' && !availableFinishes.includes(selectedFinish)) {
      setSelectedFinish('ALL');
    }
  }, [availableFinishes, selectedFinish]);

  // Stock count per finish map
  const stockCountsByFinish = useMemo(() => {
    const map: Record<string, number> = {};
    let totalAll = 0;
    items.forEach((item) => {
      if (activeFolder && item.category !== activeFolder.name) return;
      map[item.finish] = (map[item.finish] || 0) + item.quantity;
      totalAll += item.quantity;
    });
    map['ALL'] = totalAll;
    return map;
  }, [items, activeFolder]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Folder filter
      if (activeFolder && item.category !== activeFolder.name) {
        return false;
      }
      // 2. Finish filter
      if (selectedFinish !== 'ALL' && item.finish !== selectedFinish) {
        return false;
      }
      // 3. Status filter
      if (statusFilter === 'low_stock' && (item.quantity > item.min_threshold || item.quantity === 0)) {
        return false;
      }
      if (statusFilter === 'out_of_stock' && item.quantity !== 0) {
        return false;
      }
      if (statusFilter === 'in_stock' && item.quantity <= item.min_threshold) {
        return false;
      }
      // 4. Search query (matches code, sku, name, finish, category)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesFinish = item.finish.toLowerCase().includes(q);
        const matchesCategory = (item.category || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesSku && !matchesName && !matchesFinish && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [items, activeFolder, selectedFinish, statusFilter, searchQuery]);

  // Quick Increment / Decrement without PIN
  const handleQuickAdjust = async (item: LaminateItem, delta: number) => {
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

  // Create Folder Handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    const exists = folders.some((f) => f.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast('A folder with this name already exists', 'error');
      return;
    }

    const folderId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newFolder: Folder = {
      id: folderId,
      name,
      finishes: selectedFolderFinishes.length > 0 ? selectedFolderFinishes : ['MS', 'HT'],
      createdAt: new Date().toISOString(),
    };

    const updated = [...folders, newFolder];
    setFolders(updated);
    localStorage.setItem('shiv_folders', JSON.stringify(updated));
    setSelectedFolderId(newFolder.id);
    setShowAddFolderModal(false);
    setNewFolderName('');
    setSelectedFolderFinishes(['MS', 'HT']);
    showToast(`Created folder "${name}"!`);
  };

  // Create Sheet Handler
  const handleCreateSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newSheetCode.trim();
    const finish = newSheetFinish.trim().toUpperCase();
    const folder = newSheetFolder.trim();

    if (!code || !finish) {
      showToast('Please provide both design code and finish', 'error');
      return;
    }

    const sku = `${finish}-${code}`;
    const existing = items.find((i) => i.sku.toUpperCase() === sku.toUpperCase());
    if (existing) {
      showToast(`Item with SKU "${sku}" already exists!`, 'error');
      return;
    }

    const newItem: LaminateItem = {
      id: `custom-${Date.now()}`,
      sku,
      code,
      finish,
      finish_name: `${finish} Finish`,
      name: `Shiv ${folder} ${code} (${finish})`,
      category: folder,
      brand: 'SHIV LAMINATE',
      quantity: Number(newSheetQty) || 0,
      min_threshold: Number(newSheetMin) || 5,
      unit_price: 850,
      location: 'Warehouse Rack',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedItems = [newItem, ...items];
    setItems(updatedItems);

    // Save custom items locally
    const customList = updatedItems.filter((i) => i.id.startsWith('custom-'));
    localStorage.setItem('shiv_custom_stock', JSON.stringify(customList));

    // Update folder finishes if missing
    const targetFolder = folders.find((f) => f.name === folder);
    if (targetFolder && !targetFolder.finishes.includes(finish)) {
      const updatedFolders = folders.map((f) =>
        f.id === targetFolder.id ? { ...f, finishes: [...f.finishes, finish] } : f
      );
      setFolders(updatedFolders);
      localStorage.setItem('shiv_folders', JSON.stringify(updatedFolders));
    }

    setShowAddSheetModal(false);
    setNewSheetCode('');
    setNewSheetQty(12);
    setNewSheetMin(5);
    showToast(`Added sheet ${sku} to folder "${folder}"!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-12">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={analytics?.lowStockCount || 0}
        onOpenScanner={() => setShowScanner(true)}
        activeFolderName={activeFolder ? activeFolder.name : 'Pastel Colour'}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md bg-white border border-slate-200 animate-bounce">
          {toast.type === 'success' ? (
            <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-1 rounded-lg">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <div className="bg-rose-50 text-rose-600 border border-rose-200 p-1 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-800">{toast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            {/* Folder Bar & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                <button
                  onClick={() => setSelectedFolderId('all')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedFolderId === 'all'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FolderIcon className="w-3.5 h-3.5" />
                  <span>All Folders ({items.length})</span>
                </button>

                {folders.map((f) => {
                  const isSelected = selectedFolderId === f.id;
                  const count = items.filter((i) => i.category === f.name).length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolderId(f.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <FolderIcon className="w-3.5 h-3.5" />
                      <span>{f.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-sky-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setNewFolderName('');
                    setSelectedFolderFinishes(['MS', 'HT']);
                    setShowAddFolderModal(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-dashed border-sky-300 hover:bg-sky-100 transition-all shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ New Folder</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => {
                    setNewSheetFolder(activeFolder ? activeFolder.name : folders[0]?.name || 'Pastel Colour');
                    setNewSheetFinish(activeFolder?.finishes[0] || 'MS');
                    setShowAddSheetModal(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Sheet</span>
                </button>
              </div>
            </div>

            {/* Search & Status Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code (e.g. 1903, 101), SKU, or Finish..."
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filters & Refresh */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-sm">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'all' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('low_stock')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'low_stock' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Low ({analytics?.lowStockCount || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter('out_of_stock')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'out_of_stock' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Out ({analytics?.outOfStockCount || 0})
                  </button>
                </div>

                <button
                  onClick={loadData}
                  disabled={refreshing}
                  title="Reload Stock Data"
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Finish Category Pills */}
            <FinishTabs
              selectedFinish={selectedFinish}
              onSelectFinish={setSelectedFinish}
              stockCountsByFinish={stockCountsByFinish}
              availableFinishes={availableFinishes}
            />

            {/* Results Count Banner */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Showing <strong className="text-slate-900">{filteredItems.length}</strong> laminate items
                {activeFolder && <span> in folder <strong className="text-sky-700">{activeFolder.name}</strong></span>}
                {selectedFinish !== 'ALL' && <span> with finish <strong className="text-sky-700">{selectedFinish}</strong></span>}
                {searchQuery && <span> matching "<strong className="text-slate-900">{searchQuery}</strong>"</span>}
              </span>
              <span className="hidden sm:inline text-slate-400">Shiv Laminate Stock System</span>
            </div>

            {/* Inventory Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="h-44 rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-12 text-center max-w-lg mx-auto">
                <Sparkles className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-900 mb-1">No Laminate Found</h4>
                <p className="text-xs text-slate-500 mb-4">
                  No stock items match your current filter and search criteria.
                </p>
                <button
                  onClick={() => {
                    setSelectedFinish('ALL');
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors shadow-sm"
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

      {/* Stock In Modal */}
      {selectedItemForIn && (
        <StockInModal
          item={selectedItemForIn}
          onClose={() => setSelectedItemForIn(null)}
          onSubmit={handleStockInSubmit}
        />
      )}

      {/* Stock Out Modal */}
      {selectedItemForOut && (
        <StockOutModal
          item={selectedItemForOut}
          onClose={() => setSelectedItemForOut(null)}
          onSubmit={handleStockOutSubmit}
        />
      )}

      {/* Qr Modal */}
      {selectedItemForQr && (
        <QrModal
          item={selectedItemForQr}
          onClose={() => setSelectedItemForQr(null)}
        />
      )}

      {/* Scanner Modal */}
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

      {/* Add New Folder Modal */}
      {showAddFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Folder</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new catalog folder (e.g. Heavy Texture, Acrylic, 1mm Folder)
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Heavy Texture (HT), 0.8mm Collection"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-sky-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Finishes in this Folder (Select or Add)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_FINISHES.map((f) => {
                    const isChecked = selectedFolderFinishes.includes(f);
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedFolderFinishes(selectedFolderFinishes.filter((x) => x !== f));
                          } else {
                            setSelectedFolderFinishes([...selectedFolderFinishes, f]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          isChecked
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customFinishInput}
                    onChange={(e) => setCustomFinishInput(e.target.value)}
                    placeholder="Custom finish (e.g. WOOD)"
                    className="flex-1 h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs uppercase text-slate-900 focus:border-sky-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customFinishInput.trim().toUpperCase();
                      if (trimmed && !selectedFolderFinishes.includes(trimmed)) {
                        setSelectedFolderFinishes([...selectedFolderFinishes, trimmed]);
                        setCustomFinishInput('');
                      }
                    }}
                    className="h-9 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Sheet Modal */}
      {showAddSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Laminate Sheet</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new design code to a catalog folder (e.g. MS-101, HT-101)
            </p>

            <form onSubmit={handleCreateSheet} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Folder</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {folders.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => {
                        setNewSheetFolder(f.name);
                        if (f.finishes.length > 0) {
                          setNewSheetFinish(f.finishes[0]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                        newSheetFolder === f.name
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      📁 {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Finish Code (e.g. MS, HT, HG)
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from(
                    new Set([
                      ...(folders.find((f) => f.name === newSheetFolder)?.finishes || []),
                      'MS',
                      'HT',
                      'HG',
                      'SF',
                      'SMT',
                    ])
                  ).map((fin) => (
                    <button
                      type="button"
                      key={fin}
                      onClick={() => setNewSheetFinish(fin)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        newSheetFinish === fin
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {fin}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Design Code</label>
                  <input
                    type="text"
                    required
                    value={newSheetCode}
                    onChange={(e) => setNewSheetCode(e.target.value)}
                    placeholder="e.g. 101, 1903"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-sky-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Generated SKU</label>
                  <div className="h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-sky-700 flex items-center">
                    {newSheetFinish && newSheetCode ? `${newSheetFinish}-${newSheetCode}` : '---'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Stock (Sheets)</label>
                  <input
                    type="number"
                    min="0"
                    value={newSheetQty}
                    onChange={(e) => setNewSheetQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-sky-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={newSheetMin}
                    onChange={(e) => setNewSheetMin(parseInt(e.target.value, 10) || 5)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-sky-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSheetModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  Save Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
