import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import UserProfile from "../models/UserProfile.js";
import {jwtDecode} from "jwt-decode";
import Otp from "../models/Otp.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";




const router = express.Router();
dotenv.config();

const JWT_SECRET= process.env.JWT_SECRET;

const EMAIL_USER=process.env.EMAIL_USER;
const EMAIL_PASS=process.env.EMAIL_PASS;


async function generateUniqueId() {
  while (true) {
    const id = Math.floor(100000 + Math.random() * 900000);
    const user = await User.findOne({ uniqueId: id });
    if (!user) return id;
  }
}




router.post('/send-otp', async (req, res) => {
  const { email, type } = req.body;

  if (!email || !type) {
    return res.status(400).json({ success: false, message: "Email and type are required" });
  }

  try {
    const existingUser = await User.findOne({ email });


    if (type === "verifyEmail" && existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    if (type === "resetPassword" && !existingUser) {
      return res.status(400).json({ success: false, message: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

   
    await Otp.deleteMany({ email, type });

    const newOtp = new Otp({ email, otp, expiresAt, type });
    await newOtp.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Quizzy.in" <${EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Hi,Your OTP is: ${otp}. It will expire in 5 minutes.`,
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ success: false, message: "Error sending OTP" });
  
}
});





router.post('/verify-otp', async (req, res) => {
  const { email, otp, type } = req.body;

  if (!email || !otp || !type) {
    return res.status(400).json({ success: false, message: "Email, OTP, and type are required" });
  }

  try {
    const otpRecord = await Otp.findOne({ email, type });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });
    }

    const now = new Date();
    if (now > new Date(otpRecord.expiresAt)) {
      await Otp.deleteMany({ email, type }); 
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    if (otp !== otpRecord.otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

   
    await Otp.deleteMany({ email, type });

    return res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});




router.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });


  const isStrongPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
  if (!isStrongPassword) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long and contain both letters and numbers."
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    await Otp.deleteMany({ email }); 

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});





router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

   
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }


    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters and include letters and numbers",
      });
    }

  
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const uniqueId = await generateUniqueId();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Save new user
    const newUser = new User({ uniqueId, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt with:", email, password);

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("User found:", user.email, user._id);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Password does not match");
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email ,name:user.name,isGuest:user.isGuest},
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    //console.log("Generated token:", token);
    console.log(jwtDecode(token));

    res.json({
      message: "Login successful",
      token,
      user: { id: user.uniqueId, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// GET /api/auth/google (start OAuth)
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// backend/routes/auth.js

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const payload = {
      userId: req.user._id,
      email: req.user.email,
      name: req.user.name,
    };

    const token = jwt.sign(payload,JWT_SECRET, {
      expiresIn: "24h",
    });

    
    res.redirect(`http://localhost:3000/oauth-redirect?token=${token}`);
  }
);


router.post("/guest", async (req, res) => {
  try {
    const uniqueId = await generateUniqueId();

    const guestUser = new User({
      uniqueId,
      isGuest: true,
      dateRegistered: new Date(),
    });

    await guestUser.save();

   
    const token = jwt.sign(
      {
        userId: guestUser._id,
        uniqueId: guestUser.uniqueId,
        isGuest: true,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log(jwtDecode(token));

   
    res.json({
      message: "Guest login successful",
      token,
      user: {
        id: guestUser.uniqueId,
        isGuest: true,
      },
    });
  } catch (err) {
    console.error("Guest login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
export default router;
