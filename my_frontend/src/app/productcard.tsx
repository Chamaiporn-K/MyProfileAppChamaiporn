import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  onDelete,
  isDeleting = false,
  isAdmin = false,
}: {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  isDeleting?: boolean;
  isAdmin?: boolean;
}) {
  const cat = CATEGORY_STYLE[product.category];
  const derivedStatus = getProductStatus(product.stock);
  const status = STATUS_STYLE[derivedStatus];
  const displayStatus = derivedStatus;
  const [detailVisible, setDetailVisible] = useState(false);

  // isAdmin is a second layer of defense on top of whatever the parent already
  // decided — even if a parent forgets to omit onEdit/onDelete for a
  // non-admin, the buttons stay hidden here.
  const canEdit = isAdmin && !!onEdit;
  const canDelete = isAdmin && !!onDelete;

  const handleDeletePress = () => {
    if (!canDelete || !onDelete) return;

    const message = `Are you sure you want to delete "${product.name}"? This cannot be undone.`;

    if (Platform.OS === 'web') {
      // Alert.alert's multi-button dialog doesn't render on react-native-web,
      // so on web we fall back to the browser's native confirm dialog.
      if (typeof window !== 'undefined' && window.confirm(message)) {
        onDelete(product);
      }
      return;
    }

    Alert.alert(
      'Delete product',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(product) },
      ]
    );
  };

  return (
    <>
      <Pressable style={styles.productCard} onPress={() => setDetailVisible(true)}>
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
              {canEdit ? (
                <Pressable
                  style={styles.editButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    // Defer to next tick: onEdit() switches tabs and unmounts
                    // this whole list synchronously. Doing that inside the
                    // same click dispatch that originated on a now-removed
                    // descendant node crashes react-dom-web with a
                    // "removeChild" NotFoundError.
                    setTimeout(() => onEdit!(product), 0);
                  }}
                  hitSlop={6}
                  disabled={isDeleting}
                >
                  <Text style={styles.editButtonText}>✏️</Text>
                </Pressable>
              ) : null}
              {canDelete ? (
                <Pressable
                  style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeletePress();
                  }}
                  hitSlop={6}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteButtonText}>{isDeleting ? '…' : '🗑️'}</Text>
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
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL(product.product_link!);
                  }}
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
      </Pressable>

      {detailVisible ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setDetailVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailVisible(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                <View style={[styles.modalImageWrap, { backgroundColor: cat ? cat.bg : '#F1F5F9' }]}>
                  {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={styles.modalImage} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 48 }}>📦</Text>
                  )}
                </View>

                <View style={styles.modalTopRow}>
                  <Text style={styles.modalTitle}>{product.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status ? status.bg : '#E2E8F0' }]}>
                    <Text style={[styles.statusText, { color: status ? status.fg : '#64748B' }]}>
                      {displayStatus}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalMeta}>
                  {product.id} · {product.category}
                  {product.color ? ` · ${product.color}` : ''}
                  {product.size ? ` · ${product.size}` : ''}
                </Text>

                {product.details ? <Text style={styles.modalDetails}>{product.details}</Text> : null}

                <View style={styles.modalInfoRow}>
                  <Text style={styles.productLocation}>📍 {product.location_text}</Text>
                  <Text style={styles.productStock}>{product.stock_text}</Text>
                </View>

                {product.product_link ? (
                  <Text
                    style={[styles.productLink, { marginTop: 12 }]}
                    onPress={() => Linking.openURL(product.product_link!)}
                  >
                    Open product link
                  </Text>
                ) : null}

                <View style={styles.modalActionsRow}>
                  {canEdit ? (
                    <Pressable
                      style={styles.modalEditButton}
                      onPress={() => {
                        setDetailVisible(false);
                        // Defer navigation to the next tick so the Modal has
                        // fully unmounted before the parent list re-renders/
                        // filters — avoids a DOM node race on web.
                        setTimeout(() => onEdit!(product), 0);
                      }}
                    >
                      <Text style={styles.modalEditButtonText}>Edit product</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.modalCloseButton} onPress={() => setDetailVisible(false)}>
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
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
  deleteButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 11,
  },
  deleteButtonDisabled: {
    opacity: 0.55,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalImageWrap: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  modalMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  modalDetails: {
    fontSize: 13,
    color: '#334155',
    marginTop: 12,
    lineHeight: 19,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalEditButton: {
    flex: 1,
    backgroundColor: '#1B2A4A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalEditButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
});