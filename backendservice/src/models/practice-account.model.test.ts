import { PracticeAccountModel } from './practice-account.model';

describe('PracticeAccountModel Sequelize Model', () => {
  it('should have the correct table name', () => {
    expect(PracticeAccountModel.tableName).toBe('practice_account');
  });

  it('should define all required fields with correct types and constraints', () => {
    const attributes = PracticeAccountModel.getAttributes();

    // id
    expect(attributes.id.type).toEqual({});
    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id.allowNull).toBe(false);

    // readable_id
    expect(attributes.readable_id.type.toString({})).toContain('BIGINT');
    expect(attributes.readable_id.allowNull).toBe(false);
    expect(attributes.readable_id.unique).toBe(true);
    expect(attributes.readable_id.autoIncrement).toBe(true);

    [
      'practice_name',
      'address1',
      'address2',
      'city',
      'state',
      'zip',
      'office_email',
      'office_phone',
      'website_address',
      'speciality_name',
      'practice_software_name',
    ].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('VARCHAR');
    });

    ['has_accepted_terms', 'active_status', 'account_verified'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('BOOLEAN');
    });

    // Optional fields
    ['created_at', 'updated_at', 'created_by', 'updated_by'].forEach((field) => {
      expect(attributes[field].allowNull).toBe(true);
    });
  });

  it('should have freezeTableName and timestamps options set correctly', () => {
    expect(PracticeAccountModel.options.freezeTableName).toBe(true);
    expect(PracticeAccountModel.options.timestamps).toBe(false);
  });
});
