import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth.js";
import userRoutes from './routes/dashboard.js';
import quizroutes from "./routes/quizapi.js";
import path from "path";
import dotenv from "dotenv";
 

const app = express();
dotenv.config();
const PORT = process.env.PORT;
const mongouri=process.env.MONGO_URI;
const secret=process.env.JWT_SECRET;


app.use(cors({
  origin: "http://localhost:3000", // your React app origin
  credentials: true,
}));
app.use(express.json());

app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());

app.use(passport.session());

// In your main server file (e.g., app.js or server.js)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


// MongoDB connection
mongoose.connect(mongouri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Routes
app.use("/api/auth", authRoutes);
app.use('/api', userRoutes);
app.use('/quiz',quizroutes);




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
