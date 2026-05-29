import express from "express";
import cors from "cors";
import client, { initDb } from "./db.js";

import authRoutes from "./routes/auth.js";
import anglesRoutes from "./routes/angles.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize DB
initDb().catch(console.error);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/angles", anglesRoutes);

app.get("/api/trending", async (req, res) => {
  res.json([
    { topic: '#DesignEngineering', count: '1.2k Angles' },
    { topic: '#Web3', count: '854 Angles' }
  ]);
});

app.get("/api/suggestions", async (req, res) => {
  try {
    const result = await client.execute("SELECT id, name, handle FROM users ORDER BY RANDOM() LIMIT 5");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Prisme Backend running on http://localhost:${PORT}`);
});
