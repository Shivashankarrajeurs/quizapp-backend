

import express from "express";
import axios from "axios";
import authMiddleware from "../middleware/authMiddleware.js";
import UserProfile from "../models/UserProfile.js";
import dotenv from "dotenv";



const router = express.Router();
dotenv.config();
const apiurl=process.env.quizurl;
const key=process.env.x_rapidapi_key;
const host=process.env.x_rapidapi_host;

// In-memory quiz data cache (populated once)
let quizAll = [];

const quizAPI = {
  url:apiurl,
  headers: {
    'x-rapidapi-key':key,
    'x-rapidapi-host':host,
  },
};

// Fetch and cache quiz data at server start
const fetchQuizData = async () => {
  try {
    const response = await axios.get(quizAPI.url, { headers: quizAPI.headers });
    quizAll = response.data || [];
  } catch (error) {
    console.error("Failed to fetch quiz data:", error.message);
  }
};
fetchQuizData();

// GET /quiz/question - return one random question
router.get("/question", authMiddleware, async (req, res) => {
  if (quizAll.length === 0) return res.status(503).json({ message: "No questions available." });
  const randomIndex = Math.floor(Math.random() * quizAll.length);
  const question = quizAll[randomIndex];
  res.json({ question });
});

// POST /quiz/completed - submit total stars earned
router.post("/completed", authMiddleware, async (req, res) => {
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
      const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
    }

    if (diffDays === 1) {
      profile.quizStreak += 1;
    } else if (diffDays > 1) {
      profile.quizStreak = 1;
    }

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
