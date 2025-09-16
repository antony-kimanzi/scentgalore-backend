import dotenv from "dotenv";
dotenv.config();

const appConfig = {
  host: process.env.HOST || localhost,
  port: parseInt(process.env.PORT) || 3001,
};

export default appConfig;
