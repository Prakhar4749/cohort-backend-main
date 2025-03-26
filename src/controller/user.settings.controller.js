
import { userPaymentMethod } from "../models/users/user.payment.method.model.js";
import User from "../models/users/user.model.js";
import { userTransaction } from "../models/users/user.transaction.model.js";
import { userPermissions } from "../models/users/user.permission.model.js";
import { GetImageUrlFromCloudinary } from "../libs/cloudinary/cloudinaryUploader.js";
import { ApiError, ApiResponse, AsyncHandler } from "../utils/server-utils.js";

class userSettingsController {
  // Private methods using closure
  #findUserSettings = async (userId) => {
    return await AccountSettings.findOne({ user: userId })
      .populate('user', 'name email');
  }

  #updateUserSettings = async (userId, updateData) => {
    return await AccountSettings.findOneAndUpdate(
      { user: userId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  #handleFileUploads = async (files) => {
    const updateData = {};
   
    
    if (files?.profilePhoto) {
      updateData.profilePhoto = await GetImageUrlFromCloudinary(files.profilePhoto[0].path);
    }
    if (files?.coverPhoto) {
      updateData.coverPhoto = await GetImageUrlFromCloudinary(files.coverPhoto[0].path);
    }
    console.log("update",updateData)
    return updateData;
  }

  // Public methods wrapped with AsyncHandler

  getUserSettings = AsyncHandler(async (req, res) => {
    const userId = req.params.user_id || req.user._id; // Get from params or authenticated user

    // Fetch only the relevant fields for settings
    const userSettings = await User.findById(userId)
      .select('firstName lastName username email state bio profilePhoto coverPhoto')
      .lean();

    if (!userSettings) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: userSettings
    });
  });


  // update user settings 

  updateUserSettings = AsyncHandler(async (req, res) => {
    const userId = req.user._id; // Get from params or authenticated user
    console.log('User ID:', userId);
    console.log('Request body:', req.body);

    // Extract only the allowed fields from request body
    const {
      firstName,
      lastName,
      username,
      email,
      state,
      bio
    } = req.body;

    // Create update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (state !== undefined) updateData.state = state;
    if (bio !== undefined) updateData.bio = bio;

    // Handle file uploads if any
 
    if (req.files) {
      const fileUpdateData = await this.#handleFileUploads(req.files);
      if (fileUpdateData.profilePhoto) {
        updateData.profilePhoto = fileUpdateData.profilePhoto;
      }
      if (fileUpdateData.coverPhoto) {
        updateData.coverPhoto = fileUpdateData.coverPhoto;
      }
    }

    console.log('Update data being sent to MongoDB:', updateData);

    // Find and update the user, returning the updated document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
        select: 'firstName lastName username email state bio profilePhoto coverPhoto' // Return only these fields
      }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User settings updated successfully',
      data: updatedUser
    });
  });

  // Payment methods
  getUserPaymentMethod = AsyncHandler(async (req, res) => {
    // Changed "user" to "userId" to match your schema definition
    const paymentMethods = await userPaymentMethod.find({ userId: req.user});
    res.json(new ApiResponse(200, "Payment methods retrieved", paymentMethods));
  });

  addUserPaymentMethod = AsyncHandler(async (req, res) => {
    const userId = req.user;
    const { type, isDefault, cardDetails, bankDetails, upiDetails } = req.body;
    console.log("check", req.body)

    // Validate required fields
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required. Allowed types: card, bank, upi",
      });
    }

    // No need to manually check against PAYMENT_TYPES array
    // Mongoose will validate against the enum automatically

    // Ensure userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Additional validation based on payment type
    if (type === 'card' && (!cardDetails || !cardDetails.lastFourDigits || !cardDetails.cardHolderName)) {
      return res.status(400).json({
        success: false,
        message: "Card details are required for card payment type",
      });
    }

    if (type === 'bank' && (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifscCode)) {
      return res.status(400).json({
        success: false,
        message: "Bank details are required for bank payment type",
      });
    }

    if (type === 'upi' && (!upiDetails || !upiDetails.upiId)) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required for UPI payment type",
      });
    }

    // Create a new payment method
    const newPaymentMethod = new userPaymentMethod({
      userId,
      type,
      isDefault,
      // Only include relevant payment details based on type
      ...(type === 'card' && { cardDetails }),
      ...(type === 'bank' && { bankDetails }),
      ...(type === 'upi' && { upiDetails }),
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


  updateUserPaymentMethod = AsyncHandler(async (req, res) => {
    const paymentMethodId = req.params.payment_method_id;
    const { type, isDefault, cardDetails, bankDetails, upiDetails } = req.body;
  
    // Validate if payment method exists
    const existingPaymentMethod = await userPaymentMethod.findOne({_id: paymentMethodId,
      userId: req.user}
    );
  
    if (!existingPaymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found"
      });
    }
  
    // Validate payment type if it's being updated
    if (type && !['card', 'bank', 'upi'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type. Allowed types: card, bank, upi"
      });
    }
  
    // Type-specific validations if type is being changed
    if (type) {
      if (type === 'card' && cardDetails && (!cardDetails.lastFourDigits || !cardDetails.cardHolderName)) {
        return res.status(400).json({
          success: false,
          message: "Card details are incomplete"
        });
      }
  
      if (type === 'bank' && bankDetails && (!bankDetails.accountNumber || !bankDetails.ifscCode)) {
        return res.status(400).json({
          success: false,
          message: "Bank details are incomplete"
        });
      }
  
      if (type === 'upi' && upiDetails && !upiDetails.upiId) {
        return res.status(400).json({
          success: false,
          message: "UPI ID is required"
        });
      }
    }
  
    // Handle default payment method logic
    if (isDefault === true) {
      // If setting this payment method as default, unset any existing default
      await userPaymentMethod.updateMany(
        { userId: existingPaymentMethod.userId, _id: { $ne: paymentMethodId } },
        { $set: { isDefault: false } }
      );
    }
  
    // Create update and unset objects
    const updateData = {};
    const unsetData = {};
    
    if (type) updateData.type = type;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    
    // Only update the appropriate payment details based on type
    if (type === 'card') {
      if (cardDetails) {
        updateData.cardDetails = {
          ...existingPaymentMethod.cardDetails || {},
          ...cardDetails
        };
      }
      // Clear other payment details
      unsetData.bankDetails = "";
      unsetData.upiDetails = "";
    } else if (type === 'bank') {
      if (bankDetails) {
        updateData.bankDetails = {
          ...existingPaymentMethod.bankDetails || {},
          ...bankDetails
        };
      }
      // Clear other payment details
      unsetData.cardDetails = "";
      unsetData.upiDetails = "";
    } else if (type === 'upi') {
      if (upiDetails) {
        updateData.upiDetails = {
          ...existingPaymentMethod.upiDetails || {},
          ...upiDetails
        };
      }
      // Clear other payment details
      unsetData.cardDetails = "";
      unsetData.bankDetails = "";
    } else if (!type) {
      // If type is not changing, update only the relevant details
      if (existingPaymentMethod.type === 'card' && cardDetails) {
        updateData.cardDetails = {
          ...existingPaymentMethod.cardDetails || {},
          ...cardDetails
        };
      } else if (existingPaymentMethod.type === 'bank' && bankDetails) {
        updateData.bankDetails = {
          ...existingPaymentMethod.bankDetails || {},
          ...bankDetails
        };
      } else if (existingPaymentMethod.type === 'upi' && upiDetails) {
        updateData.upiDetails = {
          ...existingPaymentMethod.upiDetails || {},
          ...upiDetails
        };
      }
    }
  
    // Update the payment method
    const updatedPaymentMethod = await userPaymentMethod.findByIdAndUpdate(
      paymentMethodId,
      { 
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 && { $unset: unsetData })
      },
      { new: true, runValidators: true }
    );
  
    res.status(200).json({
      success: true,
      message: "Payment method updated successfully",
      result: updatedPaymentMethod
    });
  });

  deleteUserPaymentMethod = AsyncHandler(async (req, res) => {
    const paymentMethodId = req.params.payment_method_id;
  
    // ✅ Check if payment method exists

  
    const paymentMethod = await userPaymentMethod.findOne({_id: paymentMethodId,
      userId: req.user}
    );
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }
  
    // ✅ Delete payment method
    await userPaymentMethod.findByIdAndDelete(paymentMethodId);
  
    res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
    });
  })

  //  done 👍

  // transactions 


  getUserTransaction = AsyncHandler(async (req, res) => { 
    const userTransactions = await userTransaction.findOne({ user: req.user._id }) 
      .sort({ createdAt: -1 }); 
  
    // Check if userTransactions is null or undefined
    if (!userTransactions) { 
      return res.json(new ApiResponse(200, "No transactions found", [])); 
    } 
  
    res.json(new ApiResponse(200, "Transaction history retrieved", userTransactions)); 
  });

  // permissions

  getUserPermissions = AsyncHandler(async (req, res) => {
    const  userId  = req.user._id; 
    
    // Find user permissions by user ID 
    const UserPermission = await userPermissions.findOne(
      { user: userId } // Find by user ID field
     
    );
    
    if (!UserPermission) {
      return res.status(404).json({ 
        success: false, 
        message: "User permissions not found" 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "User permissions fetched successfully",
      data: UserPermission
    });
  });

  updateUserPermissions = AsyncHandler(async (req, res) => {
    const  userId  = req.user._id; 
    const { app, email, chat } = req.body; // Assuming these are the fields you want to update
    
    // Prepare update data object
    const updateData = {};
    if (app) updateData.app = app;
    if (email) updateData.email = email;
    if (chat) updateData.chat = chat;
    
    // Prepare unset data (if you need to remove fields)
    const unsetData = {};
    // Add any fields you want to unset to the unsetData object
    // For example: if (req.body.removeField) unsetData['fieldName'] = 1;
    
    // Find user permissions by user ID and update
    const updateUserPermission = await userPermissions.findOneAndUpdate(
      { user: userId }, // Find by user ID field
      { 
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 && { $unset: unsetData })
      },
      { new: true, runValidators: true }
    );
    
    if (!updateUserPermission) {
      return res.status(404).json({ 
        success: false, 
        message: "User permissions not found" 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "User permissions updated successfully",
      data: updateUserPermission
    });
  });


 
}

export default new userSettingsController();
