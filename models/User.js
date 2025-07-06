import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  uniqueId: {
    type: Number,
    unique: true,
    required: false,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    default: "",
  },
  dateRegistered: {
    type: Date,
    default: Date.now,
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model("User", userSchema);
export default User;

