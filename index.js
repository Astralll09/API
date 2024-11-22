require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Connexion à PostgreSQL
const pool = new Pool({
    
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT
});

// Création de la table articles (à exécuter une seule fois)
pool.query(`
  CREATE TABLE IF NOT EXISTS articles(
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL
  )
`)
  .then(() => console.log("La table articles a été créée ou existe déjà."))
  .catch(err => console.error(`Erreur lors de la création de la table articles : ${err}`));

// Middleware pour parser le JSON
app.use(express.json());

// Routes

// 1. Récupérer tous les articles
app.get("/articles", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM articles ORDER BY id ASC");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ message: `Erreur lors de la récupération des articles : ${err}` });
  }
});

// 2. Créer un nouvel article
app.post("/articles", async (req, res) => {
  try {
    const { title, content, author } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ message: "Tous les champs (title, content, author) sont requis." });
    }

    const result = await pool.query(
      "INSERT INTO articles (title, content, author) VALUES ($1, $2, $3) RETURNING *",
      [title, content, author]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: `Erreur lors de la création de l'article : ${err}` });
  }
});

// 3. Modifier un article
app.patch("/articles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, author } = req.body;

    const updates = [];
    const values = [];
    let index = 1;

    if (title) {
      updates.push(`title=$${index++}`);
      values.push(title);
    }
    if (content) {
      updates.push(`content=$${index++}`);
      values.push(content);
    }
    if (author) {
      updates.push(`author=$${index++}`);
      values.push(author);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "Aucune donnée à mettre à jour." });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE articles SET ${updates.join(", ")} WHERE id=$${index} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Article non trouvé." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: `Erreur lors de la mise à jour de l'article : ${err}` });
  }
});

// 4. Supprimer un article
app.delete("/articles/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM articles WHERE id=$1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Article non trouvé." });
    }

    res.status(200).json({ message: "Article supprimé avec succès.", deletedArticle: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: `Erreur lors de la suppression de l'article : ${err}` });
  }
});

// Route par défaut
app.get("/", (req, res) => {
  res.send("Bienvenue sur l'API de gestion des articles !");
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`Le serveur écoute sur le port ${port}.`);
});
