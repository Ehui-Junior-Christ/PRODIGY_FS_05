import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import client, { initDb } from "./db.js";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/auth.js";
import anglesRoutes from "./routes/angles.js";
import usersRoutes from "./routes/users.js";
import notificationsRoutes from "./routes/notifications.js";

const app = express();
const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, "..");
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.use("/css", express.static(path.join(publicRoot, "css")));
app.use("/js", express.static(path.join(publicRoot, "js")));

const PORT = process.env.PORT || 3000;

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/angles", anglesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);

app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get(["/", "/index.html", "/trending.html", "/notifications.html", "/profile.html", "/messages.html", "/verify.html", "/reset-password.html"], (req, res) => {
  const requestedFile = req.path === "/" ? "index.html" : req.path.slice(1);
  res.sendFile(path.join(publicRoot, requestedFile));
});

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

app.get("/api/messages/:receiverHandle", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_prisme_key");
    const senderId = decoded.id;

    const receiverRes = await client.execute({
      sql: "SELECT id FROM users WHERE handle = ?",
      args: [req.params.receiverHandle]
    });
    if (receiverRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const receiverId = receiverRes.rows[0].id;

    const result = await client.execute({
      sql: `SELECT m.*, u.handle as sender_handle 
            FROM messages m 
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?) 
               OR (m.sender_id = ? AND m.receiver_id = ?) 
            ORDER BY m.created_at ASC`,
      args: [senderId, receiverId, receiverId, senderId]
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Conversations list
app.get("/api/conversations", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_prisme_key");
    const userId = decoded.id;

    // A simple query to get users you have exchanged messages with
    const result = await client.execute({
      sql: `SELECT DISTINCT u.id, u.name, u.handle 
            FROM users u
            JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id)
            WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?`,
      args: [userId, userId, userId]
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Socket.io Logic
io.on("connection", (socket) => {
  console.log("Un utilisateur est connecté :", socket.id);

  // L'utilisateur s'authentifie et rejoint une "room" avec son propre ID
  socket.on("register", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("send_message", async (data) => {
    // data = { senderId, receiverHandle, content }
    try {
      const receiverRes = await client.execute({
        sql: "SELECT id FROM users WHERE handle = ?",
        args: [data.receiverHandle]
      });
      if (receiverRes.rows.length === 0) return;
      const receiverId = receiverRes.rows[0].id;

      const result = await client.execute({
        sql: "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?) RETURNING *",
        args: [data.senderId, receiverId, data.content]
      });

      const message = result.rows[0];

      // Envoyer le message au destinataire
      io.to(`user_${receiverId}`).emit("new_message", { ...message, sender_handle: data.senderHandle });
      // Envoyer le message à l'expéditeur (pour confirmer l'envoi)
      io.to(`user_${data.senderId}`).emit("new_message", { ...message, sender_handle: data.senderHandle });

    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
  });
});

try {
  await initDb();
  httpServer.listen(PORT, () => {
    console.log(`Prisme Backend running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Failed to initialize database:", error);
  process.exit(1);
}
