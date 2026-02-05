document.addEventListener('DOMContentLoaded', () => {
    generateTables();

    // Resume session if currentTable was set
    const savedTable = localStorage.getItem('waiterCurrentTable');
    if (savedTable) {
        selectTable(parseInt(savedTable));
    }



    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'));
    }
});



let tables = [];
let allOrders = {};

try {
    tables = JSON.parse(localStorage.getItem('waiterTables')) || [];
    allOrders = JSON.parse(localStorage.getItem('waiterData')) || {};
} catch (e) {
    console.error("Error loading data from localStorage", e);
    tables = [];
    allOrders = {};
}

let currentTable = null;

function generateTables() {
    const grid = document.getElementById('tableGrid');
    if (!grid) return;
    grid.innerHTML = "";

    // "Add Table" Card
    const addCard = document.createElement('div');
    addCard.className = 'card add-table-card';
    addCard.innerHTML = `<div style="font-size:4rem; color:var(--accent-green); font-weight:bold;">+</div>`;
    addCard.onclick = addTable;
    grid.appendChild(addCard);

    // Existing Tables
    tables.sort((a, b) => a - b).forEach(num => {
        const hasOrder = (allOrders[num] && allOrders[num].length > 0);
        const card = document.createElement('div');
        card.className = `card table-card ${hasOrder ? 'has-order' : ''}`;

        card.innerHTML = `
            <div class="card-body" style="font-size: 3.5rem; font-weight: bold; color: #444;">
                ${num}
            </div>
        `;
        card.onclick = () => selectTable(num);
        grid.appendChild(card);
    });
}
function removeTable(num) {
    customConfirm("Tisch löschen", `Möchten Sie Tisch ${num} wirklich löschen?`, (confirmed) => {
        if (confirmed) {
            tables = tables.filter(t => t !== num);
            localStorage.setItem('waiterTables', JSON.stringify(tables));
            delete allOrders[num];
            localStorage.setItem('waiterData', JSON.stringify(allOrders));
            generateTables();
            backToTables();
        }
    });
}

function addTable() {
    customPrompt("Neuer Tisch", "Tischnummer eingeben:", (num) => {
        if (!num) return;
        const tableNum = parseInt(num);
        if (isNaN(tableNum)) {
            customAlert("Fehler", "Bitte eine gültige Nummer eingeben.");
            return;
        }
        if (tableNum <= 0) {
            customAlert("Fehler", "Bitte eine Nummer größer als 0 eingeben.");
            return;
        }
        if (tables.includes(tableNum)) {
            customAlert("Fehler", "Tisch existiert bereits.");
            return;
        }
        tables.push(tableNum);
        localStorage.setItem('waiterTables', JSON.stringify(tables));
        generateTables();
    });
}


function selectTable(num) {
    currentTable = num;
    localStorage.setItem('waiterCurrentTable', num);
    document.getElementById('tableGrid').style.display = 'none';
    document.getElementById('orderInterface').style.display = 'block';

    // Safety check for header title element inside new layout
    const titleEl = document.getElementById('headerTitle').querySelector('.header-center');
    if (titleEl) titleEl.innerText = "Tisch " + num;

    renderOrder();
}

function backToTables() {
    currentTable = null;
    localStorage.removeItem('waiterCurrentTable');
    document.getElementById('tableGrid').style.display = 'grid';
    document.getElementById('orderInterface').style.display = 'none';
    document.getElementById('headerTitle').querySelector('.header-center').innerText = "Tische";
    document.getElementById('numSearch').value = "";
    document.getElementById('searchResults').innerHTML = "";
    generateTables();
}


// ... Menu and Order logic remains similar but optimized ...
const menu = [
    { id: 1, name: "Cola" },
    { id: 2, name: "Wasser" },
    { id: 3, name: "Bier" },
    { id: 10, name: "Burger" },
    { id: 11, name: "Pizza" }
];

function searchMenu() {
    const val = document.getElementById('numSearch').value;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "";
    if (!val) return;

    const query = val.toLowerCase();
    const currentItems = allOrders[currentTable] || [];

    const matches = menu.filter(item =>
        item.id.toString().startsWith(query) ||
        item.name.toLowerCase().includes(query)
    );
    matches.forEach(item => {
        const orderItem = currentItems.find(i => i.id === item.id);
        const qtyLabel = orderItem ? `<span style="background:var(--primary); color:white; padding:2px 10px; border-radius:10px; margin-left:10px; font-size:1rem;">${orderItem.quantity}</span>` : "";

        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `<strong>${item.id}</strong>. ${item.name} ${qtyLabel}`;
        div.onclick = () => addToOrder(item);
        resultsDiv.appendChild(div);
    });
}

