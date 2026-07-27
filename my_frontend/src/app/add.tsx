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
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiCall } from '../lib/api';

function isHttpUrl(value: string) {
  return /^https?:\/\/.+/i.test(value.trim());
}

export default function AddProductScreen() {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Tote');
  const [stock, setStock] = useState('0');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('Available');
  const [imageSource, setImageSource] = useState<'none' | 'url' | 'file'>('none');

  async function pickImageFromDevice() {
    if (Platform.OS !== 'web') {
      const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to photos to upload a product image.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    const uri = asset.base64
      ? `data:${mime};base64,${asset.base64}`
      : asset.uri;
    setImageUrl(uri);
    setImageSource('file');
  }

  function onImageUrlChange(text: string) {
    setImageUrl(text);
    setImageSource(text.trim() ? 'url' : 'none');
  }

  function clearImage() {
    setImageUrl('');
    setImageSource('none');
  }

  function submit() {
    if (!name || !sku) {
      Alert.alert('Validation', 'Please provide product name and SKU.');
      return;
    }

    const trimmedImage = imageUrl.trim();
    if (trimmedImage && imageSource === 'url' && !isHttpUrl(trimmedImage) && !trimmedImage.startsWith('data:')) {
      Alert.alert('Validation', 'Image link must be a valid URL or choose a file from your device.');
      return;
    }

    const payload = {
      id: sku,
      name,
      category,
      stock: Number(stock),
      location_text: location,
      badge_status: status,
      image_url: trimmedImage || null,
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
          setImageSource('none');
          setStatus('Available');
          setCategory('Tote');
        } else {
          Alert.alert('Error', json?.error || 'Failed to add product.');
        }
      })
      .catch((err) => {
        console.error('Add product error', err);
        Alert.alert('Error', err.message || 'Failed to reach the backend.');
      });
  }

  const previewUri = imageUrl.trim() || null;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
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
          <Text style={styles.label}>Product image</Text>
          <Text style={styles.hint}>Upload from device or paste an image link (URL)</Text>

          {previewUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
              <Pressable style={styles.clearImageBtn} onPress={clearImage}>
                <Text style={styles.clearImageText}>Remove image</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable style={styles.secondaryButton} onPress={pickImageFromDevice}>
            <Text style={styles.secondaryButtonText}>Choose image from device</Text>
          </Pressable>

          <Text style={[styles.label, { marginTop: 10 }]}>Image link (optional)</Text>
          <TextInput
            style={styles.input}
            value={imageSource === 'file' ? '' : imageUrl}
            onChangeText={onImageUrlChange}
            placeholder="https://example.com/product.png"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={imageSource !== 'file'}
          />
          {imageSource === 'file' ? (
            <Text style={styles.hint}>Using uploaded image. Remove it to paste a link instead.</Text>
          ) : null}
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
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#1B2A4A' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: '600' },
  hint: { fontSize: 11, color: '#94A3B8', marginBottom: 8, lineHeight: 16 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    color: '#0F172A',
  },
  previewWrap: { marginBottom: 10, alignItems: 'flex-start' },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E6EEF6',
  },
  clearImageBtn: { marginTop: 6 },
  clearImageText: { fontSize: 12, color: '#B4791E', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1B2A4A',
  },
  secondaryButtonText: { color: '#1B2A4A', fontWeight: '600', fontSize: 13 },
  button: {
    marginTop: 18,
    backgroundColor: '#1B2A4A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});