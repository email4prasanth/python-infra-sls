import { buildPagination } from './pagination-builder';

describe('buildPagination', () => {
  it('should calculate correct totalPages when totalItems is divisible by limit', () => {
    const page = 1;
    const limit = 10;
    const totalItems = 50;

    const result = buildPagination(page, limit, totalItems);

    expect(result.totalPages).toBe(5);
    expect(result.currentPage).toBe(1);
    expect(result.rowsPerPage).toBe(10);
    expect(result.totalItems).toBe(50);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.nextPage).toBe(2);
    expect(result.previousPage).toBe(null);
  });

  it('should calculate correct totalPages when totalItems is not divisible by limit', () => {
    const page = 1;
    const limit = 10;
    const totalItems = 55;

    const result = buildPagination(page, limit, totalItems);

    expect(result.totalPages).toBe(6);
    expect(result.currentPage).toBe(1);
    expect(result.rowsPerPage).toBe(10);
    expect(result.totalItems).toBe(55);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.nextPage).toBe(2);
    expect(result.previousPage).toBe(null);
  });

  it('should set hasNextPage to true when current page is less than total pages', () => {
    const page = 2;
    const limit = 10;
    const totalItems = 30;

    const result = buildPagination(page, limit, totalItems);

    expect(result.hasNextPage).toBe(true);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.nextPage).toBe(3);
  });

  it('should set hasNextPage to false when current page is equal to total pages', () => {
    const page = 3;
    const limit = 10;
    const totalItems = 30;

    const result = buildPagination(page, limit, totalItems);

    expect(result.hasNextPage).toBe(false);
    expect(result.currentPage).toBe(3);
    expect(result.totalPages).toBe(3);
    expect(result.nextPage).toBe(null);
  });

  it('should handle edge case of 0 totalItems', () => {
    const page = 1;
    const limit = 10;
    const totalItems = 0;

    const result = buildPagination(page, limit, totalItems);

    expect(result.totalPages).toBe(0);
    expect(result.currentPage).toBe(1);
    expect(result.rowsPerPage).toBe(10);
    expect(result.totalItems).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.nextPage).toBe(null);
    expect(result.previousPage).toBe(null);
  });
});
