import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { apiCall } from '../lib/api';

type ClusterSummary = {
  cluster: 'low' | 'medium' | 'high';
  product_count: number;
  average_price: number | string;
  min_price: number | string;
  max_price: number | string;
  average_monthly_sales: number | string;
  total_monthly_sales: number | string;
};

type ClusterProduct = {
  id: string;
  cluster: 'low' | 'medium' | 'high';
  price: number | string;
  monthly_sales: number | string;
};

type ClusterResponse = {
  generated_at: string | null;
  clusters: ClusterSummary[];
  products: ClusterProduct[];
};

const CLUSTER_STYLE = {
  low: { label: 'Low price', bg: '#E4F5E8', fg: '#2F8F4E' },
  medium: { label: 'Medium price', bg: '#FDF1DA', fg: '#B4791E' },
  high: { label: 'High price', bg: '#FBEFF1', fg: '#B15C74' },
} as const;

function formatPrice(value: number | string) {
  return `${Number(value || 0).toLocaleString('th-TH')} ฿`;
}

function formatGeneratedAt(value: string | null) {
  if (!value) return 'No saved analysis yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Saved analysis' : `Updated ${date.toLocaleString('th-TH')}`;
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<ClusterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (refreshing = false) => {
    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall('/clusters');
      setData({
        generated_at: response?.generated_at ?? null,
        clusters: Array.isArray(response?.clusters) ? response.clusters : [],
        products: Array.isArray(response?.products) ? response.products : [],
      });
    } catch (requestError: any) {
      setError(requestError?.message || 'Unable to load clustering results.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B2A4A" />
        <Text style={styles.loadingText}>Loading price analysis...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Dashboard unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadDashboard()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const clusters = data?.clusters ?? [];
  const products = data?.products ?? [];
  const totalValue = products.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const chartWidth = Math.max(240, width - 72);
  const maxPrice = Math.max(...products.map((product) => Number(product.price || 0)), 1);
  const maxSales = Math.max(...products.map((product) => Number(product.monthly_sales || 0)), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadDashboard(true)} tintColor="#1B2A4A" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.eyebrow}>K-MEANS ANALYSIS</Text>
          <Text style={styles.title}>Price Dashboard</Text>
          <Text style={styles.updated}>{formatGeneratedAt(data?.generated_at ?? null)}</Text>
        </View>
        <Text style={styles.titleIcon}>◌</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.metricDark]}>
          <Text style={styles.metricValueLight}>{products.length}</Text>
          <Text style={styles.metricLabelLight}>Products clustered</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatPrice(totalValue)}</Text>
          <Text style={styles.metricLabel}>Sum of listed prices</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Price groups</Text>
      {clusters.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No analysis results yet</Text>
          <Text style={styles.emptyText}>Run the K-Means script, then pull down to refresh this page.</Text>
        </View>
      ) : (
        clusters.map((summary) => {
          const style = CLUSTER_STYLE[summary.cluster] ?? CLUSTER_STYLE.medium;
          return (
            <View key={summary.cluster} style={styles.clusterCard}>
              <View style={[styles.clusterIcon, { backgroundColor: style.bg }]}>
                <Text style={[styles.clusterIconText, { color: style.fg }]}>{summary.product_count}</Text>
              </View>
              <View style={styles.clusterDetails}>
                <Text style={styles.clusterName}>{style.label}</Text>
                <Text style={styles.clusterRange}>{formatPrice(summary.min_price)} – {formatPrice(summary.max_price)}</Text>
                <Text style={styles.clusterSales}>Avg. sales: {Number(summary.average_monthly_sales || 0).toLocaleString('th-TH')} / month</Text>
              </View>
              <View style={styles.averageBlock}>
                <Text style={styles.averageLabel}>Average</Text>
                <Text style={[styles.averageValue, { color: style.fg }]}>{formatPrice(summary.average_price)}</Text>
              </View>
            </View>
          );
        })
      )}

      {products.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Price vs. monthly sales</Text>
          <Text style={styles.chartHint}>Each dot is a product; color indicates its price cluster.</Text>
          <View style={[styles.chartArea, { width: chartWidth }]}>
            <View style={styles.yAxis} />
            <View style={styles.xAxis} />
            <Text style={styles.yAxisLabel}>{maxSales.toLocaleString('th-TH')}</Text>
            <Text style={styles.axisTitleY}>Monthly sales</Text>
            <Text style={styles.axisTitleX}>Price (THB)</Text>
            {products.map((product) => {
              const style = CLUSTER_STYLE[product.cluster] ?? CLUSTER_STYLE.medium;
              const left = 28 + (Number(product.price || 0) / maxPrice) * (chartWidth - 46);
              const top = 10 + (1 - Number(product.monthly_sales || 0) / maxSales) * 126;
              return (
                <View
                  key={product.id}
                  style={[styles.dot, { left, top, backgroundColor: style.fg }]}
                  accessibilityLabel={`${product.id}: ${formatPrice(product.price)}, ${product.monthly_sales} monthly sales, ${style.label}`}
                />
              );
            })}
            <Text style={styles.xStart}>0</Text>
            <Text style={styles.xEnd}>{formatPrice(maxPrice)}</Text>
          </View>
          <View style={styles.legend}>
            {(Object.keys(CLUSTER_STYLE) as Array<keyof typeof CLUSTER_STYLE>).map((cluster) => (
              <View key={cluster} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CLUSTER_STYLE[cluster].fg }]} />
                <Text style={styles.legendText}>{CLUSTER_STYLE[cluster].label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {products.length > 0 ? <Text style={styles.sectionTitle}>Clustered products</Text> : null}
      {products.map((product) => {
        const style = CLUSTER_STYLE[product.cluster] ?? CLUSTER_STYLE.medium;
        return (
          <View key={product.id} style={styles.productRow}>
            <View>
              <Text style={styles.productCode}>{product.id}</Text>
              <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
              <Text style={styles.productSales}>{Number(product.monthly_sales || 0).toLocaleString('th-TH')} sales / month</Text>
            </View>
            <View style={[styles.clusterPill, { backgroundColor: style.bg }]}>
              <Text style={[styles.clusterPillText, { color: style.fg }]}>{style.label}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFB' },
  content: { padding: 20, paddingBottom: 30 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#FAFAFB' },
  loadingText: { marginTop: 10, color: '#64748B', fontSize: 14 },
  errorTitle: { color: '#1B2A4A', fontWeight: '700', fontSize: 17 },
  errorText: { color: '#64748B', marginTop: 8, textAlign: 'center', fontSize: 13 },
  retryButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1B2A4A' },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: '#B4791E', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  title: { color: '#1B2A4A', fontSize: 25, fontWeight: '800', marginTop: 3 },
  updated: { color: '#94A3B8', fontSize: 11, marginTop: 5 },
  titleIcon: { color: '#F2A93B', fontSize: 40, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#EDF0F5' },
  metricDark: { backgroundColor: '#1B2A4A', borderColor: '#1B2A4A' },
  metricValue: { color: '#1B2A4A', fontWeight: '800', fontSize: 20 },
  metricValueLight: { color: '#FFFFFF', fontWeight: '800', fontSize: 26 },
  metricLabel: { color: '#64748B', fontSize: 11, marginTop: 5 },
  metricLabelLight: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 5 },
  sectionTitle: { color: '#1E293B', fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 2 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: '#EDF0F5' },
  emptyTitle: { color: '#1E293B', fontWeight: '700', fontSize: 15 },
  emptyText: { color: '#64748B', fontSize: 13, marginTop: 5, lineHeight: 19 },
  clusterCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EDF0F5' },
  clusterIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  clusterIconText: { fontWeight: '800', fontSize: 16 },
  clusterDetails: { flex: 1 },
  clusterName: { color: '#1E293B', fontSize: 14, fontWeight: '700' },
  clusterRange: { color: '#64748B', fontSize: 11, marginTop: 4 },
  clusterSales: { color: '#94A3B8', fontSize: 10, marginTop: 3 },
  averageBlock: { alignItems: 'flex-end' },
  averageLabel: { color: '#94A3B8', fontSize: 10 },
  averageValue: { fontWeight: '800', fontSize: 12, marginTop: 3 },
  productRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 13, marginBottom: 8, borderWidth: 1, borderColor: '#EDF0F5' },
  productCode: { color: '#334155', fontSize: 13, fontWeight: '700' },
  productPrice: { color: '#64748B', fontSize: 12, marginTop: 3 },
  productSales: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
  clusterPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  clusterPillText: { fontSize: 11, fontWeight: '700' },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 22, borderWidth: 1, borderColor: '#EDF0F5' },
  chartHint: { color: '#64748B', fontSize: 11, marginTop: -6, marginBottom: 12 },
  chartArea: { height: 190, alignSelf: 'center', position: 'relative', marginTop: 4 },
  yAxis: { position: 'absolute', left: 28, top: 10, bottom: 32, width: 1, backgroundColor: '#CBD5E1' },
  xAxis: { position: 'absolute', left: 28, right: 10, bottom: 32, height: 1, backgroundColor: '#CBD5E1' },
  yAxisLabel: { position: 'absolute', left: 0, top: 5, color: '#94A3B8', fontSize: 9 },
  axisTitleY: { position: 'absolute', left: 0, top: 74, color: '#64748B', fontSize: 9, transform: [{ rotate: '-90deg' }] },
  axisTitleX: { position: 'absolute', right: 10, bottom: 8, color: '#64748B', fontSize: 9 },
  xStart: { position: 'absolute', left: 25, bottom: 18, color: '#94A3B8', fontSize: 9 },
  xEnd: { position: 'absolute', right: 8, bottom: 18, color: '#94A3B8', fontSize: 9 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#FFFFFF' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#64748B', fontSize: 10 },
});
