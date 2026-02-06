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

    // Double-tap zoom is already handled by touch-action: manipulation in CSS.
    // Removed JS-based preventDefault on touchend as it can break scrolling momentum.

    // Focus logic: Rely on manual tapping for search focus to prevent accidental keyboard popups during scroll.
    // document.addEventListener('click', (e) => { ... }); // Removed to honor request "tapping behind... do nothing"
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
    customConfirm("Tisch löschen", `Tisch ${num} löschen?`, (confirmed) => {
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
    customPrompt("Neuer Tisch", "Tischnummer:", (num) => {
        if (!num) return;
        const tableNum = parseInt(num);
        if (isNaN(tableNum)) {
            customAlert("Fehler", "Ungültige Nummer");
            return;
        }
        if (tableNum <= 0) {
            customAlert("Fehler", "Nummer > 0 erforderlich");
            return;
        }
        if (tables.includes(tableNum)) {
            customAlert("Fehler", "Tisch existiert bereits");
            return;
        }
        tables.push(tableNum);
        localStorage.setItem('waiterTables', JSON.stringify(tables));
        generateTables();
        selectTable(tableNum);
    });
}


function selectTable(num) {
    currentTable = num;
    localStorage.setItem('waiterCurrentTable', num);
    document.getElementById('tableGrid').style.display = 'none';
    document.getElementById('orderInterface').style.display = 'block';

    const container = document.querySelector('.container');
    if (container) container.scrollTop = 0;

    // Safety check for header title element inside new layout
    const titleEl = document.getElementById('headerTitle').querySelector('.header-center');
    if (titleEl) titleEl.innerText = "Tisch " + num;

    renderOrder();

    // Focus search box after a short delay to ensure it's visible
    setTimeout(() => {
        const input = document.getElementById('numSearch');
        if (input) input.focus();
    }, 100);
}

function backToTables() {
    currentTable = null;
    localStorage.removeItem('waiterCurrentTable');
    document.getElementById('tableGrid').style.display = 'grid';
    document.getElementById('orderInterface').style.display = 'none';
    document.getElementById('headerTitle').querySelector('.header-center').innerText = "Tische";

    const container = document.querySelector('.container');
    if (container) container.scrollTop = 0;

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
    // FOOD
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
    { id: 300, name: "PIZZA MARGHERITA" },
    { id: 301, name: "PIZZA SALAME" },
    { id: 302, name: "PIZZA PROSCIUTTO E FUNGHI" },
    { id: 304, name: "PIZZA PARMIGIANA" },
    { id: 305, name: "PIZZA SALSICCIA" },
    { id: 306, name: "PIZZA VEGETARIANA" },
    { id: 307, name: "PIZZA DIAVOLA" },
    { id: 308, name: "PIZZA SFIZIOSA" },
    { id: 309, name: "PIZZA BUFALINA" },
    { id: 310, name: "PIZZA RUSTICA" },
    { id: 312, name: "PIZZA LE QUATTRO STAGIONI" },
    { id: 313, name: "PIZZA QUATTRO FORMAGGI" },
    { id: 314, name: "PIZZA SALMONE" },
    { id: 315, name: "PIZZA D'ITALY" },
    { id: 316, name: "PIZZA ZOLA E PARMA" },
    { id: 317, name: "PIZZA ΤΟΝΝO E CIPOLLA" },
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

    // DRINKS
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
    { id: 11, name: "CRODINO" },
    { id: 12, name: "LAVANDA SPRITZ" },
    { id: 13, name: "LIMOADE SPRITZ" },
    { id: 20, name: "AQUA PANNA 0,25l" },
    { id: 21, name: "AQUA PANNA 0,75l" },
    { id: 22, name: "SAN PELLEGRINO 0,25l" },
    { id: 23, name: "SAN PELLEGRINO 0,75l" },
    { id: 24, name: "COCA COLA 0,2l" },
    { id: 25, name: "COCA COLA 0,4l" },
    { id: 26, name: "SPRITE 0,2l" },
    { id: 27, name: "SPRITE 0,4l" },
    { id: 28, name: "FANTA 0,2l" },
    { id: 29, name: "FANTA 0,4l" },
    { id: 30, name: "SPEZI 0,2l" },
    { id: 31, name: "SPEZI 0,4l" },
    { id: 32, name: "GINGER ALE 0,2l" },
    { id: 33, name: "GINGER ALE 0,4l" },
    { id: 34, name: "TONIC WATER 0,2l" },
    { id: 35, name: "TONIC WATER 0,4l" },
    { id: 36, name: "BITTER LEMON 0,2l" },
    { id: 37, name: "BITTER LEMON 0,4l" },
    { id: 38, name: "BANANENSAFT 0,2l" },
    { id: 39, name: "BANANENSAFT 0,4l" },
    { id: 40, name: "ORANGENSAFT 0,2l" },
    { id: 41, name: "ORANGENSAFT 0,4l" },
    { id: 42, name: "KIRSCHSAFT 0,2l" },
    { id: 43, name: "KIRSCHSAFT 0,4l" },
    { id: 44, name: "APFELSAFT 0,2l" },
    { id: 45, name: "APFELSAFT 0,4l" },
    { id: 46, name: "RHABARBERSAFT 0,2l" },
    { id: 47, name: "RHABARBERSAFT 0,4l" },
    { id: 48, name: "JOHANNISBEERSAFT 0,2l" },
    { id: 49, name: "JOHANNISBEERSAFT 0,4l" },
    { id: 50, name: "KIBA 0,2l" },
    { id: 51, name: "KIBA 0,4l" },
    { id: 60, name: "ROTWEIN 0,2l" },
    { id: 61, name: "WEISSWEIN 0,2l" },
    { id: 62, name: "ROSÉ 0,2l" },
    { id: 63, name: "FRIZZANTINO 0,2l" },
    { id: 64, name: "LAMBRUSCO 0,2l" },
    { id: 65, name: "WEISSWEINSCHORLE 0,2l" },
    { id: 66, name: "PRIMITIVO 0,2l" },
    { id: 67, name: "CHIANTI CLASSICO 0,2l" },
    { id: 68, name: "CHARDONNAY 0,2l" },
    { id: 69, name: "PINOT GRIGIO 0,2l" },
    { id: 70, name: "GRAPPA 2cl" },
    { id: 71, name: "GRAPPA 4cl" },
    { id: 72, name: "LIMONCELLO 2cl" },
    { id: 73, name: "LIMONCELLO 4cl" },
    { id: 74, name: "AVERNA 2cl" },
    { id: 75, name: "AVERNA 4cl" },
    { id: 76, name: "RAMAZOTTI 2cl" },
    { id: 77, name: "RAMAZOTTI 4cl" },
    { id: 78, name: "AMARO DEL CAPO 2cl" },
    { id: 79, name: "AMARO DEL CAPO 4cl" },
    { id: 80, name: "SAMBUCA 2cl" },
    { id: 81, name: "SAMBUCA 4cl" },
    { id: 82, name: "FERNET BRANCHA 2cl" },
    { id: 83, name: "FERNET BRANCHA 4cl" },
    { id: 84, name: "CAFFE" },
    { id: 85, name: "CAPPUCCINO" },
    { id: 86, name: "LATTE MACCHIATO" },
    { id: 87, name: "ESPRESSO" },
    { id: 88, name: "ESPRESSO DOPPIO" },
    { id: 89, name: "ESPRESSO MACCHIATO" },
    { id: 90, name: "TEE" },
    { id: 91, name: "PAULANDER PILS 0,3l" },
    { id: 92, name: "PAULANDER PILS 0,5l" },
    { id: 93, name: "PAULANER WEISSBIER 0,3l" },
    { id: 94, name: "PAULANER WEISSBIER 0,5l" },
    { id: 95, name: "RADLER 0,3l" },
    { id: 96, name: "RADLER 0,5l" },
    { id: 97, name: "PAULANER HEFEWEIZEN DUNKEL 0,5l" },
    { id: 98, name: "PAULANER PILS alkoholfrei 0,33l" },
    { id: 99, name: "PAULANER WEISSBIER alkoholfrei 0,5l" }
];

function searchMenu() {
    const val = document.getElementById('numSearch').value;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "";
    if (!val) return;

    const query = val.toLowerCase();
    // For ID matching, strip leading zeros so "01" matches ID 1
    const idQuery = query.replace(/^0+/, '');
    const currentItems = allOrders[currentTable] || [];

    const matches = menu.filter(item =>
        (idQuery !== '' && item.id.toString().startsWith(idQuery)) ||
        item.name.toLowerCase().includes(query)
    );

    // Sort result by ID numerically: lowest number up
    matches.sort((a, b) => a.id - b.id);

    matches.forEach(item => {
        const orderItem = currentItems.find(i => i.id === item.id);
        const qtyLabel = orderItem ? `<span style="background:var(--primary); color:white; padding:10px 30px; border-radius:40px; font-size:2.2rem; font-weight:800;">${orderItem.quantity}x</span>` : "";

        // Pad display ID to at least 2 digits
        const displayId = item.id.toString().padStart(2, '0');

        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:30px; flex:1;">
                <span style="color:var(--primary); font-weight:900; min-width:80px; font-size:2.2rem;">${displayId}</span>
                <span style="font-weight:800; font-size:2.2rem;">${item.name}</span>
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

    customConfirm("Entfernen", `${itemName} entfernen?`, (confirmed) => {
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
        container.innerHTML = '<div style="padding:40px; color:#aaa; text-align:center; font-size: 2rem;">Keine Bestellung</div>';
        return;
    }

    items.forEach(item => {
        const displayId = item.id.toString().padStart(2, '0');
        const div = document.createElement('div');
        div.className = 'order-row';
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name"><span style="color:var(--primary); font-weight:bold;">${displayId}.</span> ${item.name}</span>
                ${item.comment ? `<div class="item-comment">${item.comment}</div>` : ""}
            </div>
            <div class="item-controls">
                <button class="comment-btn" onclick="editComment(${item.uid})">📝</button>
                <div class="qty-group">
                    ${item.quantity > 1 ? `<button class="qty-btn" onclick="updateQuantity(${item.uid}, -1)">-</button>` : '<button class="qty-btn" style="visibility:hidden; pointer-events:none;">-</button>'}
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
    customConfirm("Tisch leeren", "Alle Bestellungen löschen?", (confirmed) => {
        if (confirmed) {
            delete allOrders[currentTable];
            saveAndRender();
            // Stays inside table menu (no backToTables call)
        }
    });
}

// Custom Modal Implementation
function customAlert(title, message) {
    showModal(title, message, [{ text: "✔", primary: true }]);
}

function customConfirm(title, message, callback) {
    showModal(title, message, [
        { text: "✖", primary: false, onClick: () => callback(false) },
        { text: "✔", primary: true, onClick: () => callback(true) }
    ]);
}

function customPrompt(title, message, callback) {
    const inputId = "modalInput";
    const bodyContent = `
        <p style="margin-bottom:30px;">${message}</p>
        <input type="number" id="${inputId}" class="search-box" style="text-align:center;" inputmode="numeric" autofocus>
    `;
    showModal(title, bodyContent, [
        { text: "✖", primary: false, onClick: () => callback(null) },
        {
            text: "✔", primary: true, onClick: () => {
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
        { text: "✖", primary: false, onClick: () => callback(null) },
        {
            text: "🗑️", primary: false, onClick: () => callback("")
        },
        {
            text: "✔", primary: true, onClick: () => {
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

