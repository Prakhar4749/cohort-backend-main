import { ApiError, ApiResponse, AsyncHandler } from "../utils/server-utils.js";
import { GetImageUrlFromCloudinary } from "../libs/cloudinary/cloudinaryUploader.js";
import Community from "../models/community/community.model.js";
import User from "../models/users/user.model.js";
import Post from "../models/post/post.model.js";
import CommunityPaymentMethod from "../models/community/community.payment.method.model.js";
import { Membership } from "../models/community/membership.model.js";
import { communityPermissions } from "../models/community/community.permission.model.js";
import mongoose from "mongoose";
import { communityTransaction } from "../models/community/comunity.transaction.model.js";

export class CommunityController {
  // �� Private method to find a community by ID

  static #handleFileUploads = async (files) => {
    const updateData = {};
    
    try {
      // Handle profile photo upload (single file)
      if (files?.communityProfileImage && files.communityProfileImage.length > 0) {
        updateData.profilePhoto = await GetImageUrlFromCloudinary([files.communityProfileImage[0].path]);
      }
      
      // Handle cover photos upload (multiple files)
      if (files?.communityCoverImages && files.communityCoverImages.length > 0) {
        const coverPhotoPaths = files.communityCoverImages.map(file => file.path);
        updateData.coverPhoto = await GetImageUrlFromCloudinary(coverPhotoPaths);
      }
      
      console.log("File upload update data:", updateData);
      return updateData;
    } catch (error) {
      console.error("Error in file upload handling:", error);
      throw new ApiError(400, "Failed to upload files");
    }
  }
  

  static isUserCommunityAdmin = async (userId, communityId) => {
    try {
      const membership = await Membership.findOne({
        userId,
        communityId,
      });

      if (!membership) {
        return false;
      }

      return membership.role === "admin";
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  };

  static async #findCommunityById(communityId) {
    return await Community.findById(communityId);
  }

  // ✅ CREATE COMMUNITY
  static CreateCommunity = AsyncHandler(async (req, res) => {
    const {
      communityName,
      communityDescription,
      communityEmail,
      communityUsername,
      type,
      membershipType,
      socialAccounts,
    } = req.body;
  
    // Validate required fields
    if (
      !communityName?.trim() ||
      !communityDescription?.trim() ||
      !communityUsername?.trim()
    ) {
      throw new ApiError(400, "Please provide valid fields.");
    }
  
    // Handle File Uploads
    const uploadedFiles = await this.#handleFileUploads(req.files);
  
    // Create new community
    const newCommunity = await Community.create({
      communityName: communityName.trim(),
      communityUsername: communityUsername.trim(),
      communityDescription: communityDescription.trim(),
      communityEmail: communityEmail.trim(),
      communityJoinUrl: `https://example.com/${communityUsername.replace(/\s+/g, "-")}`,
      type: type || "Public",
      membershipType: membershipType || "Free",
      communityProfileImage: uploadedFiles.profilePhoto || null,
      communityCoverImages: uploadedFiles.coverPhoto || [],
      socialAccounts: {
        instagram: socialAccounts?.instagram || "",
        website: socialAccounts?.website || "",
        googleMeet: socialAccounts?.googleMeet || "",
        msTeams: socialAccounts?.msTeams || "",
        facebook: socialAccounts?.facebook || "",
        twitter: socialAccounts?.twitter || "",
        linkedin: socialAccounts?.linkedin || "",
      },
      owner: req.user._id,
    });
  
    // Create permission
    const permissions = new communityPermissions({
      community: newCommunity._id,
    });
  
    await permissions.save();
  
    // Update the community with references
    await mongoose.model("Community").findByIdAndUpdate(newCommunity._id, {
      $set: {
        "settings.permissions": permissions._id,
      },
    });
  
    // Create membership
    const membership = await Membership.create({
      userId: req.user._id,
      communityId: newCommunity._id,
      role: "admin",
    });
  
    res
      .status(201)
      .json(
        new ApiResponse(201, "Community created successfully", newCommunity)
      );
  });

  // ✅ JOIN COMMUNITY
  static JoinCommunity = AsyncHandler(async (req, res) => {
    const communityId = req.params.communityId;

    const userId = req.user._id;

    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if already a member
    const existingMembership = await Membership.findOne({
      userId,
      communityId,
    });

    if (existingMembership) {
      throw new Error("Already a member of this community");
    }

    // Create membership
    const membership = await Membership.create({
      userId,
      communityId,
      role: "member",
      status: "active",
      subscriptionStatus:
        community.membershipType === "Free" ? "free" : "pending",
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "User joined the community successfully",
          membership
        )
      );
  });

  // get all community of user as admin

  static getCommunitiesAsAdmin = AsyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get communities the user is a member of
    const memberships = await Membership.find({
      userId,
      role: "admin",
    }).populate("communityId");

    const Communities = memberships.map((m) => m.communityId);

    const adminsCommunities = (
      await Community.find(
        { _id: { $in: Communities } },
        {
          communityName: 1,
          communityUsername: 1,
          communityDescription: 1,
          communityProfileImage: 1,
          type: 1,
          membershipType: 1,
        }
      )
        .sort({ updatedAt: -1 }) // ✅ Sort at query level
        .lean()
    ).map(({ _id, ...rest }) => ({ communityId: _id, ...rest }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "all community of user as admin",
          adminsCommunities
        )
      );
  });

  // Community settings

  static getSpecificCommunityAsAdmin = AsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { communityId } = req.params;

    // Use the authorization function
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error("Not authorized to get this community details");
    }

    const community = await Community.findById(communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, "community details of user as admin", community)
      );
  });

  static updateSpecificCommunityAsAdmin = AsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { communityId } = req.params;

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new ApiError(403, "Not authorized to update this community");
    }

    // Prepare update object
    const updateData = {};

    // Add fields to update
    if (req.body.communityName) updateData.communityName = req.body.communityName;
    if (req.body.communityDescription) updateData.communityDescription = req.body.communityDescription;
    if (req.body.communityUsername) updateData.communityUsername = req.body.communityUsername;
    if (req.body.type && ["Public", "Private"].includes(req.body.type)) {
      updateData.type = req.body.type;
    }
    if (req.body.membershipType && ["Free", "Paid"].includes(req.body.membershipType)) {
      updateData.membershipType = req.body.membershipType;
    }

    // Handle file uploads
    if (req.files) {
      const fileUpdateData = await this.#handleFileUploads(req.files);
      
      if (fileUpdateData.profilePhoto) {
        updateData.communityProfileImage = fileUpdateData.profilePhoto;
      }
      
      if (fileUpdateData.coverPhoto) {
        updateData.$push = { 
          communityCoverImages: { 
            $each: fileUpdateData.coverPhoto 
          } 
        };
      }
    }

    // Handle nested settings
    if (req.body.settings && req.body.settings.permissions) {
      const permissions = req.body.settings.permissions;
      updateData.$set = {
        'settings.permissions.canPost': permissions.canPost,
        'settings.permissions.canChat': permissions.canChat,
        'settings.permissions.canAddMembers': permissions.canAddMembers
      };
    }

    // Handle social accounts
    if (req.body.socialAccounts) {
      updateData.$set = {
        ...updateData.$set,
        socialAccounts: {
          ...updateData.socialAccounts,
          ...req.body.socialAccounts
        }
      };
    }

    // Update the community
    const updatedCommunity = await Community.findByIdAndUpdate(
      communityId, 
      updateData, 
      { 
        new: true,  // Return the modified document
        runValidators: true  // Run model validations
      }
    );

    if (!updatedCommunity) {
      throw new ApiError(404, "Community not found");
    }

    res.status(200).json(new ApiResponse(200, "Community updated successfully", updatedCommunity));
});

  static deleteCommunityAsOwner = AsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { communityId } = req.params;

    // Find the community and check if it exists
    const community = await Community.findById(communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check if the current user is the owner of the community
    if (!community.owner.equals(userId)) {
      throw new Error(
        "Not authorized to delete this community. Only the owner can delete a community."
      );
    }

    // Perform deletion operations

    // 1. First, let's delete all memberships related to this community
    await Membership.deleteMany({ communityId });

    // 2. Delete any related payment methods
    if (community.paymentMethod && community.paymentMethod.length > 0) {
      await CommunityPaymentMethod.deleteMany({
        _id: { $in: community.paymentMethod },
      });
    }

    // 3. You might also want to delete related content like posts, messages, etc.

    // 4. Finally, delete the community itself
    await Community.findByIdAndDelete(communityId);

    res
      .status(200)
      .json(
        new ApiResponse(200, "Community deleted successfully", { communityId })
      );
  });

  // COMMUNITY STATS
  static GetCommunityStats = AsyncHandler(async (req, res) => {
    const { communityid } = req.params;

    const existingCommunity =
      await CommunityController.#findCommunityById(communityid);

    if (!existingCommunity) {
      throw new ApiError(404, "Community not found.");
    }

    const communityStats = await Community.findOne(
      {
        _id: existingCommunity._id,
      },
      {
        _id: 0,
        communityName: 1,
        communityJoinUrl: 1,
        communityDescription: 1,
        communityCoverImage: 1,
        onlineMembers: 1,
        communityLikes: 1,
        admins: 1,
      }
    ).populate("communityMembers");
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Community stats retrieved successfully",
          communityStats
        )
      );
  });

  // TRENDING COMMUNITY
  static TrendingCommunity = AsyncHandler(async (req, res) => {
    const trendingCommunities = await Community.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "community",
          as: "communityPosts",
        },
      },
      {
        $unwind: {
          path: "$communityPosts",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          totalTrendingScore: {
            $sum: {
              $add: [
                "$communityPosts.likeCount",
                "$communityPosts.commentCount",
                "$communityPosts.shareCount",
              ],
            },
          },
        },
      },
      {
        $sort: {
          totalTrendingScore: -1,
        },
      },
      {
        $limit: 5,
      },
    ]);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Trending communities retrieved successfully",
          trendingCommunities
        )
      );
  });

  // TRENDING POSTS
  static GetTrendingPosts = AsyncHandler(async (req, res) => {
    const trendingPosts = await Post.aggregate([
      {
        $addFields: {
          toatlTrendingPostScore: {
            $add: ["$likeCount", "$commentCount", "$shareCount"],
          },
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "_id",
          foreignField: "communityPosts",
          as: "community",
        },
      },
      {
        $unwind: {
          path: "$community",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          images: 1,
          createdAt: 1,
          likeCount: 1,
          commentCount: 1,
          shareCount: 1,
          toatlTrendingPostScore: 1,
          community: "$community._id",
          communityName: "$community.communityName",
        },
      },
      { $sort: { toatlTrendingPostScore: -1 } },
    ]);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Trending post retrieved successfully",
          trendingPosts
        )
      );
  });

  // MOST ACTIVE USERS
  static GetMostActiveUsers = AsyncHandler(async (req, res) => {
    const mostActiveUsers = await Post.aggregate([
      {
        $group: {
          _id: "$user",
          totalActivityCount: {
            $sum: { $add: ["$likeCount", "$commentCount", "$shareCount"] },
          },
        },
      },
      {
        $sort: { totalActivityCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Active users retrieved successfully",
          mostActiveUsers
        )
      );
  });

  // Payment methods
  static getCommunityPaymentMethod = AsyncHandler(async (req, res) => {
    const communityId = req.params.communityId;

    const userId = req.user._id;

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error("Not authorized to get payment method of this community");
    }

    const paymentMethods = await CommunityPaymentMethod.find({ communityId });
    res.json(new ApiResponse(200, "Payment methods retrieved", paymentMethods));
  });

  static addCommunityPaymentMethod = AsyncHandler(async (req, res) => {
    const { type, isDefault, cardDetails, bankDetails, upiDetails } = req.body;
    const communityId = req.params.communityId;
    const userId = req.user._id;

    console.log("check", req.body);

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error("Not authorized to add payment method of this community");
    }

    // Validate required fields
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required. Allowed types: card, bank, upi",
      });
    }

    // Ensure userId is provided
    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: "community ID is required",
      });
    }

    // Additional validation based on payment type
    if (
      type === "card" &&
      (!cardDetails ||
        !cardDetails.lastFourDigits ||
        !cardDetails.cardHolderName)
    ) {
      return res.status(400).json({
        success: false,
        message: "Card details are required for card payment type",
      });
    }

    if (
      type === "bank" &&
      (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifscCode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bank details are required for bank payment type",
      });
    }

    if (type === "upi" && (!upiDetails || !upiDetails.upiId)) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required for UPI payment type",
      });
    }

    // Create a new payment method
    const newPaymentMethod = new CommunityPaymentMethod({
      communityId,
      type,
      isDefault,
      // Only include relevant payment details based on type
      ...(type === "card" && { cardDetails }),
      ...(type === "bank" && { bankDetails }),
      ...(type === "upi" && { upiDetails }),
    });

    try {
      // Save to database
      await newPaymentMethod.save();

      res.status(201).json({
        success: true,
        message: "Payment method added successfully",
        result: newPaymentMethod,
      });
    } catch (error) {
      // This will catch validation errors from mongoose
      return res.status(400).json({
        success: false,
        message: error.message || "Error adding payment method",
      });
    }
  });

  static updateCommunityPaymentMethod = AsyncHandler(async (req, res) => {
    const paymentMethodId = req.params.payment_method_id;
    const { type, isDefault, cardDetails, bankDetails, upiDetails } = req.body;

    const communityId = req.params.communityId;
    const userId = req.user._id;

    console.log("check", req.body);

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error(
        "Not authorized to update payment method of this community"
      );
    }

    // Validate if payment method exists
    const existingPaymentMethod =
      await CommunityPaymentMethod.findById(paymentMethodId);

    if (!existingPaymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    // Validate payment type if it's being updated
    if (type && !["card", "bank", "upi"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type. Allowed types: card, bank, upi",
      });
    }

    // Type-specific validations if type is being changed
    if (type) {
      if (
        type === "card" &&
        cardDetails &&
        (!cardDetails.lastFourDigits || !cardDetails.cardHolderName)
      ) {
        return res.status(400).json({
          success: false,
          message: "Card details are incomplete",
        });
      }

      if (
        type === "bank" &&
        bankDetails &&
        (!bankDetails.accountNumber || !bankDetails.ifscCode)
      ) {
        return res.status(400).json({
          success: false,
          message: "Bank details are incomplete",
        });
      }

      if (type === "upi" && upiDetails && !upiDetails.upiId) {
        return res.status(400).json({
          success: false,
          message: "UPI ID is required",
        });
      }
    }

    // Handle default payment method logic
    if (isDefault === true) {
      // If setting this payment method as default, unset any existing default
      await CommunityPaymentMethod.updateMany(
        {
          communityId: existingPaymentMethod.communityId,
          _id: { $ne: paymentMethodId },
        },
        { $set: { isDefault: false } }
      );
    }

    // Create update and unset objects
    const updateData = {};
    const unsetData = {};

    if (type) updateData.type = type;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // Only update the memberropriate payment details based on type
    if (type === "card") {
      if (cardDetails) {
        updateData.cardDetails = {
          ...(existingPaymentMethod.cardDetails || {}),
          ...cardDetails,
        };
      }
      // Clear other payment details
      unsetData.bankDetails = "";
      unsetData.upiDetails = "";
    } else if (type === "bank") {
      if (bankDetails) {
        updateData.bankDetails = {
          ...(existingPaymentMethod.bankDetails || {}),
          ...bankDetails,
        };
      }
      // Clear other payment details
      unsetData.cardDetails = "";
      unsetData.upiDetails = "";
    } else if (type === "upi") {
      if (upiDetails) {
        updateData.upiDetails = {
          ...(existingPaymentMethod.upiDetails || {}),
          ...upiDetails,
        };
      }
      // Clear other payment details
      unsetData.cardDetails = "";
      unsetData.bankDetails = "";
    } else if (!type) {
      // If type is not changing, update only the relevant details
      if (existingPaymentMethod.type === "card" && cardDetails) {
        updateData.cardDetails = {
          ...(existingPaymentMethod.cardDetails || {}),
          ...cardDetails,
        };
      } else if (existingPaymentMethod.type === "bank" && bankDetails) {
        updateData.bankDetails = {
          ...(existingPaymentMethod.bankDetails || {}),
          ...bankDetails,
        };
      } else if (existingPaymentMethod.type === "upi" && upiDetails) {
        updateData.upiDetails = {
          ...(existingPaymentMethod.upiDetails || {}),
          ...upiDetails,
        };
      }
    }

    // Update the payment method
    const updatedPaymentMethod = await CommunityPaymentMethod.findByIdAndUpdate(
      paymentMethodId,
      {
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 && { $unset: unsetData }),
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Payment method updated successfully",
      result: updatedPaymentMethod,
    });
  });

  static deleteCommunityPaymentMethod = AsyncHandler(async (req, res) => {
    const paymentMethodId = req.params.payment_method_id;
    const communityId = req.params.communityId;
    const userId = req.user._id;

    console.log("check", req.body);

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error(
        "Not authorized to delete payment method of this community"
      );
    }

    // ✅ Check if payment method exists
    const paymentMethod =
      await CommunityPaymentMethod.findById(paymentMethodId);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    // ✅ Delete payment method
    await CommunityPaymentMethod.findByIdAndDelete(paymentMethodId);

    res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
    });
  });

  // transactions

  static getCommunityTransaction = AsyncHandler(async (req, res) => {
    const communityId = req.params.communityId;
    const userId = req.user._id;

    console.log("check", req.body);

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error("Not authorized to get transactions of this community");
    }
    const CommunityTransactions = await communityTransaction
      .findOne({ community: communityId })
      .sort({ createdAt: -1 });

    // Check if CommunityTransactions is null or undefined
    if (!CommunityTransactions) {
      return res.json(new ApiResponse(200, "No transactions found", []));
    }

    res.json(
      new ApiResponse(
        200,
        "Transaction history retrieved",
        CommunityTransactions
      )
    );
  });

  // permissions

  static getCommunityPermissions = AsyncHandler(async (req, res) => {
    const communityId = req.params.communityId;
    const userId = req.user._id;

    // Find community permissions by user ID
    const CommunityPermissions = await communityPermissions.findOne(
      { community: communityId } // Find by community ID field
    );

    if (!CommunityPermissions) {
      return res.status(404).json({
        success: false,
        message: "community permissions not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "community permissions fetched successfully",
      data: CommunityPermissions,
    });
  });

  static updateCommunityPermissions = AsyncHandler(async (req, res) => {
    const { member, email, chat } = req.body; // Assuming these are the fields you want to update

    const communityId = req.params.communityId;
    const userId = req.user._id;

    // Check if user is admin
    const isAdmin = await this.isUserCommunityAdmin(userId, communityId);

    if (!isAdmin) {
      throw new Error("Not authorized to update permissions of this community");
    }

    // Prepare update data object
    const updateData = {};
    if (member) updateData.member = member;
    if (email) updateData.email = email;
    if (chat) updateData.chat = chat;

    // Prepare unset data (if you need to remove fields)
    const unsetData = {};
    // Add any fields you want to unset to the unsetData object
    // For example: if (req.body.removeField) unsetData['fieldName'] = 1;

    // Find user permissions by user ID and update
    const updateUserPermission = await communityPermissions.findOneAndUpdate(
      { community: communityId }, // Find by community ID field
      {
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 && { $unset: unsetData }),
      },
      { new: true, runValidators: true }
    );

    if (!updateUserPermission) {
      return res.status(404).json({
        success: false,
        message: "User permissions not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User permissions updated successfully",
      data: updateUserPermission,
    });
  });
}
