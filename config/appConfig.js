import dotenv from "dotenv";
dotenv.config();

const appConfig = {
  port: parseInt(process.env.PORT) || 3001,
};

export default appConfig;
