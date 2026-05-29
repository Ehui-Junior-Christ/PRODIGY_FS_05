import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import client from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

router.post("/register", async (req, res) => {
  try {
    const { name, handle, email, password, termsAccepted } = req.body;
    if (!termsAccepted) return res.status(400).json({ error: "Vous devez accepter les conditions." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.execute({
      sql: "INSERT INTO users (name, handle, email, password_hash) VALUES (?, ?, ?, ?)",
      args: [name, handle, email, hashedPassword],
    });
    res.status(201).json({ message: "Utilisateur créé", id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'inscription." });
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
    
    const token = jwt.sign({ id: user.id, handle: user.handle, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, handle: user.handle } });
  } catch (error) {
    res.status(500).json({ error: "Erreur de connexion" });
  }
});

router.post("/forgot-password", async (req, res) => {
  // Logique d'envoi d'email à implémenter
  res.json({ message: "Si cet email existe, un lien a été envoyé." });
});

export default router;
