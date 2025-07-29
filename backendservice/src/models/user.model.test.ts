import { UserModel } from './user.model';

describe('UserModel Sequelize Model', () => {
  it('should have the correct table name', () => {
    expect(UserModel.tableName).toBe('user_account');
  });

  it('should define all required fields with correct types and constraints', () => {
    const attributes = UserModel.getAttributes();

    // id
    expect(attributes.id.type).toEqual({});
    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id.allowNull).toBe(false);

    // readable_id
    expect(attributes.readable_id.type.toString({})).toContain('BIGINT');
    expect(attributes.readable_id.allowNull).toBe(false);
    expect(attributes.readable_id.unique).toBe(true);
    expect(attributes.readable_id.autoIncrement).toBe(true);

    // first_name, last_name, email_id, phone_number, role_id, role, password, doctor_email_id
    ['first_name', 'last_name', 'email_id', 'phone_number', 'password'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('VARCHAR');
    });

    // Optional fields
    [
      'created_at',
      'updated_at',
      'created_by',
      'updated_by',
      'active_status',
      'is_password_active',
      'password_reset_at',
      'is_password_reset',
    ].forEach((field) => {
      expect(attributes[field].allowNull).toBe(true);
    });

    // Boolean fields
    ['active_status', 'is_password_reset'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('BOOLEAN');
    });
  });

  it('should have freezeTableName and timestamps options set correctly', () => {
    expect(UserModel.options.freezeTableName).toBe(true);
    expect(UserModel.options.timestamps).toBe(false);
  });
});
