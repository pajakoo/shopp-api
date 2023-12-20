const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: "/auth/google/callback",
			scope: ["profile", "email"],
		},
		function (accessToken, refreshToken, profile, callback) {
			console.log(' profile->', profile);
			callback(null, profile);
		}
	)
);

passport.serializeUser((user, done) => {
	console.log('1 passport->', user);
	done(null, user);
});

passport.deserializeUser((user, done) => {
	console.log('2 passport->', user);
	done(null, user);
});
