import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddProductScreen from './add';
import EditProductScreen from './edit';
import CategoriesScreen from './categories';
import LocationsScreen from './locations';
import ProductsScreen from './products';
import ProductCard, { Product } from './productcard';
import { apiCall } from '../lib/api';
import { getProductStatus } from '../lib/product-status';

const RECENT_PRODUCTS_LIMIT = 4;

const NAV_ITEMS = [
  { key: 'home', label: 'Home', emoji: '🏠' },
  { key: 'add', label: 'Add', emoji: '➕' },
  { key: 'products', label: 'Products', emoji: '📦' },
  { key: 'categories', label: 'Categories', emoji: '🗂️' },
] as const;

const DRAWER_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'locations', label: 'Location (Warehouse)' },
] as const;
const DRAWER_WIDTH = Math.min(280, Dimensions.get('window').width * 0.78);

function ThaiPatternOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.patternRow, { top: -10, left: -10 }]} />
      <View style={[styles.patternRow, { top: 20, left: 15 }]} />
      <View style={[styles.patternRow, { top: -25, left: 60 }]} />
      <View style={[styles.patternRow, { top: 15, left: 110 }]} />
      <View style={[styles.patternRow, { top: -5, left: 180 }]} />
      <View style={[styles.patternRow, { top: 30, left: 240 }]} />
      <View style={[styles.patternRow, { top: -15, left: 300 }]} />
    </View>
  );
}

