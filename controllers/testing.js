import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_USER="shivashankarrajeurs@gmail.com";
const EMAIL_PASS="cwrutoeljtrqwcig";

async function test() {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  try {
    let info = await transporter.sendMail({
      from: `"Test" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      subject: "Test email from Node.js",
      text: "Hello! This is a test email to verify nodemailer setup.",
    });
    console.log("Email sent:", info.messageId);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

test();
