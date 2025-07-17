import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './src/models/User.js'; // Adjust the path as necessary

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        let user = await User.findOne({ email });

        if (!user) {
          // Create with default values (can be updated later via frontend)
          user = await User.create({
            name: profile.displayName,
            email,
            board: 'Not Set',
            grade: 'Not Set',
            school: '',
            div: '',
            pincode: '',
            badges: [],
            totalTimeSpent: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalPoints: 0,
            experience: 0,
            completedVideos: [],
            // credential_id is skipped for Google users
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
