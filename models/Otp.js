// models/Otp.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  type: { type: String, required: true }, // 🔥 add this line
});


export default mongoose.model('Otp', otpSchema);

