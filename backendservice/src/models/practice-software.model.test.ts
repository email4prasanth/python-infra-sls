import { PracticeSoftwareModel } from './practice-software.model';

describe('PracticeSoftwareModel Sequelize Model', () => {
  it('should have the correct table name', () => {
    expect(PracticeSoftwareModel.tableName).toBe('practice_software');
  });

  it('should define all required fields with correct types and constraints', () => {
    const attributes = PracticeSoftwareModel.getAttributes();

    // id
    expect(attributes.id.type).toEqual({});
    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id.allowNull).toBe(false);

    // readable_id
    expect(attributes.readable_id.type.toString({})).toContain('BIGINT');
    expect(attributes.readable_id.allowNull).toBe(false);
    expect(attributes.readable_id.unique).toBe(true);
    expect(attributes.readable_id.autoIncrement).toBe(true);

    // Software name
    expect(attributes.software_name.type.toString({})).toContain('VARCHAR');

    // Optional fields
    ['created_at', 'updated_at', 'created_by', 'updated_by'].forEach((field) => {
      expect(attributes[field].allowNull).toBe(true);
    });
  });

  it('should have freezeTableName and timestamps options set correctly', () => {
    expect(PracticeSoftwareModel.options.freezeTableName).toBe(true);
    expect(PracticeSoftwareModel.options.timestamps).toBe(false);
  });
});
