const formClient = document.getElementById("addClientForm");
const clientTable = document.getElementById("clientTable");
const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const cancelEdit = document.getElementById("cancelEdit");

let editingClientId = null;

// Fonction pour charger la liste des clients
async function loadClients() {
  try {
    const res = await fetch("/api/clients");
    const clients = await res.json();

    if (!Array.isArray(clients)) {
      console.error("Clients reçus non valides:", clients);
      clientTable.innerHTML = "<tr><td colspan='4'>Aucun client disponible</td></tr>";
      return;
    }

    clientTable.innerHTML = "";
    if (clients.length === 0) {
      clientTable.innerHTML = "<tr><td colspan='4'>Aucun client disponible</td></tr>";
      return;
    }

    clients.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.ID}</td>
        <td>${c.NOM}</td>
        <td>${c.EMAIL}</td>
        <td>
          <div class="action-buttons">
            <button type="button" onclick="editClient({ID: ${c.ID}, NOM: '${c.NOM}', EMAIL: '${c.EMAIL}'})">Modifier</button>
            <button type="button" onclick="deleteClient(${c.ID})">Supprimer</button>
          </div>
        </td>
      `;
      clientTable.appendChild(tr);
    });
  } catch (err) {
    console.error("Erreur chargement clients:", err);
    clientTable.innerHTML = "<tr><td colspan='4'>Erreur lors du chargement</td></tr>";
  }
}

// Pré-remplir le formulaire pour modification
function editClient(client) {
  editingClientId = client.ID;
  document.getElementById("clientNom").value = client.NOM;
  document.getElementById("clientEmail").value = client.EMAIL;
  formTitle.textContent = "Modifier le client";
  submitButton.textContent = "Enregistrer";
  cancelEdit.style.display = "inline-block";
}

// Annuler la modification
cancelEdit.addEventListener("click", () => {
  editingClientId = null;
  formTitle.textContent = "Ajouter un client";
  submitButton.textContent = "Ajouter";
  formClient.reset();
  cancelEdit.style.display = "none";
});

// Ajouter ou modifier un client
formClient.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formClient);
  const data = {
    nom: formData.get("nom"),
    email: formData.get("email")
  };

  try {
    let url = "/api/clients";
    let method = "POST";

    if (editingClientId) {
      url = `/api/clients/${editingClientId}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message);

    formClient.reset();
    editingClientId = null;
    formTitle.textContent = "Ajouter un client";
    submitButton.textContent = "Ajouter";
    cancelEdit.style.display = "none";
    loadClients();
  } catch (err) {
    console.error("Erreur ajout/modif client:", err);
    alert("Erreur lors de l'opération");
  }
});

// Supprimer un client
async function deleteClient(id) {
  if (!confirm("Supprimer ce client ?")) return;

  try {
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    const result = await res.json();
    alert(result.message);
    loadClients();
  } catch (err) {
    console.error("Erreur suppression client:", err);
    alert("Erreur lors de la suppression");
  }
}

// Charger les clients au démarrage
loadClients();