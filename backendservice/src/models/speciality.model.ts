import { DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/connections';

const TABLE_NAME = 'speciality_management';

export const SpecialityModel = sequelize.define(
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
    speciality_name: {
      type: DataTypes.STRING,
      allowNull: false,
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
