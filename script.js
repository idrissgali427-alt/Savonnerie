// script Savonerie.js

// Initialisation des données
let rawMaterials = JSON.parse(localStorage.getItem('rawMaterials')) || [];
let productions = JSON.parse(localStorage.getItem('productions')) || [];
let salesExpenses = JSON.parse(localStorage.getItem('salesExpenses')) || [];
let managerName = localStorage.getItem('managerName') || '';

// Définition des éléments du DOM
const mainNavLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const managerNameInput = document.getElementById('managerNameInput');
const currentDateTimeElement = document.getElementById('currentDateTime');

const rawMaterialForm = document.getElementById('rawMaterialForm');
const productionForm = document.getElementById('productionForm');
const salesExpensesForm = document.getElementById('salesExpensesForm');

const rawMaterialTableBody = document.querySelector('#rawMaterialTable tbody');
const productionTableBody = document.querySelector('#productionTable tbody');
const salesExpensesTableBody = document.querySelector('#salesExpensesTable tbody');
const transactionHistoryTableBody = document.querySelector('#transactionHistoryTable tbody');

const dashboardDailyProd = document.querySelector('#dashboard .dashboard-card #tableBilanProduction');
const dashboardDailySale = document.querySelector('#dashboard .dashboard-card #tableBilanVente');
const dashboardMonthlyProd = document.querySelector('#dashboard .dashboard-card #tableBilanProductionMensuel');
const dashboardDailyExpenses = document.querySelector('#dashboard .dashboard-card #tableBilanDepenses');

const searchReceiptNumberInput = document.getElementById('searchReceiptNumber');
const filterMonthInput = document.getElementById('filterMonth');
const filterPointOfSaleInput = document.getElementById('filterPointOfSale');
const filterProductTypeInput = document.getElementById('filterProductType');
const searchButton = document.getElementById('searchButton');
const clearSearchButton = document.getElementById('clearSearchButton');
const filterButton = document.getElementById('filterButton');
const clearFilterButton = document.getElementById('clearFilterButton');

const bilanGlobalTableBody = document.querySelector('#bilanGlobalTable tbody');
const printBilanButton = document.getElementById('printBilanButton');
const printReceiptButton = document.getElementById('printReceiptButton');

const diagramMonthInput = document.getElementById('diagramMonth');
const diagramYearInput = document.getElementById('diagramYear');
const generateDiagramButton = document.getElementById('generateDiagramButton');

let productionSalesChartInstance;
let expensesChartInstance;

// --- Fonctions utilitaires ---

/**
 * Met à jour et affiche la date et l'heure actuelles.
 */
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    currentDateTimeElement.textContent = now.toLocaleDateString('fr-FR', options);
}

/**
 * Génère un numéro de reçu unique.
 * @param {string} type - 'MP' (Matière Première), 'PROD' (Production), 'VE' (Vente).
 * @returns {string} Le numéro de reçu généré.
 */
