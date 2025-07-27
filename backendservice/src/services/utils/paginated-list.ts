import { FindAndCountOptions, Model } from 'sequelize';
import { HttpStatus } from '../../lib/enum';
import { AppError } from '../../lib/error';
import { buildPagination } from '../../lib/utils';
import { IPaginationResult } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface IPaginationData<T = any> {
  list: T[];
  pagination: IPaginationResult;
}

const DEFAULT_LIMIT = 5;
const DEFAULT_PAGE = 1;

export const getPaginatedData = async <T extends Model>(
  model: { new (): T } & typeof Model,
  query: Omit<FindAndCountOptions, 'limit' | 'offset'>,
  limit: number,
  page: number
): Promise<IPaginationData> => {
  const pageNumber = page ?? DEFAULT_PAGE;
  const limitNumber = limit ?? DEFAULT_LIMIT;

  if (pageNumber < 1) throw new AppError('Page must be greater than 0', HttpStatus.BAD_REQUEST);
  if (limitNumber < 1) throw new AppError('Limit must be greater than 0', HttpStatus.BAD_REQUEST);

  const offset = (pageNumber - 1) * limitNumber;

  const fetchResult = await model.findAndCountAll({
    ...query,
    limit: limitNumber,
    offset,
    raw: true,
  });

  const pagination = buildPagination(pageNumber, limitNumber, fetchResult.count);

  const result = {
    pagination,
    list: fetchResult.rows,
  };

  return result;
};
