import express from "express";
import jwt from "jsonwebtoken";
import client from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

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

// GET /api/notifications — notifications de l'utilisateur connecté
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Likes reçus sur les angles de l'utilisateur
    const likesRes = await client.execute({
      sql: `SELECT 'like' as type, u.name as actor_name, u.handle as actor_handle,
             a.content as angle_content, a.id as angle_id, l.created_at
             FROM likes l
             JOIN users u ON l.user_id = u.id
             JOIN angles a ON l.angle_id = a.id
             WHERE a.author_id = ? AND l.user_id != ?
             ORDER BY l.created_at DESC LIMIT 20`,
      args: [userId, userId]
    });

    // Nouveaux abonnés
    const followsRes = await client.execute({
      sql: `SELECT 'follow' as type, u.name as actor_name, u.handle as actor_handle,
             NULL as angle_content, NULL as angle_id, f.created_at
             FROM follows f
             JOIN users u ON f.follower_id = u.id
             WHERE f.following_id = ?
             ORDER BY f.created_at DESC LIMIT 20`,
      args: [userId]
    });

    // Fusionner et trier par date
    const all = [...likesRes.rows, ...followsRes.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30);

    res.json(all);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
