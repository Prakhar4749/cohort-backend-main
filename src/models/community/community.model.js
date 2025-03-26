import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema(
  {
    communityName: {
      type: String,
      required: true,
      index: true,
    },
    communityJoinUrl: {
      type: String,
      required: true,
    },
    communityEmail: {
      type: String,
      required: true,
      default:"exapmle@gmail.com"
    },
    communityUsername: {
      type: String,
      required: [true, 'Community username is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['Public', 'Private'],
      default: 'Public'
    },
    membershipType: {
      type: String,
      enum: ['Free', 'Paid'],
      default: 'Free'
    },
    communityDescription: {
      type: String,
      required: true,
    },
    communityCountry: {
      type: String,
      required: true,
      default: "india"
    },
    communityProfileImage: {
      type: String,
    },
    communityCoverImages: {
      type: [String],
    },
    // Owner of the community
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Community permission
    settings: {
      permissions: { type: mongoose.Schema.Types.ObjectId, ref: "communityPermissions" }
    },


    socialAccounts: {
      instagram: { type: String, default: "" },
      website: { type: String, default: "" },
      googleMeet: { type: String, default: "" },
      msTeams: { type: String, default: "" },
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    


    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Community = mongoose.model("Community", CommunitySchema);

export default Community;
