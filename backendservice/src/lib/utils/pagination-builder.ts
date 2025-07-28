import { IPaginationResult } from '../../types';

export const buildPagination = (page: number, limit: number, totalItems: number): IPaginationResult => {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    currentPage: Number(page),
    rowsPerPage: Number(limit),
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? Number(page) + 1 : null,
    previousPage: hasPreviousPage ? Number(page) - 1 : null,
  };
};
