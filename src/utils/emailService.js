// utils/emailService.js
import nodemailer from 'nodemailer';

export const sendEmailNotification = (subject, message) => {
  // This would be configured with your actual email provider
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'example@gmail.com',
      pass: process.env.EMAIL_PASS || 'password'
    }
  });
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'example@gmail.com',
    to: 'cohortsupport@mail.com',
    subject: subject,
    text: message
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};
