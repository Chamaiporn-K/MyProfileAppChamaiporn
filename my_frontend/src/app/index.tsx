import { useEffect, useMemo, useRef, useState } from 'react';
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
import ProductCard, { Product, STATUS_STYLE } from './productcard';
import { apiCall, clearAuthSession, loadAuthToken, setAuthToken } from '../lib/api';
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

type AuthMode = 'login' | 'signup';

function AuthScreen({
  mode,
  onModeChange,
  onLogin,
  onSignup,
  errorMessage,
}: {
  mode: AuthMode;
  onModeChange: (next: AuthMode) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onSignup: (username: string, password: string, confirmPassword: string, email: string) => Promise<void>;
  errorMessage: string | null;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(username.trim(), password);
      } else {
        await onSignup(username.trim(), password, confirmPassword, email.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={styles.authSubtitle}>
          {mode === 'login' ? 'Sign in with your username and password.' : 'Create a new username and secure password.'}
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.authInput}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.authInput}
        />

        {mode === 'signup' ? (
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.authInput}
          />
        ) : null}

        {mode === 'signup' ? (
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            secureTextEntry
            style={styles.authInput}
          />
        ) : null}

        <Pressable style={[styles.authButton, isSubmitting && styles.authButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.authButtonText}>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}</Text>
        </Pressable>

        {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}

        <Pressable onPress={() => onModeChange(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.authToggleText}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

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

const STOCK_STATUS_ROWS: { key: 'In Stock' | 'Low Stock' | 'Out of Stock'; label: string }[] = [
  { key: 'In Stock', label: 'In Stock' },
  { key: 'Low Stock', label: 'Low Stock' },
  { key: 'Out of Stock', label: 'Out of Stock' },
];

function StockStatusChart({ products }: { products: Product[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { 'In Stock': 0, 'Low Stock': 0, 'Out of Stock': 0 };
    products.forEach((p) => {
      const status = getProductStatus(p.stock);
      c[status] = (c[status] ?? 0) + 1;
    });
    return c;
  }, [products]);

  const total = products.length;

  return (
    <View style={styles.dashboardCard}>
      <Text style={styles.dashboardTitle}>Stock Overview</Text>

      {total === 0 ? (
        <Text style={styles.dashboardEmptyText}>No products yet — add some to see the breakdown.</Text>
      ) : (
        <>
          <View style={styles.stackedBar}>
            {STOCK_STATUS_ROWS.map(({ key }) => {
              const count = counts[key] ?? 0;
              if (!count) return null;
              const pct = (count / total) * 100;
              return (
                <View
                  key={key}
                  style={{ width: `${pct}%`, backgroundColor: STATUS_STYLE[key].fg }}
                />
              );
            })}
          </View>

          <View style={styles.dashboardLegend}>
            {STOCK_STATUS_ROWS.map(({ key, label }) => {
              const count = counts[key] ?? 0;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <View key={key} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: STATUS_STYLE[key].fg }]} />
                    <Text style={styles.legendLabel}>{label}</Text>
                  </View>
                  <Text style={styles.legendValue}>
                    {count} · {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isAdmin = sessionUser?.role === 'admin';
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await loadAuthToken();
        if (!token) {
          setAuthReady(true);
          return;
        }

        const userData = await apiCall('/auth/me');
        setSessionUser(userData?.user ?? null);
      } catch {
        await clearAuthSession();
        setSessionUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  function loadProducts(query = searchQuery) {
    setIsLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ page: '1', limit: '50' });
    if (query.trim()) params.set('q', query.trim());

    apiCall(`/products?${params.toString()}`)
      .then((data) => {
        const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
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
    if (!sessionUser) return;
    const timer = setTimeout(() => loadProducts(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sessionUser]);

  const handleLogin = async (username: string, password: string) => {
    setAuthError(null);
    if (!username || !password) {
      setAuthError('Username and password are required.');
      return;
    }

    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      await setAuthToken(response?.token ?? null);
      setSessionUser(response?.user ?? null);
    } catch (error: any) {
      const message = error?.message || 'Unable to sign in.';
      setAuthError(message);
      Alert.alert('Sign in failed', message);
    }
  };

  const handleSignup = async (username: string, password: string, confirmPassword: string, email: string) => {
    setAuthError(null);
    if (!username || !password || !email) {
      setAuthError('Username, password, and email are required.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (password.length < 5) {
      setAuthError('Password must be at least 5 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    try {
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, email }),
      });

      await setAuthToken(response?.token ?? null);
      setSessionUser(response?.user ?? null);
    } catch (error: any) {
      const message = error?.message || 'Unable to create account.';
      setAuthError(message);
      Alert.alert('Sign up failed', message);
    }
  };

  if (!authReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B2A4A" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  if (!sessionUser) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
        errorMessage={authError}
      />
    );
  }

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


        {activeTab === 'add' ? (
          <AddProductScreen
            existingCategories={Array.from(new Set(products.map((p) => p.category)))}
            isAdmin={isAdmin}
          />
        ) : activeTab === 'edit' && editingProduct ? (
          <EditProductScreen
            product={editingProduct}
            existingCategories={Array.from(new Set(products.map((p) => p.category)))}
            isAdmin={isAdmin}
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
                isAdmin={isAdmin}
                onEdit={
                  isAdmin
                    ? (p) => {
                        setEditingProduct(p);
                        setActiveTab('edit');
                      }
                    : undefined
                }
                onDelete={isAdmin ? handleDeleteProduct : undefined}
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
                isAdmin={isAdmin}
              />
            ))}
            {products.length === 0 ? (
              <View style={styles.homeEmptyState}>
                <Text style={styles.homeEmptyTitle}>No products found</Text>
                <Text style={styles.homeEmptyText}>Try a different product name or SKU.</Text>
              </View>
            ) : null}

            <StockStatusChart products={products} />
          </ScrollView>
        )}

        <View style={styles.bottomNav}>
          {NAV_ITEMS.filter((item) => item.key !== 'add' || isAdmin).map(({ key, label, emoji }) => {
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

              <Pressable
                onPress={async () => {
                  await clearAuthSession();
                  setSessionUser(null);
                  closeDrawer();
                }}
                style={styles.drawerLogout}
              >
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
    padding: 24,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2A4A',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  authInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    color: '#0F172A',
  },
  authButton: {
    backgroundColor: '#1B2A4A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  authError: {
    marginTop: 12,
    textAlign: 'center',
    color: '#C53030',
    fontSize: 14,
  },
  authToggleText: {
    marginTop: 18,
    textAlign: 'center',
    color: '#1B2A4A',
    fontWeight: '600',
  },
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
  dashboardCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  dashboardEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  dashboardLegend: {
    marginTop: 14,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
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