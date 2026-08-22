const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./model/User");

const app = express();
const DEFAULT_ALLOWED_ORIGINS = [
  "https://voting-appp.vercel.app",
];

const normalizeOrigin = (origin) =>
  origin.trim().replace(/^["'\[]+|["'\]]+$/g, "").replace(/\/$/, "");

// Supports a normal comma-separated value as well as a JSON-like value copied
// from an array, e.g. ["https://site-a.com", "https://site-b.com"].
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);

const corsOptions = {
  origin: (origin, callback) => {
    // Requests without an Origin header (health checks, curl, same-origin) are safe.
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: Origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Explicitly register every API preflight for serverless deployments too.
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.set("trust proxy", 1);

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "career_nav_secret";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let databaseConnection;

if (!MONGO_URI) {
  console.error(
    "DB Error: Missing MONGO_URI. Add it to your Vercel backend environment variables."
  );
}

const connectDatabase = async () => {
  if (!MONGO_URI) throw new Error("Database configuration is missing");
  if (mongoose.connection.readyState === 1) return;

  if (!databaseConnection) {
    databaseConnection = mongoose
      .connect(MONGO_URI, { serverSelectionTimeoutMS: 8_000 })
      .then(() => console.log("MongoDB Atlas Connected"))
      .catch((error) => {
        databaseConnection = null;
        throw error;
      });
  }

  await databaseConnection;
};

if (MONGO_URI) {
  connectDatabase().catch((error) => console.error("DB Error:", error.message));
}

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

app.get("/api/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "starting",
    database: databaseReady ? "connected" : "unavailable",
  });
});

app.use("/api", async (_req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error("Database unavailable:", error.message);
    res.status(503).json({ message: "Database unavailable. Try again in a moment." });
  }
});


app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Enter email and password" });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email: normalizedEmail, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User Registered" });
  } catch (err) {
    console.error("Registration error:", err.message);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    res.status(500).json({ message: "Registration failed. Try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Enter email and password" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});



//  Schema creation
const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },

  options: [
    {
      text: { type: String, required: true },
      votes: { type: Number, default: 0 },
    },
  ],

  expiryTime: {
    type: Date,
    required: true,
  },

  votesByIP: [
    {
      ip: String,
      userId: String, 
      optionIndex: Number,
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Poll = mongoose.model("Poll", pollSchema);



// CREATE POLL
app.post("/api/polls", async (req, res) => {
  try {
    const { question, options, expiryTime } = req.body;

    if (
      typeof question !== "string" ||
      !Array.isArray(options) ||
      options.length < 2 ||
      options.length > 4 ||
      options.some((option) => typeof option !== "string" || !option.trim()) ||
      Number.isNaN(new Date(expiryTime).getTime()) ||
      new Date(expiryTime) <= new Date()
    ) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const poll = new Poll({
      question: question.trim(),
      options: options.map((option) => ({ text: option.trim() })),
      expiryTime,
    });

    await poll.save();
    res.status(201).json(poll);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET POLLS
app.get("/api/polls", async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VOTE
app.post("/api/polls/:id/vote", async (req, res) => {
  try {
    const { optionIndex, userId } = req.body;

    if (!Number.isInteger(optionIndex)) {
      return res.status(400).json({ message: "Choose a valid option" });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Choose a valid option" });
    }

   
    if (new Date() > new Date(poll.expiryTime)) {
      return res.status(400).json({ message: "Poll expired" });
    }

  
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const existingVote = poll.votesByIP.find((v) => v.ip === ip || v.userId === userId);

    if (existingVote) {
      
      poll.options[existingVote.optionIndex].votes -= 1;
      existingVote.optionIndex = optionIndex;
      existingVote.userId = userId; 
    } else {
      poll.votesByIP.push({ ip, optionIndex, userId });
    }

    
    poll.options[optionIndex].votes += 1;

    await poll.save();
    res.json(poll);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
