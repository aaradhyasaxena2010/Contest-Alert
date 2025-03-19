// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Setup session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'secretKey',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

/* ---------------------------
   Mongoose Schemas & Models
------------------------------*/

// User Schema: Stores Google profile and reminder preferences
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: String,
    email: String,
    reminderPreferences: {
        leetcode: { type: Boolean, default: false },
        codeforces: {
            div1: { type: Boolean, default: false },
            div3: { type: Boolean, default: false },
            div4: { type: Boolean, default: false }
        }
    }
});
const User = mongoose.model('User', userSchema);

// Contest Schema: Stores contest details (from Codeforces or computed LeetCode)
const contestSchema = new mongoose.Schema({
    platform: String,
    name: String,
    startTime: Number, // UNIX timestamp in seconds
    duration: Number   // in seconds
});
const Contest = mongoose.model('Contest', contestSchema);

/* ---------------------------
      Passport Configuration
------------------------------*/

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

/* ---------------------------
      Authentication Routes
------------------------------*/

// Start Google OAuth flow
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// OAuth callback
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // Redirect to frontend after successful login (adjust URL as needed)
    res.redirect('http://localhost:3000');
});

app.get('/auth/logout', (req, res) => {
    // Use the callback version if Passport >= 0.6.0
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ error: "Logout failed" });
        }
        // Then destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
                return res.status(500).json({ error: "Logout failed" });
            }
            // Clear the session cookie
            res.clearCookie('connect.sid');
            // Option 1: Redirect
            // return res.redirect('http://localhost:3000');

            // Option 2: Send JSON success response (no redirect)
            return res.json({ message: "Signed out successfully." });
        });
    });
});






/* ---------------------------
      User Preferences Endpoint
------------------------------*/

