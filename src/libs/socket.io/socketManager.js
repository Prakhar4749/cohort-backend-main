import { Server as SocketIOserver } from "socket.io";
import mongoose from "mongoose";
import Community from "../../models/community/community.model.js";
import { appEnvConfigs } from "../../configs/env_config.js";

const onlineUsers = new Set();

const ConnectSocket = (server) => {
  const io = new SocketIOserver(server, {
    cors: {
      origin: appEnvConfigs.REACT_FRONTEND_APP_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, communityId } = socket.handshake.query;

      if (!userId || !communityId) {
        console.warn("⚠️ Missing userId or communityId in socket connection.");
        return;
      }

      const userKey = `${userId}-${communityId}`;

      const community = await Community.findById(communityId);
      if (!community) {
        console.error(`❌ Community ${communityId} not found.`);
        return;
      }

      if (!community.activeMembers.includes(userId)) {
        await Community.updateOne(
          { _id: communityId },
          { $addToSet: { activeMembers: userId } },
          { session }
        );
      }

      if (!onlineUsers.has(userKey)) {
        await Community.updateOne(
          { _id: communityId },
          { $inc: { onlineMembers: 1 } },
          { session }
        );
        onlineUsers.add(userKey);
        console.log(`✅ User ${userId} joined Community ${communityId}`);
      } else {
        console.log(
          `⚠️ User ${userId} already online in Community ${communityId}, skipping increment.`
        );
      }

      await session.commitTransaction();
      session.endSession();

      socket.on("disconnect", async () => {
        const disconnectSession = await mongoose.startSession();
        disconnectSession.startTransaction();
        try {
          if (onlineUsers.has(userKey)) {
            await Community.updateOne(
              { _id: communityId },
              {
                $pull: { activeMembers: userId },
                $inc: { onlineMembers: -1 },
              },
              { session: disconnectSession }
            );
            onlineUsers.delete(userKey);
            console.log(`🚪 User ${userId} left Community ${communityId}`);
          } else {
            console.warn(
              `⚠️ User ${userId} was not tracked online in Community ${communityId}, skipping update.`
            );
          }
          await disconnectSession.commitTransaction();
        } catch (error) {
          await disconnectSession.abortTransaction();
          console.error("❌ Error handling socket disconnect:", error);
        } finally {
          disconnectSession.endSession();
        }
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("⚠️ Error in socket connection:", error);
    } finally {
      session.endSession();
    }
  });

  io.on("error", (error) => {
    console.error("⚠️ Socket.IO error:", error);
  });
};

export default ConnectSocket;
