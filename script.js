document.addEventListener('DOMContentLoaded', () => {
    generateTables();

    // Resume session if currentTable was set
    const savedTable = localStorage.getItem('waiterCurrentTable');
    if (savedTable) {
        selectTable(parseInt(savedTable));
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.navigator_worker = navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'));
    }

    // PWA DOUBLE-TAP ZOOM SHIELD (iOS Standalone Fix)
    let lastTap = 0;
    document.addEventListener('touchstart', function (e) {
        const now = Date.now();
        if (now - lastTap < 300) {
            e.preventDefault();
        }
        lastTap = now;
    }, { passive: false });

    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // Handle viewport resizing (keyboard opening/closing on iOS)
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0));
});

function handleViewportChange() {
    const viewport = window.visualViewport;
    const body = document.body;
    // Force container to match visual viewport height to prevent sliding
    body.style.height = viewport.height + 'px';
    window.scrollTo(0, 0);
}

// Visual Haptic Feedback for physical button feel
function triggerHaptic(el) {
    el.style.transform = 'scale(0.95)';
    el.style.opacity = '0.8';
    setTimeout(() => {
        el.style.transform = '';
        el.style.opacity = '';
    }, 100);
}

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
    document.body.classList.add('order-mode');
    document.getElementById('tableGrid').style.display = 'none';
    document.getElementById('orderInterface').style.display = 'block';

    const container = document.querySelector('.container');
    if (container) container.scrollTop = 0;

    const titleEl = document.getElementById('headerTitle').querySelector('.header-center');
    if (titleEl) titleEl.innerText = "Tisch " + num;

    renderOrder();

    setTimeout(() => {
        const input = document.getElementById('numSearch');
        if (input) input.focus();
    }, 100);
}

