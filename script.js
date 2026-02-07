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
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.error('SW Registration Failed', err));
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

    // VIRTUAL VIEWPORT ADAPTATION (iOS Keyboard handling)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const root = document.getElementById('rootContainer');
            if (!root) return;

            const modalContainer = document.getElementById('modalContainer');
            const orderInterface = document.getElementById('orderInterface');

            const isModalOpen = modalContainer && modalContainer.children.length > 0;
            const isOrderScreen = orderInterface && getComputedStyle(orderInterface).display !== 'none';

            // Special case: Keep modal centered when keyboard appears, don't shrink container
            if (isModalOpen && !isOrderScreen) return;

            // Adapt height to keyboard/viewport changes
            root.style.height = window.visualViewport.height + 'px';
        });
    }

    // LOCK RUBBER-BAND SCROLL ON SEARCH FOCUS (iOS Safari specific)
    const searchInput = document.getElementById('numSearch');
    if (searchInput) {
        // Initialize with inputMode none to support custom numpad first
        searchInput.inputMode = 'none';

        const preventRubberBand = (e) => {
            const results = document.getElementById('searchResults');
            const activeOrder = document.getElementById('activeOrder');

            const isResultScroll = results && results.classList.contains('active') && results.contains(e.target);
            const isActiveOrderScroll = activeOrder && activeOrder.contains(e.target);

            // Allow touchmove inside results list OR active order list
            if (!isResultScroll && !isActiveOrderScroll && e.cancelable) {
                e.preventDefault();
            }
        };

        searchInput.addEventListener('focus', () => {
            document.addEventListener('touchmove', preventRubberBand, { passive: false });
            // Show custom numpad on focus if no keyboard is currently visible
            const numpad = document.getElementById('numpadContainer');
            const fullKb = document.getElementById('fullKeyboardContainer');
            const orderIface = document.getElementById('orderInterface');
            if (numpad.style.display === 'none' && fullKb.style.display === 'none') {
                numpad.style.display = 'grid';
                orderIface.classList.add('numpad-active');
            }
        });

        searchInput.addEventListener('blur', () => {
            document.removeEventListener('touchmove', preventRubberBand);
        });

        // Prevent custom keyboard buttons from blurring the input
        let backspaceInterval = null;

        const handleKbPress = (e) => {
            const btn = e.target.closest('.num-btn, .kb-key');
            if (btn) {
                if (e.type === 'touchstart' || e.type === 'mousedown') {
                    e.preventDefault();
                    const key = btn.getAttribute('data-key');

                    if (key) {
                        const modalInput = document.getElementById('modalInput');
                        const target = (modalInput && document.body.contains(modalInput)) ? modalInput : searchInput;

                        numInput(key, target);

                        // Repeat delete logic
                        if (key === 'back') {
                            if (backspaceInterval) {
                                if (backspaceInterval.type === 'timeout') clearTimeout(backspaceInterval.id);
                                if (backspaceInterval.type === 'interval') clearInterval(backspaceInterval.id);
                            }
                            // Initial delay before repeating
                            const timeoutId = setTimeout(() => {
                                const intervalId = setInterval(() => {
                                    numInput('back', target);
                                }, 60); // Faster repeat
                                backspaceInterval = { id: intervalId, type: 'interval' };
                            }, 500); // System-like delay
                            backspaceInterval = { id: timeoutId, type: 'timeout' };
                        }
                    } else {
                        // Handle special buttons that don't use 'data-key'
                        if (btn.classList.contains('swap-btn') || btn.classList.contains('symbol-btn')) {
                            toggleKeyboard();
                        } else if (btn.classList.contains('shift-btn')) {
                            toggleShift();
                        } else if (btn.classList.contains('return-btn')) {
                            hideKeyboard();
                        }
                    }
                } else if (e.type === 'touchend' || e.type === 'mouseup' || e.type === 'mouseleave') {
                    if (backspaceInterval) {
                        if (backspaceInterval.type === 'timeout') clearTimeout(backspaceInterval.id);
                        if (backspaceInterval.type === 'interval') clearInterval(backspaceInterval.id);
                        backspaceInterval = null;
                    }
                }
            }
        };

        document.addEventListener('touchstart', handleKbPress, { passive: false });
        document.addEventListener('mousedown', handleKbPress);
        document.addEventListener('touchend', handleKbPress);
        document.addEventListener('mouseup', handleKbPress);
        document.addEventListener('mouseleave', handleKbPress);
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
    tables.sort((a, b) => a - b).forEach((num, index) => {
        const hasOrder = (allOrders[num] && allOrders[num].length > 0);
        const card = document.createElement('div');
        card.className = `card table-card ${hasOrder ? 'has-order' : ''}`;
        card.style.animationDelay = `${index * 0.03}s`;
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


function selectTable(num) {
    currentTable = num;
    localStorage.setItem('waiterCurrentTable', num);

    const gridContainer = document.getElementById('tableGridContainer');
    const orderIface = document.getElementById('orderInterface');

    gridContainer.style.display = 'none';
    orderIface.style.display = 'flex';
    orderIface.classList.add('active');

    // Update Header
    document.getElementById('backToTablesBtn').style.display = 'flex';
    document.getElementById('deleteAllBtn').style.display = 'none';
    document.getElementById('infoBtn').style.display = 'none';
    updateHeaderTitle("Tisch " + num);

    renderOrder();
}

function updateHeaderTitle(title) {
    const el = document.getElementById('headerTitle').querySelector('.header-center');
    el.classList.add('changing');
    setTimeout(() => {
        el.innerText = title;
        el.classList.remove('changing');
    }, 150);
}




function backToTables() {
    currentTable = null;
    localStorage.removeItem('waiterCurrentTable');

    const gridContainer = document.getElementById('tableGridContainer');
    const orderIface = document.getElementById('orderInterface');

    gridContainer.style.display = 'flex'; // Ensure flex for consistency
    orderIface.style.display = 'none';
    orderIface.classList.remove('active');

    // Update Header
    document.getElementById('backToTablesBtn').style.display = 'none';
    document.getElementById('deleteAllBtn').style.display = 'flex';
    document.getElementById('infoBtn').style.display = 'flex';
    updateHeaderTitle("Tische");


    const input = document.getElementById('numSearch');
    input.value = "";
    input.inputMode = 'none';
    document.getElementById('searchResults').innerHTML = "";
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('numpadContainer').style.display = 'none';
    document.getElementById('fullKeyboardContainer').style.display = 'none';
    document.getElementById('orderInterface').classList.remove('numpad-active', 'keyboard-active');
    generateTables();
}



// ... Menu and Order logic remains similar but optimized ...
const menu = [
    // FOOD
    { id: 100, name: "CARPACCIO DI MANZO" },
    { id: 101, name: "VITELLO TONNATO" },
    { id: 102, name: "FORMAGGIO DI CAPRA" },
    { id: 103, name: "ANTIPASTO DELLA CASA" },
    { id: 104, name: "CAPRESE DI BUFALA" },
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
    { id: 200, name: "SPAGHETTI AGLIO OLIO E PEPERONCINO" },
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
    { id: 215, name: "SPAGHETTI PUTTANESCA CON TONNO" },
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
    { id: 317, name: "PIZZA TONNO E CIPOLLA" },
    { id: 324, name: "MONATS ANTIPASTI" },
    { id: 325, name: "MONATS PASTA LA FORMA" },
    { id: 326, name: "MONATS PASTA DEL MESE 1" },
    { id: 327, name: "MONATS PASTA DEL MESE 2" },
    { id: 328, name: "MONATS FISCH" },
    { id: 329, name: "MONATS FLEISCH" },
    { id: 330, name: "MONATS DESSERT" },
    { id: 400, name: "SALTIMBOCCA ALLA ROMANA" },
    { id: 401, name: "FILETTO ALLA GRIGLIA" },
    { id: 402, name: "FILETTO AL PEPE VERDE" },
    { id: 403, name: "POLLO ALLA GRIGLIA" },
    { id: 404, name: "CARRÉ DI AGNELLO" },
    { id: 405, name: "ENTRECÔTE DI MANZO" },
    { id: 406, name: "SALMONE ALLA GRIGLIA" },
    { id: 407, name: "POLPO ALLA GRIGLIA" },
    { id: 415, name: "TIRAMISU" },
    { id: 416, name: "PANNA COTTA" },
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
    { id: 14, name: "Sauvignon Blanc FLASCHE 0,75l" },
    { id: 15, name: "Scalabrone FLASCHE 0,75l" },
    { id: 20, name: "PAULANER PILS 0,3l" },
    { id: 21, name: "PAULANER PILS 0,5l" },
    { id: 22, name: "PAULANER WEISSBIER 0,3l" },
    { id: 23, name: "PAULANER WEISSBIER 0,5l" },
    { id: 26, name: "RADLER 0,3l" },
    { id: 27, name: "RADLER 0,5l" },
    { id: 31, name: "Bruciato FLASCHE 0,75l" },
    { id: 32, name: "JOHANNISBEERSAFT 0,2l" },
    { id: 33, name: "JOHANNISBEERSAFT 0,4l" },
    { id: 34, name: "PAULANER WEISSBIER ALKOHOLFREI 0,5l" },
    { id: 35, name: "PAULANER HEFEWEIZEN DUNKEL 0,5l" },
    { id: 36, name: "PAULANER PILS ALKOHOLFREI 0,33l" },
    { id: 40, name: "AQUA PANNA 0,25l" },
    { id: 41, name: "AQUA PANNA 0,75l" },
    { id: 42, name: "SAN PELLEGRINO 0,25l" },
    { id: 43, name: "SAN PELLEGRINO 0,75l" },
    { id: 44, name: "BANANENSAFT 0,2l" },
    { id: 45, name: "BANANENSAFT 0,4l" },
    { id: 46, name: "ORANGENSAFT 0,2l" },
    { id: 47, name: "ORANGENSAFT 0,4l" },
    { id: 48, name: "KIRSCHSAFT 0,2l" },
    { id: 49, name: "KIRSCHSAFT 0,4l" },
    { id: 50, name: "APFELSAFT 0,2l" },
    { id: 51, name: "APFELSAFT 0,4l" },
    { id: 52, name: "KIBA 0,2l" },
    { id: 53, name: "KIBA 0,4l" },
    { id: 54, name: "RHABARBERSAFT 0,2l" },
    { id: 55, name: "RHABARBERSAFT 0,4l" },
    { id: 56, name: "ROTWEIN 0,2l" },
    { id: 57, name: "WEISSWEIN 0,2l" },
    { id: 58, name: "ROSÉ 0,2l" },
    { id: 59, name: "FRIZZANTINO 0,2l" },
    { id: 60, name: "LAMBRUSCO 0,2l" },
    { id: 61, name: "WEISSWEINSCHORLE 0,2l" },
    { id: 62, name: "COCA COLA 0,2l" },
    { id: 63, name: "COCA COLA 0,4l" },
    { id: 64, name: "SPRITE 0,2l" },
    { id: 65, name: "SPRITE 0,4l" },
    { id: 66, name: "FANTA 0,2l" },
    { id: 67, name: "FANTA 0,4l" },
    { id: 68, name: "SPEZI 0,2l" },
    { id: 69, name: "SPEZI 0,4l" },
    { id: 70, name: "GINGER ALE 0,2l" },
    { id: 71, name: "GINGER ALE 0,4l" },
    { id: 72, name: "TONIC WATER 0,2l" },
    { id: 73, name: "TONIC WATER 0,4l" },
    { id: 74, name: "BITTER LEMON 0,2l" },
    { id: 75, name: "BITTER LEMON 0,4l" },
    { id: 80, name: "PRIMITIVO 0,2l" },
    { id: 81, name: "CHIANTI CLASSICO 0,2l" },
    { id: 82, name: "CHARDONNAY 0,2l" },
    { id: 83, name: "PINOT GRIGIO 0,2l" },
    { id: 85, name: "Vermentino FLASCHE 0,75l" },
    { id: 86, name: "Chardonnay FLASCHE 0,75l" },
    { id: 87, name: "Pinot Grigio FLASCHE 0,75l" },
    { id: 88, name: "Lagrein Rosé FLASCHE 0,75l" },
    { id: 90, name: "Chianti Classico FLASCHE 0,75l" },
    { id: 91, name: "Primitivo FLASCHE 0,75l" },
    { id: 97, name: "Lagrein Rot FLASCHE 0,75l" },
    { id: 98, name: "Insoglio FLASCHE 0,75l" },
    { id: 113, name: "Weissburgunder FLASCHE 0,75l" },
    { id: 409, name: "AMARO DEL CAPO 2cl" },
    { id: 410, name: "AMARO DEL CAPO 4cl" },
    { id: 432, name: "Sodale FLASCHE 0,75l" },
    { id: 500, name: "CAFFÈ" },
    { id: 501, name: "CAPPUCCINO" },
    { id: 502, name: "LATTE MACCHIATO" },
    { id: 503, name: "ESPRESSO" },
    { id: 504, name: "ESPRESSO DOPPIO" },
    { id: 505, name: "ESPRESSO MACCHIATO" },
    { id: 506, name: "TEE" },
    { id: 507, name: "GRAPPA 2cl" },
    { id: 508, name: "GRAPPA 4cl" },
    { id: 509, name: "LIMONCELLO 2cl" },
    { id: 510, name: "LIMONCELLO 4cl" },
    { id: 511, name: "AVERNA 2cl" },
    { id: 512, name: "AVERNA 4cl" },
    { id: 513, name: "FERNET-BRANCA 2cl" },
    { id: 514, name: "FERNET-BRANCA 4cl" },
    { id: 515, name: "SAMBUCA 2cl" },
    { id: 516, name: "SAMBUCA 4cl" },
    { id: 517, name: "Tignanello FLASCHE 0,75l" },
    { id: 519, name: "RAMAZZOTTI 4cl" },
    { id: 520, name: "RAMAZZOTTI 2cl" }
];

function searchMenu() {
    const val = document.getElementById('numSearch').value;
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "";
    resultsDiv.scrollTop = 0;

    if (!val) {
        resultsDiv.classList.remove('active');
        return;
    }

    resultsDiv.classList.add('active');
    const query = val.toLowerCase();
    const isNum = /^\d+$/.test(query);
    const currentItems = allOrders[currentTable] || [];

    let matches = [];
    if (isNum) {
        // If it's a number, only search by ID (code)
        const idQuery = query.replace(/^0+/, '');
        matches = menu.filter(item => item.id.toString().startsWith(idQuery));
    } else {
        // Otherwise search by name
        matches = menu.filter(item => item.name.toLowerCase().includes(query));
    }

    // Sort result by ID numerically: lowest number up
    matches.sort((a, b) => a.id - b.id);

    // AUTO-ADD RULE: If unique match and "obvious"
    if (matches.length === 1) {
        const item = matches[0];
        if ((isNum && item.id.toString() === query.replace(/^0+/, '')) ||
            (!isNum && query.length >= 3 && item.name.toLowerCase().startsWith(query))) {
            addToOrder(item);
            return;
        }
    }

    matches.forEach(item => {
        const orderItem = currentItems.find(i => i.id === item.id);
        const qtyLabel = orderItem ? `<span class="qty-tag">${orderItem.quantity}x</span>` : "";

        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <span class="item-id">${item.id}</span>
            <span class="item-text">${item.name}</span>
            ${qtyLabel}
        `;
        div.onclick = () => addToOrder(item);
        resultsDiv.appendChild(div);
    });
}

function toggleKeyboard() {
    const input = document.getElementById('numSearch');
    const numpad = document.getElementById('numpadContainer');
    const fullKb = document.getElementById('fullKeyboardContainer');
    const orderIface = document.getElementById('orderInterface');

    input.inputMode = 'none';

    const isNumpadVisible = numpad.style.display !== 'none';

    if (isNumpadVisible) {
        // Numpad -> Full Keyboard
        numpad.style.display = 'none';
        fullKb.style.display = 'flex';
        orderIface.classList.remove('numpad-active');
        orderIface.classList.add('keyboard-active');

        // Reset to first-letter-caps mode
        isShifted = false; // Set to false first to ensure toggleShift sets it to true correctly
        toggleShift(true);
    } else {
        // Full Keyboard -> Numpad
        fullKb.style.display = 'none';
        numpad.style.display = 'grid';
        orderIface.classList.remove('keyboard-active');
        orderIface.classList.add('numpad-active');
    }
    input.focus({ preventScroll: true });
}

function hideKeyboard() {
    document.getElementById('numpadContainer').style.display = 'none';
    document.getElementById('fullKeyboardContainer').style.display = 'none';
    document.getElementById('orderInterface').classList.remove('numpad-active', 'keyboard-active');
    document.getElementById('numSearch').blur();
}

let isShifted = true; // Start with uppercase

function toggleShift(forceState = null) {
    if (forceState !== null) {
        isShifted = forceState;
    } else {
        isShifted = !isShifted;
    }
    const btn = document.getElementById('kbShiftBtn');
    const keys = document.querySelectorAll('.kb-key:not(.shift-btn):not(.backspace-btn):not(.symbol-btn):not(.space-btn):not(.return-btn)');

    if (isShifted) {
        btn.classList.add('active-shift');
    } else {
        btn.classList.remove('active-shift');
    }

    keys.forEach(k => {
        const val = k.getAttribute('data-key');
        if (val && val.length === 1 && /[a-zA-Z]/.test(val)) {
            const newVal = isShifted ? val.toUpperCase() : val.toLowerCase();
            k.innerText = newVal;
            k.setAttribute('data-key', newVal);
        }
    });
}

function numInput(key, targetInput = null) {
    const input = targetInput || document.getElementById('numSearch');
    if (!input) return;

    if (key === 'back') {
        input.value = input.value.slice(0, -1);
    } else if (key === 'clear') {
        input.value = "";
    } else if (key === '123') {
        // Switch back to numpad (only for main search)
        if (input.id === 'numSearch') {
            document.getElementById('fullKeyboardContainer').style.display = 'none';
            document.getElementById('orderInterface').classList.remove('keyboard-active');
            document.getElementById('numpadContainer').style.display = 'grid';
            document.getElementById('orderInterface').classList.add('numpad-active');
        }
    } else {
        input.value += key;
        // Sentence case: if shifted and typed a letter, unshift
        if (isShifted && key.length === 1 && /[a-zA-Z]/.test(key)) {
            toggleShift(false);
        }
    }

    // Trigger search if it's the main search box
    if (input.id === 'numSearch') {
        searchMenu();
    }
    input.focus({ preventScroll: true });
}


function addToOrder(item) {
    if (!allOrders[currentTable]) allOrders[currentTable] = [];



    const existingEntry = allOrders[currentTable].find(i => i.id === item.id && !i.comment);
    let targetUid = null;
    if (existingEntry) {
        existingEntry.quantity = (existingEntry.quantity || 1) + 1;
        targetUid = existingEntry.uid;
    } else {
        targetUid = Date.now() + Math.random();
        allOrders[currentTable].push({
            ...item,
            quantity: 1,
            comment: "",
            uid: targetUid
        });
    }
    saveAndRender(targetUid, existingEntry ? 'update' : 'new');



    const searchInput = document.getElementById('numSearch');

    searchInput.value = "";
    document.getElementById('searchResults').innerHTML = "";
    document.getElementById('searchResults').classList.remove('active');

    // Auto-scroll to bottom of order list to see the new item adding
    setTimeout(() => {
        const list = document.getElementById('activeOrder');
        if (list) {
            list.scrollTo({
                top: list.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, 50);

    // Keep keyboard open
    // searchInput.focus(); // Removed to prevent system numpad popup
}


function updateQuantity(uid, delta) {
    const item = allOrders[currentTable].find(i => i.uid === uid);
    if (!item) return;
    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) {
        allOrders[currentTable] = allOrders[currentTable].filter(i => i.uid !== uid);
    }
    saveAndRender(uid, 'update');



    // Keep keyboard open
    // document.getElementById('numSearch').focus(); // Removed to prevent system numpad popup
}

function removeFromOrder(uid) {
    const row = document.getElementById(`row-${uid}`);
    if (row && row.parentElement) {
        const container = row.parentElement;
        container.classList.add('item-deleted');
        // Total duration is transition-normal * 2 (slideOut + collapseHeight)
        // Transition-normal is 0.25s
        setTimeout(() => {
            allOrders[currentTable] = allOrders[currentTable].filter(i => i.uid !== uid);
            saveAndRender();
        }, 500);
    } else {
        allOrders[currentTable] = allOrders[currentTable].filter(i => i.uid !== uid);
        saveAndRender();
    }
}


function saveAndRender(targetUid = null, type = null) {
    localStorage.setItem('waiterData', JSON.stringify(allOrders));
    renderOrder(targetUid, type);
    if (targetUid && type === 'update') {
        const row = document.getElementById(`row-${targetUid}`);
        if (row) {
            const badge = row.querySelector('.qty-badge');
            if (badge) {
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 300);
            }
        }
    }
}



function renderOrder(highlightUid = null, type = null) {
    const container = document.getElementById('activeOrder');
    container.innerHTML = "";
    const items = allOrders[currentTable] || [];

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:40px; color:#aaa; text-align:center; font-size: 1.1rem;">Keine Bestellung</div>';
        return;
    }

    items.forEach(item => {
        const displayId = item.id;

        const rowContainer = document.createElement('div');
        rowContainer.className = 'order-row-container';
        if (item.uid === highlightUid) {
            if (type === 'new') rowContainer.classList.add('item-new');
            if (type === 'update') rowContainer.classList.add('item-updated');
        }

        rowContainer.innerHTML = `
            <div class="order-row" id="row-${item.uid}">
                <div class="qty-badge-box" onclick="event.stopPropagation(); updateQuantity(${item.uid}, -1)">
                    <span class="qty-badge">${item.quantity}</span>
                </div>
                <div class="item-main-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-code">${displayId}</span>
                </div>
            </div>
            <div class="swipe-delete-btn" onclick="removeFromOrder(${item.uid})">Löschen</div>
        `;

        const row = rowContainer.querySelector('.order-row');


        // Single Tap to Increment
        row.onclick = (e) => {
            // If already swiped, a tap should reset it
            if (row.classList.contains('swiped')) {
                row.classList.remove('swiped');
                return;
            }
            updateQuantity(item.uid, 1);
        };

        // Swipe logic
        let touchStartX = 0;
        row.ontouchstart = (e) => {
            touchStartX = e.touches[0].clientX;
        };

        row.ontouchend = (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (diff > 40) { // Swipe left
                row.classList.add('swiped');
            } else if (diff < -40) { // Swipe right
                row.classList.remove('swiped');
            }
        };

        container.appendChild(rowContainer);
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
        <p style="margin-bottom:15px;">${message}</p>
        <input type="text" id="${inputId}" class="modal-input" style="text-align:center;" inputmode="none" autocomplete="off">
        <div class="modal-numpad">
            <button class="num-btn" data-key="1">1</button>
            <button class="num-btn" data-key="2">2</button>
            <button class="num-btn" data-key="3">3</button>
            <button class="num-btn" data-key="4">4</button>
            <button class="num-btn" data-key="5">5</button>
            <button class="num-btn" data-key="6">6</button>
            <button class="num-btn" data-key="7">7</button>
            <button class="num-btn" data-key="8">8</button>
            <button class="num-btn" data-key="9">9</button>
            <button class="num-btn" style="visibility:hidden;"></button>
            <button class="num-btn" data-key="0">0</button>
            <button class="num-btn delete" data-key="back">⌫</button>
        </div>
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
        <input type="text" id="${inputId}" class="modal-input" style="text-align:center;" autocomplete="off">
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
            // Force keyboard dismissal
            if (document.activeElement) document.activeElement.blur();
            container.removeChild(overlay);
        };
        footer.appendChild(b);
    });

    overlay.appendChild(modal);
    container.appendChild(overlay);

    // Handle 'Enter' key
    const input = modal.querySelector('input');
    if (input) {
        setTimeout(() => input.focus(), 50);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const primaryBtn = buttons.find(b => b.primary);
                if (primaryBtn && primaryBtn.onClick) {
                    primaryBtn.onClick();
                    if (document.activeElement) document.activeElement.blur();
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
