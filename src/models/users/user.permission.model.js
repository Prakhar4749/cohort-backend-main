import mongoose from "mongoose";

const userPermissionsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  app: {
    mentionsNotify: { type: Boolean, default: false },
    followNotify: { type: Boolean, default: false },
    chatsNotify: { type: Boolean, default: false },
    disableNotification: { type: Boolean, default: true },
    replyNotification: { type: Boolean, default: false }
  },
  email: {
    emailAlerts: { type: Boolean, default: false },
    messagesAlert: { type: Boolean, default: false },
    pushNotify: { type: Boolean, default: false }
  },
  chat: {
    onlineStatus: { type: Boolean, default: false },
    soundNotification: { type: Boolean, default: false },
    dontChatNotify: { type: Boolean, default: true }
  }
}, { timestamps: true });

const userPermissions = mongoose.model("userPermissions", userPermissionsSchema);

export { userPermissions }
