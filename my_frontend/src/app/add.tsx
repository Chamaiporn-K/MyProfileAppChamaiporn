import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { apiCall } from '../lib/api';

export default function AddProductScreen() {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Tote');
  const [stock, setStock] = useState('0');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('Available');

  function submit() {
    if (!name || !sku) {
      Alert.alert('Validation', 'Please provide product name and SKU.');
      return;
    }
    // POST to backend API
    const payload = {
      id: sku, // maps to Productcode
      name, // maps to Name
      category, // maps to Category
      stock: Number(stock), // maps to Stock
      location_text: location, // maps to Location in DB
      badge_status: status, // maps to Status in DB
      image_url: imageUrl, // maps to image (text) in DB
    };

    apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then((json) => {
        if (json && json.success) {
          Alert.alert('Product added', `${name} (${sku}) was added.`);
          setName('');
          setSku('');
          setStock('0');
          setLocation('');
          setImageUrl('');
          setStatus('Available');
          setCategory('Tote');
        } else {
          Alert.alert('Error', 'Failed to add product.');
        }
      })
      .catch((err) => {
        console.error('Add product error', err);
        Alert.alert('Error', err.message || 'Failed to reach the backend.');
      });
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Product</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>SKU</Text>
          <TextInput style={styles.input} value={sku} onChangeText={setSku} placeholder="TS-001" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Tote" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Stock</Text>
          <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Warehouse D4 / Shelf A1" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Image URL</Text>
          <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://...png" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <TextInput style={styles.input} value={status} onChangeText={setStatus} placeholder="Available / Low in stock / Out of Stock" />
        </View>

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Add Product</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#1B2A4A' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    color: '#0F172A',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#1B2A4A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
