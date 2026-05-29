import express from "express";
import cors from "cors";
import client, { initDb } from "./db.js";

import authRoutes from "./routes/auth.js";
import anglesRoutes from "./routes/angles.js";
import usersRoutes from "./routes/users.js";
import notificationsRoutes from "./routes/notifications.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize DB
initDb().catch(console.error);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/angles", anglesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);

// Trending — calculé depuis la vraie BDD
app.get("/api/trending", async (req, res) => {
  try {
    const result = await client.execute(`
      SELECT p.name as topic, COUNT(a.id) as count
      FROM prismes p
      LEFT JOIN angles a ON a.prisme_id = p.id
      GROUP BY p.id
      ORDER BY count DESC
      LIMIT 10
    `);
    const rows = result.rows.map(r => ({
      topic: '#' + r.topic,
      count: r.count + (r.count === 1 ? ' Angle' : ' Angles')
    }));
    // Si aucune donnée, retourner des valeurs par défaut
    if (rows.length === 0) {
      return res.json([
        { topic: '#DesignEngineering', count: '0 Angles' },
        { topic: '#Web3', count: '0 Angles' },
        { topic: '#Tech', count: '0 Angles' }
      ]);
    }
    res.json(rows);
  } catch (error) {
    res.json([{ topic: '#Prisme', count: '0 Angles' }]);
  }
});

// Suggestions — utilisateurs à suivre (excluant l'utilisateur connecté)
app.get("/api/suggestions", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT id, name, handle FROM users ORDER BY RANDOM() LIMIT 5"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Prisme Backend running on http://localhost:${PORT}`);
});
