import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getProductStatus } from '../lib/product-status';

export type Product = {
  id: string;
  name: string;
  details?: string;
  color?: string;
  size?: string;
  category: string;
  stock: number;
  stock_text: string;
  location_count: number;
  location_text: string;
  image_url: string;
  product_link?: string;
};

export const CATEGORY_STYLE: Record<string, { bg: string; fg: string }> = {
  'Tote': { bg: '#EAF2FB', fg: '#2F6FA6' },
  'Heritage Clutch': { bg: '#F6F1E8', fg: '#8A7141' },
  'Structured Handbag': { bg: '#FBEFF1', fg: '#B15C74' },
  'Patchwork Luggage': { bg: '#F7ECE4', fg: '#A15A2E' },
};

export const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  'In Stock': { bg: '#E4F5E8', fg: '#2F8F4E' },
  'Low Stock': { bg: '#FDF1DA', fg: '#B4791E' },
  'Out of Stock': { bg: '#FDECEC', fg: '#C53030' },
};

export default function ProductCard({
  product,
  onEdit,
}: {
  product: Product;
  onEdit?: (product: Product) => void;
}) {
  const cat = CATEGORY_STYLE[product.category];
  const derivedStatus = getProductStatus(product.stock);
  const status = STATUS_STYLE[derivedStatus];
  const displayStatus = derivedStatus;

  return (
    <View style={styles.productCard}>
      <View style={[styles.productIcon, { backgroundColor: cat ? cat.bg : '#F1F5F9' }]}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 28 }}>📦</Text>
        )}
      </View>

      <View style={{ flex: 1, justifyContent: 'space-between', height: 64 }}>
        <View style={styles.productTopRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusBadge, { backgroundColor: status ? status.bg : '#E2E8F0' }]}>
              <Text style={[styles.statusText, { color: status ? status.fg : '#64748B' }]}>
                {displayStatus}
              </Text>
            </View>
            {onEdit ? (
              <Pressable style={styles.editButton} onPress={() => onEdit(product)} hitSlop={6}>
                <Text style={styles.editButtonText}>✏️</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.productMeta}>
          {product.id} · {product.category}
          {product.color ? ` · ${product.color}` : ''}
          {product.size ? ` · ${product.size}` : ''}
          {product.product_link ? (
            <>
              {' · '}
              <Text
                style={styles.productLink}
                onPress={() => Linking.openURL(product.product_link!)}
              >
                Open link
              </Text>
            </>
          ) : null}
        </Text>

        <View style={styles.productBottomRow}>
          <Text style={styles.productLocation}>📍 {product.location_text}</Text>
          <Text style={styles.productStock}>{product.stock_text}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    width: 64,
    height: 64,
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
  editButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 11,
  },
  productMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  productLink: {
    color: '#1B2A4A',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
});