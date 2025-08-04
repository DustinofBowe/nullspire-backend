const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

app.use(cors());
app.use(bodyParser.json());

const ADMIN_PASSWORD = "ChatGPT123";

let pendingCharacters = [];
let approvedCharacters = [];
let nextId = 1;

// Public: get approved characters by name
app.get("/api/characters", (req, res) => {
  const nameQuery = (req.query.name || "").toLowerCase();
  const character = approvedCharacters.find(
    (c) => c.name.toLowerCase() === nameQuery
  );
  if (character) {
    res.json(character);
  } else {
    res.status(404).json({ error: "Character not found." });
  }
});

// Public: submit new character (goes to pending)
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
  res.json({ message: "Submission received, pending approval." });
});

// Admin auth middleware (simple password check)
function checkAdminPassword(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Admin: list pending characters
app.get("/api/pending", checkAdminPassword, (req, res) => {
  res.json(pendingCharacters);
});

// Admin: approve a pending character by id
app.post("/api/pending/approve", checkAdminPassword, (req, res) => {
  const { id } = req.body;
  const index = pendingCharacters.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Pending character not found" });
  }
  const [approved] = pendingCharacters.splice(index, 1);
  approvedCharacters.push(approved);
  res.json({ message: "Character approved", character: approved });
});

// Admin: reject a pending character by id
app.post("/api/pending/reject", checkAdminPassword, (req, res) => {
  const { id } = req.body;
  const index = pendingCharacters.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Pending character not found" });
  }
  pendingCharacters.splice(index, 1);
  res.json({ message: "Character rejected" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
});
