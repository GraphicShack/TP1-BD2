const formProduit = document.getElementById("addProduitForm");
const produitTable = document.getElementById("produitTable");
const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const cancelEdit = document.getElementById("cancelEdit");

let editingProduitId = null;

// Fonction pour charger la liste des produits
async function loadProduits() {
  try {
    const res = await fetch("/api/produits");
    const produits = await res.json();

    if (!Array.isArray(produits)) {
      console.error("Produits reçus non valides:", produits);
      produitTable.innerHTML = "<tr><td colspan='5'>Aucun produit disponible</td></tr>";
      return;
    }

    produitTable.innerHTML = "";
    if (produits.length === 0) {
      produitTable.innerHTML = "<tr><td colspan='5'>Aucun produit disponible</td></tr>";
      return;
    }

    produits.forEach(p => {
      const stockDisponible = Number.isFinite(Number(p.STOCK_DISPONIBLE))
        ? Number(p.STOCK_DISPONIBLE)
        : Number(p.STOCK);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.ID}</td>
        <td>${p.NOM}</td>
        <td>${p.PRIX.toFixed(2)} $</td>
        <td>${stockDisponible} <small style="color:#6b7280;">(total: ${p.STOCK})</small></td>
        <td>
          <div class="action-buttons">
            <button type="button" onclick="editProduit({ID: ${p.ID}, NOM: '${p.NOM}', PRIX: ${p.PRIX}, STOCK: ${p.STOCK}})">Modifier</button>
            <button type="button" onclick="deleteProduit(${p.ID})">Supprimer</button>
          </div>
        </td>
      `;
      produitTable.appendChild(tr);
    });
  } catch (err) {
    console.error("Erreur chargement produits:", err);
    produitTable.innerHTML = "<tr><td colspan='5'>Erreur lors du chargement</td></tr>";
  }
}

// Pré-remplir le formulaire pour modification
function editProduit(produit) {
  editingProduitId = produit.ID;
  document.getElementById("produitNom").value = produit.NOM;
  document.getElementById("produitPrix").value = produit.PRIX;
  document.getElementById("produitStock").value = produit.STOCK;
  formTitle.textContent = "Modifier le produit";
  submitButton.textContent = "Enregistrer";
  cancelEdit.style.display = "inline-block";
}

// Annuler la modification
cancelEdit.addEventListener("click", () => {
  editingProduitId = null;
  formTitle.textContent = "Ajouter un produit";
  submitButton.textContent = "Ajouter";
  formProduit.reset();
  cancelEdit.style.display = "none";
});

// Ajouter ou modifier un produit
formProduit.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formProduit);
  const data = {
    nom: formData.get("nom"),
    prix: parseFloat(formData.get("prix")),
    stock: parseInt(formData.get("stock"))
  };

  try {
    let url = "/api/produits";
    let method = "POST";

    if (editingProduitId) {
      url = `/api/produits/${editingProduitId}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message);

    formProduit.reset();
    editingProduitId = null;
    formTitle.textContent = "Ajouter un produit";
    submitButton.textContent = "Ajouter";
    cancelEdit.style.display = "none";
    loadProduits();
  } catch (err) {
    console.error("Erreur ajout/modif produit:", err);
    alert("Erreur lors de l'opération");
  }
});

// Supprimer un produit
async function deleteProduit(id) {
  if (!confirm("Supprimer ce produit ?")) return;

  try {
    const res = await fetch(`/api/produits/${id}`, { method: "DELETE" });
    const result = await res.json();
    alert(result.message);
    loadProduits();
  } catch (err) {
    console.error("Erreur suppression produit:", err);
    alert("Erreur lors de la suppression");
  }
}

// Charger les produits au démarrage
loadProduits();