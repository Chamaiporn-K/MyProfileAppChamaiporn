import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { apiCall } from '../lib/api';
import ProductCard, { Product } from './productcard';

type Cat = { id: string; name: string; count: number; stock_total: number };

export default function CategoriesScreen({ products }: { products: Product[] }) {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadCategories = useCallback(() => {
    setIsLoading(true);
    setError(null);
    apiCall('/categories')
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load categories from backend', err.message);
        setCategories([]);
        setError(err?.message || 'Unable to load categories from the database.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const categoryProducts = selectedCategory === null
    ? []
    : products.filter((product) => {
      const category = product.category?.trim() || 'Uncategorized';
      return category === selectedCategory;
    });

  if (selectedCategory !== null) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.container}>
          <Pressable onPress={() => setSelectedCategory(null)} style={styles.backButton}>
            <Text style={styles.backText}>‹ Categories</Text>
          </Pressable>
          <Text style={styles.title}>{selectedCategory}</Text>
          <Text style={styles.subtitle}>Products in this category (view only)</Text>

          <FlatList
            data={categoryProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => <ProductCard product={item} />}
            ListEmptyComponent={
              <View style={styles.messageState}>
                <Text style={styles.emptyText}>No products found in this category.</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Live data from your product database</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#1B2A4A" />
        ) : error ? (
          <View style={styles.messageState}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadCategories} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(i) => i.id}
            onRefresh={loadCategories}
            refreshing={isLoading}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedCategory(item.name)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={`View products in ${item.name}`}
              >
                <View>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.stock}>{Number(item.stock_total || 0)} units in stock</Text>
                </View>
                <View style={styles.rowEnd}>
                  <Text style={styles.count}>{item.count} items</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No categories found in the database.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1B2A4A' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 4, marginBottom: 12 },
  listContent: { flexGrow: 1, paddingBottom: 16 },
  row: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowPressed: { opacity: 0.7 },
  rowEnd: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  chevron: { color: '#1B2A4A', fontSize: 24, fontWeight: '400', lineHeight: 24 },
  catName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  stock: { color: '#64748B', fontSize: 12, marginTop: 3 },
  count: { fontSize: 12, color: '#64748B' },
  messageState: { alignItems: 'center', paddingTop: 56 },
  errorText: { color: '#C53030', textAlign: 'center' },
  retryButton: { backgroundColor: '#1B2A4A', borderRadius: 8, marginTop: 14, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  emptyText: { color: '#64748B', paddingTop: 56, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 14, paddingVertical: 4 },
  backText: { color: '#1B2A4A', fontSize: 14, fontWeight: '700' },
});
