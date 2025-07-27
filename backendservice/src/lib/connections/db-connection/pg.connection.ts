// DB connection logics goes here
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
dotenv.config(); // Load environment variables from .env file

export const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT as string),
    logging: false,
  }
);

export const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the DB:', error);
  }
};
