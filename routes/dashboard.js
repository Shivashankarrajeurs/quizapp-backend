import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import UserProfile from "../models/UserProfile.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads/profile-images");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + "_" + Date.now() + ext);
  },
});
const upload = multer({ storage });

// Get user profile by user id
router.get("/profile/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    let profile = await UserProfile.findOne({ user: userId });

    if (!profile) {
      // If profile doesn't exist, create a default one
      profile = new UserProfile({ user: userId });
      await profile.save();
    }

    res.json({
      name: profile.name,
      imageUrl: profile.imageUrl,
      stars: profile.stars,
      quizStreak: profile.quizStreak,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Update profile name and image URL
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, imageUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in token" });
    }

    let profile = await UserProfile.findOne({ user: userId });
    if (!profile) {
      profile = new UserProfile({ user: userId, name: "Player" });
    }

    if (typeof name === "string") profile.name = name.trim() || "Player";
    if (typeof imageUrl === "string") profile.imageUrl = imageUrl;

    await profile.save();

    res.json({
      message: "Profile updated successfully",
      name: profile.name,
      imageUrl: profile.imageUrl,
      stars: profile.stars,
      quizStreak: profile.quizStreak,
    });
  } catch (error) {
    console.error("Error in /profile PUT:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

// Upload profile image
router.post(
  "/uploadImage",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const imageUrl = `/uploads/profile-images/${req.file.filename}`;

      // Save image URL in user profile
      let profile = await UserProfile.findOne({ user: req.user.id });
      if (!profile) {
        profile = new UserProfile({ user: req.user.id });
      }
      profile.imageUrl = imageUrl;
      await profile.save();

      res.json({ imageUrl });
    } catch (error) {
      console.error("Failed to upload image:", error);
      res.status(500).json({ message: "Image upload failed" });
    }
  }
);

// Leaderboard - return all users sorted by stars descending
// backend/routes/leaderboard.js
router.get("/leaderboard", authMiddleware, async (req, res) => {
  try {
    const leaderboard = await UserProfile.find({})
      .select("name stars imageUrl quizStreak")
      .sort({ stars: -1 })
      .lean();

    const baseURL = process.env.BASE_URL || "http://localhost:5000"; // replace with your prod domain if needed
   

    const leaderboardWithImage = leaderboard.map((user) => ({
      ...user,
      name: user.name?.trim() || "Player",
      imageUrl: user.imageUrl?.startsWith("http")
        ? user.imageUrl
        : user.imageUrl
        ? `${baseURL}/${user.imageUrl}`
        : "",
    }));

    res.json(leaderboardWithImage);
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});



// Update stars and quiz streak after quiz completed
router.post("/quiz/completed", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { starsEarned } = req.body;

    if (!starsEarned || starsEarned <= 0)
      return res.status(400).json({ message: "Invalid stars earned" });

    let profile = await UserProfile.findOne({ user: userId });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!profile) {
      profile = new UserProfile({
        user: userId,
        stars: starsEarned,
        quizStreak: 1,
        lastQuizDate: today,
      });
      await profile.save();
      return res.json({
        message: "Stars added and streak started",
        stars: starsEarned,
        quizStreak: 1,
      });
    }

    const lastDate = profile.lastQuizDate ? new Date(profile.lastQuizDate) : null;
    let diffDays = 0;
    if (lastDate) {
      const lastDay = new Date(
        lastDate.getFullYear(),
        lastDate.getMonth(),
        lastDate.getDate()
      );
      diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
    }

    if (diffDays === 1) {
      profile.quizStreak += 1; // next day
    } else if (diffDays > 1) {
      profile.quizStreak = 1; // missed days reset streak
    }
    // diffDays === 0 means same day, keep streak as is

    profile.stars += starsEarned;
    profile.lastQuizDate = today;

    await profile.save();

    res.json({
      message: "Stars and quiz streak updated",
      stars: profile.stars,
      quizStreak: profile.quizStreak,
    });
  } catch (error) {
    console.error("Failed to update stars and streak:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;