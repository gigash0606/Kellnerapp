document.addEventListener('DOMContentLoaded', () => {
    generateTables();

    // Resume session if currentTable was set
    const savedTable = localStorage.getItem('waiterCurrentTable');
    if (savedTable) {
        selectTable(parseInt(savedTable));
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.worker = navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'));
    }

    // PWA DOUBLE-TAP ZOOM SHIELD
    let lastTap = 0;
    document.addEventListener('touchstart', function (e) {
        const now = Date.now();
        if (now - lastTap < 300) {
            if (e.touches.length > 1 || now - lastTap < 300) {
                e.preventDefault();
            }
        }
        lastTap = now;
    }, { passive: false });

    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // OPTIMIZED VIEWPORT HANDLING FOR iOS
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const root = document.getElementById('rootContainer');
            const searchResults = document.getElementById('searchResults');
            const orderInterface = document.getElementById('orderInterface');

            if (!root) return;

            // Set height to actual visible viewport (critical for iOS Home Screen App)
            const vh = window.visualViewport.height;
            root.style.height = vh + 'px';

            // Adjust search results max-height to ensure they don't cover everything
            if (searchResults && orderInterface && getComputedStyle(orderInterface).display !== 'none') {
                // Keep results within 40% of the visible area so the order list stays visible
                searchResults.style.maxHeight = (vh * 0.45) + 'px';
            }

            // iOS Panning Fix: Always scroll to top
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
        });
    }

    // SEARCH INPUT POLISH
    const searchInput = document.getElementById('numSearch');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            // Slight delay to allow viewport to settle on iOS
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
            }, 100);
        });

        // Prevention of accidental body scroll while typing
        searchInput.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
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
    addCard.onclick = addTable;
    addCard.innerHTML = `
        <div class="card-body">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:40px; height:40px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </div>
    `;
    grid.appendChild(addCard);

    // Existing Tables
    tables.sort((a, b) => a - b).forEach(num => {
        const hasOrder = (allOrders[num] && allOrders[num].length > 0);
        const card = document.createElement('div');
        card.className = `card table-card ${hasOrder ? 'has-order' : ''}`;
        card.onclick = () => selectTable(num);

        card.innerHTML = `
            <div class="card-body">
                <span class="table-num">${num}</span>
            </div>
        `;
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


/**
 * ORDER INTERFACE MANAGEMENT
 * Handles all logic when inside a specific table view.
 */

const OrderManager = {
    // Current state
    get currentItems() {
        return allOrders[currentTable] || [];
    },

    set currentItems(val) {
        allOrders[currentTable] = val;
    },

    // UI Elements
    get listContainer() { return document.getElementById('activeOrder'); },
    get searchInput() { return document.getElementById('numSearch'); },
    get searchResults() { return document.getElementById('searchResults'); },

    /**
     * Entry point: Show table view
     */
    select(num) {
        currentTable = num;
        localStorage.setItem('waiterCurrentTable', num);

        // UI Transitions
        document.getElementById('tableGridContainer').style.display = 'none';
        const orderIface = document.getElementById('orderInterface');
        orderIface.style.display = 'flex';

        // Update Header
        document.getElementById('backToTablesBtn').style.display = 'flex';
        document.getElementById('deleteAllBtn').style.display = 'none';
        document.getElementById('infoBtn').style.display = 'none';
        document.querySelector('.header-center').innerText = `Tisch ${num}`;

        this.render();

        // Focus search box for immediate entry
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus({ preventScroll: true });
            }
        }, 150);
    },

    /**
     * Exit point: Back to grid
     */
    close() {
        currentTable = null;
        localStorage.removeItem('waiterCurrentTable');

        document.getElementById('tableGridContainer').style.display = 'block';
        document.getElementById('orderInterface').style.display = 'none';

        // Reset Header
        document.getElementById('backToTablesBtn').style.display = 'none';
        document.getElementById('deleteAllBtn').style.display = 'flex';
        document.getElementById('infoBtn').style.display = 'flex';
        document.querySelector('.header-center').innerText = "Tische";

        // Cleanup
        this.searchInput.value = "";
        this.searchResults.innerHTML = "";
        this.searchResults.classList.remove('active');

        generateTables();
    },

    /**
     * Main Render Loop
     */
    render() {
        const container = this.listContainer;
        if (!container) return;

        container.innerHTML = "";
        const items = this.currentItems;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-order-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <p>Keine Bestellung</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const rowWrapper = document.createElement('div');
            rowWrapper.className = 'order-row-container';
            rowWrapper.innerHTML = `
                <div class="swipe-delete-btn" onclick="OrderManager.removeItem('${item.uid}')">Löschen</div>
                <div class="order-row" id="row-${item.uid}">
                    <div class="qty-control" onclick="OrderManager.updateQty('${item.uid}', 1)">
                        <span class="qty-val">${item.quantity}</span>
                    </div>
                    <div class="item-content" onclick="OrderManager.handleRowClick('${item.uid}')">
                        <div class="item-info">
                            <span class="item-name">${item.name}</span>
                            <span class="item-code">${item.id}</span>
                        </div>
                        ${item.comment ? `<div class="item-comment">"${item.comment}"</div>` : ''}
                    </div>
                    <button class="row-edit-btn" onclick="OrderManager.editComment('${item.uid}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            `;

            this.setupSwipe(rowWrapper.querySelector('.order-row'));
            container.appendChild(rowWrapper);
        });
    },

    /**
     * Row Interactions
     */
    handleRowClick(uid) {
        // Find row element
        const row = document.getElementById(`row-${uid}`);
        if (row && row.classList.contains('swiped')) {
            row.classList.remove('swiped');
            return;
        }
        // Default action for clicking the main part of the row: Edit Comment
        // (Previously it was increment, but we have a dedicated button for that now)
        this.editComment(uid);
    },

    updateQty(uid, delta) {
        const items = this.currentItems;
        const index = items.findIndex(i => i.uid.toString() === uid.toString());
        if (index === -1) return;

        items[index].quantity += delta;
        if (items[index].quantity <= 0) {
            items.splice(index, 1);
        }

        this.save();
    },

    removeItem(uid) {
        this.currentItems = this.currentItems.filter(i => i.uid.toString() !== uid.toString());
        this.save();
    },

    editComment(uid) {
        const item = this.currentItems.find(i => i.uid.toString() === uid.toString());
        if (!item) return;

        customTextPrompt("Kommentar", `Notiz für ${item.name}:`, (val) => {
            if (val === null) return; // Cancelled

            // If qty > 1, ask if we should apply to all or split?
            // Simplified: Just apply to this entry. If user wants a separate one, they can split via logic if we add it.
            // For now, let's keep it simple: edit this item.

            if (item.quantity > 1 && val !== "") {
                // Split logic: take one out and give it the comment
                item.quantity -= 1;
                this.currentItems.push({
                    ...item,
                    quantity: 1,
                    comment: val,
                    uid: Date.now() + Math.random()
                });
            } else {
                item.comment = val;
            }

            this.restack();
            this.save();
        });
    },

    restack() {
        const stacked = [];
        this.currentItems.forEach(item => {
            const existing = stacked.find(s => s.id === item.id && s.comment === item.comment);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                stacked.push(item);
            }
        });
        this.currentItems = stacked;
    },

    clear() {
        customConfirm("Tisch leeren", "Alle Bestellungen dieses Tisches löschen?", (confirmed) => {
            if (confirmed) {
                this.currentItems = [];
                this.save();
            }
        });
    },

    /**
     * Search & Add
     */
    search() {
        const query = this.searchInput.value.trim().toLowerCase();
        const results = this.searchResults;
        results.innerHTML = "";

        if (!query) {
            results.classList.remove('active');
            return;
        }

        results.classList.add('active');
        const isNum = /^\d+$/.test(query);

        let matches = [];
        if (isNum) {
            const idMatch = query.replace(/^0+/, '');
            matches = menu.filter(item => item.id.toString().startsWith(idMatch));
        } else {
            matches = menu.filter(item => item.name.toLowerCase().includes(query));
        }

        // Sort: ID numerical
        matches.sort((a, b) => a.id - b.id);

        // Predictable Auto-Add
        if (matches.length === 1) {
            const item = matches[0];
            const cleanId = query.replace(/^0+/, '');
            // EXACT ID match OR Name Match > 3 chars
            if ((isNum && item.id.toString() === cleanId) ||
                (!isNum && query.length >= 4 && item.name.toLowerCase() === query)) {
                this.addItem(item);
                return;
            }
        }

        // Render results
        matches.forEach(item => {
            const currentItem = this.currentItems.find(i => i.id === item.id);
            const qtyLabel = currentItem ? `<span class="qty-tag">${currentItem.quantity}x</span>` : "";

            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <span class="item-id">${item.id}</span>
                <span class="item-text">${item.name}</span>
                ${qtyLabel}
            `;
            div.onclick = () => this.addItem(item);
            results.appendChild(div);
        });
    },

    addItem(item) {
        if (navigator.vibrate) navigator.vibrate(12);

        // Default: stack items with NO comments
        const existing = this.currentItems.find(i => i.id === item.id && !i.comment);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.currentItems.push({
                ...item,
                quantity: 1,
                comment: "",
                uid: Date.now() + Math.random()
            });
        }

        this.save();

        // Reset Search
        this.searchInput.value = "";
        this.searchResults.innerHTML = "";
        this.searchResults.classList.remove('active');

        // Scroll list to bottom
        setTimeout(() => {
            this.listContainer.scrollTop = this.listContainer.scrollHeight;
        }, 50);
    },

    /**
     * Utilities
     */
    save() {
        localStorage.setItem('waiterData', JSON.stringify(allOrders));
        this.render();
    },

    setupSwipe(row) {
        let startX = 0;
        row.ontouchstart = (e) => { startX = e.touches[0].clientX; };
        row.ontouchend = (e) => {
            const diff = startX - e.changedTouches[0].clientX;
            if (diff > 55) row.classList.add('swiped');
            else if (diff < -55) row.classList.remove('swiped');
        };
    }
};

// Map old global functions to the new Manager for HTML compatibility
function selectTable(num) { OrderManager.select(num); }
function backToTables() { OrderManager.close(); }
function searchMenu() { OrderManager.search(); }
function clearTable() { OrderManager.clear(); }
function addToOrder(item) { OrderManager.addItem(item); }
function updateQuantity(uid, d) { OrderManager.updateQty(uid, d); }
function removeFromOrder(uid) { OrderManager.removeItem(uid); }


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
        <p style="margin-bottom:15px;">${message}</p>
        <input type="number" id="${inputId}" class="modal-input" style="text-align:center;" inputmode="numeric" autofocus>
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
        <p style="margin-bottom:15px;">${message}</p>
        <input type="text" id="${inputId}" class="modal-input" style="text-align:center;" autofocus autocomplete="off">
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
        setTimeout(() => {
            input.focus({ preventScroll: true });
        }, 100);
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

function confirmDeleteAll() {
    customConfirm("Alle löschen", "Möchten Sie wirklich ALLE Tische und Daten löschen? Dies kann nicht rückgängig gemacht werden.", (confirmed) => {
        if (confirmed) {
            tables = [];
            allOrders = {};
            localStorage.setItem('waiterTables', JSON.stringify(tables));
            localStorage.setItem('waiterData', JSON.stringify(allOrders));
            localStorage.removeItem('waiterCurrentTable');
            generateTables();
        }
    });
}

function showLegalInfo() {
    const legalText = `
        <div style="text-align:left; line-height:1.6; font-size:0.95rem;">
            <p>Diese App dient ausschließlich als digitale <strong>Gedächtnisstütze</strong> zum Merken von Bestellungen.</p>
            <p>Ihr Zweck ist es, den Arbeitsablauf zu beschleunigen und den Gebrauch von Papier zu minimieren.</p>
            <p><strong>Wichtige Hinweise:</strong></p>
            <ul style="padding-left:20px;">
                <li>Die App führt <strong>keine</strong> illegalen Aktivitäten durch.</li>
                <li>Sie ist kein offizielles Kassensystem.</li>
                <li>Alle Daten werden lokal in Ihrem Browser gespeichert.</li>
            </ul>
            <p><em>Viel Spaß bei der Arbeit!</em></p>
        </div>
    `;
    showModal("Information", legalText, [{ text: "Verstanden", primary: true }], true);
}
