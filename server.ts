import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DB_PATH = path.join(process.cwd(), "db.json");

  app.use(cors());
  app.use(express.json());

  // Helper to read DB
  const readDB = async () => {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  };

  // Helper to write DB
  const writeDB = async (data: any) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  };

  // API Routes
  app.get("/api/movies", async (req, res) => {
    try {
      const db = await readDB();
      res.json(db.movies);
    } catch (error) {
      res.status(500).json({ error: "Failed to read movies" });
    }
  });

  app.post("/api/ratings", async (req, res) => {
    try {
      const { movieId, userId, rating } = req.body;
      const db = await readDB();
      db.ratings.push({ movieId, userId, rating, timestamp: new Date().toISOString() });
      await writeDB(db);
      res.status(201).json({ message: "Rating saved" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save rating" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const { movieId, userId, userName, comment } = req.body;
      const db = await readDB();
      db.reviews.push({ 
        id: Math.random().toString(36).substr(2, 9),
        movieId, 
        userId, 
        userName, 
        comment, 
        timestamp: new Date().toISOString() 
      });
      await writeDB(db);
      res.status(201).json({ message: "Review saved" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save review" });
    }
  });

  app.get("/api/reviews/:movieId", async (req, res) => {
    try {
      const db = await readDB();
      const reviews = db.reviews.filter((r: any) => r.movieId === req.params.movieId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