function generateReceiptNumber(type) {
    const now = new Date();
    const datePart = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const uniquePart = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${type}-${datePart}-${uniquePart}`;
}

/**
 * Sauvegarde les données dans le stockage local.
 */
function saveData() {
    localStorage.setItem('rawMaterials', JSON.stringify(rawMaterials));
    localStorage.setItem('productions', JSON.stringify(productions));
    localStorage.setItem('salesExpenses', JSON.stringify(salesExpenses));
    localStorage.setItem('managerName', managerName);
}

/**
 * Formate un nombre en devise FCFA.
 * @param {number} amount - Le montant à formater.
 * @returns {string} Le montant formaté.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(amount);
}

// --- Fonctions de mise à jour de l'interface utilisateur ---

/**
 * Met à jour les valeurs du tableau de bord.
 */
function updateDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    const dailyProductionValue = productions
        .filter(p => p.date.startsWith(today))
        .reduce((sum, p) => sum + p.quantityProduced * p.unitCost, 0);

    const dailySaleValue = salesExpenses
        .filter(s => s.date.startsWith(today))
        .reduce((sum, s) => sum + (s.productQuantity * s.unitPrice), 0);
    
    const monthlyProductionValue = productions
        .filter(p => p.date.startsWith(thisMonth))
        .reduce((sum, p) => sum + p.quantityProduced * p.unitCost, 0);

    const dailyExpensesValue = salesExpenses
        .filter(s => s.date.startsWith(today))
        .reduce((sum, s) => sum + s.expenses, 0);

    dashboardDailyProd.textContent = formatCurrency(dailyProductionValue);
    dashboardDailySale.textContent = formatCurrency(dailySaleValue);
    dashboardMonthlyProd.textContent = formatCurrency(monthlyProductionValue);
    dashboardDailyExpenses.textContent = formatCurrency(dailyExpensesValue);
}

/**
 * Remplit une table HTML avec les données fournies.
 * @param {HTMLTableSectionElement} tableBody - L'élément <tbody> de la table.
 * @param {Array} data - Le tableau de données à afficher.
 * @param {string} dataType - Le type de données ('rawMaterial', 'production', 'salesExpenses').
 */
function populateTable(tableBody, data, dataType) {
    tableBody.innerHTML = '';
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        let htmlContent = '';
        if (dataType === 'rawMaterial') {
            htmlContent = `
                <td>${item.receiptNumberRaw}</td>
                <td>${item.rawMaterial}</td>
                <td>${item.quantityReceived} kg/L</td>
                <td>${item.quantityUsed} kg/L</td>
                <td>${item.date}</td>
                <td><button class="btn btn-danger btn-delete" data-type="rawMaterial" data-index="${index}">Supprimer</button></td>
            `;
        } else if (dataType === 'production') {
            htmlContent = `
                <td>${item.receiptNumberProd}</td>
                <td>${item.productName}</td>
                <td>${item.quantityProduced} kg/L</td>
                <td>${formatCurrency(item.unitCost)}</td>
                <td>${item.productionManager}</td>
                <td>${item.date}</td>
                <td><button class="btn btn-danger btn-delete" data-type="production" data-index="${index}">Supprimer</button></td>
            `;
        } else if (dataType === 'salesExpenses') {
            const expenseProofLink = item.expenseProof ? `<a href="${item.expenseProof}" target="_blank">Voir</a>` : 'N/A';
            htmlContent = `
                <td>${item.receiptNumberSales}</td>
                <td>${item.pointOfSale}</td>
                <td>${item.productSold}</td>
                <td>${item.productQuantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${formatCurrency(item.expenses)}</td>
                <td>${expenseProofLink}</td>
                <td>${item.date}</td>
                <td><button class="btn btn-danger btn-delete" data-type="salesExpenses" data-index="${index}">Supprimer</button></td>
            `;
        } else if (dataType === 'history') {
            htmlContent = `
                <td>${item.receiptNumber || 'N/A'}</td>
                <td>${item.type}</td>
                <td>${item.details}</td>
                <td>${item.quantityOrAmount}</td>
                <td>${item.pointOfSale || 'N/A'}</td>
                <td>${item.proofLink || 'N/A'}</td>
                <td>${item.date}</td>
                <td><button class="btn btn-danger btn-delete" data-type="${item.source}" data-index="${item.originalIndex}">Supprimer</button></td>
            `;
        }
        row.innerHTML = htmlContent;
        tableBody.appendChild(row);
    });
}

/**
 * Affiche l'historique des transactions.
 * @param {Array} filteredData - Les données filtrées à afficher.
 */
function displayTransactionHistory(filteredData = null) {
    const allTransactions = [
        ...rawMaterials.map((item, index) => ({
            receiptNumber: item.receiptNumberRaw,
            type: 'Matière Première',
            details: item.rawMaterial,
            quantityOrAmount: `${item.quantityReceived} kg reçus, ${item.quantityUsed} kg utilisés`,
            pointOfSale: 'N/A',
            proofLink: 'N/A',
            date: item.date,
            source: 'rawMaterials',
            originalIndex: index
        })),
        ...productions.map((item, index) => ({
            receiptNumber: item.receiptNumberProd,
            type: 'Production',
            details: item.productName,
            quantityOrAmount: `${item.quantityProduced} kg`,
            pointOfSale: 'N/A',
            proofLink: 'N/A',
            date: item.date,
            source: 'productions',
            originalIndex: index
        })),
        ...salesExpenses.map((item, index) => ({
            receiptNumber: item.receiptNumberSales,
            type: 'Vente/Dépense',
            details: `${item.productSold} (Vente), Dépenses (${formatCurrency(item.expenses)})`,
            quantityOrAmount: `${item.productQuantity} unités`,
            pointOfSale: item.pointOfSale,
            proofLink: item.expenseProof ? `<a href="${item.expenseProof}" target="_blank">Voir</a>` : 'N/A',
            date: item.date,
            source: 'salesExpenses',
            originalIndex: index
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const dataToDisplay = filteredData || allTransactions;
    populateTable(transactionHistoryTableBody, dataToDisplay, 'history');
}

/**
 * Met à jour le bilan global.
 */
function updateBilanGlobal() {
    const productionToday = productions.filter(p => p.date.startsWith(new Date().toISOString().slice(0, 10)));
    const salesToday = salesExpenses.filter(s => s.date.startsWith(new Date().toISOString().slice(0, 10)));

    const dailyProductionCost = productionToday.reduce((sum, p) => sum + p.quantityProduced * p.unitCost, 0);
    const dailySalesRevenue = salesToday.reduce((sum, s) => sum + s.productQuantity * s.unitPrice, 0);
    const dailyExpensesCost = salesToday.reduce((sum, s) => sum + s.expenses, 0);
    
    bilanGlobalTableBody.innerHTML = `
        <tr class="bilan-entry production-daily-color">
            <td>Production Journalière</td>
            <td id="tableBilanProduction" class="bilan-value">${formatCurrency(dailyProductionCost)}</td>
            <td id="lastUpdateProduction">${new Date().toLocaleDateString('fr-FR')}</td>
        </tr>
        <tr class="bilan-entry sales-daily-color">
            <td>Vente Journalière</td>
            <td id="tableBilanVente" class="bilan-value">${formatCurrency(dailySalesRevenue)}</td>
            <td id="lastUpdateVente">${new Date().toLocaleDateString('fr-FR')}</td>
        </tr>
        <tr class="bilan-entry production-monthly-color">
            <td>Production Mensuelle</td>
            <td id="tableBilanProductionMensuel" class="bilan-value">${formatCurrency(
                productions.reduce((sum, p) => sum + p.quantityProduced * p.unitCost, 0)
            )}</td>
            <td id="lastUpdateProductionMensuel">${new Date().toLocaleDateString('fr-FR')}</td>
        </tr>
        <tr class="bilan-entry expenses-daily-color">
            <td>Dépenses Journalières</td>
            <td id="tableBilanDepenses" class="bilan-value">${formatCurrency(dailyExpensesCost)}</td>
            <td id="lastUpdateDepenses">${new Date().toLocaleDateString('fr-FR')}</td>
        </tr>
    `;
}

// --- Fonctions de gestion des événements ---

/**
 * Gère le changement de section via la barre de navigation.
 */
function handleNavClick(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href').substring(1);

    // Supprimer la classe 'active' de tous les liens et sections
    mainNavLinks.forEach(link => link.classList.remove('active'));
    contentSections.forEach(section => section.classList.remove('active'));

    // Ajouter la classe 'active' au lien et à la section ciblés
    event.target.classList.add('active');
    document.getElementById(targetId).classList.add('active');

    // Mettre à jour les graphiques si la section est "Diagrammes"
    if (targetId === 'diagramsSection') {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        diagramYearInput.value = year;
        diagramMonthInput.value = `${year}-${month}`;
        updateCharts();
    }
}

/**
 * Gère la soumission du formulaire de matières premières.
 */
function handleRawMaterialSubmit(event) {
    event.preventDefault();
    const formData = new FormData(rawMaterialForm);
    const newEntry = {
        receiptNumberRaw: document.getElementById('receiptNumberRaw').value,
        rawMaterial: formData.get('matiere_premiere'),
        quantityReceived: parseFloat(formData.get('quantite_recue')),
        quantityUsed: parseFloat(formData.get('quantite_utilisee')),
        date: new Date().toISOString()
    };
    rawMaterials.push(newEntry);
    saveData();
    populateTable(rawMaterialTableBody, rawMaterials, 'rawMaterial');
    updateDashboard();
    updateBilanGlobal();
    rawMaterialForm.reset();
    document.getElementById('receiptNumberRaw').value = generateReceiptNumber('MP');
    displayTransactionHistory();
}

/**
 * Gère la soumission du formulaire de production.
 */
function handleProductionSubmit(event) {
    event.preventDefault();
    const formData = new FormData(productionForm);
    const newEntry = {
        receiptNumberProd: document.getElementById('receiptNumberProd').value,
        productName: formData.get('nom_produit'),
        quantityProduced: parseFloat(formData.get('quantite_produite')),
        unitCost: parseFloat(formData.get('cout_unitaire')),
        productionManager: formData.get('nom_responsable_production'),
        date: new Date().toISOString()
    };
    productions.push(newEntry);
    saveData();
    populateTable(productionTableBody, productions, 'production');
    updateDashboard();
    updateBilanGlobal();
    productionForm.reset();
    document.getElementById('receiptNumberProd').value = generateReceiptNumber('PROD');
    displayTransactionHistory();
}

/**
 * Gère la soumission du formulaire de ventes et dépenses.
 */
function handleSalesExpensesSubmit(event) {
    event.preventDefault();
    const formData = new FormData(salesExpensesForm);
    const expenseProofFile = document.getElementById('expenseProof').files[0];
    let expenseProofUrl = '';
    if (expenseProofFile) {
        // Enregistrer l'URL de l'objet pour un aperçu temporaire.
        // Pour un stockage permanent, il faudrait utiliser un backend ou une base de données.
        expenseProofUrl = URL.createObjectURL(expenseProofFile);
    }
    const newEntry = {
        receiptNumberSales: document.getElementById('receiptNumberSales').value,
        pointOfSale: formData.get('point_de_vente'),
        productSold: formData.get('produit_vendu'),
        productQuantity: parseFloat(formData.get('quantite_produit')),
        unitPrice: parseFloat(formData.get('prix_unitaire')),
        expenses: parseFloat(formData.get('depenses')),
        expenseProof: expenseProofUrl,
        date: new Date().toISOString()
    };
    salesExpenses.push(newEntry);
    saveData();
    populateTable(salesExpensesTableBody, salesExpenses, 'salesExpenses');
    updateDashboard();
    updateBilanGlobal();
    salesExpensesForm.reset();
    document.getElementById('receiptNumberSales').value = generateReceiptNumber('VE');
    displayTransactionHistory();
}

/**
 * Gère la suppression d'une ligne de tableau.
 */
function handleDelete(event) {
    if (event.target.classList.contains('btn-delete')) {
        const button = event.target;
        const dataType = button.dataset.type;
        const index = parseInt(button.dataset.index);

        if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
            if (dataType === 'rawMaterials') {
                rawMaterials.splice(index, 1);
            } else if (dataType === 'productions') {
                productions.splice(index, 1);
            } else if (dataType === 'salesExpenses') {
                salesExpenses.splice(index, 1);
            }
            saveData();
            // Recharger toutes les tables pour garantir la cohérence des indices et des données
            loadDataAndPopulateTables();
            updateDashboard();
            updateBilanGlobal();
            displayTransactionHistory();
        }
    }
}

/**
 * Gère l'impression d'un reçu de vente.
 */
function handlePrintReceipt(event) {
    event.preventDefault();
    const lastSale = salesExpenses[salesExpenses.length - 1];
    if (!lastSale) {
        alert('Aucune vente récente à imprimer.');
        return;
    }
    const receiptContent = `
        <h1>Reçu de Vente</h1>
        <p><strong>Numéro de Reçu:</strong> ${lastSale.receiptNumberSales}</p>
        <p><strong>Date:</strong> ${new Date(lastSale.date).toLocaleString('fr-FR')}</p>
        <p><strong>Point de Vente:</strong> ${lastSale.pointOfSale}</p>
        ---
        <p><strong>Produit:</strong> ${lastSale.productSold}</p>
        <p><strong>Quantité:</strong> ${lastSale.productQuantity}</p>
        <p><strong>Prix Unitaire:</strong> ${formatCurrency(lastSale.unitPrice)}</p>
        ---
        <p><strong>Total de la Vente:</strong> ${formatCurrency(lastSale.productQuantity * lastSale.unitPrice)}</p>
    `;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Reçu</title>');
    printWindow.document.write('<style>body { font-family: Arial, sans-serif; padding: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(receiptContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

/**
 * Gère l'impression du bilan global.
 */
function handlePrintBilan() {
    const bilanContent = document.getElementById('bilanGlobalSection').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Bilan Global</title>');
    printWindow.document.write('<style>body { font-family: Arial, sans-serif; padding: 20px; } .bilan-entry td { padding: 8px; border: 1px solid #ccc; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Bilan Global</h1>');
    printWindow.document.write(bilanContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

/**
 * Filtre l'historique des transactions.
 */
function filterHistory() {
    const searchText = searchReceiptNumberInput.value.toLowerCase().trim();
    const filterMonth = filterMonthInput.value;
    const filterPointOfSale = filterPointOfSaleInput.value.toLowerCase().trim();
    const filterProductType = filterProductTypeInput.value;

    const allTransactions = [
        ...rawMaterials.map((item, index) => ({ ...item, type: 'Matière Première', source: 'rawMaterials', originalIndex: index })),
        ...productions.map((item, index) => ({ ...item, type: 'Production', source: 'productions', originalIndex: index })),
        ...salesExpenses.map((item, index) => ({ ...item, type: 'Vente/Dépense', source: 'salesExpenses', originalIndex: index }))
    ];

    const filteredTransactions = allTransactions.filter(item => {
        const matchesSearch = searchText ? (item.receiptNumberRaw || item.receiptNumberProd || item.receiptNumberSales).toLowerCase().includes(searchText) : true;
        const matchesMonth = filterMonth ? item.date.startsWith(filterMonth) : true;
        const matchesPointOfSale = filterPointOfSale ? (item.pointOfSale || '').toLowerCase().includes(filterPointOfSale) : true;
        const matchesProductType = filterProductType ? (item.productName === filterProductType || item.productSold === filterProductType) : true;

        return matchesSearch && matchesMonth && matchesPointOfSale && matchesProductType;
    });

    displayTransactionHistory(filteredTransactions);
}

/**
 * Gère la génération des graphiques.
 */
function updateCharts() {
    const selectedMonth = diagramMonthInput.value;
    const selectedYear = diagramYearInput.value;

    if (!selectedMonth || !selectedYear) {
        alert('Veuillez sélectionner un mois et une année.');
        return;
    }

    // Données pour le graphique Production vs Ventes
    const filteredProductions = productions.filter(p => p.date.startsWith(selectedMonth));
    const filteredSales = salesExpenses.filter(s => s.date.startsWith(selectedMonth));
    
    const productionData = filteredProductions.reduce((sum, p) => sum + (p.quantityProduced * p.unitCost), 0);
    const salesData = filteredSales.reduce((sum, s) => sum + (s.productQuantity * s.unitPrice), 0);

    const productionSalesData = {
        labels: ['Production', 'Ventes'],
        datasets: [{
            label: 'Comparaison mensuelle',
            data: [productionData, salesData],
            backgroundColor: ['#28a745', '#17a2b8'],
            borderColor: ['#28a745', '#17a2b8'],
            borderWidth: 1
        }]
    };

    // Données pour le graphique de répartition des dépenses
    const rawMaterialCost = filteredProductions.reduce((sum, p) => sum + (p.quantityProduced * p.unitCost), 0);
    const otherExpenses = filteredSales.reduce((sum, s) => sum + s.expenses, 0);

    const expensesData = {
        labels: ['Coût des matières premières', 'Autres dépenses'],
        datasets: [{
            label: 'Répartition des dépenses',
            data: [rawMaterialCost, otherExpenses],
            backgroundColor: ['#dc3545', '#ffc107'],
            hoverOffset: 4
        }]
    };

    // Création ou mise à jour des graphiques
    const productionSalesCtx = document.getElementById('productionSalesChart').getContext('2d');
    if (productionSalesChartInstance) {
        productionSalesChartInstance.destroy();
    }
    productionSalesChartInstance = new Chart(productionSalesCtx, {
        type: 'bar',
        data: productionSalesData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const expensesCtx = document.getElementById('expensesChart').getContext('2d');
    if (expensesChartInstance) {
        expensesChartInstance.destroy();
    }
    expensesChartInstance = new Chart(expensesCtx, {
        type: 'pie',
        data: expensesData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Répartition des Dépenses'
                }
            }
        }
    });
}

/**
 * Charge les données et remplit les tables au démarrage.
 */
function loadDataAndPopulateTables() {
    populateTable(rawMaterialTableBody, rawMaterials, 'rawMaterial');
    populateTable(productionTableBody, productions, 'production');
    populateTable(salesExpensesTableBody, salesExpenses, 'salesExpenses');
    displayTransactionHistory();
}

// --- Initialisation et Écouteurs d'événements ---

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser l'heure et la date
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Initialiser les numéros de reçu
    document.getElementById('receiptNumberRaw').value = generateReceiptNumber('MP');
    document.getElementById('receiptNumberProd').value = generateReceiptNumber('PROD');
    document.getElementById('receiptNumberSales').value = generateReceiptNumber('VE');

    // Charger le nom du responsable
    if (managerName) {
        managerNameInput.value = managerName;
    }
    managerNameInput.addEventListener('change', (e) => {
        managerName = e.target.value;
        saveData();
    });

    // Charger les données et mettre à jour l'interface
    loadDataAndPopulateTables();
    updateDashboard();
    updateBilanGlobal();

    // Gestion de la navigation
    mainNavLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });

    // Gestion des soumissions de formulaires
    rawMaterialForm.addEventListener('submit', handleRawMaterialSubmit);
    productionForm.addEventListener('submit', handleProductionSubmit);
    salesExpensesForm.addEventListener('submit', handleSalesExpensesSubmit);

    // Gestion des suppressions (délégation d'événements)
    document.querySelector('#rawMaterialTable').addEventListener('click', handleDelete);
    document.querySelector('#productionTable').addEventListener('click', handleDelete);
    document.querySelector('#salesExpensesTable').addEventListener('click', handleDelete);
    document.querySelector('#transactionHistoryTable').addEventListener('click', handleDelete);

    // Gestion des impressions
    printBilanButton.addEventListener('click', handlePrintBilan);
    printReceiptButton.addEventListener('click', handlePrintReceipt);
    
    // Gestion de la recherche et du filtrage
    searchButton.addEventListener('click', filterHistory);
    clearSearchButton.addEventListener('click', () => {
        searchReceiptNumberInput.value = '';
        filterHistory(); // Appeler le filtre pour effacer les résultats
    });
    filterButton.addEventListener('click', filterHistory);
    clearFilterButton.addEventListener('click', () => {
        filterMonthInput.value = '';
        filterPointOfSaleInput.value = '';
        filterProductTypeInput.value = '';
        displayTransactionHistory();
    });

    // Gestion des diagrammes
    generateDiagramButton.addEventListener('click', updateCharts);
});




//CODE DE PROTECTION



// Définis le mot de passe requis
const motDePasseRequis = '00C1';

// Demande à l'utilisateur d'entrer le mot de passe
let motDePasseSaisi = prompt('Veuillez entrer le mot de passe pour accéder à l\'application.');

// Vérifie si le mot de passe saisi est correct
if (motDePasseSaisi === motDePasseRequis) {
  // Le mot de passe est correct, tu peux continuer
  alert('Accès accordé !');
  // Ici, tu peux mettre tout le code de ton application
  // Par exemple, afficher le contenu de la page
} else {
  // Le mot de passe est incorrect
  alert('Mot de passe incorrect. Accès refusé !');
  // Tu peux rediriger l'utilisateur ou cacher le contenu
  window.location.href = ''; // Exemple de redirection
}
