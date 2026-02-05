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
    addCard.innerHTML = `<div style="font-size:7rem; color:var(--accent-green); font-weight:bold;">+</div>`;
    addCard.onclick = addTable;
    grid.appendChild(addCard);

    // Existing Tables
    tables.sort((a, b) => a - b).forEach(num => {
        const hasOrder = (allOrders[num] && allOrders[num].length > 0);
        const card = document.createElement('div');
        card.className = `card table-card ${hasOrder ? 'has-order' : ''}`;

        card.innerHTML = `
            <div class="card-body" style="font-size: 6rem; font-weight: bold; color: #444;">
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
    const input = document.getElementById('numSearch');
    input.value = "";
    input.inputMode = 'decimal';
    const btn = document.getElementById('kbToggle');
    if (btn) {
        btn.classList.remove('active');
        btn.innerText = '123';
    }
    document.getElementById('searchResults').innerHTML = "";
    generateTables();
}


// ... Menu and Order logic remains similar but optimized ...
const menu = [
    // Food Items
    { id: 100, name: "CARPACCIO DIE MANZO" },
    { id: 101, name: "VITELLO TONNATO" },
    { id: 102, name: "FORMAGGIO DI CAPRA" },
    { id: 103, name: "ANTIPASTO DELLA CASA" },
    { id: 104, name: "CAPRESE DIE BUFALA" },
    { id: 105, name: "BRUSCHETTA CLASSICA" },
    { id: 106, name: "BRUSCHETTA CAPRESE" },
    { id: 111, name: "INSALATA TONNO" },
    { id: 112, name: "INSALATA CAPRICCIOSA" },
    { id: 115, name: "INSALATA DI POLLO" },
    { id: 116, name: "INSALATA MISTA" },
    { id: 117, name: "TARTARE DI MANZO" },
    { id: 118, name: "TARTARE DI SALMONE" },
    { id: 120, name: "ZUPPA DI POMODORO" },
    { id: 121, name: "MINESTRONE" },
    { id: 200, name: "SPAGHETTI AGLIO OLIO E PERONCINO" },
    { id: 201, name: "PENNE ARRABIATA" },
    { id: 202, name: "TAGLIATELLE AL RAGÙ" },
    { id: 203, name: "SPAGHETTI ALLA CARBONARA" },
    { id: 204, name: "SPAGHETTI DEL PESCATORE" },
    { id: 205, name: "RISOTTO STRACCIATA DI BUFALA E PORCINI" },
    { id: 206, name: "GNOCCHI ALLA SORRENTINA" },
    { id: 207, name: "FILEJA ALLA MONZESE" },
    { id: 208, name: "RAVIOLI BURRATA" },
    { id: 209, name: "RAVIOLI PERE E GORGONZOLA" },
    { id: 210, name: "FILEJA MANZO E RUCOLA" },
    { id: 211, name: "LASAGNE" },
    { id: 212, name: "SPAGHETTI AI GAMBERI" },
    { id: 213, name: "TAGLIATELLE SALMONE" },
    { id: 214, name: "PENNE ALLA CACCIATORA" },
    { id: 215, name: "SPAGHETTI PUTTANESCA CON ΤΟΝΝΟ" },
    { id: 300, name: "MARGHERITA" },
    { id: 301, name: "SALAME" },
    { id: 302, name: "PROSCIUTTO E FUNGHI" },
    { id: 304, name: "PARMIGIANA" },
    { id: 305, name: "SALSICCIA" },
    { id: 306, name: "VEGETARIANA" },
    { id: 307, name: "DIAVOLA" },
    { id: 308, name: "SFIZIOSA" },
    { id: 309, name: "BUFALINA" },
    { id: 310, name: "RUSTICA" },
    { id: 312, name: "LE QUATTRO STAGIONI" },
    { id: 313, name: "QUATTRO FORMAGGI" },
    { id: 314, name: "SALMONE (PIZZA)" },
    { id: 315, name: "D'ITALY (PIZZA)" },
    { id: 316, name: "ZOLA E PARMA" },
    { id: 317, name: "ΤΟΝΝO E CIPOLLA" },
    { id: 400, name: "SALTIMBOCCA ALLA ROMANA" },
    { id: 401, name: "FILETTO ALLA GRIGLIA" },
    { id: 402, name: "FILETTO AL PEPE VERDE" },
    { id: 403, name: "POLLO ALLA GRIGLIA" },
    { id: 404, name: "CARRÉ DI AGNELLO" },
    { id: 405, name: "ENTRECÔTE DI MANZO" },
    { id: 406, name: "SALMONE ALLA GRIGLIA" },
    { id: 407, name: "POLPO ALLA GRIGLIA" },
    { id: 415, name: "TIRAMISU" },
    { id: 416, name: "ΡΑΝΝΑ COTTA" },
    { id: 417, name: "TORTINO AL CIOCCOLATO" },
    { id: 418, name: "CRÈME BRÛLÉE" },

    // Drink Items
    { id: 1, name: "APEROL SPRITZ" },
    { id: 2, name: "CAMPARI SPRITZ" },
    { id: 3, name: "CAMPARI AMALFI" },
    { id: 4, name: "PROSECCO" },
    { id: 5, name: "SARTI SPRITZ" },
    { id: 6, name: "SARTI LEMON" },
    { id: 7, name: "LIMONCELLO SPRITZ" },
    { id: 8, name: "GIN & TONIC" },
    { id: 9, name: "MARTINI BIANCO" },
    { id: 10, name: "HUGO" },
    { id: 11, name: "CRODINO | alkoholfrei" },
    { id: 12, name: "LAVANDA SPRITZ | alkoholfrei" },
    { id: 13, name: "LIMOADE SPRITZ | alkoholfrei" },
    { id: 20, name: "AQUA PANNA (STILL)" },
    { id: 21, name: "SAN PELLEGRINO (MEDIUM)" },
    { id: 22, name: "COCA COLA" },
    { id: 23, name: "SPRITE" },
    { id: 24, name: "FANTA" },
    { id: 25, name: "SPEZI" },
    { id: 26, name: "GINGER ALE" },
    { id: 27, name: "TONIC WATER" },
    { id: 28, name: "BITTER LEMON" },
    { id: 29, name: "BANANENSAFT" },
    { id: 30, name: "ORANGENSAFT" },
    { id: 31, name: "KIRSCHSAFT" },
    { id: 32, name: "APFELSAFT" },
    { id: 33, name: "RHABARBERSAFT" },
    { id: 34, name: "JOHANNISBEERSAFT" },
    { id: 35, name: "KIBA" },
    { id: 50, name: "ROTWEIN" },
    { id: 51, name: "WEISSWEIN" },
    { id: 52, name: "ROSÉ" },
    { id: 53, name: "FRIZZANTINO" },
    { id: 54, name: "LAMBRUSCO" },
    { id: 55, name: "WEISSWEINSCHORLE" },
    { id: 56, name: "PRIMITIVO" },
    { id: 57, name: "CHIANTI CLASSICO" },
    { id: 58, name: "CHARDONNAY" },
    { id: 59, name: "PINOT GRIGIO" },
    { id: 70, name: "GRAPPA" },
    { id: 71, name: "LIMONCELLO" },
    { id: 72, name: "AVERNA" },
    { id: 73, name: "RAMAZOTTI" },
    { id: 74, name: "AMARO DEL CAPO" },
    { id: 75, name: "SAMBUCA" },
    { id: 76, name: "FERNET BRANCHA" },
    { id: 80, name: "CAFFE" },
    { id: 81, name: "CAPPUCCINO" },
    { id: 82, name: "LATTE MACCHIATO" },
    { id: 83, name: "ESPRESSO" },
    { id: 84, name: "ESPRESSO DOPPIO" },
    { id: 85, name: "ESPRESSO MACCHIATO" },
    { id: 86, name: "TEE" },
    { id: 90, name: "PAULANDER PILS" },
    { id: 91, name: "PAULANER WEISSBIER" },
    { id: 92, name: "RADLER" },
    { id: 93, name: "PAULANER HEFEWEIZEN DUNKEL" },
    { id: 94, name: "PAULANER PILS alkoholfrei" },
    { id: 95, name: "PAULANER WEISSBIER alkoholfrei" }
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
        const qtyLabel = orderItem ? `<span style="background:var(--primary); color:white; padding:10px 30px; border-radius:40px; font-size:2.8rem; font-weight:800;">${orderItem.quantity}x</span>` : "";

        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:30px; flex:1;">
                <span style="color:var(--primary); font-weight:900; min-width:80px; font-size:2.5rem;">${item.id}</span>
                <span style="font-weight:800; font-size:2.5rem;">${item.name}</span>
            </div>
            ${qtyLabel}
        `;
        div.onclick = () => addToOrder(item);
        resultsDiv.appendChild(div);
    });
}