function addToOrder(item) {
    if (!allOrders[currentTable]) allOrders[currentTable] = [];
    const existingItem = allOrders[currentTable].find(i => i.id === item.id);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        allOrders[currentTable].push({ ...item, quantity: 1 });
    }
    saveAndRender();
    document.getElementById('numSearch').value = "";
    document.getElementById('searchResults').innerHTML = "";
}

function updateQuantity(itemId, delta) {
    const item = allOrders[currentTable].find(i => i.id === itemId);
    if (!item) return;
    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) {
        allOrders[currentTable] = allOrders[currentTable].filter(i => i.id !== itemId);
    }
    saveAndRender();
}

function removeFromOrder(itemId) {
    const item = allOrders[currentTable].find(i => i.id === itemId);
    const itemName = item ? item.name : "Artikel";

    customConfirm("Artikel entfernen", `Möchten Sie ${itemName} wirklich aus der Bestellung entfernen?`, (confirmed) => {
        if (confirmed) {
            allOrders[currentTable] = allOrders[currentTable].filter(i => i.id !== itemId);
            saveAndRender();
        }
    });
}

function saveAndRender() {
    localStorage.setItem('waiterData', JSON.stringify(allOrders));
    renderOrder();
}

function renderOrder() {
    const container = document.getElementById('activeOrder');
    container.innerHTML = "";
    const items = allOrders[currentTable] || [];

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:40px; color:#aaa; text-align:center;">Keine Bestellung</div>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'order-row';
        div.innerHTML = `
            <span class="item-name"><span style="color:#888; font-size:0.9rem; font-weight:normal;">#${item.id}</span> ${item.name}</span>
            <div class="item-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="del-btn" onclick="removeFromOrder(${item.id})">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function clearTable() {
    customConfirm("Tisch leeren", "Möchten Sie alle Bestellungen von diesem Tisch wirklich löschen?", (confirmed) => {
        if (confirmed) {
            delete allOrders[currentTable];
            saveAndRender();
            // Stays inside table menu (no backToTables call)
        }
    });
}

// Custom Modal Implementation
function customAlert(title, message) {
    showModal(title, message, [{ text: "OK", primary: true }]);
}

function customConfirm(title, message, callback) {
    showModal(title, message, [
        { text: "Abbrechen", primary: false, onClick: () => callback(false) },
        { text: "Löschen", primary: true, onClick: () => callback(true) }
    ]);
}

function customPrompt(title, message, callback) {
    const inputId = "modalInput";
    const bodyContent = `
        <p>${message}</p>
        <input type="number" id="${inputId}" class="search-box" style="margin-top:10px; text-align:center;" inputmode="numeric" autofocus>
    `;
    showModal(title, bodyContent, [
        { text: "Abbrechen", primary: false, onClick: () => callback(null) },
        {
            text: "OK", primary: true, onClick: () => {
                const val = document.getElementById(inputId).value;
                callback(val);
            }
        }
    ], true);
}

function showModal(title, content, buttons, isHtml = false) {
    const container = document.getElementById('modalContainer');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    let bodyHtml = isHtml ? content : `<p>${content}</p>`;

    modal.innerHTML = `
        <div class="modal-header">${title}</div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer"></div>
    `;

    const footer = modal.querySelector('.modal-footer');
    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.className = `modal-btn ${btn.primary ? 'primary' : ''}`;
        b.innerText = btn.text;
        b.onclick = () => {
            if (btn.onClick) btn.onClick();
            container.removeChild(overlay);
        };
        footer.appendChild(b);
    });

    overlay.appendChild(modal);
    container.appendChild(overlay);

    // Auto-focus input if present and handle 'Enter' key
    const input = modal.querySelector('input');
    if (input) {
        setTimeout(() => input.focus(), 100);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const primaryBtn = buttons.find(b => b.primary);
                if (primaryBtn && primaryBtn.onClick) {
                    primaryBtn.onClick();
                    container.removeChild(overlay);
                }
            }
        });
    }
}

