import { LoginModel } from './login.model';

describe('LoginModel Sequelize Model', () => {
  it('should have the correct table name', () => {
    expect(LoginModel.tableName).toBe('login');
  });

  it('should define all required fields with correct types and constraints', () => {
    const attributes = LoginModel.getAttributes();

    // id
    expect(attributes.id.type).toEqual({});
    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id.allowNull).toBe(false);

    // readable_id
    expect(attributes.readable_id.type.toString({})).toContain('BIGINT');
    expect(attributes.readable_id.allowNull).toBe(false);
    expect(attributes.readable_id.unique).toBe(true);
    expect(attributes.readable_id.autoIncrement).toBe(true);

    ['email_id', 'otp_secret', 'otp', 'remark', 'auth_token', 'refresh_token'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('VARCHAR');
    });

    ['is_credential_verified', 'is_2fa_verified'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('BOOLEAN');
    });

    ['id', 'user_id', 'practice_account_id'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('UUID');
    });
  });

  it('should have freezeTableName and timestamps options set correctly', () => {
    expect(LoginModel.options.freezeTableName).toBe(true);
    expect(LoginModel.options.timestamps).toBe(false);
  });
});
