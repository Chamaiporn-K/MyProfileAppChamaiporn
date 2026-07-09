import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Status = 'In Stock' | 'Low Stock' | 'Out of Stock';
type Category = 'Tote' | 'Clutch' | 'Handbag' | 'Luggage';

type Product = {
  id: string;
  name: string;
  category: Category;
  stock: number;
  location: string;
  status: Status;
  image: ImageSourcePropType;
};

const CATEGORY_STYLE: Record<Category, { bg: string; fg: string }> = {
  Tote: { bg: '#EAF2FB', fg: '#2F6FA6' },
  Clutch: { bg: '#F6F1E8', fg: '#8A7141' },
  Handbag: { bg: '#FBEFF1', fg: '#B15C74' },
  Luggage: { bg: '#F7ECE4', fg: '#A15A2E' },
};

const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  'In Stock': { bg: '#E4F5E8', fg: '#2F8F4E' },
  'Low Stock': { bg: '#FDF1DA', fg: '#B4791E' },
  'Out of Stock': { bg: '#FBE6E6', fg: '#C23B3B' },
};

const PRODUCTS: Product[] = [
  {
    id: 'TS-001',
    name: 'Thai Silk Tote — Blue Pikul Bloom',
    category: 'Tote',
    stock: 18,
    location: 'Shelf A1',
    status: 'In Stock',
    image: require('../../assets/images/Thai_Silk Tote_Blue_Pikul_Bloom.png'),
  },
  {
    id: 'TS-002',
    name: 'Thai Silk Heritage Clutch — Floral Lace',
    category: 'Clutch',
    stock: 4,
    location: 'Shelf B2',
    status: 'Low Stock',
    image: require('../../assets/images/Thai_Silk_Heritage_Clutch_Floral_Lace.png'),
  },
  {
    id: 'TS-003',
    name: 'Thai Silk Structured Handbag — Pearl Blush',
    category: 'Handbag',
    stock: 0,
    location: 'Shelf C3',
    status: 'Out of Stock',
    image: require('../../assets/images/Thai_Silk_Structured_Handbag_Pearl_Blush.png'),
  },
  {
    id: 'TS-004',
    name: 'Thai Silk Patchwork Luggage — Ancient Khit Pattern',
    category: 'Luggage',
    stock: 25,
    location: 'Warehouse D4',
    status: 'In Stock',
    image: require('../../assets/images/Thai_Silk_Patchwork_Luggage_Ancient_Khit_Pattern.png'),
  },
];

const NAV_ITEMS = [
  { key: 'home', label: 'Home', emoji: '🏠' },
  { key: 'add', label: 'Add', emoji: '➕' },
  { key: 'products', label: 'Products', emoji: '📦' },
  { key: 'categories', label: 'Categories', emoji: '🗂️' },
] as const;

const DRAWER_ITEMS = ['Home', 'Products', 'Categories', 'Stores', 'Finances', 'Settings'];

const DRAWER_WIDTH = Math.min(280, Dimensions.get('window').width * 0.78);

// ส่วนประกอบลายผ้าไทยข้าวหลามตัดแบบไม่ต้องพึ่งรูปภาพ
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

function StatCard({
  label,
  value,
  fg,
  bg,
}: {
  label: string;
  value: number;
  fg: string;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function ProductCard({ product }: { product: Product }) {
  const cat = CATEGORY_STYLE[product.category];
  const status = STATUS_STYLE[product.status];

  return (
    <View style={styles.productCard}>
      {/* ขยายรูปภาพเป็น 64x64 ให้มองเห็นลวดลายผ้าไหมชัดเจนขึ้น */}
      <View style={[styles.productIcon, { backgroundColor: cat.bg }]}>
        <Image source={product.image} style={styles.productImage} resizeMode="cover" />
      </View>

      <View style={{ flex: 1, justifyContent: 'space-between', height: 64 }}>
        <View style={styles.productTopRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.fg }]}>{product.status}</Text>
          </View>
        </View>

        <Text style={styles.productMeta}>
          {product.id} · {product.category}
        </Text>

        <View style={styles.productBottomRow}>
          <Text style={styles.productLocation}>📍 {product.location}</Text>
          <Text style={styles.productStock}>{product.stock} units</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lowStockCount = PRODUCTS.filter((p) => p.status !== 'In Stock').length;

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
            />
          </View>

          <View style={styles.statRow}>
            <StatCard label="Total items" value={PRODUCTS.length} fg="#1B2A4A" bg="#FFFFFF" />
            <StatCard label="Needs attention" value={lowStockCount} fg="#B4791E" bg="#FDF1DA" />
          </View>
        </View>

        {/* ---------- PRODUCT SECTION ---------- */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Your Products</Text>
          <Pressable>
            <Text style={styles.seeAll}>See all ›</Text>
          </Pressable>
        </View>

        <FlatList
          data={PRODUCTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />

        {/* ---------- BOTTOM MENU ---------- */}
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

      {/* ---------- SIDE DRAWER ---------- */}
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
                  <Pressable key={item} onPress={closeDrawer} style={styles.drawerItem}>
                    <Text style={styles.drawerItemText}>{item}</Text>
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
    backgroundColor: '#FAFAFB', // ปรับพื้นหลังแอปให้อมเทาอ่อนลงนิดนึงเพื่อให้ Card สีขาวดูลอยเด่นขึ้น
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
    overflow: 'hidden', // ล็อคให้ลายข้าวหลามตัดไม่ทะลุขอบโค้ง
    position: 'relative',
  },
  patternRow: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)', // ลายจางมากๆ สไตล์ลักชูรี
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // เพิ่มช่องว่างระหว่างรูปกับข้อความให้ดูโปร่งขึ้น
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  productIcon: {
    width: 64, // ขยายจาก 52 เป็น 64
    height: 64, // ขยายจาก 52 เป็น 64
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productLocation: {
    fontSize: 11,
    color: '#64748B',
  },
  productStock: {
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
    paddingVertical: 4,
  },
  drawerItemText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
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