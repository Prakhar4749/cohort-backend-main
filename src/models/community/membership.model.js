import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
    // The user who is a member
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // The community they belong to
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community',
        required: true
    },
    
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned'],
        default: 'active'
    },
    subscriptionStatus: {
        type: String,
        enum: ['free', 'paid', 'expired'],
        default: 'free'
    },
    
    // Gamification data
    level: {
        currentLevel: { type: Number, default: 1 },
        points: { type: Number, default: 0 },
        progress: { type: Number, default: 0 }
    },

    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure a user can only be a member of a community once
membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

export const Membership = mongoose.model('Membership', membershipSchema);