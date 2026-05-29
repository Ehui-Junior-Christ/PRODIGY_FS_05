import express from "express";
import client from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

router.get("/", async (req, res) => {
  try {
    let userId = null;
    const token = req.headers["authorization"]?.split(" ")[1];
    if (token) {
      try { userId = jwt.verify(token, JWT_SECRET).id; } catch (e) {}
    }

    const result = await client.execute(`
      SELECT a.id, a.content, a.media_url, a.created_at, u.name as author, u.handle as author_handle, p.name as prisme,
             (SELECT COUNT(*) FROM likes WHERE angle_id = a.id) as likes,
             0 as comments
      FROM angles a JOIN users u ON a.author_id = u.id
      LEFT JOIN prismes p ON a.prisme_id = p.id ORDER BY a.created_at DESC LIMIT 50
    `);

    const posts = await Promise.all(result.rows.map(async (row) => {
      let isLiked = false;
      if (userId) {
        const likeCheck = await client.execute({ sql: "SELECT 1 FROM likes WHERE user_id = ? AND angle_id = ?", args: [userId, row.id] });
        isLiked = likeCheck.rows.length > 0;
      }
      return { id: row.id, author: row.author, author_handle: row.author_handle, prisme: row.prisme, content: row.content, media_url: row.media_url, likes: row.likes, isLiked, created_at: row.created_at };
    }));
    res.json(posts);
  } catch (error) { res.status(500).json({ error: "Erreur serveur" }); }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { content, prisme, mediaUrl } = req.body;
    let prismeId = null;
    if (prisme) {
      const pRes = await client.execute({ sql: "SELECT id FROM prismes WHERE name = ?", args: [prisme] });
      if (pRes.rows.length > 0) prismeId = pRes.rows[0].id;
      else prismeId = (await client.execute({ sql: "INSERT INTO prismes (name) VALUES (?)", args: [prisme] })).lastInsertRowid;
    }

    // media_url column needs to be added to db if it doesn't exist. We assume it's text.
    const aRes = await client.execute({
      sql: "INSERT INTO angles (prisme_id, author_id, content, media_url) VALUES (?, ?, ?, ?)",
      args: [prismeId, req.user.id, content, mediaUrl || null]
    });
    res.status(201).json({ id: aRes.lastInsertRowid.toString() });
  } catch (error) { 
    console.error("POST /api/angles Error:", error);
    res.status(500).json({ error: "Erreur création" }); 
  }
});

router.post("/:id/like", authenticateToken, async (req, res) => {
  const check = await client.execute({ sql: "SELECT 1 FROM likes WHERE user_id = ? AND angle_id = ?", args: [req.user.id, req.params.id] });
  if (check.rows.length > 0) {
    await client.execute({ sql: "DELETE FROM likes WHERE user_id = ? AND angle_id = ?", args: [req.user.id, req.params.id] });
    res.json({ liked: false });
  } else {
    await client.execute({ sql: "INSERT INTO likes (user_id, angle_id) VALUES (?, ?)", args: [req.user.id, req.params.id] });
    res.json({ liked: true });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    // Vérifier si l'angle appartient bien à l'utilisateur
    const check = await client.execute({ sql: "SELECT author_id FROM angles WHERE id = ?", args: [req.params.id] });
    if (check.rows.length === 0) return res.status(404).json({ error: "Angle introuvable" });
    if (check.rows[0].author_id !== req.user.id) return res.status(403).json({ error: "Non autorisé" });
    
    // Supprimer les likes et les tags liés (si ajoutés plus tard)
    await client.execute({ sql: "DELETE FROM likes WHERE angle_id = ?", args: [req.params.id] });
    await client.execute({ sql: "DELETE FROM angles WHERE id = ?", args: [req.params.id] });
    
    res.json({ message: "Angle supprimé" });
  } catch (error) {
    console.error("DELETE /api/angles Error:", error);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