function backToTables() {
    currentTable = null;
    localStorage.removeItem('waiterCurrentTable');
    document.body.classList.remove('order-mode');
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

const menu = [
    // FOOD
    { id: 100, name: "CARPACCIO DIE MANZO", category: 2 },
    { id: 101, name: "VITELLO TONNATO", category: 2 },
    { id: 102, name: "FORMAGGIO DI CAPRA", category: 2 },
    { id: 103, name: "ANTIPASTO DELLA CASA", category: 2 },
    { id: 104, name: "CAPRESE DIE BUFALA", category: 2 },
    { id: 105, name: "BRUSCHETTA CLASSICA", category: 2 },
    { id: 106, name: "BRUSCHETTA CAPRESE", category: 2 },
    { id: 111, name: "INSALATA TONNO", category: 2 },
    { id: 112, name: "INSALATA CAPRICCIOSA", category: 2 },
    { id: 115, name: "INSALATA DI POLLO", category: 2 },
    { id: 116, name: "INSALATA MISTA", category: 2 },
    { id: 117, name: "TARTARE DI MANZO", category: 2 },
    { id: 118, name: "TARTARE DI SALMONE", category: 2 },
    { id: 120, name: "ZUPPA DI POMODORO", category: 2 },
    { id: 121, name: "MINESTRONE", category: 2 },
    { id: 200, name: "SPAGHETTI AGLIO OLIO E PERONCINO", category: 2 },
    { id: 201, name: "PENNE ARRABIATA", category: 2 },
    { id: 202, name: "TAGLIATELLE AL RAGÙ", category: 2 },
    { id: 203, name: "SPAGHETTI ALLA CARBONARA", category: 2 },
    { id: 204, name: "SPAGHETTI DEL PESCATORE", category: 2 },
    { id: 205, name: "RISOTTO STRACCIATA DI BUFALA E PORCINI", category: 2 },
    { id: 206, name: "GNOCCHI ALLA SORRENTINA", category: 2 },
    { id: 207, name: "FILEJA ALLA MONZESE", category: 2 },
    { id: 208, name: "RAVIOLI BURRATA", category: 2 },
    { id: 209, name: "RAVIOLI PERE E GORGONZOLA", category: 2 },
    { id: 210, name: "FILEJA MANZO E RUCOLA", category: 2 },
    { id: 211, name: "LASAGNE", category: 2 },
    { id: 212, name: "SPAGHETTI AI GAMBERI", category: 2 },
    { id: 213, name: "TAGLIATELLE SALMONE", category: 2 },
    { id: 214, name: "PENNE ALLA CACCIATORA", category: 2 },
    { id: 215, name: "SPAGHETTI PUTTANESCA CON ΤΟΝΝΟ", category: 2 },
    { id: 300, name: "PIZZA MARGHERITA", category: 2 },
    { id: 301, name: "PIZZA SALAME", category: 2 },
    { id: 302, name: "PIZZA PROSCIUTTO E FUNGHI", category: 2 },
    { id: 304, name: "PIZZA PARMIGIANA", category: 2 },
    { id: 305, name: "PIZZA SALSICCIA", category: 2 },
    { id: 306, name: "PIZZA VEGETARIANA", category: 2 },
    { id: 307, name: "PIZZA DIAVOLA", category: 2 },
    { id: 308, name: "PIZZA SFIZIOSA", category: 2 },
    { id: 309, name: "PIZZA BUFALINA", category: 2 },
    { id: 310, name: "PIZZA RUSTICA", category: 2 },
    { id: 312, name: "PIZZA LE QUATTRO STAGIONI", category: 2 },
    { id: 313, name: "PIZZA QUATTRO FORMAGGI", category: 2 },
    { id: 314, name: "PIZZA SALMONE", category: 2 },
    { id: 315, name: "PIZZA D'ITALY", category: 2 },
    { id: 316, name: "PIZZA ZOLA E PARMA", category: 2 },
    { id: 317, name: "PIZZA ΤΟΝΝO E CIPOLLA", category: 2 },
    { id: 400, name: "SALTIMBOCCA ALLA ROMANA", category: 2 },
    { id: 401, name: "FILETTO ALLA GRIGLIA", category: 2 },
    { id: 402, name: "FILETTO AL PEPE VERDE", category: 2 },
    { id: 403, name: "POLLO ALLA GRIGLIA", category: 2 },
    { id: 404, name: "CARRÉ DI AGNELLO", category: 2 },
    { id: 405, name: "ENTRECÔTE DI MANZO", category: 2 },
    { id: 406, name: "SALMONE ALLA GRIGLIA", category: 2 },
    { id: 407, name: "POLPO ALLA GRIGLIA", category: 2 },
    { id: 415, name: "TIRAMISU", category: 3 },
    { id: 416, name: "ΡΑΝΝΑ COTTA", category: 3 },
    { id: 417, name: "TORTINO AL CIOCCOLATO", category: 3 },
    { id: 418, name: "CRÈME BRÛLÉE", category: 3 },

    // DRINKS
    { id: 1, name: "APEROL SPRITZ", category: 1 },
    { id: 2, name: "CAMPARI SPRITZ", category: 1 },
    { id: 3, name: "CAMPARI AMALFI", category: 1 },
    { id: 4, name: "PROSECCO", category: 1 },
    { id: 5, name: "SARTI SPRITZ", category: 1 },
    { id: 6, name: "SARTI LEMON", category: 1 },
    { id: 7, name: "LIMONCELLO SPRITZ", category: 1 },
    { id: 8, name: "GIN & TONIC", category: 1 },
    { id: 9, name: "MARTINI BIANCO", category: 1 },
    { id: 10, name: "HUGO", category: 1 },
    { id: 11, name: "CRODINO", category: 1 },
    { id: 12, name: "LAVANDA SPRITZ", category: 1 },
    { id: 13, name: "LIMOADE SPRITZ", category: 1 },
    { id: 20, name: "AQUA PANNA 0,25l", category: 1 },
    { id: 21, name: "AQUA PANNA 0,75l", category: 1 },
    { id: 22, name: "SAN PELLEGRINO 0,25l", category: 1 },
    { id: 23, name: "SAN PELLEGRINO 0,75l", category: 1 },
    { id: 24, name: "COCA COLA 0,2l", category: 1 },
    { id: 25, name: "COCA COLA 0,4l", category: 1 },
    { id: 26, name: "SPRITE 0,2l", category: 1 },
    { id: 27, name: "SPRITE 0,4l", category: 1 },
    { id: 28, name: "FANTA 0,2l", category: 1 },
    { id: 29, name: "FANTA 0,4l", category: 1 },
    { id: 30, name: "SPEZI 0,2l", category: 1 },
    { id: 31, name: "SPEZI 0,4l", category: 1 },
    { id: 32, name: "GINGER ALE 0,2l", category: 1 },
    { id: 33, name: "GINGER ALE 0,4l", category: 1 },
    { id: 34, name: "TONIC WATER 0,2l", category: 1 },
    { id: 35, name: "TONIC WATER 0,4l", category: 1 },
    { id: 36, name: "BITTER LEMON 0,2l", category: 1 },
    { id: 37, name: "BITTER LEMON 0,4l", category: 1 },
    { id: 38, name: "BANANENSAFT 0,2l", category: 1 },
    { id: 39, name: "BANANENSAFT 0,4l", category: 1 },
    { id: 40, name: "ORANGENSAFT 0,2l", category: 1 },
    { id: 41, name: "ORANGENSAFT 0,4l", category: 1 },
    { id: 42, name: "KIRSCHSAFT 0,2l", category: 1 },
    { id: 43, name: "KIRSCHSAFT 0,4l", category: 1 },
    { id: 44, name: "APFELSAFT 0,2l", category: 1 },
    { id: 45, name: "APFELSAFT 0,4l", category: 1 },
    { id: 46, name: "RHABARBERSAFT 0,2l", category: 1 },
    { id: 47, name: "RHABARBERSAFT 0,4l", category: 1 },
    { id: 48, name: "JOHANNISBEERSAFT 0,2l", category: 1 },
    { id: 49, name: "JOHANNISBEERSAFT 0,4l", category: 1 },
    { id: 50, name: "KIBA 0,2l", category: 1 },
    { id: 51, name: "KIBA 0,4l", category: 1 },
    { id: 60, name: "ROTWEIN 0,2l", category: 1 },
    { id: 61, name: "WEISSWEIN 0,2l", category: 1 },
    { id: 62, name: "ROSÉ 0,2l", category: 1 },
    { id: 63, name: "FRIZZANTINO 0,2l", category: 1 },
    { id: 64, name: "LAMBRUSCO 0,2l", category: 1 },
    { id: 65, name: "WEISSWEINSCHORLE 0,2l", category: 1 },
    { id: 66, name: "PRIMITIVO 0,2l", category: 1 },
    { id: 67, name: "CHIANTI CLASSICO 0,2l", category: 1 },
    { id: 68, name: "CHARDONNAY 0,2l", category: 1 },
    { id: 69, name: "PINOT GRIGIO 0,2l", category: 1 },
    { id: 70, name: "GRAPPA 2cl", category: 1 },
    { id: 71, name: "GRAPPA 4cl", category: 1 },
    { id: 72, name: "LIMONCELLO 2cl", category: 1 },
    { id: 73, name: "LIMONCELLO 4cl", category: 1 },
    { id: 74, name: "AVERNA 2cl", category: 1 },
    { id: 75, name: "AVERNA 4cl", category: 1 },
    { id: 76, name: "RAMAZOTTI 2cl", category: 1 },
    { id: 77, name: "RAMAZOTTI 4cl", category: 1 },
    { id: 78, name: "AMARO DEL CAPO 2cl", category: 1 },
    { id: 79, name: "AMARO DEL CAPO 4cl", category: 1 },
    { id: 80, name: "SAMBUCA 2cl", category: 1 },
    { id: 81, name: "SAMBUCA 4cl", category: 1 },
    { id: 82, name: "FERNET BRANCHA 2cl", category: 1 },
    { id: 83, name: "FERNET BRANCHA 4cl", category: 1 },
    { id: 84, name: "CAFFE", category: 1 },
    { id: 85, name: "CAPPUCCINO", category: 1 },
    { id: 86, name: "LATTE MACCHIATO", category: 1 },
    { id: 87, name: "ESPRESSO", category: 1 },
    { id: 88, name: "ESPRESSO DOPPIO", category: 1 },
    { id: 89, name: "ESPRESSO MACCHIATO", category: 1 },
    { id: 90, name: "TEE", category: 1 },
    { id: 91, name: "PAULANDER PILS 0,3l", category: 1 },
    { id: 92, name: "PAULANDER PILS 0,5l", category: 1 },
    { id: 93, name: "PAULANER WEISSBIER 0,3l", category: 1 },
    { id: 94, name: "PAULANER WEISSBIER 0,5l", category: 1 },
    { id: 95, name: "RADLER 0,3l", category: 1 },
    { id: 96, name: "RADLER 0,5l", category: 1 },
    { id: 97, name: "PAULANER HEFEWEIZEN DUNKEL 0,5l", category: 1 },
    { id: 98, name: "PAULANER PILS alkoholfrei 0,33l", category: 1 },
    { id: 99, name: "PAULANER WEISSBIER alkoholfrei 0,5l", category: 1 }
];

function searchMenu() {
    const val = document.getElementById('numSearch').value;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "";
    if (!val) return;

    const query = val.toLowerCase();
    const idQuery = query.replace(/^0+/, '');
    const currentItems = allOrders[currentTable] || [];

    const matches = menu.filter(item =>
        (idQuery !== '' && item.id.toString().startsWith(idQuery)) ||
        item.name.toLowerCase().includes(query)
    );

    matches.sort((a, b) => a.id - b.id);

    matches.forEach(item => {
        const orderItem = currentItems.find(i => i.id === item.id && !i.comment);
        const qtyLabel = orderItem ? `<span style="background:var(--primary); color:white; padding:10px 30px; border-radius:40px; font-size:1.8rem; font-weight:800; margin-left:10px;">${orderItem.quantity}x</span>` : "";
        const displayId = item.id.toString().padStart(2, '0');

        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:20px; flex:1;">
                <span style="color:var(--primary); font-weight:900; min-width:60px; font-size:2rem;">${displayId}</span>
                <span style="font-weight:800; font-size:2rem;">${item.name}</span>
                ${qtyLabel}
            </div>
        `;
        div.onclick = () => {
            addToOrder(item);
            searchMenu();
        };
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

    input.blur();
    setTimeout(() => input.focus(), 50);
}

function addToOrder(item) {
    if (!allOrders[currentTable]) allOrders[currentTable] = [];
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
    if (!container) return;

    restackItems();
    const items = allOrders[currentTable] || [];

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:40px; color:#aaa; text-align:center; font-size: 2rem;">Keine Bestellung</div>';
        return;
    }

    // Keep track of existing UIDs to identify what to remove
    const currentUids = new Set(items.map(item => item.uid.toString()));
    const existingRows = Array.from(container.querySelectorAll('.order-row'));

    // Remove rows that are no longer in the order
    existingRows.forEach(row => {
        if (!currentUids.has(row.dataset.uid)) {
            row.classList.add('removing');
            setTimeout(() => row.remove(), 300);
        }
    });

    // Update or Add items
    items.forEach(item => {
        let div = container.querySelector(`[data-uid="${item.uid}"]`);

        if (!div) {
            div = document.createElement('div');
            div.className = 'order-row';
            div.dataset.uid = item.uid;
            div.style = "display:flex; justify-content:space-between; align-items:center; padding: 25px 0;";
        }

        // Always append to ensure correct sorted order in DOM
        container.appendChild(div);

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:20px; flex:1;">
                <!-- Quantity Controls -->
                <div style="display:flex; align-items:center; gap:10px;">
                    ${item.quantity > 1 ? `<button onclick="updateQuantity(${item.uid}, -1)" style="background:#f1f3f5; border:none; color:#444; font-size:2.8rem; font-weight:900; width:60px; height:60px; border-radius:12px; display:flex; align-items:center; justify-content:center; padding:0;">-</button>` : `<div style="width:60px;"></div>`}
                    <div style="background:var(--primary); color:white; padding:8px 20px; border-radius:12px; font-size:2.8rem; font-weight:800; min-width:70px; height:60px; display:flex; align-items:center; justify-content:center;">${item.quantity}</div>
                    <button onclick="updateQuantity(${item.uid}, 1)" style="background:#f1f3f5; border:none; color:#444; font-size:2.8rem; font-weight:900; width:60px; height:60px; border-radius:12px; display:flex; align-items:center; justify-content:center; padding:0;">+</button>
                </div>
                
                <!-- Name -->
                <div style="display:flex; flex-direction:column; overflow:hidden;">
                    <span style="font-weight:700; font-size:2.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</span>
                    ${item.comment ? `<div class="item-comment" style="margin-top:5px; font-style:italic; color:#666; font-size:1.6rem;">${item.comment}</div>` : ""}
                </div>
            </div>

            <div style="display:flex; align-items:center; gap:15px;">
                <span style="color:#999; font-weight:600; font-size:1.8rem; min-width:35px; text-align:right;">${item.id}</span>
                <button onclick="editComment(${item.uid})" style="background:#f1f3f5; border:none; font-size:2.8rem; width:70px; height:60px; border-radius:12px; display:flex; align-items:center; justify-content:center; padding:0;">💬</button>
                <button onclick="removeFromOrder(${item.uid})" style="background:#fff1f2; border:none; font-size:2.8rem; width:70px; height:60px; border-radius:12px; display:flex; align-items:center; justify-content:center; padding:0; color:#ff4757;">✕</button>
            </div>
        `;
    });
}


function editComment(uid) {
    const item = allOrders[currentTable].find(i => i.uid === uid);
    if (!item) return;

    customTextPrompt("Kommentar", `Kommentar für ${item.name}:`, (newComment) => {
        if (newComment === null) return;
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
        }
    });
}

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
