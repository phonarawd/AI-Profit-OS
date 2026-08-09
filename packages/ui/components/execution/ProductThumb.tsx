"use client";

import {
  ProductImage,
  type ProductImageProps,
} from "../product/ProductImage";

export type ProductThumbProps = Omit<ProductImageProps, "variant">;

/**
 * §48.10 / §48.3a — execution-row thumb.
 * Thin wrapper over shared ProductImage (audit §26).
 */
export function ProductThumb(props: ProductThumbProps) {
  return <ProductImage {...props} variant="thumb" />;
}
