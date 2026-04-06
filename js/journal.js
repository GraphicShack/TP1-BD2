const journalTable = document.getElementById("journalTable");

// Fonction pour charger le journal
async function loadJournal() {
  try {
    const res = await fetch("/api/journal");
    const journalEntries = await res.json();

    if (!Array.isArray(journalEntries)) {
      console.error("Journal reçu non valide:", journalEntries);
      journalTable.innerHTML = "<tr><td colspan='4'>Aucune entrée disponible</td></tr>";
      return;
    }

    journalTable.innerHTML = "";
    if (journalEntries.length === 0) {
      journalTable.innerHTML = "<tr><td colspan='4'>Aucune entrée disponible</td></tr>";
      return;
    }

    journalEntries.forEach(entry => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${entry.ID}</td>
        <td>${entry.TABLE_NAME}</td>
        <td>${entry.ACTION}</td>
        <td>${new Date(entry.DATE_ACTION).toLocaleString('fr-CA')}</td>
      `;
      journalTable.appendChild(tr);
    });
  } catch (err) {
    console.error("Erreur chargement journal:", err);
    journalTable.innerHTML = "<tr><td colspan='4'>Erreur lors du chargement</td></tr>";
  }
}

// Charger le journal au chargement de la page
loadJournal();
