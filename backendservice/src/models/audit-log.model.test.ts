import { AuditLogModel } from './audit-log.model';

describe('AuditLogModel Sequelize Model', () => {
  it('should have the correct table name', () => {
    expect(AuditLogModel.tableName).toBe('audit_log');
  });

  it('should define all required fields with correct types and constraints', () => {
    const attributes = AuditLogModel.getAttributes();

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
      'practice_account_id',
      'user_id',
      'source_ip',
      'api_path',
      'request',
      'response',
      'event_type',
      'operation_status',
      'error_message',
    ].forEach((field) => {
      expect(attributes[field].type.toString({})).toContain('VARCHAR');
    });

    expect(attributes.event_time_stamp.type.toString({})).toContain('TIMESTAMP');
  });

  it('should have freezeTableName and timestamps options set correctly', () => {
    expect(AuditLogModel.options.freezeTableName).toBe(true);
    expect(AuditLogModel.options.timestamps).toBe(false);
  });
});
