import { errorHandler } from '../middleware';
import { StateModel } from '../models/state.model';
import { getStatesList } from './state.service'; // Update with actual path

jest.mock('../models/state.model');
jest.mock('../middleware');

describe('getStatesList', () => {
  const mockStates = [
    { id: 1, dial_code: '+1', state_name: 'Alabama', state_abbr: 'AB' },
    { id: 2, dial_code: '+1', state_name: 'Alaska', state_abbr: 'AL' },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the list of states on success', async () => {
    (StateModel.findAll as jest.Mock).mockResolvedValue(mockStates);

    const result = await getStatesList();

    expect(StateModel.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'dial_code', 'state_name', 'state_abbr'],
      raw: true,
    });
    expect(result).toEqual(mockStates);
  });

  it('should handle errors and return error response', async () => {
    const mockError = new Error('DB Error');
    const mockErrorResponse = { statusCode: 500, message: 'Something went wrong' };
    (StateModel.findAll as jest.Mock).mockRejectedValue(mockError);
    (errorHandler as jest.Mock).mockReturnValue(mockErrorResponse);

    const result = await getStatesList();

    expect(errorHandler).toHaveBeenCalledWith(mockError);
    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify(mockErrorResponse),
    });
  });
});