// Update reminder preferences for logged-in user
app.post('/api/user/preferences', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const updatedUser = await User.findByIdAndUpdate(req.user.id, {
            reminderPreferences: req.body.reminderPreferences
        }, { new: true });
        res.json({ message: 'Preferences updated', user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

app.get('/api/user-preferences', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.user.id; // Assuming authentication middleware  
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user.reminderPreferences); // Assuming preferences are stored in user object
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


app.get('/api/user/info', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Return whichever fields you want:
        res.json({
            name: user.name,
            email: user.email,
            reminderPreferences: user.reminderPreferences
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});


/* ---------------------------
      Contest Fetch & Compute
------------------------------*/

// Fetch Codeforces contests via API
async function fetchCodeforcesContests() {
    try {
        const response = await axios.get('https://codeforces.com/api/contest.list');
        const contests = response.data.result;
        const upcoming = contests.filter(contest => contest.phase === 'BEFORE');
        return upcoming.map(contest => ({
            platform: 'Codeforces',
            name: contest.name,
            startTime: contest.startTimeSeconds,
            duration: contest.durationSeconds
        }));
    } catch (error) {
        console.error("Error fetching Codeforces contests:", error);
        return [];
    }
}

// Compute next LeetCode Weekly Contest (every Sunday at 8:00 IST)
function getNextWeeklyContest(currentDate) {
    const currentDay = currentDate.getDay();
    let daysUntilSunday = (7 - currentDay) % 7;
    if (currentDay === 0) {
        const contestToday = new Date(currentDate);
        contestToday.setUTCHours(14, 30, 0, 0); // 08:00 IST = 2:30 UTC
        if (currentDate < contestToday) {
            daysUntilSunday = 0;
        } else {
            daysUntilSunday = 7;
        }
    }
    const contestDate = new Date(currentDate);
    contestDate.setDate(contestDate.getDate() + daysUntilSunday);
    contestDate.setUTCHours(14, 30, 0, 0);
    return contestDate;
}

// Compute next LeetCode Biweekly Contest (every second Saturday at 8:00 PM IST)
function getNextBiweeklyContest(currentDate) {
    // Reference: January 8, 2022 at 8:00 PM IST (14:30 UTC)
    const reference = new Date(Date.UTC(2022, 0, 8, 14, 30, 0));
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((currentDate - reference) / msPerDay);
    const periodsPassed = Math.floor(diffDays / 14);
    let candidate = new Date(reference.getTime() + periodsPassed * 14 * msPerDay);
    candidate.setUTCHours(14, 30, 0, 0);
    if (candidate <= currentDate) {
        candidate = new Date(candidate.getTime() + 14 * msPerDay);
    }
    return candidate;
}

// Compute the next three upcoming LeetCode contests
function computeUpcomingLeetCodeContests() {
    const now = new Date();
    const weekly1 = getNextWeeklyContest(now);
    const weekly2 = new Date(weekly1.getTime() + 7 * 24 * 60 * 60 * 1000);
    const biweekly1 = getNextBiweeklyContest(now);
    const biweekly2 = new Date(biweekly1.getTime() + 14 * 24 * 60 * 60 * 1000);
    const contests = [
        { platform: 'LeetCode', name: 'LeetCode Weekly Contest', startTime: Math.floor(weekly1.getTime() / 1000), duration: 5400 },
        { platform: 'LeetCode', name: 'LeetCode Weekly Contest', startTime: Math.floor(weekly2.getTime() / 1000), duration: 5400 },
        { platform: 'LeetCode', name: 'LeetCode Biweekly Contest', startTime: Math.floor(biweekly1.getTime() / 1000), duration: 5400 },
        { platform: 'LeetCode', name: 'LeetCode Biweekly Contest', startTime: Math.floor(biweekly2.getTime() / 1000), duration: 5400 }
    ];
    contests.sort((a, b) => a.startTime - b.startTime);
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const upcoming = contests.filter(c => c.startTime > nowSeconds);
    return upcoming.slice(0, 3);
}

// Update contests endpoint: Merges Codeforces and computed LeetCode contests
app.post('/api/updateContests', async (req, res) => {
    console.log("POST /api/updateContests hit");
    try {
        const codeforcesContests = await fetchCodeforcesContests();
        const leetcodeContests = computeUpcomingLeetCodeContests();
        const allContests = [...codeforcesContests, ...leetcodeContests];

        // Clear existing contests and insert new ones
        await Contest.deleteMany({});
        await Contest.insertMany(allContests);

        res.json({ message: "Contests updated", count: allContests.length });
    } catch (error) {
        console.error("Error updating contests:", error);
        res.status(500).json({ error: "Failed to update contests" });
    }
});

// Get contests endpoint
app.get('/api/contests', async (req, res) => {
    try {
        const contests = await Contest.find({}).sort({ startTime: 1 });
        res.json(contests);
    } catch (error) {
        console.error("Error retrieving contests:", error);
        res.status(500).json({ error: "Failed to retrieve contests" });
    }
});

/* ---------------------------
      Email Reminder Setup
------------------------------*/

// Configure Nodemailer transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
// Cron job to run every minute and send reminder emails 20 minutes before contest start
cron.schedule('* * * * *', async () => {
    try {
        const now = Math.floor(Date.now() / 1000);
        const reminderTime = now + 20 * 60; // Exactly 20 minutes from now

        // Find contests starting exactly 20 minutes from now
        const upcomingContests = await Contest.find({
            startTime: { $gte: reminderTime - 60, $lte: reminderTime + 60 } // ±30 sec buffer
        });

        for (let contest of upcomingContests) {
            let users = [];

            if (contest.platform === 'LeetCode') {
                users = await User.find({ 'reminderPreferences.leetcode': true });
            } else if (contest.platform === 'Codeforces') {
                users = await User.find({
                    $or: [
                        { 'reminderPreferences.codeforces.div1': true },
                        { 'reminderPreferences.codeforces.div3': true },
                        { 'reminderPreferences.codeforces.div4': true }
                    ]
                });
            }
            // Add more platforms as needed

            for (let user of users) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Reminder: ${contest.name} is starting soon!`,
                    text: `Hi ${user.name},\n\nReminder: ${contest.name} starts at ${new Date(contest.startTime * 1000).toLocaleString()}.\n\nGood luck!\n\nBest,\nContest Alert Team`
                };

                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`Reminder email sent to ${user.email}`);
                } catch (error) {
                    console.error(`Failed to send email to ${user.email}:`, error);
                }

                // Introduce a delay of 1 second before sending the next email
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});



app.get('/test-email', async (req, res) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: "your-email@example.com", // Replace with your email
            subject: "Test Email from Contest Alert",
            text: "This is a test email to verify if the mailing system is working correctly."
        };

        await transporter.sendMail(mailOptions);
        res.send("Test email sent successfully!");
    } catch (error) {
        console.error("Error sending test email:", error);
        res.status(500).send("Failed to send test email.");
    }
});

app.get('/test-email-all', async (req, res) => {
    try {
        // Fetch all users from the database
        const users = await User.find({}, 'email name');

        if (!users.length) {
            return res.status(404).send("No users found in the database.");
        }

        // Send an email to each user
        for (let user of users) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email, // Send email to each user
                subject: "Test Email from Contest Alert",
                text: `Hi ${user.name},\n\nThis is a test email to verify if the mailing system is working correctly for all users.\n\nBest,\nContest Alert Team`
            };

            // Send email asynchronously
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error(`Failed to send email to ${user.email}:`, error);
                } else {
                    console.log(`Test email sent to ${user.email}: ${info.response}`);
                }
            });
        }

        res.send("Test emails sent to all users!");

    } catch (error) {
        console.error("Error sending test emails:", error);
        res.status(500).send("Failed to send test emails.");
    }
});



/* ---------------------------
         Start Server
------------------------------*/
const PORT = process.env.PORT || 5001;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });
module.exports = app