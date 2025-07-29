import { DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/connections';

const TABLE_NAME = 'patient';

export const PatientModel = sequelize.define(
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
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
    },

    first_name: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    dob: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    email_id: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    // place_holder1: {
    //   type: DataTypes.STRING(),
    //   allowNull: true,
    // },
    // place_holder2: {
    //   type: DataTypes.STRING(),
    //   allowNull: true,
    // },
    // place_holder3: {
    //   type: DataTypes.STRING(),
    //   allowNull: true,
    // },
    active_status: {
      type: DataTypes.BOOLEAN,
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);
