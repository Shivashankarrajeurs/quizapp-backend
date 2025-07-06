import mongoose from "mongoose";

const UserProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  name: { type: String, default: "Player" },
  imageUrl: { type: String, default: "" },
  stars: { type: Number, default: 0 },
  quizStreak: { type: Number, default: 0 },       // Added quiz streak
  lastQuizDate: { type: Date, default: null },    // Track last quiz date for streak logic
});

const UserProfile = mongoose.model("UserProfile", UserProfileSchema);
export default UserProfile;


