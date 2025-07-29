import { StateModel } from './state.model';

describe('StateModel Sequelize Model', () => {
  it('should have the correct table name', () => {
    expect(StateModel.tableName).toBe('states');
  });

  it('should define all required fields with correct types and constraints', () => {
    const attributes = StateModel.getAttributes();

    // id
    expect(attributes.id.type).toEqual({});
    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id.allowNull).toBe(false);

    // readable_id
    expect(attributes.readable_id.type.toString({})).toContain('BIGINT');
    expect(attributes.readable_id.allowNull).toBe(false);
    expect(attributes.readable_id.unique).toBe(true);
    expect(attributes.readable_id.autoIncrement).toBe(true);

    ['dial_code', 'state_name', 'atate_abbr'].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('VARCHAR');
      expect(attributes[field].allowNull).toBe(false);
    });

    // Optional fields
    ['created_at', 'updated_at', 'created_by', 'updated_by'].forEach((field) => {
      expect(attributes[field].allowNull).toBe(true);
    });
  });

  it('should have freezeTableName and timestamps options set correctly', () => {
    expect(StateModel.options.freezeTableName).toBe(true);
    expect(StateModel.options.timestamps).toBe(false);
  });
});