function StatCard({ label, value, fg, bg }: { label: string; value: number; fg: string; bg: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function loadProducts(query = searchQuery) {
    setIsLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ page: '1', limit: '50' });
    if (query.trim()) params.set('q', query.trim());

    apiCall(`/products?${params.toString()}`)
      .then((data) => {
        const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        // Map DB columns (Productcode, Name, ...) to frontend Product shape
        const mapped: Product[] = rows.map((row: any) => ({
          id: String(row.id ?? row.Productcode ?? ''),
          name: row.name ?? row.Name ?? '',
          details: row.details ?? '',
          color: row.color ?? '',
          size: row.size ?? '',
          category: row.category ?? row.Category ?? 'Tote',
          stock: Number(row.stock ?? row.Stock ?? 0),
          stock_text: row.stock_text ?? `${row.Stock ?? row.stock ?? 0} in stock`,
          location_count: Number(row.location_count ?? 1),
          location_text: row.location_text ?? row.Location ?? '',
          image_url: row.image_url ?? row.image ?? '',
          product_link: row.product_link ?? '',
        }));
        setProducts(mapped);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setFetchError(error?.message || 'Unable to load products from backend.');
        setIsLoading(false);
      });
  }

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleDeleteProduct(product: Product) {
    setDeletingProductId(product.id);
    apiCall(`/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' })
      .then(() => {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      })
      .catch((error) => {
        console.error('Error deleting product:', error);
        Alert.alert('Delete failed', error?.message || 'Unable to delete product.');
      })
      .finally(() => setDeletingProductId(null));
  }

  const lowStockCount = products.filter((p) => getProductStatus(p.stock) !== 'In Stock').length;

  function openDrawer() {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  }

  function navigateFromDrawer(tab: 'home' | 'products' | 'categories' | 'locations') {
    setActiveTab(tab);
    closeDrawer();
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThaiPatternOverlay />

          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.iconButton} onPress={openDrawer} hitSlop={8}>
                <Text style={{ fontSize: 18, color: '#FFFFFF' }}>☰</Text>
              </Pressable>
              <View>
                <Text style={styles.headerEyebrow}>Warehouse Overview</Text>
                <Text style={styles.headerTitle}>Siam Silk House</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
                <View style={styles.notificationDot} />
              </Pressable>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>KL</Text>
              </View>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
            <TextInput
              placeholder="Search products, SKU..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                <Text style={styles.clearSearch}>×</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.statRow}>
            <StatCard label="Total items" value={products.length} fg="#1B2A4A" bg="#FFFFFF" />
            <StatCard label="Needs attention" value={lowStockCount} fg="#B4791E" bg="#FDF1DA" />
          </View>
        </View>

        {activeTab === 'home' ? (
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>Your Products</Text>
            <Pressable onPress={() => setActiveTab('products')}>
              <Text style={styles.seeAll}>See all ›</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Simple tab routing using activeTab state */}
        {activeTab === 'add' ? (
          <AddProductScreen existingCategories={Array.from(new Set(products.map((p) => p.category)))} />
        ) : activeTab === 'edit' && editingProduct ? (
          <EditProductScreen
            product={editingProduct}
            existingCategories={Array.from(new Set(products.map((p) => p.category)))}
            onSuccess={() => {
              setEditingProduct(null);
              setActiveTab('products');
              loadProducts();
            }}
            onCancel={() => {
              setEditingProduct(null);
              setActiveTab('products');
            }}
          />
        ) : activeTab === 'categories' ? (
          <CategoriesScreen products={products} />
        ) : activeTab === 'locations' ? (
          <LocationsScreen products={products} />
        ) : activeTab === 'products' ? (
          <ProductsScreen
            products={products}
            isLoading={isLoading}
            searchQuery={searchQuery}
            renderItem={({ item }: any) => (
              <ProductCard
                product={item}
                onEdit={(p) => {
                  setEditingProduct(p);
                  setActiveTab('edit');
                }}
                onDelete={handleDeleteProduct}
                isDeleting={deletingProductId === item.id}
              />
            )}
          />
        ) : isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1B2A4A" />
            <Text style={{ marginTop: 8, color: '#64748B' }}>Loading products...</Text>
          </View>
        ) : fetchError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ marginTop: 8, color: '#C53030' }}>{fetchError}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.homeContent}
            contentContainerStyle={styles.recentList}
            showsVerticalScrollIndicator={false}
          >
            {products.slice(0, RECENT_PRODUCTS_LIMIT).map((item) => (
              <ProductCard
                key={item.id}
                product={item}
              />
            ))}
            {products.length === 0 ? (
              <View style={styles.homeEmptyState}>
                <Text style={styles.homeEmptyTitle}>No products found</Text>
                <Text style={styles.homeEmptyText}>Try a different product name or SKU.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.bottomNav}>
          {NAV_ITEMS.map(({ key, label, emoji }) => {
            const isActive = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.drawerHeader}>
                <Pressable onPress={closeDrawer} hitSlop={8}>
                  <Text style={styles.drawerClose}>✕</Text>
                </Pressable>
                <Text style={styles.drawerBrand}>StockWise</Text>
                <View style={{ width: 18 }} />
              </View>

              <View style={styles.drawerMenu}>
                {DRAWER_ITEMS.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => navigateFromDrawer(item.key)}
                    style={[styles.drawerItem, activeTab === item.key && styles.drawerItemActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activeTab === item.key }}
                  >
                    <Text style={[styles.drawerItemText, activeTab === item.key && styles.drawerItemTextActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={closeDrawer} style={styles.drawerLogout}>
                <Text style={styles.drawerLogoutText}>Log out</Text>
              </Pressable>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFB', 
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1B2A4A',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden', 
    position: 'relative',
  },
  patternRow: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)', 
    transform: [{ rotate: '45deg' }],
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F2A93B',
    borderWidth: 2,
    borderColor: '#1B2A4A',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2A93B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1B2A4A',
    fontWeight: '700',
    fontSize: 13,
  },
  searchBar: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  clearSearch: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 20,
    paddingLeft: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    zIndex: 1,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.85,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 6,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B2A4A',
  },
  homeContent: {
    flex: 1,
  },
  recentList: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  homeEmptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  homeEmptyTitle: {
    color: '#1B2A4A',
    fontSize: 16,
    fontWeight: '700',
  },
  homeEmptyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#EEF1F8',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#1B2A4A',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#1B2A4A',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  drawerClose: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  drawerBrand: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  drawerMenu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  drawerItem: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 210,
  },
  drawerItemActive: { backgroundColor: 'rgba(255,255,255,0.14)' },
  drawerItemText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  drawerItemTextActive: { color: '#F2A93B' },
  drawerLogout: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  drawerLogoutText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
  },
});
