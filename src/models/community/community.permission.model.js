import mongoose from "mongoose";

const communityPermissionsSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    required: true,
    unique: true
  },
  member: {
    canPost: { type: Boolean, default: false },
    canChat: { type: Boolean, default: false },
    canAddMember: { type: Boolean, default: false }
    
  },
  email: {
    emailAlerts: { type: Boolean, default: false },
    messagesAlert: { type: Boolean, default: false },
    pushNotify: { type: Boolean, default: false }
  },
  chat: {
    onlineStatus: { type: Boolean, default: false },
    soundNotification: { type: Boolean, default: false }
  }
}, { timestamps: true });

const communityPermissions = mongoose.model("communityPermissions", communityPermissionsSchema);

export { communityPermissions }
