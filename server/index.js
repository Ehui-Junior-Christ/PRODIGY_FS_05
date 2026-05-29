import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import client, { initDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_prisme_key";

// Initialize DB
initDb().catch(console.error);

// Middleware for auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, handle, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.execute({
      sql: "INSERT INTO users (name, handle, email, password_hash) VALUES (?, ?, ?, ?)",
      args: [name, handle, email, hashedPassword],
    });
    res.status(201).json({ message: "User created successfully", id: result.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to register. Handle or email might already exist." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    
    if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });
    
    const token = jwt.sign({ id: user.id, handle: user.handle, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, handle: user.handle } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

// --- ANGLES (POSTS) ROUTES ---
app.get("/api/angles", async (req, res) => {
  try {
    // Check auth to see if user liked
    const authHeader = req.headers["authorization"];
    let userId = null;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    const result = await client.execute(`
      SELECT a.id, a.content, a.created_at, u.name as author, p.name as prisme,
             (SELECT COUNT(*) FROM likes WHERE angle_id = a.id) as likes,
             0 as comments
      FROM angles a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN prismes p ON a.prisme_id = p.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    // Fetch tags and check if liked
    const posts = await Promise.all(result.rows.map(async (row) => {
      let isLiked = false;
      if (userId) {
        const likeCheck = await client.execute({
          sql: "SELECT 1 FROM likes WHERE user_id = ? AND angle_id = ?",
          args: [userId, row.id]
        });
        isLiked = likeCheck.rows.length > 0;
      }

      const tagsResult = await client.execute({
        sql: "SELECT t.name FROM tags t JOIN angle_tags at ON t.id = at.tag_id WHERE at.angle_id = ?",
        args: [row.id]
      });

      return {
        id: row.id,
        author: row.author,
        prisme: row.prisme || "Général",
        content: row.content,
        likes: row.likes,
        comments: row.comments,
        isLiked,
        tags: tagsResult.rows.map(t => t.name)
      };
    }));

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch angles" });
  }
});

app.post("/api/angles", authenticateToken, async (req, res) => {
  try {
    const { content, prisme, tags } = req.body;
    const authorId = req.user.id;

    // Ensure Prisme exists
    let prismeId = null;
    if (prisme) {
      const pRes = await client.execute({ sql: "SELECT id FROM prismes WHERE name = ?", args: [prisme] });
      if (pRes.rows.length > 0) {
        prismeId = pRes.rows[0].id;
      } else {
        const insertP = await client.execute({ sql: "INSERT INTO prismes (name) VALUES (?)", args: [prisme] });
        prismeId = insertP.lastInsertRowid;
      }
    }

    // Insert Angle
    const aRes = await client.execute({
      sql: "INSERT INTO angles (prisme_id, author_id, content) VALUES (?, ?, ?)",
      args: [prismeId, authorId, content]
    });
    const angleId = aRes.lastInsertRowid;

    // Handle tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        let tagId;
        const tRes = await client.execute({ sql: "SELECT id FROM tags WHERE name = ?", args: [tag] });
        if (tRes.rows.length > 0) {
          tagId = tRes.rows[0].id;
        } else {
          const insertT = await client.execute({ sql: "INSERT INTO tags (name) VALUES (?)", args: [tag] });
          tagId = insertT.lastInsertRowid;
        }
        await client.execute({
          sql: "INSERT INTO angle_tags (angle_id, tag_id) VALUES (?, ?)",
          args: [angleId, tagId]
        });
      }
    }

    res.status(201).json({ message: "Angle created", id: angleId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create angle" });
  }
});

app.post("/api/angles/:id/like", authenticateToken, async (req, res) => {
  try {
    const angleId = req.params.id;
    const userId = req.user.id;

    const check = await client.execute({
      sql: "SELECT 1 FROM likes WHERE user_id = ? AND angle_id = ?",
      args: [userId, angleId]
    });

    if (check.rows.length > 0) {
      // Unlike
      await client.execute({
        sql: "DELETE FROM likes WHERE user_id = ? AND angle_id = ?",
        args: [userId, angleId]
      });
      res.json({ liked: false });
    } else {
      // Like
      await client.execute({
        sql: "INSERT INTO likes (user_id, angle_id) VALUES (?, ?)",
        args: [userId, angleId]
      });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// --- SIDEBAR DATA ---
app.get("/api/trending", async (req, res) => {
  // Mocked for now, in a real app this would aggregate tags
  res.json([
    { topic: '#DesignEngineering', count: '1.2k Angles' },
    { topic: '#Web3', count: '854 Angles' },
    { topic: '#Minimalisme', count: '432 Angles' }
  ]);
});

app.get("/api/suggestions", async (req, res) => {
  try {
    const result = await client.execute("SELECT id, name, handle FROM users ORDER BY RANDOM() LIMIT 5");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

app.listen(PORT, () => {
  console.log(`Prisme Backend running on http://localhost:${PORT}`);
});
