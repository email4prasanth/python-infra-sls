/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus } from '../../lib/enum';
import { AppError } from '../../lib/error';
import { buildPagination } from '../../lib/utils';
import { getPaginatedData } from './paginated-list';

jest.mock('../../lib/utils', () => ({
  buildPagination: jest.fn(),
}));

describe('getPaginatedData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error when page number is less than 1', async () => {
    const mockModel = {
      findAndCountAll: jest.fn(),
    };

    await expect(getPaginatedData(mockModel as any, {}, 10, 0)).rejects.toThrow(
      new AppError('Page must be greater than 0', HttpStatus.BAD_REQUEST)
    );

    expect(mockModel.findAndCountAll).not.toHaveBeenCalled();
  });

  it('should throw an error when limit is less than 1', async () => {
    const mockModel = {
      findAndCountAll: jest.fn(),
    };

    await expect(getPaginatedData(mockModel as any, {}, 0, 1)).rejects.toThrow(
      new AppError('Limit must be greater than 0', HttpStatus.BAD_REQUEST)
    );

    expect(mockModel.findAndCountAll).not.toHaveBeenCalled();
  });

  it('should return correct pagination data for the first page', async () => {
    const mockModel = {
      findAndCountAll: jest.fn().mockResolvedValue({
        count: 15,
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      }),
    };

    const mockBuildPagination = jest.fn().mockReturnValue({
      currentPage: 1,
      totalPages: 3,
      totalItems: 15,
      itemsPerPage: 5,
    });

    (buildPagination as jest.Mock).mockImplementation(mockBuildPagination);

    const result = await getPaginatedData(mockModel as any, {}, 5, 1);

    expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
      limit: 5,
      offset: 0,
      raw: true,
    });

    expect(mockBuildPagination).toHaveBeenCalledWith(1, 5, 15);

    expect(result).toEqual({
      pagination: {
        currentPage: 1,
        totalPages: 3,
        totalItems: 15,
        itemsPerPage: 5,
      },
      list: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    });
  });

  it('should handle empty result set correctly', async () => {
    const mockModel = {
      findAndCountAll: jest.fn().mockResolvedValue({
        count: 0,
        rows: [],
      }),
    };

    const mockBuildPagination = jest.fn().mockReturnValue({
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 5,
    });

    (buildPagination as jest.Mock).mockImplementation(mockBuildPagination);

    const result = await getPaginatedData(mockModel as any, {}, 5, 1);

    expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
      limit: 5,
      offset: 0,
      raw: true,
    });

    expect(mockBuildPagination).toHaveBeenCalledWith(1, 5, 0);

    expect(result).toEqual({
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 5,
      },
      list: [],
    });
  });
});
