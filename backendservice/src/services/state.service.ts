import { errorHandler } from '../middleware';
import { StateModel } from '../models';
import { IStateResponse } from '../types';

export const getStatesList = async () => {
  try {
    const roles = (await StateModel.findAll({
      attributes: ['id', 'dial_code', 'state_name', 'state_abbr'],
      raw: true,
    })) as unknown as IStateResponse[];
    return roles;
  } catch (err) {
    const error = errorHandler(err);
    return {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
  }
};
