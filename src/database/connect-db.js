import mongoose from "mongoose";
import { appEnvConfigs } from "../configs/env_config.js";

const Connectdb = async () => {
  try {
    mongoose.connection.on("connected", () =>
      console.log("Database connected successfully ✅ ")
    );
    mongoose.connection.on("disconnected", () =>
      console.log("Oops! Databse disconnected ❌")
    );
    await mongoose.connect(appEnvConfigs.DATABASE_URL);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default Connectdb;