function toggleKeyboard() {
    const input = document.getElementById('numSearch');
    const btn = document.getElementById('kbToggle');

    if (input.inputMode === 'decimal') {
        input.inputMode = 'text';
        btn.classList.add('active');
        btn.innerText = 'ABC';
    } else {
        input.inputMode = 'decimal';
        btn.classList.remove('active');
        btn.innerText = '123';
    }

    // Briefly blur and refocus to trigger the keyboard change on mobile
    input.blur();
    setTimeout(() => input.focus(), 50);
}

function addToOrder(item) {
    if (!allOrders[currentTable]) allOrders[currentTable] = [];
    // Only stack if there is no comment
    const existingEntry = allOrders[currentTable].find(i => i.id === item.id && !i.comment);
    if (existingEntry) {
        existingEntry.quantity = (existingEntry.quantity || 1) + 1;
    } else {
        allOrders[currentTable].push({
            ...item,
            quantity: 1,
            comment: "",
            uid: Date.now() + Math.random()
        });
    }
    saveAndRender();
    document.getElementById('numSearch').value = "";
    document.getElementById('searchResults').innerHTML = "";
}

function updateQuantity(uid, delta) {
    const item = allOrders[currentTable].find(i => i.uid === uid);
    if (!item) return;
    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) {
        allOrders[currentTable] = allOrders[currentTable].filter(i => i.uid !== uid);
    }
    saveAndRender();
}

