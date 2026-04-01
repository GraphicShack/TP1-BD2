function appendLog(message) {
	const textbox = document.getElementById("log-textbox");
	if (!textbox) return;
	const timestamp = new Date().toLocaleTimeString();
	textbox.value += `[${timestamp}] ${message}\n`;
	textbox.scrollTop = textbox.scrollHeight;
}

async function testConnection() {
	appendLog("Tentative de connexion à la base de données...");

	try {
		const response = await fetch("/api/test-connection");
		const data = await response.json();

		if (data.ok) {
			appendLog((data.message || "Connexion réussie"));
		} else {
			appendLog("Erreur : " + (data.message || "Erreur inconnue"));
		}
	} catch (err) {
		appendLog("Erreur réseau : " + (err.message || err));
	}
}

document.addEventListener("DOMContentLoaded", () => {
	testConnection();
});

