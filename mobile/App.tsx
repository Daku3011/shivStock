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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import catalogData from './src/catalog.json';

interface Item {
  sku: string;
  code: string;
  finish: string;
  finish_name?: string;
  name: string;
  quantity: number;
  min_threshold: number;
}

interface Transaction {
  id: string;
  sku: string;
  type: 'IN' | 'OUT';
  change: number;
  balance: number;
  time: string;
}

const FINISHES = ['ALL', 'SMT', 'HG', 'SF', 'MS', 'BO', 'FS', 'CP', 'BR', 'GW', 'STN', 'HGS'];

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedFinish, setSelectedFinish] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'analytics' | 'history'>('stock');

  // Modal states
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalType, setModalType] = useState<'IN' | 'OUT' | null>(null);
  const [modalQty, setModalQty] = useState('5');

  // Load from local storage or fallback to catalog
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem('shiv_mobile_stock');
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          const initial: Item[] = (catalogData as any[]).map((c) => ({
            sku: c.sku,
            code: c.code,
            finish: c.finish,
            finish_name: c.finish_name,
            name: c.name,
            quantity: c.quantity ?? 12,
            min_threshold: c.min_threshold ?? 5,
          }));
          setItems(initial);
          await AsyncStorage.setItem('shiv_mobile_stock', JSON.stringify(initial));
        }

        const storedTx = await AsyncStorage.getItem('shiv_mobile_tx');
        if (storedTx) setTransactions(JSON.parse(storedTx));
      } catch (e) {
        console.error('Error loading mobile stock:', e);
      }
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

  const handleStockAdjust = (sku: string, type: 'IN' | 'OUT', delta: number) => {
    const item = items.find((i) => i.sku === sku);
    if (!item) return;

    if (type === 'OUT' && item.quantity < delta) {
      Alert.alert('Insufficient Stock', `Only ${item.quantity} sheets available.`);
      return;
    }

    const prev = item.quantity;
    const next = type === 'IN' ? prev + delta : prev - delta;

    const updated = items.map((i) => (i.sku === sku ? { ...i, quantity: next } : i));
    const tx: Transaction = {
      id: Date.now().toString(),
      sku,
      type,
      change: type === 'IN' ? delta : -delta,
      balance: next,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    saveItems(updated, tx);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFinish !== 'ALL' && item.finish !== selectedFinish) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.finish.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedFinish, search]);

  const totalSheets = useMemo(() => items.reduce((a, b) => a + b.quantity, 0), [items]);
  const lowStockCount = useMemo(
    () => items.filter((i) => i.quantity <= i.min_threshold).length,
    [items]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* App Topbar */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.appTitle}>
            SHIV <Text style={styles.appAccent}>LAMINATE</Text>
          </Text>
          <Text style={styles.appSubtitle}>Pastel Colour &bull; Mobile Warehouse</Text>
        </View>

        {lowStockCount > 0 && (
          <View style={styles.lowBadge}>
            <Text style={styles.lowBadgeText}>{lowStockCount} Low</Text>
          </View>
        )}
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
            Ledger
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stock' && (
        <View style={{ flex: 1 }}>
          {/* Quick Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Code (e.g. 1903) or SKU..."
              placeholderTextColor="#64748b"
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {FINISHES.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.finishPill, selectedFinish === f && styles.finishPillActive]}
                  onPress={() => setSelectedFinish(f)}
                >
                  <Text
                    style={[
                      styles.finishPillText,
                      selectedFinish === f && styles.finishPillTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(i) => i.sku}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isLow = item.quantity <= item.min_threshold;
              const isOut = item.quantity === 0;

              return (
                <View style={[styles.card, isOut && styles.cardOut, isLow && !isOut && styles.cardLow]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={styles.finishTag}>
                        <Text style={styles.finishTagText}>{item.finish}</Text>
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
                    </View>
                  </View>

                  {/* Warehouse Tactile Buttons */}
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      disabled={isOut}
                      style={[styles.adjustBtn, styles.btnOut, isOut && { opacity: 0.3 }]}
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
                      }}
                    >
                      <Text style={styles.moreBtnText}>Batch...</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <ScrollView style={styles.analyticsContainer}>
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Stock</Text>
              <Text style={styles.statVal}>{totalSheets}</Text>
              <Text style={styles.statSub}>Sheets in Warehouse</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total SKUs</Text>
              <Text style={styles.statVal}>{items.length}</Text>
              <Text style={styles.statSub}>11 Pastel Finishes</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={[styles.statCard, { borderColor: '#f59e0b' }]}>
              <Text style={[styles.statLabel, { color: '#f59e0b' }]}>Low Stock</Text>
              <Text style={[styles.statVal, { color: '#f59e0b' }]}>{lowStockCount}</Text>
              <Text style={styles.statSub}>&le; 5 sheets</Text>
            </View>

            <View style={[styles.statCard, { borderColor: '#ef4444' }]}>
              <Text style={[styles.statLabel, { color: '#ef4444' }]}>Out of Stock</Text>
              <Text style={[styles.statVal, { color: '#ef4444' }]}>
                {items.filter((i) => i.quantity === 0).length}
              </Text>
              <Text style={styles.statSub}>0 sheets</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Ledger Tab */}
      {activeTab === 'history' && (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.txRow}>
              <View>
                <Text style={styles.txSku}>{item.sku}</Text>
                <Text style={styles.txTime}>{item.time}</Text>
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
            <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 40 }}>
              No transactions recorded yet.
            </Text>
          }
        />
      )}

      {/* Batch Adjust Modal */}
      {selectedItem && modalType && (
        <Modal transparent animationType="slide" visible={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Batch Stock Adjustment</Text>
              <Text style={styles.modalSub}>{selectedItem.sku} &bull; #{selectedItem.code}</Text>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalTypeBtn, modalType === 'IN' && styles.modalTypeIn]}
                  onPress={() => setModalType('IN')}
                >
                  <Text style={styles.modalTypeBtnText}>Add (+)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalTypeBtn, modalType === 'OUT' && styles.modalTypeOut]}
                  onPress={() => setModalType('OUT')}
                >
                  <Text style={styles.modalTypeBtnText}>Remove (-)</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={modalQty}
                onChangeText={setModalQty}
                placeholder="Number of sheets"
                placeholderTextColor="#64748b"
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
                      handleStockAdjust(selectedItem.sku, modalType, q);
                      setSelectedItem(null);
                    }
                  }}
                >
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  topbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  appTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  appAccent: { color: '#38bdf8' },
  appSubtitle: { fontSize: 10, color: '#94a3b8' },
  lowBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowBadgeText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  tabContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#0284c7' },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '800' },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
  },
  clearBtn: { position: 'absolute', right: 24, top: 18 },
  clearBtnText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold' },
  finishRow: { paddingHorizontal: 12, paddingBottom: 8 },
  finishPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  finishPillActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  finishPillText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  finishPillTextActive: { color: '#ffffff' },
  listContainer: { padding: 12 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardOut: { borderColor: '#e11d48' },
  cardLow: { borderColor: '#d97706' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  finishTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  finishTagText: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  codeText: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  skuText: { color: '#64748b', fontSize: 11, fontFamily: 'monospace' },
  qtyText: { fontSize: 26, fontWeight: '900' },
  qtyNormal: { color: '#10b981' },
  qtyLow: { color: '#f59e0b' },
  qtyOut: { color: '#f43f5e' },
  unitText: { color: '#64748b', fontSize: 10, textTransform: 'uppercase' },
  btnRow: { flexDirection: 'row', gap: 8 },
  adjustBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOut: { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderWidth: 1, borderColor: '#f43f5e' },
  btnOutText: { color: '#f43f5e', fontWeight: '800', fontSize: 12 },
  btnIn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10b981' },
  btnInText: { color: '#10b981', fontWeight: '800', fontSize: 12 },
  moreBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '600' },
  analyticsContainer: { padding: 16 },
  statGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statVal: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginVertical: 4 },
  statSub: { color: '#64748b', fontSize: 10 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  txSku: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  txTime: { color: '#64748b', fontSize: 11 },
  txIn: { color: '#10b981', fontWeight: 'bold', fontSize: 16 },
  txOut: { color: '#f43f5e', fontWeight: 'bold', fontSize: 16 },
  txBalance: { color: '#94a3b8', fontSize: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modalTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTypeIn: { backgroundColor: '#10b981' },
  modalTypeOut: { backgroundColor: '#f43f5e' },
  modalTypeBtnText: { color: '#ffffff', fontWeight: 'bold' },
  modalInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    borderRadius: 12,
    height: 48,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#94a3b8', fontWeight: 'bold' },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#ffffff', fontWeight: 'bold' },
});
