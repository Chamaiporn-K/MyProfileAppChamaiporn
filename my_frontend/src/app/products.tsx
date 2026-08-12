import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

export default function ProductsScreen({
  products,
  isLoading,
  renderItem,
  searchQuery,
}: {
  products: any[];
  isLoading: boolean;
  renderItem: any;
  searchQuery: string;
}) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Products</Text>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1B2A4A" />
            <Text style={{ marginTop: 8, color: '#64748B' }}>Loading products...</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item: any) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? `No products match “${searchQuery}”. Try a different keyword.`
                    : 'There are no products to display.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#1B2A4A' },
  listContent: { paddingBottom: 16, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 72 },
  emptyTitle: { color: '#1B2A4A', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
