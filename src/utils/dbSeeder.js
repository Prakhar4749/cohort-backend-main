// utils/dbSeeder.js
import FAQ from '../models/other/faqModel.js';

export const seedFAQs = async (force = false) => {
  try {
    if (force) {
      await FAQ.deleteMany(); // Clears existing FAQs
      console.log("🗑️ Existing FAQs deleted");
    }

    const count = await FAQ.countDocuments();
    if (count === 0) {
      await FAQ.insertMany([
        // Account-related FAQs
        {
          question: "How do I reset my password?",
          answer: 'Click "Forgot Password" on the login page and follow the instructions.',
          category: "Account",
          popularity: 10,
        },
        {
          question: "Can I change my registered email?",
          answer: "Yes, go to account settings and update your email address.",
          category: "Account",
          popularity: 9,
        },
        {
          question: "How do I delete my account?",
          answer: "You can request account deletion through settings or contact support.",
          category: "Account",
          popularity: 7,
        },

        // Payment-related FAQs
        {
          question: "What payment methods do you accept?",
          answer: "We accept credit/debit cards, UPI, and bank transfers.",
          category: "Payments",
          popularity: 10,
        },
        {
          question: "Is my payment information secure?",
          answer: "Yes, we use encryption and comply with PCI-DSS security standards.",
          category: "Payments",
          popularity: 8,
        },
        {
          question: "How do I get a refund?",
          answer: "Refunds can be requested within 7 days by contacting support.",
          category: "Payments",
          popularity: 7,
        },

        // Support & Contact FAQs
        {
          question: "How can I contact customer support?",
          answer: "Email us at support@cohorts.com or call +91 13121315412.",
          category: "Support",
          popularity: 9,
        },
        {
          question: "Do you offer live chat support?",
          answer: "Yes, live chat is available Monday to Friday from 8 AM to 10 PM.",
          category: "Support",
          popularity: 8,
        },

        // General FAQs
        {
          question: "What are your business hours?",
          answer: "Our support team is available Monday to Friday, 8 AM to 10 PM.",
          category: "General",
          popularity: 6,
        },
        {
          question: "Do you have a mobile app?",
          answer: "Yes, our app is available for iOS and Android.",
          category: "General",
          popularity: 5,
        },
        {
          question: "How do I report a bug?",
          answer: "Use the 'Report a Bug' option in settings or email support.",
          category: "General",
          popularity: 5,
        },
      ]);
      console.log("✅ Sample FAQs added");
    }
  } catch (error) {
    console.error("❌ Error seeding FAQs:", error);
  }
};
