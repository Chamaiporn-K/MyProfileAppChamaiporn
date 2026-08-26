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
import { getProductStatus } from '../lib/product-status';

function isHttpUrl(value: string) {
  return /^https?:\/\/.+/i.test(value.trim());
}

const DEFAULT_CATEGORIES = ['Tote', 'Heritage Clutch', 'Structured Handbag', 'Patchwork Luggage'];

export type EditableProduct = {
  id: string;
  name: string;
  details?: string;
  color?: string;
  size?: string;
  category: string;
  stock: number;
  location_text: string;
  image_url: string;
};

type AddProductScreenProps = {
  existingCategories?: string[];
  product?: EditableProduct | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isAdmin?: boolean;
};

export default function AddProductScreen({
  existingCategories = [],
  product = null,
  onSuccess,
  onCancel,
  isAdmin = false,
}: AddProductScreenProps) {
  const isEditMode = !!product;

  // Second layer of defense: even if a parent forgets to gate navigation,
  // this screen refuses to render the form for a non-admin session. The
  // backend still enforces this on every write — this is UI-only.
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.accessDeniedWrap}>
          <Text style={styles.accessDeniedTitle}>Access denied</Text>
          <Text style={styles.accessDeniedText}>
            You need an admin account to {isEditMode ? 'edit' : 'add'} products.
          </Text>
          {onCancel ? (
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Go back</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const initialCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories, ...(product?.category ? [product.category] : [])])
  );

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.id ?? '');
  const [details, setDetails] = useState(product?.details ?? '');
  const [color, setColor] = useState(product?.color ?? '');
  const [size, setSize] = useState(product?.size ?? '');
  const [categoryOptions, setCategoryOptions] = useState<string[]>(initialCategories);
  const [category, setCategory] = useState(product?.category ?? initialCategories[0] ?? 'Tote');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [location, setLocation] = useState(product?.location_text ?? '');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [imageSource, setImageSource] = useState<'none' | 'url' | 'file'>(
    product?.image_url ? 'url' : 'none'
  );

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

  function confirmNewCategory() {
    const trimmed = newCategoryText.trim();
    if (!trimmed) {
      setIsAddingCategory(false);
      setNewCategoryText('');
      return;
    }
    const alreadyExists = categoryOptions.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      Alert.alert('Category exists', `"${trimmed}" is already in the list.`);
      return;
    }
    setCategoryOptions((prev) => [...prev, trimmed]);
    setCategory(trimmed);
    setNewCategoryText('');
    setIsAddingCategory(false);
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

    const parsedStock = Number(stock);
    const derivedStatus = getProductStatus(parsedStock);
    const payload = {
      id: sku,
      name,
      details,
      color: color.trim() || null,
      size,
      category,
      stock: parsedStock,
      location_text: location,
      image_url: trimmedImage || null,
    };

    const request = isEditMode
      ? apiCall(`/products/${encodeURIComponent(product!.id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : apiCall('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

    request
      .then((json) => {
        if (json && json.success) {
          if (isEditMode) {
            Alert.alert('Product updated', `${name} (${sku}) was updated.`);
            onSuccess?.();
          } else {
            Alert.alert('Product added', `${name} (${sku}) was added.`);
            setName('');
            setSku('');
            setDetails('');
            setColor('');
            setSize('');
            setStock('0');
            setLocation('');
            setImageUrl('');
            setImageSource('none');
            setCategory(categoryOptions[0] ?? 'Tote');
          }
        } else {
          Alert.alert('Error', json?.error || `Failed to ${isEditMode ? 'update' : 'add'} product.`);
        }
      })
      .catch((err) => {
        console.error(`${isEditMode ? 'Edit' : 'Add'} product error`, err);
        Alert.alert('Error', err.message || 'Failed to reach the backend.');
      });
  }

  const previewUri = imageUrl.trim() || null;
  const derivedStatus = getProductStatus(Number(stock));

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isEditMode ? 'Edit Product' : 'Add Product'}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>SKU</Text>
          <TextInput
            style={[styles.input, isEditMode && styles.inputDisabled]}
            value={sku}
            onChangeText={setSku}
            placeholder="TS-001"
            editable={!isEditMode}
          />
          {isEditMode ? <Text style={styles.hint}>SKU can't be changed after creation.</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Details</Text>
          <TextInput
            style={styles.input}
            value={details}
            onChangeText={setDetails}
            placeholder="Short product details"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Color</Text>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="e.g. Black, Tan"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Size</Text>
          <TextInput
            style={styles.input}
            value={size}
            onChangeText={setSize}
            placeholder="e.g. S, M, L / 30x20cm"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {categoryOptions.map((c) => {
              const selected = c === category;
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c}</Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[styles.chip, styles.chipAddNew]}
              onPress={() => setIsAddingCategory((v) => !v)}
            >
              <Text style={styles.chipAddNewText}>{isAddingCategory ? '✕ Cancel' : '+ New category'}</Text>
            </Pressable>
          </View>

          {isAddingCategory ? (
            <View style={styles.newCategoryRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newCategoryText}
                onChangeText={setNewCategoryText}
                placeholder="New category name"
                autoFocus
                onSubmitEditing={confirmNewCategory}
              />
              <Pressable style={styles.addCategoryBtn} onPress={confirmNewCategory}>
                <Text style={styles.addCategoryBtnText}>Add</Text>
              </Pressable>
            </View>
          ) : null}
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
          <View style={[styles.chip, styles.chipSelected]}>
            <Text style={[styles.chipText, styles.chipTextSelected]}>{derivedStatus}</Text>
          </View>
          <Text style={styles.hint}>Status is calculated from stock automatically: 0 = Out of Stock, below 20 = Low Stock.</Text>
        </View>

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>{isEditMode ? 'Save Changes' : 'Add Product'}</Text>
        </Pressable>

        {isEditMode ? (
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        ) : null}
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
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
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
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  accessDeniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B2A4A',
  },
  accessDeniedText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6EEF6',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#1B2A4A',
    borderColor: '#1B2A4A',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipAddNew: {
    borderStyle: 'dashed',
    borderColor: '#1B2A4A',
  },
  chipAddNewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B2A4A',
  },
  newCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  addCategoryBtn: {
    backgroundColor: '#1B2A4A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addCategoryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});