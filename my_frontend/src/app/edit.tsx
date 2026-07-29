import React from 'react';
import AddProductScreen, { EditableProduct } from './add';

type EditProductScreenProps = {
  product: EditableProduct;
  existingCategories?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function EditProductScreen({
  product,
  existingCategories = [],
  onSuccess,
  onCancel,
}: EditProductScreenProps) {
  return (
    <AddProductScreen
      product={product}
      existingCategories={existingCategories}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
