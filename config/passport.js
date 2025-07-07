import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/User.js";  // Your User model for DB operations

dotenv.config();

const cl_id=process.env.GOOGLE_CLIENT_ID;
const cl_secret=process.env.GOOGLE_CLIENT_SECRET;

passport.use(
  new GoogleStrategy(
    {
      clientID:cl_id,
      clientSecret:cl_secret,
      callbackURL: "https://quizapp-backend-v6zw.onrender.com/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // 1. Check by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 2. Check if user exists by email (registered normally)
          user = await User.findOne({ email });

          if (user) {
            // 3. Link Google account by adding googleId to existing user
            user.googleId = profile.id;
            user.name = user.name || profile.displayName; // optional: update name if not set
            await user.save();
          } else {
            // 4. Create new user with Google info
            user = new User({
              googleId: profile.id,
              email,
              name: profile.displayName,
            });
            await user.save();
          }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

export default passport;
