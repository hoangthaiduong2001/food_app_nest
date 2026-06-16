import { ProductResType } from '@/routes/product/product.model';

export const buildProduct = (overrides: Partial<ProductResType> = {}): ProductResType => ({
  id: 1,
  name: 'Test Product',
  description: 'A test product',
  sellerId: null,
  seller: null,
  basePrice: 100_000,
  virtualPrice: 120_000,
  totalStock: 50,
  isActive: true,
  slug: 'test-product',
  brandId: 1,
  images: ['https://example.com/img.jpg'],
  publishedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  categories: [{ id: 1, name: 'Electronics' }],
  variants: [
    {
      id: 1,
      sku: 'SKU-001',
      name: null,
      price: 100_000,
      stock: 50,
      attributes: null,
      isDefault: true,
      isActive: true,
    },
  ],
  ...overrides,
});
