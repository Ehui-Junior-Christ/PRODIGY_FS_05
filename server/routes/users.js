import express from "express";
import jwt from "jsonwebtoken";
import client from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

const optionalAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch (e) {}
  }
  next();
};

const requireAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.sendStatus(403);
  }
};

// GET /api/users/me — profil de l'utilisateur connecté
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await client.execute({
      sql: `SELECT u.id, u.name, u.handle, u.email, u.bio, u.avatar_url, u.cover_url, u.created_at,
             (SELECT COUNT(*) FROM angles WHERE author_id = u.id) as angles_count,
             (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
             (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
             FROM users u WHERE u.id = ?`,
      args: [req.user.id]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/users/me — modifier le profil de l'utilisateur connecté
router.put("/me", requireAuth, async (req, res) => {
  try {
    const { name, handle, bio, avatar_url, cover_url } = req.body;
    if (!name || !handle) return res.status(400).json({ error: "Nom et handle requis" });

    // Vérifier si le handle est déjà pris par qqn d'autre
    const check = await client.execute({
      sql: "SELECT id FROM users WHERE handle = ? AND id != ?",
      args: [handle, req.user.id]
    });
    if (check.rows.length > 0) return res.status(409).json({ error: "Ce handle est déjà utilisé" });

    await client.execute({
      sql: "UPDATE users SET name = ?, handle = ?, bio = ?, avatar_url = ?, cover_url = ? WHERE id = ?",
      args: [name, handle, bio || '', avatar_url || '', cover_url || '', req.user.id]
    });
    
    const newToken = jwt.sign({ id: req.user.id, handle, name }, JWT_SECRET);
    res.json({ message: "Profil mis à jour", token: newToken, user: { name, handle, bio: bio || '', avatar_url: avatar_url || '', cover_url: cover_url || '' } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/users/:handle — profil public d'un utilisateur
router.get("/:handle", optionalAuth, async (req, res) => {
  try {
    const result = await client.execute({
      sql: `SELECT u.id, u.name, u.handle, u.bio, u.avatar_url, u.cover_url, u.created_at,
             (SELECT COUNT(*) FROM angles WHERE author_id = u.id) as angles_count,
             (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
             (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
             FROM users u WHERE u.handle = ?`,
      args: [req.params.handle]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = result.rows[0];
    let isFollowing = false;
    if (req.user) {
      const check = await client.execute({
        sql: "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
        args: [req.user.id, user.id]
      });
      isFollowing = check.rows.length > 0;
    }
    res.json({ ...user, isFollowing });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/users/:handle/angles — angles d'un utilisateur
router.get("/:handle/angles", async (req, res) => {
  try {
    const userRes = await client.execute({
      sql: "SELECT id FROM users WHERE handle = ?",
      args: [req.params.handle]
    });
    if (userRes.rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    const userId = userRes.rows[0].id;

    const result = await client.execute({
      sql: `SELECT a.id, a.content, a.created_at, u.name as author, u.handle as author_handle,
             p.name as prisme,
             (SELECT COUNT(*) FROM likes WHERE angle_id = a.id) as likes
             FROM angles a
             JOIN users u ON a.author_id = u.id
             LEFT JOIN prismes p ON a.prisme_id = p.id
             WHERE a.author_id = ?
             ORDER BY a.created_at DESC`,
      args: [userId]
    });
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/users/:id/follow — suivre ou ne plus suivre
router.post("/:id/follow", requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) return res.status(400).json({ error: "Vous ne pouvez pas vous suivre vous-même" });

    const check = await client.execute({
      sql: "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
      args: [req.user.id, targetId]
    });

    if (check.rows.length > 0) {
      await client.execute({
        sql: "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
        args: [req.user.id, targetId]
      });
      res.json({ following: false });
    } else {
      await client.execute({
        sql: "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
        args: [req.user.id, targetId]
      });
      res.json({ following: true });
    }
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