function removeFromOrder(uid) {
    const item = allOrders[currentTable].find(i => i.uid === uid);
    const itemName = item ? item.name : "Artikel";

    customConfirm("Artikel entfernen", `Möchten Sie ${itemName} wirklich aus der Bestellung entfernen?`, (confirmed) => {
        if (confirmed) {
            allOrders[currentTable] = allOrders[currentTable].filter(i => i.uid !== uid);
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
        container.innerHTML = '<div style="padding:40px; color:#aaa; text-align:center; font-size: 2.2rem;">Keine Bestellung</div>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'order-row';
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name"><span style="color:var(--primary); font-weight:bold;">${item.id}.</span> ${item.name}</span>
                ${item.comment ? `<div class="item-comment">${item.comment}</div>` : ""}
            </div>
            <div class="item-controls">
                <button class="comment-btn" onclick="editComment(${item.uid})">📝</button>
                <div class="qty-group">
                    <button class="qty-btn" onclick="updateQuantity(${item.uid}, -1)">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.uid}, 1)">+</button>
                </div>
                <button class="del-btn" onclick="removeFromOrder(${item.uid})">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function editComment(uid) {
    const item = allOrders[currentTable].find(i => i.uid === uid);
    if (!item) return;

    customTextPrompt("Kommentar", `Kommentar für ${item.name}:`, (newComment) => {
        if (newComment === null) return;

        // If it's a stack (qty > 1), split it
        if (item.quantity > 1) {
            item.quantity -= 1;
            allOrders[currentTable].push({
                ...item,
                quantity: 1,
                comment: newComment,
                uid: Date.now() + Math.random()
            });
        } else {
            item.comment = newComment;
        }

        // After updating/splitting, try to re-stack with existing items with the same ID and same comment
        restackItems();
        saveAndRender();
    });
}

function restackItems() {
    const items = allOrders[currentTable] || [];
    const stacked = [];

    items.forEach(item => {
        const existing = stacked.find(s => s.id === item.id && s.comment === item.comment);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            stacked.push(item);
        }
    });

    allOrders[currentTable] = stacked;
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
        <p style="margin-bottom:30px;">${message}</p>
        <input type="number" id="${inputId}" class="search-box" style="text-align:center;" inputmode="numeric" autofocus>
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

function customTextPrompt(title, message, callback) {
    const inputId = "modalInput";
    const bodyContent = `
        <p style="margin-bottom:30px;">${message}</p>
        <input type="text" id="${inputId}" class="search-box" style="text-align:center;" autofocus autocomplete="off">
    `;
    showModal(title, bodyContent, [
        { text: "Abbrechen", primary: false, onClick: () => callback(null) },
        {
            text: "Leeren", primary: false, onClick: () => callback("")
        },
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

