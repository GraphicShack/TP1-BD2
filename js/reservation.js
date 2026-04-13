const reservationForm = document.getElementById("reservationForm");
const reservationFormTitle = document.getElementById("reservationFormTitle");
const reservationSubmitButton = document.getElementById("reservationSubmitButton");
const reservationIdInput = document.getElementById("reservationId");
const cancelReservationEditButton = document.getElementById("cancelReservationEdit");
const reservationDateInput = document.getElementById("reservationDate");
const clientSelect = document.getElementById("reservationClient");
const produitSelect = document.getElementById("reservationProduit");
const quantiteInput = document.getElementById("reservationQuantite");
const stockInfo = document.getElementById("stockInfo");
const reservationTable = document.getElementById("reservationTable");
const filterButtons = document.querySelectorAll(".filter-btn");
const reservationSort = document.getElementById("reservationSort");

let clients = [];
let produits = [];
let reservations = [];
let currentStatusFilter = "TOUS";
let currentSort = "date-desc";
let editingReservationId = null;

function getTodayISODate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

reservationDateInput.min = getTodayISODate();

function getReservedQuantityForProduct(produitId, excludedReservationId = null) {
  return reservations
    .filter((r) => {
      const sameProduct = Number(r.ID_PRODUIT) === Number(produitId);
      const isExcluded =
        excludedReservationId !== null && Number(r.ID) === Number(excludedReservationId);
      const isCancelled = (r.STATUT || "En attente") === "Annulée";
      return sameProduct && !isExcluded && !isCancelled;
    })
    .reduce((sum, r) => sum + Number(r.QUANTITE || 0), 0);
}

function getAvailableQuantityForProduct(produitId, excludedReservationId = null) {
  const produit = produits.find((p) => Number(p.ID) === Number(produitId));
  if (!produit) return 0;

  const reserved = getReservedQuantityForProduct(produitId, excludedReservationId);
  return Math.max(0, Number(produit.STOCK) - reserved);
}

function updateStockInfo() {
  const produitId = Number(produitSelect.value);
  if (!produitId) {
    stockInfo.textContent = "Choisis un article pour voir la quantité disponible.";
    quantiteInput.max = "";
    return;
  }

  const available = getAvailableQuantityForProduct(produitId, editingReservationId);
  quantiteInput.max = String(available);

  if (available <= 0) {
    stockInfo.textContent = "Aucune quantité disponible pour cet article.";
  } else {
    stockInfo.textContent = `Quantité disponible: ${available}`;
  }
}

function renderClientOptions() {
  clientSelect.innerHTML = '<option value="">Sélectionner un client</option>';
  clients.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.ID;
    option.textContent = `${c.NOM} (#${c.ID})`;
    clientSelect.appendChild(option);
  });
}

function renderProduitOptions() {
  const selected = produitSelect.value;
  produitSelect.innerHTML = '<option value="">Sélectionner un article</option>';

  produits.forEach((p) => {
    const available = getAvailableQuantityForProduct(p.ID);
    const option = document.createElement("option");
    option.value = p.ID;
    option.textContent = `${p.NOM} (disponible: ${available}/${p.STOCK})`;
    produitSelect.appendChild(option);
  });

  if (selected) {
    produitSelect.value = selected;
  }
}

function renderReservations() {
  const filteredReservations = Array.isArray(reservations)
    ? reservations.filter((r) =>
        currentStatusFilter === "TOUS" ? true : (r.STATUT || "En attente") === currentStatusFilter
      )
    : [];

  const sortedReservations = [...filteredReservations].sort((a, b) => {
    switch (currentSort) {
      case "date-asc":
        return new Date(a.DATE_RESERVATION) - new Date(b.DATE_RESERVATION);
      case "date-desc":
        return new Date(b.DATE_RESERVATION) - new Date(a.DATE_RESERVATION);
      case "client-asc":
        return (a.CLIENT_NOM || "").localeCompare(b.CLIENT_NOM || "", "fr");
      case "client-desc":
        return (b.CLIENT_NOM || "").localeCompare(a.CLIENT_NOM || "", "fr");
      case "article-asc":
        return (a.PRODUIT_NOM || "").localeCompare(b.PRODUIT_NOM || "", "fr");
      case "article-desc":
        return (b.PRODUIT_NOM || "").localeCompare(a.PRODUIT_NOM || "", "fr");
      default:
        return 0;
    }
  });

  if (sortedReservations.length === 0) {
    const emptyMessage = currentStatusFilter === "TOUS"
      ? "Aucune réservation"
      : `Aucune réservation avec le statut « ${currentStatusFilter} »`;
    reservationTable.innerHTML = `<tr><td colspan='8'>${emptyMessage}</td></tr>`;
    return;
  }

  reservationTable.innerHTML = "";

  sortedReservations.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.ID}</td>
      <td>${r.CLIENT_NOM}</td>
      <td>${r.PRODUIT_NOM}</td>
      <td>${new Date(r.DATE_RESERVATION).toLocaleDateString("fr-CA")}</td>
      <td>${r.DUREE} jour(s)</td>
      <td>${r.QUANTITE}</td>
      <td>${r.STATUT || "En attente"}</td>
      <td>
        <div class="action-buttons">
          <button type="button" onclick="viewReservationNote(${r.ID})">Voir note</button>
          <button type="button" onclick="editReservation(${r.ID})">Modifier</button>
          <button type="button" onclick="cancelReservation(${r.ID})">Annuler</button>
        </div>
      </td>
    `;
    reservationTable.appendChild(tr);
  });
}

function setActiveFilterButton() {
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.status === currentStatusFilter;
    btn.classList.toggle("active", isActive);
  });
}

function resetEditMode() {
  editingReservationId = null;
  reservationIdInput.value = "";
  reservationFormTitle.textContent = "Nouvelle réservation";
  reservationSubmitButton.textContent = "Enregistrer";
  cancelReservationEditButton.style.display = "none";
}

window.editReservation = function editReservation(id) {
  const reservation = reservations.find((r) => Number(r.ID) === Number(id));
  if (!reservation) return;

  editingReservationId = Number(reservation.ID);
  reservationIdInput.value = String(reservation.ID);
  clientSelect.value = String(reservation.ID_CLIENT);
  produitSelect.value = String(reservation.ID_PRODUIT);
  reservationForm.elements.date.value = String(reservation.DATE_RESERVATION).slice(0, 10);
  reservationForm.elements.duree.value = String(reservation.DUREE);
  reservationForm.elements.quantite.value = String(reservation.QUANTITE);
  reservationForm.elements.statut.value = reservation.STATUT || "En attente";
  reservationForm.elements.notes.value = reservation.NOTES || "";

  reservationFormTitle.textContent = "Modifier la réservation";
  reservationSubmitButton.textContent = "Mettre à jour";
  cancelReservationEditButton.style.display = "inline-block";
  updateStockInfo();
  reservationForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.viewReservationNote = function viewReservationNote(id) {
  const reservation = reservations.find((r) => Number(r.ID) === Number(id));
  if (!reservation) {
    alert("Réservation introuvable");
    return;
  }

  const note = (reservation.NOTES || "").trim();
  if (!note) {
    alert("Aucune note pour cette réservation.");
    return;
  }

  alert(`Note de la réservation #${reservation.ID}\n\n${note}`);
};

