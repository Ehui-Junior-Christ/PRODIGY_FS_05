import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import client from "../db.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../emailService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";
const pendingVerifications = new Map();

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function makeSession(user) {
  const token = jwt.sign({ id: user.id, handle: user.handle, name: user.name }, JWT_SECRET);
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar_url: user.avatar_url,
      cover_url: user.cover_url,
      bio: user.bio
    }
  };
}

function normalizeHandle(value, fallback = "user") {
  return String(value || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || fallback;
}

async function uniqueHandle(baseHandle) {
  const base = normalizeHandle(baseHandle);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await client.execute({
      sql: "SELECT id FROM users WHERE handle = ?",
      args: [candidate]
    });
    if (existing.rows.length === 0) return candidate;
    candidate = `${base}_${suffix++}`.slice(0, 30);
  }
}

router.post("/register", async (req, res) => {
  try {
    const { name, handle, email, password, termsAccepted } = req.body;
    if (!name || !handle || !email || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }
    if (!termsAccepted) return res.status(400).json({ error: "Vous devez accepter les conditions." });

    const cleanHandle = normalizeHandle(handle);
    const existing = await client.execute({
      sql: "SELECT id FROM users WHERE email = ? OR handle = ?",
      args: [email, cleanHandle]
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Cet email ou ce pseudo est deja utilise." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.execute({
      sql: "INSERT INTO users (name, handle, email, password_hash) VALUES (?, ?, ?, ?)",
      args: [name, cleanHandle, email, hashedPassword],
    });

    const verificationToken = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    pendingVerifications.set(verificationToken, { email, expiresAt });

    const verificationLink = `${process.env.APP_URL || "http://localhost:5501"}/verify.html?token=${verificationToken}`;
    let verificationSent = true;
    try {
      await sendVerificationEmail(email, name, verificationLink);
    } catch (emailError) {
      verificationSent = false;
      console.warn("Verification email not sent:", emailError.message);
    }

    res.status(201).json({
      message: verificationSent
        ? "Compte cree ! Verifiez votre e-mail."
        : "Compte cree. L'e-mail de verification n'a pas pu etre envoye en local.",
      id: result.lastInsertRowid.toString(),
      verificationSent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

router.get("/verify", async (req, res) => {
  const { token } = req.query;
  const data = pendingVerifications.get(token);

  if (!data || Date.now() > data.expiresAt) {
    return res.status(400).json({ error: "Lien de verification invalide ou expire." });
  }

  try {
    await client.execute({
      sql: "UPDATE users SET email_verified = 1 WHERE email = ?",
      args: [data.email]
    });
    pendingVerifications.delete(token);

    const userRes = await client.execute({
      sql: "SELECT name FROM users WHERE email = ?",
      args: [data.email]
    });
    if (userRes.rows.length > 0) {
      await sendWelcomeEmail(data.email, userRes.rows[0].name).catch(() => {});
    }

    res.json({ message: "Email verifie avec succes !" });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de la verification." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await client.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });

    if (result.rows.length === 0) return res.status(400).json({ error: "Utilisateur introuvable" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Mot de passe incorrect" });

    res.json(makeSession(user));
  } catch (error) {
    res.status(500).json({ error: "Erreur de connexion" });
  }
});

router.post("/social", async (req, res) => {
  try {
    const { provider, uid, name, email, phoneNumber, avatar_url } = req.body;
    if (!provider) return res.status(400).json({ error: "Compte social invalide." });

    const accountEmail = email || (provider === "phone" && uid ? `phone_${uid}@auth.prisme.local` : null);
    if (!accountEmail) return res.status(400).json({ error: "Compte social invalide." });

    const existing = await client.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [accountEmail]
    });

    if (existing.rows.length > 0) {
      return res.json(makeSession(existing.rows[0]));
    }

    const phoneTail = phoneNumber ? phoneNumber.replace(/\D/g, "").slice(-6) : "";
    const displayName = name || phoneNumber || accountEmail.split("@")[0];
    const handleBase = provider === "phone" ? `phone_${phoneTail || uid?.slice(0, 6)}` : `${provider}_${accountEmail.split("@")[0]}`;
    const handle = await uniqueHandle(handleBase);
    const hashedPassword = await bcrypt.hash(`${provider}_${accountEmail}_${uid || Date.now()}`, 10);

    const created = await client.execute({
      sql: "INSERT INTO users (name, handle, email, password_hash, email_verified, avatar_url) VALUES (?, ?, ?, ?, 1, ?)",
      args: [displayName, handle, accountEmail, hashedPassword, avatar_url || null]
    });

    const userRes = await client.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [created.lastInsertRowid]
    });

    res.status(201).json(makeSession(userRes.rows[0]));
  } catch (error) {
    console.error("POST /api/auth/social Error:", error);
    res.status(500).json({ error: "Erreur de connexion sociale" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await client.execute({ sql: "SELECT name FROM users WHERE email = ?", args: [email] });
    if (result.rows.length === 0) {
      return res.json({ message: "Si cet email existe, un lien a ete envoye." });
    }

    const resetToken = generateToken();
    const expiresAt = Date.now() + 60 * 60 * 1000;
    pendingVerifications.set("reset_" + resetToken, { email, expiresAt });

    const resetLink = `${process.env.APP_URL || "http://localhost:5501"}/reset-password.html?token=${resetToken}`;
    await sendPasswordResetEmail(email, result.rows[0].name, resetLink);

    res.json({ message: "Si cet email existe, un lien a ete envoye." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  const data = pendingVerifications.get("reset_" + token);

  if (!data || Date.now() > data.expiresAt) {
    return res.status(400).json({ error: "Lien expire ou invalide." });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await client.execute({
      sql: "UPDATE users SET password_hash = ? WHERE email = ?",
      args: [hashed, data.email]
    });
    pendingVerifications.delete("reset_" + token);
    res.json({ message: "Mot de passe reinitialise avec succes." });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
