// Simple Node.js backend to test Oracle DB connectivity

const express = require("express");
const oracledb = require("oracledb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Replace with your real credentials or environment variables
const dbConfig = {
  user: "SMI1002_012",
  password: "72ccrj64",
  connectString: "gaia.emp.uqtr.ca/coursbd.uqtr.ca",
};

// Servir CSS et JS
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));

// Route pour la page HTML
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "pages", "index.html");
  console.log("Envoi de:", filePath); // Vérifie que le chemin est correct
  res.sendFile(filePath);
});

app.get("/client", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "client.html"), (err) => {
    if (err) {
      console.error("Erreur en envoyant client.html:", err);
      res.status(500).send("Erreur serveur");
    }
  });
});

app.get("/produit", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "produit.html"));
});

app.get("/journal", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "journal.html"));
});

app.get("/api/test-connection", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.close();
    res.json({ ok: true, message: "Connexion réussie" });
  } catch (err) {
    console.error("Erreur de connexion:", err.message);
    res.status(500).json({ ok: false, message: err.message });
  }
});


app.post("/api/clients", async (req, res) => {
  const { nom, email } = req.body;
  if (!nom || !email) return res.status(400).json({ ok: false, message: "Nom et email requis" });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN AJOUTER_CLIENT(:nom, :email); END;`,
      { nom, email }
    );
    await connection.commit();
    res.json({ ok: true, message: "Client ajouté !" });
  } catch (err) {
    console.error("Erreur ajout client:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/api/clients", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      "SELECT ID_CLIENT, NOM, EMAIL FROM CLIENT"
    );
    const clients = result.rows.map(r => ({ ID: r[0], NOM: r[1], EMAIL: r[2] }));
    res.json(clients);
  } catch (err) {
    console.error("Erreur récupération clients:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/api/clients/:id", async (req, res) => {
  const { id } = req.params;
  const { nom, email } = req.body;
  if (!nom || !email) return res.status(400).json({ ok: false, message: "Nom et email requis" });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN MODIFIER_CLIENT(:id, :nom, :email); END;`,
      { id: Number(id), nom, email }
    );
    await connection.commit();
    res.json({ ok: true, message: "Client modifié !" });
  } catch (err) {
    console.error("Erreur modification client:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete("/api/clients/:id", async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN SUPPRIMER_CLIENT(:id); END;`,
      { id: Number(id) }
    );
    await connection.commit();
    res.json({ ok: true, message: "Client supprimé !" });
  } catch (err) {
    console.error("Erreur suppression client:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Routes pour les PRODUITS
app.get("/api/produits", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      "SELECT ID_PRODUIT, NOM, PRIX, STOCK FROM PRODUIT"
    );
    const produits = result.rows.map(r => ({ ID: r[0], NOM: r[1], PRIX: r[2], STOCK: r[3] }));
    res.json(produits);
  } catch (err) {
    console.error("Erreur récupération produits:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/api/produits", async (req, res) => {
  const { nom, prix, stock } = req.body;
  if (!nom || prix === undefined || stock === undefined) return res.status(400).json({ ok: false, message: "Nom, prix et stock requis" });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN AJOUTER_PRODUIT(:nom, :prix, :stock); END;`,
      { nom, prix: Number(prix), stock: Number(stock) }
    );
    await connection.commit();
    res.json({ ok: true, message: "Produit ajouté !" });
  } catch (err) {
    console.error("Erreur ajout produit:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/api/produits/:id", async (req, res) => {
  const { id } = req.params;
  const { nom, prix, stock } = req.body;
  if (!nom || prix === undefined || stock === undefined) return res.status(400).json({ ok: false, message: "Nom, prix et stock requis" });

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN MODIFIER_PRODUIT(:id, :nom, :prix, :stock); END;`,
      { id: Number(id), nom, prix: Number(prix), stock: Number(stock) }
    );
    await connection.commit();
    res.json({ ok: true, message: "Produit modifié !" });
  } catch (err) {
    console.error("Erreur modification produit:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete("/api/produits/:id", async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN SUPPRIMER_PRODUIT(:id); END;`,
      { id: Number(id) }
    );
    await connection.commit();
    res.json({ ok: true, message: "Produit supprimé !" });
  } catch (err) {
    console.error("Erreur suppression produit:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Routes pour le JOURNAL
app.get("/api/journal", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      "SELECT ID, TABLE_NAME, ACTION, DATE_ACTION FROM JOURNAL ORDER BY DATE_ACTION DESC"
    );
    const journal = result.rows.map(r => ({ ID: r[0], TABLE_NAME: r[1], ACTION: r[2], DATE_ACTION: r[3] }));
    res.json(journal);
  } catch (err) {
    console.error("Erreur récupération journal:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
