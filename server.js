const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const app = express();

const FRONTEND_ORIGINS = [
  'https://nullspire-frontend-pi.vercel.app',
  'https://nullspire-frontend-ktmwv3kmz-dustinofbowes-projects.vercel.app',
  'https://nullspire-frontend-24d2gec4r-dustinofbowes-projects.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || FRONTEND_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Password']
}));

app.options("*", cors()); // ✅ Add this to fix CORS preflight

app.use(bodyParser.json());

const ADMIN_PASSWORD = "ChatGPT123";
const DATA_FILE = "/data/data.json";

let pendingCharacters = [];
let approvedCharacters = [];
let nextId = 1;

// Load data
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE));
      pendingCharacters = data.pendingCharacters || [];
      approvedCharacters = data.approvedCharacters || [];
      nextId = data.nextId || 1;
    } catch (e) {
      console.error("Failed to load data.json", e);
    }
  }
}

// Save data
function saveData() {
  const data = {
    pendingCharacters,
    approvedCharacters,
    nextId
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

loadData();

// Routes
app.get("/api/characters", (req, res) => {
  const nameQuery = (req.query.name || "").toLowerCase();
  const matches = approvedCharacters.filter((c) =>
    c.name.toLowerCase().includes(nameQuery)
  );
  if (matches.length > 0) res.json(matches);
  else res.status(404).json({ error: "Character not found." });
});

app.post("/api/submit", (req, res) => {
  const { name, level, organization, profession } = req.body;
  if (!name || !level || !organization || !profession) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const newChar = {
    id: nextId++,
    name,
    level,
    organization,
    profession,
  };
  pendingCharacters.push(newChar);
  saveData();
  res.json({ message: "Submission received, pending approval." });
});

// Admin auth
function checkAdminPassword(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/api/pending", checkAdminPassword, (req, res) => {
  res.json(pendingCharacters);
});

app.post("/api/pending/approve", checkAdminPassword, (req, res) => {
  const { id } = req.body;
  const index = pendingCharacters.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: "Pending character not found" });
  const [approved] = pendingCharacters.splice(index, 1);
  approvedCharacters.push(approved);
  saveData();
  res.json({ message: "Character approved", character: approved });
});

app.post("/api/pending/reject", checkAdminPassword, (req, res) => {
  const { id } = req.body;
  const index = pendingCharacters.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: "Pending character not found" });
  pendingCharacters.splice(index, 1);
  saveData();
  res.json({ message: "Character rejected" });
});

app.get("/api/approved", checkAdminPassword, (req, res) => {
  res.json(approvedCharacters);
});

app.post("/api/approved/delete", checkAdminPassword, (req, res) => {
  const { id } = req.body;
  const index = approvedCharacters.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ error: "Character not found" });
  approvedCharacters.splice(index, 1);
  saveData();
  res.json({ message: "Character deleted" });
});

app.post("/api/approved/edit", checkAdminPassword, (req, res) => {
  const { id, field, value } = req.body;
  const char = approvedCharacters.find((c) => c.id === id);
  if (!char) return res.status(404).json({ error: "Character not found" });
  if (!["name", "level", "organization", "profession"].includes(field)) {
    return res.status(400).json({ error: "Invalid field" });
  }
  char[field] = value;
  saveData();
  res.json({ message: "Character updated", character: char });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