async function loadData() {
  try {
    const [formDataRes, reservationsRes] = await Promise.all([
      fetch("/api/reservations/form-data"),
      fetch("/api/reservations"),
    ]);

    if (!formDataRes.ok) {
      const errData = await formDataRes.json().catch(() => ({}));
      throw new Error(errData.message || "Impossible de charger clients/produits depuis la BD");
    }

    if (!reservationsRes.ok) {
      const errData = await reservationsRes.json().catch(() => ({}));
      throw new Error(errData.message || "Impossible de charger les réservations");
    }

    const formData = await formDataRes.json();
    clients = formData.clients;
    produits = formData.produits;
    reservations = await reservationsRes.json();

    if (!Array.isArray(clients)) clients = [];
    if (!Array.isArray(produits)) produits = [];
    if (!Array.isArray(reservations)) reservations = [];

    renderClientOptions();
    renderProduitOptions();
    renderReservations();
    updateStockInfo();
  } catch (err) {
    console.error("Erreur chargement réservation:", err);
    stockInfo.textContent = `Erreur: ${err.message}`;
    reservationTable.innerHTML = "<tr><td colspan='8'>Erreur lors du chargement</td></tr>";
  }
}

reservationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(reservationForm);
  const data = {
    id_client: Number(formData.get("clientId")),
    id_produit: Number(formData.get("produitId")),
    date_reservation: formData.get("date"),
    duree: Number(formData.get("duree")),
    quantite: Number(formData.get("quantite")),
    statut: formData.get("statut") || "En attente",
    notes: formData.get("notes") || "",
  };

  const reservationId = Number(formData.get("reservationId")) || editingReservationId;

  const available = getAvailableQuantityForProduct(data.id_produit, reservationId || null);
  if (data.date_reservation < getTodayISODate()) {
    alert("Impossible de réserver pour une date antérieure.");
    return;
  }

  if (data.quantite > available) {
    alert(`Quantité insuffisante. Disponible: ${available}`);
    return;
  }

  try {
    const isEdit = Boolean(reservationId);
    const url = isEdit ? `/api/reservations/${reservationId}` : "/api/reservations";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      alert(result.message || "Erreur lors de la réservation");
      return;
    }

    alert(result.message || (isEdit ? "Réservation modifiée" : "Réservation enregistrée"));
    reservationForm.reset();
    resetEditMode();
    await loadData();
  } catch (err) {
    console.error("Erreur création réservation:", err);
    alert("Erreur lors de la réservation");
  }
});

reservationForm.addEventListener("reset", () => {
  setTimeout(() => {
    resetEditMode();
    updateStockInfo();
  }, 0);
});

cancelReservationEditButton.addEventListener("click", () => {
  reservationForm.reset();
  resetEditMode();
  updateStockInfo();
});

produitSelect.addEventListener("change", updateStockInfo);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentStatusFilter = btn.dataset.status || "TOUS";
    setActiveFilterButton();
    renderReservations();
  });
});

reservationSort.addEventListener("change", () => {
  currentSort = reservationSort.value || "date-desc";
  renderReservations();
});

window.cancelReservation = async function cancelReservation(id) {
  if (!confirm("Annuler cette réservation ?")) return;

  try {
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    const result = await res.json();

    alert(result.message || "Réservation annulée");
    await loadData();
  } catch (err) {
    console.error("Erreur annulation réservation:", err);
    alert("Erreur lors de l'annulation");
  }
};

loadData();
