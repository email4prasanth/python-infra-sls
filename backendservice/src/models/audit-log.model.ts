import { DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/connections';

const TABLE_NAME = 'audit_log';

export const AuditLogModel = sequelize.define(
  TABLE_NAME,
  {
    id: {
      type: UUIDV4,
      primaryKey: true,
      allowNull: false,
      defaultValue: UUIDV4,
    },
    readable_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      autoIncrement: true,
    },
    practice_account_id: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    user_id: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    source_ip: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    api_path: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    request: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    response: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    event_type: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    event_time_stamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    operation_status: {
      type: DataTypes.STRING(25),
      allowNull: true,
    },
    error_message: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);
