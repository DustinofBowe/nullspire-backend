const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let characters = [
  { name: "Opifex2012", level: 13, organization: "Cultist" },
  { name: "Nit", level: 4, organization: "Engineer" },
];

app.get("/api/characters", (req, res) => {
  const name = req.query.name?.toLowerCase();
  if (!name) return res.status(400).json({ error: "Missing name" });
  const match = characters.find((c) => c.name.toLowerCase() === name);
  if (!match) return res.status(404).json({ error: "Character not found" });
  res.json(match);
});

app.post("/api/submit", (req, res) => {
  const { name, level, organization } = req.body;
  if (!name || !level || !organization) {
    return res.status(400).json({ error: "All fields required" });
  }
  const exists = characters.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "Character already exists" });
  }
  const newCharacter = { name, level: parseInt(level), organization };
  characters.push(newCharacter);
  res.status(201).json({ message: "Character added", character: newCharacter });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
