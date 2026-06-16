import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { buildProduct } from '@/test/factories/product.factory';
import { PRODUCT_REPOSITORY } from './product.repository.interface';
import { ProductService } from './product.service';

const mockRepo = {
  findById: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  brandExists: jest.fn(),
  countExistingCategories: jest.fn(),
};

const mockCache = {
  del: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PRODUCT_REPOSITORY, useValue: mockRepo },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  // ─── findById ────────────────────────────────────────────────
  describe('findById', () => {
    it('returns product when found', async () => {
      const product = buildProduct({ id: 42 });
      mockRepo.findById.mockResolvedValue(product);

      const result = await service.findById(42);

      expect(result).toEqual(product);
      expect(mockRepo.findById).toHaveBeenCalledWith(42);
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── list ─────────────────────────────────────────────────────
  describe('list', () => {
    it('delegates to repository', async () => {
      const query = { limit: 20 } as never;
      const expected = { data: [], nextCursor: null, hasMore: false };
      mockRepo.list.mockResolvedValue(expected);

      const result = await service.list(query);

      expect(result).toEqual(expected);
      expect(mockRepo.list).toHaveBeenCalledWith(query);
    });
  });

  // ─── create ───────────────────────────────────────────────────
  describe('create', () => {
    const baseData = {
      name: 'New Product',
      basePrice: 100_000,
      virtualPrice: 120_000,
      stock: 10,
      isActive: true,
      brandId: 1,
      categoryIds: [2],
      images: [],
      variants: [],
    } satisfies Parameters<typeof service.create>[0];

    it('creates product when brand and categories are valid', async () => {
      mockRepo.brandExists.mockResolvedValue(true);
      mockRepo.countExistingCategories.mockResolvedValue(1);
      const product = buildProduct();
      mockRepo.create.mockResolvedValue(product);

      const result = await service.create(baseData, 1);

      expect(result).toEqual(product);
      expect(mockRepo.create).toHaveBeenCalledWith({ ...baseData, createdById: 1 });
    });

    it('throws BadRequestException when brand does not exist', async () => {
      mockRepo.brandExists.mockResolvedValue(false);

      await expect(service.create(baseData, 1)).rejects.toThrow(BadRequestException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when category does not exist', async () => {
      mockRepo.brandExists.mockResolvedValue(true);
      mockRepo.countExistingCategories.mockResolvedValue(0);

      await expect(service.create(baseData, 1)).rejects.toThrow(BadRequestException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  // ─── update ───────────────────────────────────────────────────
  describe('update', () => {
    it('updates product and invalidates cache', async () => {
      const existing = buildProduct({ id: 1 });
      const updated = buildProduct({ id: 1, name: 'Updated' });
      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.brandExists.mockResolvedValue(true);
      mockRepo.countExistingCategories.mockResolvedValue(1);
      mockRepo.update.mockResolvedValue(updated);

      const data = { name: 'Updated', brandId: 1, categoryIds: [1] } as never;
      const result = await service.update(1, data, 99);

      expect(result).toEqual(updated);
      expect(mockCache.del).toHaveBeenCalledWith('/products/1');
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as never, 1)).rejects.toThrow(NotFoundException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── softDelete ───────────────────────────────────────────────
  describe('softDelete', () => {
    it('deletes product and invalidates cache', async () => {
      mockRepo.softDelete.mockResolvedValue({ count: 1 });

      const result = await service.softDelete(1);

      expect(result).toEqual({ deleted: true });
      expect(mockCache.del).toHaveBeenCalledWith('/products/1');
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockRepo.softDelete.mockResolvedValue({ count: 0 });

      await expect(service.softDelete(999)).rejects.toThrow(NotFoundException);
      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });
});
