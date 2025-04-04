import mongoose from "mongoose";
import { appEnvConfigs } from "../configs/env_config.js";
import { seedFAQs } from "../utils/dbSeeder.js";

const Connectdb = async () => {
  try {
    mongoose.connection.on("connected", () =>
      console.log("Database connected successfully ✅ ")
    );
    mongoose.connection.on("disconnected", () =>
      console.log("Oops! Databse disconnected ❌")
    );
    await mongoose.connect(appEnvConfigs.DATABASE_URL);
    await seedFAQs(true); // Pass 'true' to force reset FAQs
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default Connectdb;
