import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Product } from './productcard';

type LocationSummary = { name: string; productCount: number; unitCount: number };

export default function LocationsScreen({ products }: { products: Product[] }) {
  const locations = useMemo<LocationSummary[]>(() => {
    const grouped = new Map<string, LocationSummary>();

    products.forEach((product) => {
      const name = product.location_text?.trim() || 'Unassigned location';
      const current = grouped.get(name) ?? { name, productCount: 0, unitCount: 0 };
      current.productCount += 1;
      current.unitCount += Number(product.stock) || 0;
      grouped.set(name, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.productCount - a.productCount);
  }, [products]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Location (Warehouse)</Text>
        <Text style={styles.subtitle}>Stock summary by storage location</Text>

        <FlatList
          data={locations}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.locationIcon}><Text style={styles.locationIconText}>⌖</Text></View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationName}>{item.name}</Text>
                <Text style={styles.locationMeta}>{item.productCount} product{item.productCount === 1 ? '' : 's'}</Text>
              </View>
              <Text style={styles.unitCount}>{item.unitCount} units</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No locations yet</Text>
              <Text style={styles.emptyText}>Add a storage location when creating a product.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  container: { flex: 1, padding: 20 },
  title: { color: '#1B2A4A', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 4, marginBottom: 16 },
  listContent: { paddingBottom: 16, flexGrow: 1 },
  row: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#F1F5F9', borderRadius: 14, borderWidth: 1, flexDirection: 'row', padding: 14 },
  locationIcon: { alignItems: 'center', backgroundColor: '#EEF1F8', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  locationIconText: { color: '#1B2A4A', fontSize: 22 },
  locationDetails: { flex: 1, marginLeft: 12 },
  locationName: { color: '#1E293B', fontSize: 14, fontWeight: '700' },
  locationMeta: { color: '#64748B', fontSize: 12, marginTop: 3 },
  unitCount: { color: '#1B2A4A', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 72 },
  emptyTitle: { color: '#1B2A4A', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
