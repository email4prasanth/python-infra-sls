import { DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/connections';

const TABLE_NAME = 'login';

export const LoginModel = sequelize.define(
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    email_id: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    is_credential_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    otp_secret: {
      type: DataTypes.STRING(25),
      allowNull: true,
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    is_2fa_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    practice_account_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    remark: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    auth_token: {
      type: DataTypes.STRING(25),
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.STRING(25),
      allowNull: true,
    },

    login_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    logout_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);
