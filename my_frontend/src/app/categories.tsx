import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { apiCall } from '../lib/api';

type Cat = { id: string; name: string; count: number };

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiCall('/categories')
      .then((data) => {
        setCategories(data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load categories from backend', err.message);
        setCategories([]);
        setIsLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Categories</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#1B2A4A" />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.catName}>{item.name}</Text>
                <Text style={styles.count}>{item.count} items</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#1B2A4A' },
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
  catName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  count: { fontSize: 12, color: '#64748B' },
});
