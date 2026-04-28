import dotenv from "dotenv";
dotenv.config();

const appConfig = {
  baseURL:
    process.env.MPESA_CALLBACK_URL?.replace("/api/payment/callback", "") ||
    "http://localhost:3000",
  credentials: {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
    passkey: process.env.MPESA_PASSKEY,
    callbackURL: process.env.MPESA_CALLBACK_URL,
  },
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  authURL: process.env.MPESA_AUTH_URL,
  stkPushURL: process.env.MPESA_STK_PUSH_URL,
  port: process.env.PORT || 3000,
};

export default appConfig;
