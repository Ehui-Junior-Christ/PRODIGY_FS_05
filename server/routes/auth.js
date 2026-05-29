import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import client from "../db.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../emailService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

// Table de tokens de vérification en mémoire (simple, sans Redis)
const pendingVerifications = new Map();

// Générer un token unique
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, handle, email, password, termsAccepted } = req.body;
    if (!termsAccepted) return res.status(400).json({ error: "Vous devez accepter les conditions." });

    // Vérifier si email ou handle déjà utilisés
    const existing = await client.execute({
      sql: "SELECT id FROM users WHERE email = ? OR handle = ?",
      args: [email, handle]
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Cet email ou ce pseudo est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.execute({
      sql: "INSERT INTO users (name, handle, email, password_hash) VALUES (?, ?, ?, ?)",
      args: [name, handle, email, hashedPassword],
    });

    // Générer un token de vérification
    const verificationToken = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h
    pendingVerifications.set(verificationToken, { email, expiresAt });

    // Envoyer l'email de vérification
    const verificationLink = `${process.env.APP_URL || 'http://localhost:5501'}/verify.html?token=${verificationToken}`;
    await sendVerificationEmail(email, name, verificationLink);

    res.status(201).json({ message: "Compte créé ! Vérifiez votre e-mail.", id: result.lastInsertRowid.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

// GET /api/auth/verify?token=xxx
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  const data = pendingVerifications.get(token);

  if (!data || Date.now() > data.expiresAt) {
    return res.status(400).json({ error: "Lien de vérification invalide ou expiré." });
  }

  try {
    // Marquer l'email comme vérifié
    await client.execute({
      sql: "UPDATE users SET email_verified = 1 WHERE email = ?",
      args: [data.email]
    });
    pendingVerifications.delete(token);

    // Récupérer le nom pour l'email de bienvenue
    const userRes = await client.execute({
      sql: "SELECT name FROM users WHERE email = ?",
      args: [data.email]
    });
    if (userRes.rows.length > 0) {
      await sendWelcomeEmail(data.email, userRes.rows[0].name).catch(() => {});
    }

    res.json({ message: "Email vérifié avec succès !" });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de la vérification." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await client.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });

    if (result.rows.length === 0) return res.status(400).json({ error: "Utilisateur introuvable" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({ id: user.id, handle: user.handle, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, handle: user.handle, avatar_url: user.avatar_url, cover_url: user.cover_url } });
  } catch (error) {
    res.status(500).json({ error: "Erreur de connexion" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await client.execute({ sql: "SELECT name FROM users WHERE email = ?", args: [email] });
    if (result.rows.length === 0) {
      // Sécurité : ne pas révéler si l'email existe
      return res.json({ message: "Si cet email existe, un lien a été envoyé." });
    }

    const resetToken = generateToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1h
    pendingVerifications.set('reset_' + resetToken, { email, expiresAt });

    const resetLink = `${process.env.APP_URL || 'http://localhost:5501'}/reset-password.html?token=${resetToken}`;
    await sendPasswordResetEmail(email, result.rows[0].name, resetLink);

    res.json({ message: "Si cet email existe, un lien a été envoyé." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  const data = pendingVerifications.get('reset_' + token);

  if (!data || Date.now() > data.expiresAt) {
    return res.status(400).json({ error: "Lien expiré ou invalide." });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await client.execute({
      sql: "UPDATE users SET password_hash = ? WHERE email = ?",
      args: [hashed, data.email]
    });
    pendingVerifications.delete('reset_' + token);
    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
