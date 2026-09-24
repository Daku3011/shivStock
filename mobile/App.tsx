import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import catalogData from './src/catalog.json';
import { mobileApi } from './src/services/api';

export interface Folder {
  id: string;
  name: string;
  finishes: string[];
  createdAt: string;
}

export interface Item {
  id?: string;
  sku: string;
  code: string;
  finish: string;
  finish_name?: string;
  name: string;
  category: string; // Folder name (e.g. "Pastel Colour", "Heavy Texture", etc.)
  quantity: number;
  min_threshold: number;
  location?: string;
  unit_price?: number;
}

export interface Transaction {
  id: string;
  sku: string;
  category?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  change: number;
  balance: number;
  time: string;
  note?: string;
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

export default function App() {
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); // 'all' or folder.id
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedFinish, setSelectedFinish] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stock' | 'analytics' | 'history'>('stock');

  // Modal states
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalType, setModalType] = useState<'IN' | 'OUT' | null>(null);
  const [modalQty, setModalQty] = useState<string>('5');
  const [modalNote, setModalNote] = useState<string>('');

  // Add Folder Modal state
  const [showAddFolderModal, setShowAddFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedFolderFinishes, setSelectedFolderFinishes] = useState<string[]>(['MS', 'HT']);
  const [customFinishInput, setCustomFinishInput] = useState<string>('');

  // Add Sheet Modal state
  const [showAddSheetModal, setShowAddSheetModal] = useState<boolean>(false);
  const [newSheetFolder, setNewSheetFolder] = useState<string>('Pastel Colour');
  const [newSheetFinish, setNewSheetFinish] = useState<string>('MS');
  const [newSheetCode, setNewSheetCode] = useState<string>('');
  const [newSheetName, setNewSheetName] = useState<string>('');
  const [newSheetQty, setNewSheetQty] = useState<string>('12');
  const [newSheetMin, setNewSheetMin] = useState<string>('5');

  // Cloud sync states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');

  const syncWithServer = async (fallbackFolders?: Folder[]) => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const serverItems = await mobileApi.fetchStock();
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        const formattedItems: Item[] = serverItems.map((s) => ({
          id: s.id,
          sku: s.sku,
          code: s.code,
          finish: s.finish,
          finish_name: s.finish_name,
          name: s.name,
          category: s.category || 'Pastel Colour',
          quantity: s.quantity,
          min_threshold: s.min_threshold,
          location: s.location,
          unit_price: s.unit_price,
        }));
        setItems(formattedItems);
        await AsyncStorage.setItem('shiv_mobile_stock', JSON.stringify(formattedItems));

        // Auto-merge categories found in database into folders
        const baseFolders = fallbackFolders || folders;
        const knownFolderNames = new Set(baseFolders.map((f) => f.name.toLowerCase()));
        let updatedFolders = [...baseFolders];
        let foldersChanged = false;

        formattedItems.forEach((it) => {
          if (it.category && !knownFolderNames.has(it.category.toLowerCase())) {
            const folderId = it.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            updatedFolders.push({
              id: folderId,
              name: it.category,
              finishes: [it.finish],
              createdAt: new Date().toISOString(),
            });
            knownFolderNames.add(it.category.toLowerCase());
            foldersChanged = true;
          }
        });

        if (foldersChanged) {
          setFolders(updatedFolders);
          await AsyncStorage.setItem('shiv_mobile_folders', JSON.stringify(updatedFolders));
        }
      }

      // Fetch transaction history from shared server
      const serverTx = await mobileApi.fetchTransactions(100);
      if (Array.isArray(serverTx) && serverTx.length > 0) {
        const formattedTx: Transaction[] = serverTx.map((t) => ({
          id: t.id,
          sku: t.sku,
          category: t.category,
          type: t.type as any,
          change: t.quantity_change,
          balance: t.new_quantity,
          time: t.created_at
            ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
          note: t.reason || t.reference || undefined,
        }));
        setTransactions(formattedTx);
        await AsyncStorage.setItem('shiv_mobile_tx', JSON.stringify(formattedTx));
      }

      setSyncStatus('synced');
    } catch (err) {
      console.warn('Could not sync with Render backend, running with local cache:', err);
      setSyncStatus('offline');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load from local storage immediately for speed, then sync with live Render backend
  useEffect(() => {
    async function loadData() {
      let currentFolders = DEFAULT_FOLDERS;
      try {
        // 1. Load folders from local cache
        const storedFolders = await AsyncStorage.getItem('shiv_mobile_folders');
        if (storedFolders) {
          try {
            const parsed = JSON.parse(storedFolders);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentFolders = parsed;
              setFolders(parsed);
            }
          } catch (e) {
            console.error('Failed to parse stored folders', e);
          }
        } else {
          await AsyncStorage.setItem('shiv_mobile_folders', JSON.stringify(DEFAULT_FOLDERS));
        }

        // 2. Load stock items from local cache
        const storedStock = await AsyncStorage.getItem('shiv_mobile_stock');
        if (storedStock) {
          const parsedStock: Item[] = JSON.parse(storedStock).map((it: any) => ({
            ...it,
            category: it.category || 'Pastel Colour',
          }));
          setItems(parsedStock);
        } else {
          const initial: Item[] = (catalogData as any[]).map((c) => ({
            sku: c.sku,
            code: c.code,
            finish: c.finish,
            finish_name: c.finish_name,
            name: c.name || `Shiv Pastel ${c.code} (${c.finish})`,
            category: c.category || 'Pastel Colour',
            quantity: c.quantity ?? 12,
            min_threshold: c.min_threshold ?? 5,
            location: c.location,
            unit_price: c.unit_price,
          }));
          setItems(initial);
          await AsyncStorage.setItem('shiv_mobile_stock', JSON.stringify(initial));
        }

        // 3. Load transactions from local cache
        const storedTx = await AsyncStorage.getItem('shiv_mobile_tx');
        if (storedTx) {
          setTransactions(JSON.parse(storedTx));
        }
      } catch (e) {
        console.error('Error loading mobile stock cache:', e);
      }

      // 4. Perform cloud sync with Render backend & Supabase
      await syncWithServer(currentFolders);
    }
    loadData();
  }, []);

  const saveItems = async (newItems: Item[], newTx?: Transaction) => {
    setItems(newItems);
    await AsyncStorage.setItem('shiv_mobile_stock', JSON.stringify(newItems));
    if (newTx) {
      const updatedTx = [newTx, ...transactions].slice(0, 100);
      setTransactions(updatedTx);
      await AsyncStorage.setItem('shiv_mobile_tx', JSON.stringify(updatedTx));
    }
  };

  const saveFolders = async (newFolders: Folder[]) => {
    setFolders(newFolders);
    await AsyncStorage.setItem('shiv_mobile_folders', JSON.stringify(newFolders));
  };

  const handleStockAdjust = async (sku: string, type: 'IN' | 'OUT', delta: number, note?: string) => {
    const item = items.find((i) => i.sku === sku);
    if (!item) return;

    if (type === 'OUT' && item.quantity < delta) {
      Alert.alert('Insufficient Stock', `Only ${item.quantity} sheets available for ${sku}.`);
      return;
    }

    const prev = item.quantity;
    const next = type === 'IN' ? prev + delta : prev - delta;

    // Optimistic UI update
    const updated = items.map((i) => (i.sku === sku ? { ...i, quantity: next } : i));
    const tx: Transaction = {
      id: Date.now().toString(),
      sku,
      category: item.category,
      type,
      change: type === 'IN' ? delta : -delta,
      balance: next,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: note?.trim() || undefined,
    };

    saveItems(updated, tx);

    // Persist adjustment directly to Render & Supabase
    try {
      if (type === 'IN') {
        const res = await mobileApi.stockIn(item.id || item.sku, delta, 'Mobile App', note);
        if (res?.item?.id && !item.id) {
          setItems((curr) => curr.map((it) => (it.sku === sku ? { ...it, id: res.item.id } : it)));
        }
      } else {
        const res = await mobileApi.stockOut(item.id || item.sku, delta, 'Mobile App', note);
        if (res?.item?.id && !item.id) {
          setItems((curr) => curr.map((it) => (it.sku === sku ? { ...it, id: res.item.id } : it)));
        }
      }
      setSyncStatus('synced');
    } catch (e: any) {
      console.warn('Server sync warning:', e.message);
      setSyncStatus('offline');
    }
  };

  // Active folder object if not 'all'
  const activeFolder = useMemo(() => {
    if (selectedFolderId === 'all') return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Finishes available for current view
  const availableFinishes = useMemo(() => {
    if (activeFolder) {
      // Finishes declared in the active folder or present in items
      const set = new Set<string>(activeFolder.finishes);
      items.filter((i) => i.category === activeFolder.name).forEach((i) => set.add(i.finish));
      return ['ALL', ...Array.from(set)];
    }
    // All folders: aggregate all finishes from items
    const set = new Set<string>();
    items.forEach((i) => set.add(i.finish));
    return ['ALL', ...Array.from(set)];
  }, [activeFolder, items]);

  // Reset selected finish if not available
  useEffect(() => {
    if (selectedFinish !== 'ALL' && !availableFinishes.includes(selectedFinish)) {
      setSelectedFinish('ALL');
    }
  }, [availableFinishes, selectedFinish]);

  // Filter items based on active folder, finish, and search query
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
      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          item.code.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.finish.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, activeFolder, selectedFinish, search]);

  // Analytics counts
  const totalSheets = useMemo(() => items.reduce((a, b) => a + b.quantity, 0), [items]);
  const lowStockCount = useMemo(
    () => items.filter((i) => i.quantity <= i.min_threshold).length,
    [items]
  );
  const outOfStockCount = useMemo(
    () => items.filter((i) => i.quantity === 0).length,
    [items]
  );

  // Folder-wise statistics
  const folderStats = useMemo(() => {
    return folders.map((f) => {
      const folderItems = items.filter((it) => it.category === f.name);
      const sheets = folderItems.reduce((acc, it) => acc + it.quantity, 0);
      const low = folderItems.filter((it) => it.quantity <= it.min_threshold).length;
      return {
        ...f,
        skuCount: folderItems.length,
        totalSheets: sheets,
        lowStock: low,
      };
    });
  }, [folders, items]);

  // Handler: Create New Folder
  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      Alert.alert('Folder Name Required', 'Please enter a name for the folder.');
      return;
    }
    const exists = folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Folder Exists', 'A folder with this name already exists.');
      return;
    }

    const folderId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newFolder: Folder = {
      id: folderId,
      name: trimmed,
      finishes: selectedFolderFinishes.length > 0 ? selectedFolderFinishes : ['MS', 'HT'],
      createdAt: new Date().toISOString(),
    };

    const updatedFolders = [...folders, newFolder];
    await saveFolders(updatedFolders);
    setSelectedFolderId(newFolder.id);
    setShowAddFolderModal(false);
    setNewFolderName('');
    setSelectedFolderFinishes(['MS', 'HT']);
    setCustomFinishInput('');
    Alert.alert('Folder Created', `Folder "${trimmed}" has been created! You can now add sheets to it.`);
  };

  // Handler: Toggle finish selection for new folder
  const toggleFolderFinish = (finish: string) => {
    if (selectedFolderFinishes.includes(finish)) {
      setSelectedFolderFinishes(selectedFolderFinishes.filter((f) => f !== finish));
    } else {
      setSelectedFolderFinishes([...selectedFolderFinishes, finish]);
    }
  };

  // Handler: Add custom finish to new folder
  const handleAddCustomFinish = () => {
    const trimmed = customFinishInput.trim().toUpperCase();
    if (trimmed && !selectedFolderFinishes.includes(trimmed)) {
      setSelectedFolderFinishes([...selectedFolderFinishes, trimmed]);
      setCustomFinishInput('');
    }
  };

  // Handler: Create New Sheet / SKU
  const handleCreateSheet = async () => {
    const code = newSheetCode.trim();
    const finish = newSheetFinish.trim().toUpperCase();
    const folder = newSheetFolder.trim();

    if (!code) {
      Alert.alert('Sheet Code Required', 'Please enter a design code (e.g. 101, 1903).');
      return;
    }
    if (!finish) {
      Alert.alert('Finish Required', 'Please select or enter a finish (e.g. MS, HT).');
      return;
    }

    const sku = `${finish}-${code}`;
    const qty = parseInt(newSheetQty, 10) || 0;
    const minThreshold = parseInt(newSheetMin, 10) || 5;

    // Check if SKU exists
    const existingIndex = items.findIndex((i) => i.sku.toUpperCase() === sku.toUpperCase());
    if (existingIndex >= 0) {
      Alert.alert(
        'Item Exists',
        `An item with SKU "${sku}" already exists. Would you like to adjust its stock instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Item',
            onPress: () => {
              setSearch(code);
              setShowAddSheetModal(false);
            },
          },
        ]
      );
      return;
    }

    const newItem: Item = {
      sku,
      code,
      finish,
      name: newSheetName.trim() || `Shiv ${folder} ${code} (${finish})`,
      category: folder,
      quantity: qty,
      min_threshold: minThreshold,
    };

    const newTx: Transaction = {
      id: Date.now().toString(),
      sku,
      category: folder,
      type: 'IN',
      change: qty,
      balance: qty,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: 'Initial catalog addition',
    };

    const updatedItems = [newItem, ...items];
    await saveItems(updatedItems, qty > 0 ? newTx : undefined);

    // Call server to persist in Render/Supabase
    try {
      const serverItem = await mobileApi.createSheet({
        code,
        finish,
        name: newItem.name,
        category: folder,
        quantity: qty,
        min_threshold: minThreshold,
      });
      if (serverItem && serverItem.id) {
        setItems((current) =>
          current.map((it) => (it.sku === sku ? { ...it, id: serverItem.id } : it))
        );
      }
      setSyncStatus('synced');
    } catch (e: any) {
      console.warn('Server create sheet sync warning:', e.message);
    }

    // Also update folder finishes if not present
    const targetFolder = folders.find((f) => f.name === folder);
    if (targetFolder && !targetFolder.finishes.includes(finish)) {
      const updatedFolders = folders.map((f) =>
        f.id === targetFolder.id ? { ...f, finishes: [...f.finishes, finish] } : f
      );
      await saveFolders(updatedFolders);
    }

    setShowAddSheetModal(false);
    setNewSheetCode('');
    setNewSheetName('');
    setNewSheetQty('12');
    setNewSheetMin('5');
    Alert.alert('Sheet Added', `Added sheet ${sku} to folder "${folder}" with ${qty} sheets.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* App Topbar - Clean Light Theme */}
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.appTitle}>
              SHIV <Text style={styles.appAccent}>LAMINATE</Text>
            </Text>
            {/* <Text style={styles.appSubtitle}>
              {activeFolder ? `${activeFolder.name} Folder` : 'All Warehouse Folders'} &bull; Single Owner
            </Text> */}
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[
              styles.syncBadge,
              syncStatus === 'synced' && styles.syncBadgeSynced,
              syncStatus === 'syncing' && styles.syncBadgeSyncing,
              syncStatus === 'offline' && styles.syncBadgeOffline,
            ]}
            onPress={() => syncWithServer()}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : (
              <View
                style={[
                  styles.syncDot,
                  syncStatus === 'synced' && styles.syncDotSynced,
                  syncStatus === 'offline' && styles.syncDotOffline,
                ]}
              />
            )}
            <Text style={styles.syncBadgeText}>
              {syncStatus === 'synced' ? 'Live Cloud' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
            </Text>
          </TouchableOpacity>

          {lowStockCount > 0 && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>{lowStockCount} Low</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addSheetBtn}
            onPress={() => {
              setNewSheetFolder(activeFolder ? activeFolder.name : folders[0]?.name || 'Pastel Colour');
              setNewSheetFinish(activeFolder?.finishes[0] || 'MS');
              setShowAddSheetModal(true);
            }}
          >
            <Text style={styles.addSheetBtnText}>+ Sheet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stock' && styles.tabActive]}
          onPress={() => setActiveTab('stock')}
        >
          <Text style={[styles.tabText, activeTab === 'stock' && styles.tabTextActive]}>
            Stock ({filteredItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'analytics' && styles.tabActive]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Ledger ({transactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stock Tab View */}
      {activeTab === 'stock' && (
        <View style={{ flex: 1 }}>
          {/* Folder Bar */}
          <View style={styles.folderRowContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
              <TouchableOpacity
                style={[styles.folderPill, selectedFolderId === 'all' && styles.folderPillActive]}
                onPress={() => setSelectedFolderId('all')}
              >
                <Text style={[styles.folderPillText, selectedFolderId === 'all' && styles.folderPillTextActive]}>
                  📁 All Folders
                </Text>
                <View style={[styles.folderCountBadge, selectedFolderId === 'all' && styles.folderCountBadgeActive]}>
                  <Text style={[styles.folderCountText, selectedFolderId === 'all' && styles.folderCountTextActive]}>
                    {items.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {folders.map((f) => {
                const isSelected = selectedFolderId === f.id;
                const count = items.filter((i) => i.category === f.name).length;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.folderPill, isSelected && styles.folderPillActive]}
                    onPress={() => setSelectedFolderId(f.id)}
                  >
                    <Text style={[styles.folderPillText, isSelected && styles.folderPillTextActive]}>
                      📁 {f.name}
                    </Text>
                    <View style={[styles.folderCountBadge, isSelected && styles.folderCountBadgeActive]}>
                      <Text style={[styles.folderCountText, isSelected && styles.folderCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.addFolderPill}
                onPress={() => {
                  setNewFolderName('');
                  setSelectedFolderFinishes(['MS', 'HT']);
                  setShowAddFolderModal(true);
                }}
              >
                <Text style={styles.addFolderPillText}>+ New Folder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Quick Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Code (e.g. 1903, 101), SKU, or Finish..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>&times;</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Finish Selector */}
          <View style={styles.finishRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
              {availableFinishes.map((f) => {
                const isSelected = selectedFinish === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.finishPill, isSelected && styles.finishPillActive]}
                    onPress={() => setSelectedFinish(f)}
                  >
                    <Text style={[styles.finishPillText, isSelected && styles.finishPillTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(i) => i.sku}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isSyncing}
                onRefresh={syncWithServer}
                colors={['#0284c7']}
                tintColor="#0284c7"
              />
            }
            renderItem={({ item }) => {
              const isLow = item.quantity <= item.min_threshold;
              const isOut = item.quantity === 0;

              return (
                <View style={[styles.card, isOut && styles.cardOut, isLow && !isOut && styles.cardLow]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.tagRow}>
                        <View style={styles.finishTag}>
                          <Text style={styles.finishTagText}>{item.finish}</Text>
                        </View>
                        <View style={styles.folderTag}>
                          <Text style={styles.folderTagText}>{item.category}</Text>
                        </View>
                      </View>
                      <Text style={styles.codeText}>#{item.code}</Text>
                      <Text style={styles.skuText}>{item.sku}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.qtyText,
                          isOut ? styles.qtyOut : isLow ? styles.qtyLow : styles.qtyNormal,
                        ]}
                      >
                        {item.quantity}
                      </Text>
                      <Text style={styles.unitText}>sheets</Text>
                      <Text
                        style={[
                          styles.statusLabel,
                          isOut ? styles.statusLabelOut : isLow ? styles.statusLabelLow : styles.statusLabelNormal,
                        ]}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </Text>
                    </View>
                  </View>

                  {/* Tactile Buttons */}
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      disabled={isOut}
                      style={[styles.adjustBtn, styles.btnOut, isOut && { opacity: 0.35 }]}
                      onPress={() => handleStockAdjust(item.sku, 'OUT', 1)}
                    >
                      <Text style={styles.btnOutText}>- 1 Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adjustBtn, styles.btnIn]}
                      onPress={() => handleStockAdjust(item.sku, 'IN', 1)}
                    >
                      <Text style={styles.btnInText}>+ 1 In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => {
                        setSelectedItem(item);
                        setModalType('IN');
                        setModalQty('5');
                        setModalNote('');
                      }}
                    >
                      <Text style={styles.moreBtnText}>Batch...</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No laminate sheets found</Text>
                <Text style={styles.emptySubtitle}>
                  {search ? 'Try adjusting your search terms' : 'Add your first sheet to this folder!'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    setNewSheetFolder(activeFolder ? activeFolder.name : folders[0]?.name || 'Pastel Colour');
                    setNewSheetFinish(activeFolder?.finishes[0] || 'MS');
                    setShowAddSheetModal(true);
                  }}
                >
                  <Text style={styles.emptyAddBtnText}>+ Add Sheet to Folder</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <ScrollView style={styles.analyticsContainer}>
          <Text style={styles.sectionTitle}>Warehouse Overview</Text>
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Stock</Text>
              <Text style={styles.statVal}>{totalSheets}</Text>
              <Text style={styles.statSub}>Sheets across all folders</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total SKUs</Text>
              <Text style={styles.statVal}>{items.length}</Text>
              <Text style={styles.statSub}>{folders.length} Catalog Folders</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={[styles.statCard, { borderColor: '#fcd34d', backgroundColor: '#fffbeb' }]}>
              <Text style={[styles.statLabel, { color: '#b45309' }]}>Low Stock</Text>
              <Text style={[styles.statVal, { color: '#b45309' }]}>{lowStockCount}</Text>
              <Text style={styles.statSub}>&le; min threshold</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.statLabel, { color: '#b91c1c' }]}>Out of Stock</Text>
              <Text style={[styles.statVal, { color: '#b91c1c' }]}>{outOfStockCount}</Text>
              <Text style={styles.statSub}>0 sheets available</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Folder Distribution</Text>
          {folderStats.map((fs) => (
            <View key={fs.id} style={styles.folderStatCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.folderStatName}>📁 {fs.name}</Text>
                <Text style={styles.folderStatFinishes}>Finishes: {fs.finishes.join(', ')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.folderStatSheets}>{fs.totalSheets} sheets</Text>
                <Text style={styles.folderStatSkus}>{fs.skuCount} SKUs ({fs.lowStock} low)</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Ledger Tab */}
      {activeTab === 'history' && (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={syncWithServer}
              colors={['#0284c7']}
              tintColor="#0284c7"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.txSku}>{item.sku}</Text>
                  {item.category && <Text style={styles.txCategoryTag}>{item.category}</Text>}
                </View>
                <Text style={styles.txTime}>{item.time}</Text>
                {item.note && <Text style={styles.txNote}>{item.note}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={item.type === 'IN' ? styles.txIn : styles.txOut}>
                  {item.type === 'IN' ? `+${item.change}` : item.change}
                </Text>
                <Text style={styles.txBalance}>Bal: {item.balance}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 13 }}>
              No transactions recorded yet.
            </Text>
          }
        />
      )}

      {/* Batch Adjust Modal */}
      {selectedItem && modalType && (
        <Modal transparent animationType="fade" visible={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Batch Stock Adjustment</Text>
              <Text style={styles.modalSub}>
                {selectedItem.sku} &bull; #{selectedItem.code} ({selectedItem.category})
              </Text>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalTypeBtn, modalType === 'IN' && styles.modalTypeIn]}
                  onPress={() => setModalType('IN')}
                >
                  <Text style={[styles.modalTypeBtnText, modalType === 'IN' && styles.modalTypeBtnTextActive]}>
                    + Add Sheets
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalTypeBtn, modalType === 'OUT' && styles.modalTypeOut]}
                  onPress={() => setModalType('OUT')}
                >
                  <Text style={[styles.modalTypeBtnText, modalType === 'OUT' && styles.modalTypeBtnTextActive]}>
                    - Remove Sheets
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={modalQty}
                onChangeText={setModalQty}
                placeholder="Number of sheets"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Optional Reference / Reason</Text>
              <TextInput
                style={styles.modalInputText}
                value={modalNote}
                onChangeText={setModalNote}
                placeholder="e.g. Received from supplier / Job site delivery"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirm}
                  onPress={() => {
                    const q = parseInt(modalQty, 10);
                    if (!isNaN(q) && q > 0) {
                      handleStockAdjust(selectedItem.sku, modalType, q, modalNote);
                      setSelectedItem(null);
                    } else {
                      Alert.alert('Invalid Quantity', 'Please enter a valid positive number.');
                    }
                  }}
                >
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Add New Folder Modal */}
      {showAddFolderModal && (
        <Modal transparent animationType="fade" visible={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Create New Laminate Folder</Text>
              <Text style={styles.modalSub}>
                Organize laminates by catalog folder (e.g. Heavy Texture, Acrylic, 1mm)
              </Text>

              <Text style={styles.inputLabel}>Folder Name</Text>
              <TextInput
                style={styles.modalInputText}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="e.g. Heavy Texture (HT), 0.8mm Collection"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Select Finishes for this Folder</Text>
              <View style={styles.finishSelectGrid}>
                {COMMON_FINISHES.map((f) => {
                  const isChecked = selectedFolderFinishes.includes(f);
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[styles.finishSelectChip, isChecked && styles.finishSelectChipActive]}
                      onPress={() => toggleFolderFinish(f)}
                    >
                      <Text style={[styles.finishSelectChipText, isChecked && styles.finishSelectChipTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8 }}>
                <TextInput
                  style={[styles.modalInputText, { flex: 1, marginBottom: 0 }]}
                  value={customFinishInput}
                  onChangeText={setCustomFinishInput}
                  placeholder="Or type custom finish (e.g. MATT)"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.addCustomFinishBtn} onPress={handleAddCustomFinish}>
                  <Text style={styles.addCustomFinishBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.modalActions, { marginTop: 20 }]}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowAddFolderModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateFolder}>
                  <Text style={styles.modalConfirmText}>Save Folder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Add New Sheet Modal */}
      {showAddSheetModal && (
        <Modal transparent animationType="fade" visible={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Add New Laminate Sheet</Text>
              <Text style={styles.modalSub}>
                Add a new sheet design to a folder (e.g. MS-101, HT-101)
              </Text>

              {/* Folder Selector */}
              <Text style={styles.inputLabel}>Folder</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.folderChoiceChip, newSheetFolder === f.name && styles.folderChoiceChipActive]}
                    onPress={() => {
                      setNewSheetFolder(f.name);
                      if (f.finishes.length > 0 && !f.finishes.includes(newSheetFinish)) {
                        setNewSheetFinish(f.finishes[0]);
                      }
                    }}
                  >
                    <Text style={[styles.folderChoiceChipText, newSheetFolder === f.name && styles.folderChoiceChipTextActive]}>
                      📁 {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Finish Selector */}
              <Text style={styles.inputLabel}>Finish Code (e.g. MS, HT, HG)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
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
                  <TouchableOpacity
                    key={fin}
                    style={[styles.finishSelectChip, newSheetFinish === fin && styles.finishSelectChipActive]}
                    onPress={() => setNewSheetFinish(fin)}
                  >
                    <Text style={[styles.finishSelectChipText, newSheetFinish === fin && styles.finishSelectChipTextActive]}>
                      {fin}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Design Code</Text>
                  <TextInput
                    style={styles.modalInputText}
                    value={newSheetCode}
                    onChangeText={setNewSheetCode}
                    placeholder="e.g. 101, 1903"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Generated SKU</Text>
                  <View style={styles.skuPreviewBox}>
                    <Text style={styles.skuPreviewText}>
                      {newSheetFinish && newSheetCode ? `${newSheetFinish}-${newSheetCode}` : '---'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Initial Sheets</Text>
                  <TextInput
                    style={styles.modalInputText}
                    keyboardType="numeric"
                    value={newSheetQty}
                    onChangeText={setNewSheetQty}
                    placeholder="12"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min Threshold</Text>
                  <TextInput
                    style={styles.modalInputText}
                    keyboardType="numeric"
                    value={newSheetMin}
                    onChangeText={setNewSheetMin}
                    placeholder="5"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={[styles.modalActions, { marginTop: 14 }]}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowAddSheetModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateSheet}>
                  <Text style={styles.modalConfirmText}>Save Sheet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0b0c0e',
  },
  appTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  appAccent: { color: '#0284c7' },
  appSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lowBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowBadgeText: { color: '#b45309', fontSize: 11, fontWeight: '700' },
  addSheetBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSheetBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  tabContainer: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#0284c7' },
  tabText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '800' },
  folderRowContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
  },
  folderRow: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  folderPillActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
  },
  folderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  folderPillTextActive: {
    color: '#0369a1',
  },
  folderCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  folderCountBadgeActive: {
    backgroundColor: '#0284c7',
  },
  folderCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  folderCountTextActive: {
    color: '#ffffff',
  },
  addFolderPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  addFolderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#0f172a',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  clearBtn: { position: 'absolute', right: 24, top: 18 },
  clearBtnText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold' },
  finishRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  finishPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  finishPillActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  finishPillText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  finishPillTextActive: { color: '#ffffff' },
  listContainer: { padding: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardOut: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cardLow: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  finishTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  finishTagText: { color: '#0369a1', fontSize: 10, fontWeight: '800' },
  folderTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  folderTagText: { color: '#64748b', fontSize: 10, fontWeight: '600' },
  codeText: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  skuText: { color: '#64748b', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  qtyText: { fontSize: 26, fontWeight: '900' },
  qtyNormal: { color: '#059669' },
  qtyLow: { color: '#d97706' },
  qtyOut: { color: '#dc2626' },
  unitText: { color: '#64748b', fontSize: 10, textTransform: 'uppercase' },
  statusLabel: { fontSize: 9, fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
  statusLabelNormal: { color: '#059669' },
  statusLabelLow: { color: '#d97706' },
  statusLabelOut: { color: '#dc2626' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  adjustBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOut: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  btnOutText: { color: '#e11d48', fontWeight: '800', fontSize: 12 },
  btnIn: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  btnInText: { color: '#059669', fontWeight: '800', fontSize: 12 },
  moreBtn: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moreBtnText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
  emptySubtitle: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 16 },
  emptyAddBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  analyticsContainer: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statVal: { color: '#0f172a', fontSize: 24, fontWeight: '900', marginVertical: 2 },
  statSub: { color: '#94a3b8', fontSize: 10 },
  folderStatCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  folderStatName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  folderStatFinishes: { fontSize: 11, color: '#64748b', marginTop: 2 },
  folderStatSheets: { fontSize: 16, fontWeight: '900', color: '#0284c7' },
  folderStatSkus: { fontSize: 11, color: '#64748b' },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txSku: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  txCategoryTag: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '700',
  },
  txTime: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  txNote: { color: '#64748b', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  txIn: { color: '#059669', fontWeight: '800', fontSize: 16 },
  txOut: { color: '#dc2626', fontWeight: '800', fontSize: 16 },
  txBalance: { color: '#64748b', fontSize: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  modalTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  modalSub: { color: '#64748b', fontSize: 11, textAlign: 'center', marginBottom: 14, marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modalTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTypeIn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  modalTypeOut: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  modalTypeBtnText: { color: '#64748b', fontWeight: '700', fontSize: 12 },
  modalTypeBtnTextActive: { color: '#0f172a', fontWeight: '900' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    borderRadius: 10,
    height: 44,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalInputText: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    borderRadius: 10,
    height: 42,
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  finishSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  finishSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  finishSelectChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  finishSelectChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  finishSelectChipTextActive: { color: '#ffffff' },
  addCustomFinishBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCustomFinishBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  folderChoiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  folderChoiceChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
  },
  folderChoiceChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  folderChoiceChipTextActive: { color: '#0369a1' },
  skuPreviewBox: {
    backgroundColor: '#f1f5f9',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  skuPreviewText: { fontSize: 14, fontWeight: '900', color: '#0284c7' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCancelText: { color: '#64748b', fontWeight: '700' },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#ffffff', fontWeight: '800' },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    gap: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  syncBadgeSynced: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  syncBadgeSyncing: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  syncBadgeOffline: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  syncDotSynced: {
    backgroundColor: '#10b981',
  },
  syncDotSyncing: {
    backgroundColor: '#3b82f6',
  },
  syncDotOffline: {
    backgroundColor: '#f59e0b',
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});
