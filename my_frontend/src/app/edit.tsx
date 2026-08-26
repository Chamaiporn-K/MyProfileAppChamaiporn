import React from 'react';
import AddProductScreen, { EditableProduct } from './add';

type EditProductScreenProps = {
  product: EditableProduct;
  existingCategories?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
  isAdmin?: boolean;
};

export default function EditProductScreen({
  product,
  existingCategories = [],
  onSuccess,
  onCancel,
  isAdmin = false,
}: EditProductScreenProps) {
  return (
    <AddProductScreen
      product={product}
      existingCategories={existingCategories}
      onSuccess={onSuccess}
      onCancel={onCancel}
      isAdmin={isAdmin}
    />
  );
}