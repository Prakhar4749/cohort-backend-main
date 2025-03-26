import { app } from "./app.js";
import { appEnvConfigs } from "./configs/env_config.js";
import Connectdb from "./database/connect-db.js";
import ConnectSocket from "./libs/socket.io/socketManager.js";
import { ApiResponse } from "./utils/server-utils.js";

(async () => {
  try {
    console.clear();
    await Connectdb();

    app.get("/", (_, res) => {
      res.json(
        new ApiResponse(200, "Welcome to server developed by Cohorts Team.")
      );
    });

    const server = app.listen(appEnvConfigs.PORT, () => {
      console.log(
        `Server started at http://localhost:${appEnvConfigs.PORT} ✅`
      );
    });

    ConnectSocket(server); // Initialize WebSocket

    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log("🛑 Server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
})();
