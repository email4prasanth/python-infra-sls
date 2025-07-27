import { DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/connections';

const TABLE_NAME = 'practice_account';

export const PracticeAccountModel = sequelize.define(
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
    practice_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address1: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address2: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zip: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    office_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    office_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    website_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    speciality_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    speciality_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    practice_software_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    practice_software_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    has_accepted_terms: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    active_status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    account_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    country_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
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
