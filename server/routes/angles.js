import express from "express";
import client from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

async function ensureCommentsSchema() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      angle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (angle_id) REFERENCES angles (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
}

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
      SELECT a.id, a.content, a.media_url, a.created_at, u.name as author, u.handle as author_handle, u.avatar_url, p.name as prisme,
             (SELECT COUNT(*) FROM likes WHERE angle_id = a.id) as likes,
             (SELECT COUNT(*) FROM comments WHERE angle_id = a.id) as comments
      FROM angles a JOIN users u ON a.author_id = u.id
      LEFT JOIN prismes p ON a.prisme_id = p.id ORDER BY a.created_at DESC LIMIT 50
    `);

    const posts = await Promise.all(result.rows.map(async (row) => {
      let isLiked = false;
      if (userId) {
        const likeCheck = await client.execute({ sql: "SELECT 1 FROM likes WHERE user_id = ? AND angle_id = ?", args: [userId, row.id] });
        isLiked = likeCheck.rows.length > 0;
      }
      return { id: row.id, author: row.author, author_handle: row.author_handle, avatar_url: row.avatar_url, prisme: row.prisme, content: row.content, media_url: row.media_url, likes: row.likes, comments: row.comments, isLiked, created_at: row.created_at };
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

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ error: "Le contenu est vide" });

    const check = await client.execute({ sql: "SELECT author_id FROM angles WHERE id = ?", args: [req.params.id] });
    if (check.rows.length === 0) return res.status(404).json({ error: "Angle introuvable" });
    if (check.rows[0].author_id !== req.user.id) return res.status(403).json({ error: "Non autorise" });

    await client.execute({
      sql: "UPDATE angles SET content = ? WHERE id = ?",
      args: [content, req.params.id]
    });

    res.json({ message: "Angle modifie" });
  } catch (error) {
    console.error("PUT /api/angles Error:", error);
    res.status(500).json({ error: "Erreur lors de la modification" });
  }
});

router.get("/:id/comments", async (req, res) => {
  try {
    await ensureCommentsSchema();
    const result = await client.execute({
      sql: `SELECT c.id, c.content, c.created_at, u.name as author, u.handle as author_handle, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.angle_id = ?
            ORDER BY c.created_at ASC`,
      args: [req.params.id]
    });
    res.json(result.rows);
  } catch (error) {
    console.error("GET /api/angles/:id/comments Error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    await ensureCommentsSchema();
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ error: "Le commentaire est vide" });

    const angle = await client.execute({
      sql: "SELECT id FROM angles WHERE id = ?",
      args: [req.params.id]
    });
    if (angle.rows.length === 0) return res.status(404).json({ error: "Angle introuvable" });

    const created = await client.execute({
      sql: "INSERT INTO comments (angle_id, user_id, content) VALUES (?, ?, ?) RETURNING id, content, created_at",
      args: [req.params.id, req.user.id, content]
    });

    res.status(201).json({
      ...created.rows[0],
      author: req.user.name,
      author_handle: req.user.handle
    });
  } catch (error) {
    console.error("POST /api/angles/:id/comments Error:", error);
    res.status(500).json({ error: "Erreur commentaire" });
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
    await client.execute({ sql: "DELETE FROM comments WHERE angle_id = ?", args: [req.params.id] });
    await client.execute({ sql: "DELETE FROM angles WHERE id = ?", args: [req.params.id] });
    
    res.json({ message: "Angle supprimé" });
  } catch (error) {
    console.error("DELETE /api/angles Error:", error);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
