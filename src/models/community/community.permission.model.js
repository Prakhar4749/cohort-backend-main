// import mongoose from "mongoose";

// const communityPermissionsSchema = new mongoose.Schema({
//   community: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Community",
//     required: true,
//     unique: true
//   },
//   member: {
//     canPost: { type: Boolean, default: false },
//     canChat: { type: Boolean, default: false },
//     canAddMember: { type: Boolean, default: false }

//   },
//   email: {
//     emailAlerts: { type: Boolean, default: false },
//     messagesAlert: { type: Boolean, default: false },
//     pushNotify: { type: Boolean, default: false }
//   },
//   chat: {
//     onlineStatus: { type: Boolean, default: false },
//     soundNotification: { type: Boolean, default: false }
//   }
// }, { timestamps: true });

// const communityPermissions = mongoose.model("communityPermissions", communityPermissionsSchema);

// export { communityPermissions }

import mongoose from "mongoose";

const communityPermissionsSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      unique: true,
      index: true, // Add index for better query performance
    },
    member: {
      canPost: { type: Boolean, default: false },
      canChat: { type: Boolean, default: false },
      canAddMember: { type: Boolean, default: false },
    },
    email: {
      emailAlerts: { type: Boolean, default: false },
      messagesAlert: { type: Boolean, default: false },
      pushNotify: { type: Boolean, default: false },
    },
    chat: {
      onlineStatus: { type: Boolean, default: false },
      soundNotification: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    // Configure toJSON and toObject options similar to Community model
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Add methods for permission checks
communityPermissionsSchema.methods.canMemberPost = function () {
  return this.member.canPost;
};

communityPermissionsSchema.methods.canMemberChat = function () {
  return this.member.canChat;
};

communityPermissionsSchema.methods.canMemberAddMember = function () {
  return this.member.canAddMember;
};

// Pre-save hook for any validation or data cleaning
communityPermissionsSchema.pre("save", function (next) {
  // Add any pre-save logic here if needed
  next();
});

// Static method to find and update permissions
communityPermissionsSchema.statics.findAndUpdateByCommunity = async function (
  communityId,
  permissionsData
) {
  return this.findOneAndUpdate({ community: communityId }, permissionsData, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

const CommunityPermissions = mongoose.model(
  "CommunityPermissions",
  communityPermissionsSchema
);

export default CommunityPermissions;
