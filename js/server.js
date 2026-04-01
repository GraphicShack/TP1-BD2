// Simple Node.js backend to test Oracle DB connectivity

const express = require("express");
const oracledb = require("oracledb");

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your real credentials or environment variables
const dbConfig = {
  user: "SMI1002_012",
  password: "72ccrj64",
  connectString: "gaia.emp.uqtr.ca/coursbd.uqtr.ca",
};

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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
