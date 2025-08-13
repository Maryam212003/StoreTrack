// testEmail.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
console.log('User:', process.env.ALERT_EMAIL_USER);
console.log('Pass:', process.env.ALERT_EMAIL_PASS ? 'Loaded' : 'Missing');
console.log('Receiver:', process.env.ALERT_EMAIL_RECEIVER);

async function sendTestEmail() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ALERT_EMAIL_USER,
        pass: process.env.ALERT_EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"StoreTrack Alerts" <${process.env.ALERT_EMAIL_USER}>`,
      to: process.env.ALERT_EMAIL_RECEIVER,
      subject: 'Test Alert - StoreTrack',
      text: 'This is a test email from StoreTrack.',
    });

    console.log('✅ Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

sendTestEmail();
