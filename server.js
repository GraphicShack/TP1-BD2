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

async function logJournalAction(connection, tableName, action) {
  const binds = { table_name: tableName, action };

  try {
    await connection.execute(
      `INSERT INTO JOURNAL (TABLE_NAME, ACTION, DATE_ACTION)
       VALUES (:table_name, :action, SYSDATE)`,
      binds
    );
    return;
  } catch (err) {
    // Fallback si DATE_ACTION est géré automatiquement par défaut/trigger
    try {
      await connection.execute(
        `INSERT INTO JOURNAL (TABLE_NAME, ACTION)
         VALUES (:table_name, :action)`,
        binds
      );
      return;
    } catch (fallbackErr) {
      console.warn("Journal non mis à jour:", fallbackErr.message || err.message);
    }
  }
}

function isPastDate(dateStr) {
  const inputDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(inputDate.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

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

app.get("/client.html", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "client.html"));
});

app.get("/produit", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "produit.html"));
});

app.get("/produit.html", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "produit.html"));
});

app.get("/journal", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "journal.html"));
});

app.get("/journal.html", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "journal.html"));
});

app.get("/reservation", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "reservation.html"));
});

app.get("/reservation.html", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "reservation.html"));
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

// Routes pour les RÉSERVATIONS
app.get("/api/reservations/form-data", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const clientsResult = await connection.execute(
      "SELECT ID_CLIENT, NOM FROM CLIENT ORDER BY NOM"
    );
    const produitsResult = await connection.execute(
      "SELECT ID_PRODUIT, NOM, STOCK FROM PRODUIT ORDER BY NOM"
    );

    const clients = clientsResult.rows.map((r) => ({ ID: Number(r[0]), NOM: r[1] }));
    const produits = produitsResult.rows.map((r) => ({
      ID: Number(r[0]),
      NOM: r[1],
      STOCK: Number(r[2]),
    }));

    res.json({ clients, produits });
  } catch (err) {
    console.error("Erreur récupération données réservation:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/api/reservations", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT
         r.ID_RESERVATION,
         r.ID_CLIENT,
         c.NOM,
         r.ID_PRODUIT,
         p.NOM,
         TO_CHAR(r.DATE_RESERVATION, 'YYYY-MM-DD'),
         r.DUREE,
         r.QUANTITE,
         r.STATUT,
         r.NOTES
       FROM RESERVATION r
       JOIN CLIENT c ON c.ID_CLIENT = r.ID_CLIENT
       JOIN PRODUIT p ON p.ID_PRODUIT = r.ID_PRODUIT
       ORDER BY r.DATE_RESERVATION DESC, r.ID_RESERVATION DESC`
    );

    const data = result.rows.map((r) => ({
      ID: Number(r[0]),
      ID_CLIENT: Number(r[1]),
      CLIENT_NOM: r[2],
      ID_PRODUIT: Number(r[3]),
      PRODUIT_NOM: r[4],
      DATE_RESERVATION: r[5],
      DUREE: Number(r[6]),
      QUANTITE: Number(r[7]),
      STATUT: r[8],
      NOTES: r[9],
    }));

    res.json(data);
  } catch (err) {
    console.error("Erreur récupération réservations:", err);
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/api/reservations", async (req, res) => {
  const { id_client, id_produit, date_reservation, duree, quantite, statut, notes } = req.body;

  const clientId = Number(id_client);
  const produitId = Number(id_produit);
  const dureeNum = Number(duree);
  const quantiteNum = Number(quantite);

  if (!clientId || !produitId || !date_reservation || !dureeNum || !quantiteNum) {
    return res.status(400).json({ ok: false, message: "Client, produit, date, durée et quantité sont requis" });
  }

  if (isPastDate(date_reservation)) {
    return res.status(400).json({ ok: false, message: "Impossible de réserver pour une date antérieure" });
  }

  if (dureeNum < 1 || quantiteNum < 1) {
    return res.status(400).json({ ok: false, message: "La durée et la quantité doivent être supérieures à 0" });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const clientResult = await connection.execute(
      "SELECT COUNT(*) FROM CLIENT WHERE ID_CLIENT = :id",
      { id: clientId }
    );
    if (Number(clientResult.rows[0][0]) === 0) {
      return res.status(404).json({ ok: false, message: "Client introuvable" });
    }

    const produitResult = await connection.execute(
      "SELECT STOCK FROM PRODUIT WHERE ID_PRODUIT = :id FOR UPDATE",
      { id: produitId }
    );

    if (produitResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Produit introuvable" });
    }

    const stock = Number(produitResult.rows[0][0]);
    const reservedResult = await connection.execute(
      `SELECT NVL(SUM(QUANTITE), 0)
       FROM RESERVATION
       WHERE ID_PRODUIT = :id
         AND NVL(STATUT, 'En attente') <> 'Annulée'`,
      { id: produitId }
    );
    const dejaReserve = Number(reservedResult.rows[0][0]);

    const disponible = stock - dejaReserve;
    if (quantiteNum > disponible) {
      return res.status(409).json({
        ok: false,
        message: `Stock insuffisant. Disponible: ${disponible}`,
      });
    }

    const insertResult = await connection.execute(
      `INSERT INTO RESERVATION (
         ID_RESERVATION,
         ID_CLIENT,
         ID_PRODUIT,
         DATE_RESERVATION,
         DUREE,
         QUANTITE,
         STATUT,
         NOTES
       )
       VALUES (
         SEQ_RESERVATION.NEXTVAL,
         :id_client,
         :id_produit,
         TO_DATE(:date_reservation, 'YYYY-MM-DD'),
         :duree,
         :quantite,
         :statut,
         :notes
       )
       RETURNING ID_RESERVATION INTO :new_id`,
      {
        id_client: clientId,
        id_produit: produitId,
        date_reservation,
        duree: dureeNum,
        quantite: quantiteNum,
        statut: statut || "En attente",
        notes: notes || "",
        new_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

  await logJournalAction(connection, "RESERVATION", "INSERT");

    await connection.commit();
    const newId = Number(insertResult.outBinds.new_id[0]);
    res.status(201).json({ ok: true, message: "Réservation enregistrée", reservation: { ID: newId } });
  } catch (err) {
    console.error("Erreur création réservation:", err);
    if (connection) await connection.rollback();
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/api/reservations/:id", async (req, res) => {
  const reservationId = Number(req.params.id);
  const { id_client, id_produit, date_reservation, duree, quantite, statut, notes } = req.body;

  const clientId = Number(id_client);
  const produitId = Number(id_produit);
  const dureeNum = Number(duree);
  const quantiteNum = Number(quantite);

  if (!reservationId || !clientId || !produitId || !date_reservation || !dureeNum || !quantiteNum) {
    return res.status(400).json({ ok: false, message: "Client, produit, date, durée et quantité sont requis" });
  }

  if (isPastDate(date_reservation)) {
    return res.status(400).json({ ok: false, message: "Impossible de réserver pour une date antérieure" });
  }

  if (dureeNum < 1 || quantiteNum < 1) {
    return res.status(400).json({ ok: false, message: "La durée et la quantité doivent être supérieures à 0" });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const reservationResult = await connection.execute(
      "SELECT COUNT(*) FROM RESERVATION WHERE ID_RESERVATION = :id",
      { id: reservationId }
    );
    if (Number(reservationResult.rows[0][0]) === 0) {
      return res.status(404).json({ ok: false, message: "Réservation introuvable" });
    }

    const clientResult = await connection.execute(
      "SELECT COUNT(*) FROM CLIENT WHERE ID_CLIENT = :id",
      { id: clientId }
    );
    if (Number(clientResult.rows[0][0]) === 0) {
      return res.status(404).json({ ok: false, message: "Client introuvable" });
    }

    const produitResult = await connection.execute(
      "SELECT STOCK FROM PRODUIT WHERE ID_PRODUIT = :id FOR UPDATE",
      { id: produitId }
    );

    if (produitResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Produit introuvable" });
    }

    const stock = Number(produitResult.rows[0][0]);
    const reservedResult = await connection.execute(
      `SELECT NVL(SUM(QUANTITE), 0)
       FROM RESERVATION
       WHERE ID_PRODUIT = :id
         AND NVL(STATUT, 'En attente') <> 'Annulée'
         AND ID_RESERVATION <> :reservation_id`,
      { id: produitId, reservation_id: reservationId }
    );
    const dejaReserve = Number(reservedResult.rows[0][0]);

    const disponible = stock - dejaReserve;
    if (quantiteNum > disponible) {
      return res.status(409).json({
        ok: false,
        message: `Stock insuffisant. Disponible: ${disponible}`,
      });
    }

    await connection.execute(
      `UPDATE RESERVATION
       SET ID_CLIENT = :id_client,
           ID_PRODUIT = :id_produit,
           DATE_RESERVATION = TO_DATE(:date_reservation, 'YYYY-MM-DD'),
           DUREE = :duree,
           QUANTITE = :quantite,
           STATUT = :statut,
           NOTES = :notes
       WHERE ID_RESERVATION = :reservation_id`,
      {
        id_client: clientId,
        id_produit: produitId,
        date_reservation,
        duree: dureeNum,
        quantite: quantiteNum,
        statut: statut || "En attente",
        notes: notes || "",
        reservation_id: reservationId,
      }
    );

    await logJournalAction(connection, "RESERVATION", "UPDATE");

    await connection.commit();
    res.json({ ok: true, message: "Réservation modifiée", reservation: { ID: reservationId } });
  } catch (err) {
    console.error("Erreur modification réservation:", err);
    if (connection) await connection.rollback();
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete("/api/reservations/:id", async (req, res) => {
  const id = Number(req.params.id);
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `UPDATE RESERVATION
       SET STATUT = 'Annulée'
       WHERE ID_RESERVATION = :id`,
      { id }
    );

    if (!result.rowsAffected) {
      return res.status(404).json({ ok: false, message: "Réservation introuvable" });
    }

    await logJournalAction(connection, "RESERVATION", "CANCEL");

    await connection.commit();
    res.json({ ok: true, message: "Réservation annulée" });
  } catch (err) {
    console.error("Erreur annulation réservation:", err);
    if (connection) await connection.rollback();
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    if (connection) await connection.close();
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
      `SELECT
         p.ID_PRODUIT,
         p.NOM,
         p.PRIX,
         p.STOCK,
         (p.STOCK - NVL(r.QTE_RESERVEE, 0)) AS STOCK_DISPONIBLE
       FROM PRODUIT p
       LEFT JOIN (
         SELECT ID_PRODUIT, NVL(SUM(QUANTITE), 0) AS QTE_RESERVEE
         FROM RESERVATION
         WHERE NVL(STATUT, 'En attente') <> 'Annulée'
         GROUP BY ID_PRODUIT
       ) r ON r.ID_PRODUIT = p.ID_PRODUIT`
    );
    const produits = result.rows.map(r => ({
      ID: r[0],
      NOM: r[1],
      PRIX: r[2],
      STOCK: r[3],
      STOCK_DISPONIBLE: Math.max(0, Number(r[4]))
    }));
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
