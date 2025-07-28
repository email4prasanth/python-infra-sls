// __tests__/db-connection.test.ts

import { initDB, sequelize } from '.';

describe('DB connection', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should call sequelize.authenticate and log success message', async () => {
    // Mock sequelize.authenticate to resolve successfully
    const authMock = jest.spyOn(sequelize, 'authenticate').mockResolvedValueOnce();

    await initDB();

    expect(authMock).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('DB connection has been established successfully.');
  });

  it('should catch error and log failure message', async () => {
    const error = new Error('Connection failed');
    // Mock sequelize.authenticate to reject with an error
    jest.spyOn(sequelize, 'authenticate').mockRejectedValueOnce(error);

    await initDB();

    expect(console.error).toHaveBeenCalledWith('Unable to connect to the DB:', error);
  });
});
