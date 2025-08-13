import cron from 'node-cron';
import prisma from '../prisma/prismaClient.js';
import nodemailer from 'nodemailer';

// Email transporter config
const transporter = nodemailer.createTransport({
  service: 'gmail', // or "smtp.mailtrap.io" for testing
  auth: {
    user: process.env.ALERT_EMAIL_USER, // Your email
    pass: process.env.ALERT_EMAIL_PASS  // App password (not your main password)
  }
});

const LOW_STOCK_THRESHOLD = 100; // Change as needed

// Function to check and send alert
async function checkLowStockAndNotify() {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lt: LOW_STOCK_THRESHOLD },
        OR: [
          { thruDate: null },
          { thruDate: { gt: new Date() } } // only active products
        ]
      }
    });

    if (lowStockProducts.length === 0) {
      console.log("✅ No low-stock products found.");
      return;
    }

    // Prepare email content
    const productList = lowStockProducts
      .map(p => `- ${p.name} (Stock: ${p.stock})`)
      .join('\n');

    const mailOptions = {
      from: process.env.ALERT_EMAIL_USER,
      to: process.env.ALERT_EMAIL_RECEIVER,
      subject: "⚠ Low Stock Alert",
      text: `The following products are running low:\n\n${productList}`
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`📩 Low stock alert sent. Products: ${lowStockProducts.length}`);
  } catch (err) {
    console.error("❌ Error checking low stock:", err);
  }
}

// Schedule job to run every day at 6:00 AM
cron.schedule('0 6 * * *', checkLowStockAndNotify, {
  timezone: "Asia/Tehran" // Change to your timezone
});

export default checkLowStockAndNotify;
