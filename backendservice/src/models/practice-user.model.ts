import { DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/connections';

const TABLE_NAME = 'practice_user';

export const PracticeUserModel = sequelize.define(
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
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    has_2fa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dea: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    state_of_issue: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    account_verified: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active_status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);
