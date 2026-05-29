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
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

function getTokenFromRequest(req) {
  return req.headers.authorization?.split(" ")[1];
}

function getUserFromToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

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
      WHERE lower(p.name) NOT LIKE '%selectionner%'
        AND lower(p.name) NOT LIKE '%sélectionner%'
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
    let userId = null;
    const user = getUserFromToken(getTokenFromRequest(req));
    if (user) userId = user.id;

    if (!userId) {
      const result = await client.execute(`
        SELECT u.id, u.name, u.handle, u.avatar_url, u.bio,
          (SELECT COUNT(*) FROM angles WHERE author_id = u.id) as angles_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
          0 as affinity_score,
          0 as isFollowing
        FROM users u
        ORDER BY followers_count DESC, angles_count DESC, u.created_at DESC
        LIMIT 5
      `);
      return res.json(result.rows);
    }

    const result = await client.execute({
      sql: `
        SELECT u.id, u.name, u.handle, u.avatar_url, u.bio,
          (SELECT COUNT(*) FROM angles WHERE author_id = u.id) as angles_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as isFollowing,
          (
            SELECT COUNT(*)
            FROM follows f1
            JOIN follows f2 ON f2.following_id = f1.following_id
            WHERE f1.follower_id = ? AND f2.follower_id = u.id
          ) +
          (
            SELECT COUNT(*)
            FROM angles mine
            JOIN angles theirs ON mine.prisme_id = theirs.prisme_id
            WHERE mine.author_id = ? AND theirs.author_id = u.id AND mine.prisme_id IS NOT NULL
          ) as affinity_score
        FROM users u
        WHERE u.id != ?
        ORDER BY isFollowing ASC, affinity_score DESC, followers_count DESC, angles_count DESC, u.created_at DESC
        LIMIT 5
      `,
      args: [userId, userId, userId, userId]
    });
    res.json(result.rows.map(row => ({ ...row, isFollowing: Boolean(row.isFollowing) })));
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/message-suggestions", async (req, res) => {
  try {
    const user = getUserFromToken(getTokenFromRequest(req));
    if (!user) return res.status(401).json({ error: "Non autorise" });

    const q = String(req.query.q || "").trim().toLowerCase();
    const searchSql = q ? "AND (lower(u.name) LIKE ? OR lower(u.handle) LIKE ?)" : "";
    const searchArgs = q ? [`%${q}%`, `%${q}%`] : [];

    const result = await client.execute({
      sql: `
        SELECT u.id, u.name, u.handle, u.avatar_url, u.bio,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) as i_follow,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id AND following_id = ?) as follows_me,
          (
            SELECT COUNT(*)
            FROM follows f1
            JOIN follows f2 ON f2.following_id = f1.following_id
            WHERE f1.follower_id = ? AND f2.follower_id = u.id
          ) +
          (
            SELECT COUNT(*)
            FROM angles mine
            JOIN angles theirs ON mine.prisme_id = theirs.prisme_id
            WHERE mine.author_id = ? AND theirs.author_id = u.id AND mine.prisme_id IS NOT NULL
          ) as affinity_score
        FROM users u
        WHERE u.id != ? ${searchSql}
        ORDER BY i_follow DESC, follows_me DESC, affinity_score DESC, followers_count DESC, u.created_at DESC
        LIMIT 12
      `,
      args: [user.id, user.id, user.id, user.id, user.id, ...searchArgs]
    });

    res.json(result.rows.map(row => ({
      ...row,
      i_follow: Boolean(row.i_follow),
      follows_me: Boolean(row.follows_me)
    })));
  } catch (error) {
    console.error("GET /api/message-suggestions Error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/messages/:receiverHandle", async (req, res) => {
  try {
    const decoded = getUserFromToken(getTokenFromRequest(req));
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
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
    const decoded = getUserFromToken(getTokenFromRequest(req));
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const userId = decoded.id;

    const result = await client.execute({
      sql: `SELECT u.id, u.name, u.handle, u.avatar_url,
              latest.content as last_message,
              latest.created_at as last_message_at
            FROM users u
            JOIN (
              SELECT
                CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id,
                MAX(id) as last_id
              FROM messages
              WHERE sender_id = ? OR receiver_id = ?
              GROUP BY other_id
            ) grouped ON grouped.other_id = u.id
            JOIN messages latest ON latest.id = grouped.last_id
            ORDER BY latest.created_at DESC, latest.id DESC`,
      args: [userId, userId, userId]
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Socket.io Logic
io.on("connection", (socket) => {
  const socketUser = getUserFromToken(socket.handshake.auth?.token);
  if (!socketUser) {
    socket.emit("message_error", { error: "Connexion non autorisee" });
    socket.disconnect(true);
    return;
  }

  socket.user = socketUser;
  socket.join(`user_${socketUser.id}`);
  console.log("Un utilisateur est connecté :", socket.id);

  // L'utilisateur s'authentifie et rejoint une "room" avec son propre ID
  socket.on("register", (userId) => {
    if (Number(userId) === Number(socket.user.id)) socket.join(`user_${socket.user.id}`);
  });

  socket.on("send_message", async (data) => {
    // data = { senderId, receiverHandle, content }
    try {
      const content = String(data.content || "").trim();
      if (!content) return socket.emit("message_error", { error: "Message vide" });

      const receiverRes = await client.execute({
        sql: "SELECT id, handle FROM users WHERE handle = ?",
        args: [data.receiverHandle]
      });
      if (receiverRes.rows.length === 0) {
        return socket.emit("message_error", { error: "Utilisateur introuvable" });
      }
      const receiverId = receiverRes.rows[0].id;
      if (Number(receiverId) === Number(socket.user.id)) {
        return socket.emit("message_error", { error: "Vous ne pouvez pas vous ecrire a vous-meme" });
      }

      const result = await client.execute({
        sql: "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?) RETURNING *",
        args: [socket.user.id, receiverId, content]
      });

      const message = { ...result.rows[0], sender_handle: socket.user.handle, receiver_handle: receiverRes.rows[0].handle };

      // Envoyer le message au destinataire
      io.to(`user_${receiverId}`).emit("new_message", message);
      // Envoyer le message à l'expéditeur (pour confirmer l'envoi)
      io.to(`user_${socket.user.id}`).emit("new_message", message);

    } catch (err) {
      console.error(err);
      socket.emit("message_error", { error: "Impossible d'envoyer le message" });
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
