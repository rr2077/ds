// ==UserScript==
// @name         DS BM
// @version      8.7.0
// @description  Ausbau Dörferübersicht
// @author       Ruberto
// @match        https://*.die-staemme.de/game.php?*&screen=overview_villages&mode=buildings*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const params = new URLSearchParams(location.search);
    if (
        params.get('screen') !== 'overview_villages' ||
        params.get('mode') !== 'buildings'
    ) return;
    const guardAction = window.DSGuards?.guardAction || ((fn) => {
        fn();
        return true;
    });

    if (typeof $ === 'undefined' || typeof UI === 'undefined' || typeof game_data === 'undefined') {
        return;
    }

    // ---------- Utility ----------
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const rid = (p='id_') => p + Math.random().toString(36).slice(2,8);

    // ---------- TM-Storage Helpers ----------
    const KEY_STATUS   = 'overviewBuilderStatus';
    const KEY_TEMPLATE = 'sequentialBuildTemplate';

    const getVal = (k, d) => { try { const v = GM_getValue(k); return (v === undefined ? d : v); } catch { return d; } };
    const setVal = (k, v) => { try { GM_setValue(k, v); } catch {} };

    const defaultBuildTemplate = 'place:1,farm:1,main:1,main:2,main:3,main:4,main:5,farm:2,farm:3,storage:1,storage:2,wood:1,stone:1,iron:1,wood:2,stone:2,wood:3,stone:3,iron:2,wood:4,stone:4,iron:3,wood:5,stone:5,iron:4,stone:6,wood:6,iron:5,wood:7,stone:7,wood:8,stone:8,iron:6,wood:9,stone:9,wood:10,stone:10,main:6,main:7,main:8,main:9,main:10,farm:4,farm:5,farm:6,farm:7,farm:8,storage:3,storage:4,barracks:1,barracks:2,barracks:3,barracks:4,barracks:5,wood:11,stone:11,storage:5,storage:6,iron:7,wood:12,stone:12,iron:8,stone:13,wood:13,iron:9,stone:14,stone:15,storage:7,storage:8,wood:14,iron:10,stone:16,storage:9,storage:10,wood:15,iron:11,stone:17,main:11,main:12,main:13,main:14,wood:16,iron:12,stone:18,main:15,main:16,wood:17,iron:13,wood:18,stone:19,farm:9,farm:10,storage:11,storage:12,main:17,main:18,iron:14,stone:20,storage:13,storage:14,main:19,main:20,storage:15,storage:16,wood:19,storage:17,storage:18,iron:15,stone:21,storage:19,storage:20,main:21,main:22,farm:11,farm:12,barracks:6,barracks:7,barracks:8,barracks:9,barracks:10,wall:1,wall:2,wall:3,wall:4,wall:5,farm:13,farm:14,smith:1,smith:2,smith:3,smith:4,smith:5,farm:15,farm:16,smith:6,smith:7,smith:8,smith:9,smith:10,stable:1,stable:2,stable:3,market:1,market:2,market:3,market:4,market:5,storage:21,storage:22,storage:23,storage:24,storage:25,stone:22,wood:20,iron:16,wood:21,stone:23,iron:17,wood:22,stone:24,iron:18,iron:19,wood:23,stone:25,iron:20,wood:24,stone:26,iron:21,market:6,market:7,market:8,market:9,market:10,wood:25,stone:27,iron:22,wood:26,stone:28,farm:17,farm:18,iron:23,wood:27,stone:29,iron:24,market:11,market:12,market:13,market:14,market:15,farm:19,farm:20,farm:21,farm:22,stone:30,wood:28,wood:29,iron:25,iron:26,wood:30,iron:27,iron:28,iron:29,farm:23,farm:24,iron:30,wall:6,wall:7,wall:8,wall:9,wall:10,market:16,market:17,market:18,market:19,market:20,farm:25,farm:26,farm:27,farm:28,farm:29,farm:30,barracks:11,barracks:12,barracks:13,barracks:14,barracks:15,barracks:16,barracks:17,barracks:18,barracks:19,barracks:20,wall:11,wall:12,wall:13,wall:14,wall:15,wall:16,wall:17,wall:18,wall:19,wall:20,stable:4,stable:5,stable:6,stable:7,stable:8,stable:9,stable:10,stable:11,stable:12,stable:13,stable:14,stable:15,garage:1,garage:2,garage:3,garage:4,garage:5,smith:11,smith:12,smith:13,smith:14,smith:15,storage:26,smith:16,smith:17,smith:18,smith:19,smith:20,storage:27,storage:28,storage:29,storage:30,garage:6,garage:7,garage:8,garage:9,garage:10,snob:1,barracks:21,barracks:22,barracks:23,barracks:24,barracks:25,stable:16,stable:17,stable:18,stable:19,stable:20';

    let scriptStatus = getVal(KEY_STATUS, 'stopped') === 'running';

    // ---------- UI ----------
    const UI_IDS = {
        container: rid('builder_'),
        startStop: rid('btn_'),
        tplInput:  rid('tpl_'),
        saveBtn:   rid('save_'),
        loadBtn:   rid('def_'),
        statusBox: rid('stat_')
    };

    function createUI() {
        const contentBox = document.getElementById('content_value');
        if (!contentBox || document.getElementById(UI_IDS.container)) { return; }
        const uiDiv = document.createElement('div');
        uiDiv.id = UI_IDS.container;
        uiDiv.className = 'vis';
        uiDiv.style.padding = '10px';
        uiDiv.style.marginBottom = '10px';
        uiDiv.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <h3 style="margin:0;font-weight:600">Bau-Plan</h3>
                <button id="${UI_IDS.startStop}" class="btn" style="font-size:14px;padding:5px 10px;"></button>
            </div>
            <b>Sequenzielle Vorlage (z.B. main:1, place:1, ...):</b>
            <textarea id="${UI_IDS.tplInput}" style="width: 98%; margin: 5px 0;" rows="5">${getVal(KEY_TEMPLATE, defaultBuildTemplate)}</textarea>
            <div style="display:flex;gap:10px;align-items:center">
              <button id="${UI_IDS.saveBtn}" class="btn">Vorlage speichern</button>
              <button id="${UI_IDS.loadBtn}" class="btn">Standard laden</button>
            </div>
            <div id="${UI_IDS.statusBox}" style="margin-top: 10px; border: 1px solid #c1a264; padding: 5px; min-height: 20px; background-color: #f4e4bc;"></div>
        `;
        contentBox.prepend(uiDiv);
        updateButtonAndStatus();
    }

    function logStatus(message, isError = false) {
        const statusLog = document.getElementById(UI_IDS.statusBox);
        if (statusLog) {
            statusLog.textContent = `Status: ${message}`;
            statusLog.style.color = isError ? '#ac3939' : 'black';
        }
    }

    function updateButtonAndStatus() {
        const btn = document.getElementById(UI_IDS.startStop);
        if (!btn) return;
        if (scriptStatus) {
            btn.textContent = 'Stop';
            btn.style.backgroundColor = '#f44336';
            logStatus('Skript ist aktiv. Prozess startet in Kürze...');
        } else {
            btn.textContent = 'Start';
            btn.style.backgroundColor = '#4CAF50';
            logStatus('Skript ist gestoppt.');
        }
    }

    function parseTemplate() {
        const templateString = document.getElementById(UI_IDS.tplInput).value.trim();
        const parts = templateString.split(',').map(p => p.trim());
        const template = [];
        for (const part of parts) {
            const [building, level] = part.split(':');
            if (building && !isNaN(parseInt(level))) {
                template.push({ building: building.trim().toLowerCase(), level: parseInt(level) });
            }
        }
        return template;
    }

    function findMainVillageTable() {
        return document.getElementById('villages');
    }

    // ---------- Kontrollschleife ----------
    function startProcess() {
        if (!scriptStatus) return;
        const initialDelay = Math.floor(Math.random() * 1500) + 1500;
        logStatus(`Warte ${Math.round(initialDelay / 1000)} Sekunden...`);
        setTimeout(function() {
            if (!scriptStatus) return;
            logStatus("Aktiviere Baumodus...");
            const buildMenu = document.querySelector('#overview_menu td:nth-child(7)');
            if (buildMenu && !buildMenu.classList.contains('selected')) {
                logStatus("FEHLER: Nicht in der Gebäudeübersicht.", true);
                return;
            }
            guardAction(() => $('#get_all_possible_build').click());
            logStatus("Warte auf Tabellen-Aktualisierung...");
            setTimeout(function() {
                if (!scriptStatus) return;
                const mainTable = findMainVillageTable();
                if (mainTable) {
                    logStatus("Analysiere Dörfer...");
                    analyzeAndBuild(mainTable);
                } else {
                    logStatus("FEHLER: Dörfer-Tabelle nicht gefunden.", true);
                }
            }, 1500);
        }, initialDelay);
    }

    // ---------- Logik ----------
    async function analyzeAndBuild(mainTable) {
        const template = parseTemplate();
        const queueLimit = game_data.features.Premium.active ? 5 : 2;
        const maxJobsPerRun = 8; // Begrenzung Klicks pro Durchlauf (Sicherheit gegen Bot-Detection)
        let jobsDoneThisRun = 0;

        if (template.length === 0) { logStatus("FEHLER: Bau-Vorlage ist ungültig oder leer.", true); return; }

        const villageRows = mainTable.querySelectorAll(':scope > tbody > tr[id^="v_"], :scope > tr[id^="v_"]');
        logStatus(`Analysiere ${villageRows.length} Dörfer...`);

        for (const row of villageRows) {
            if (jobsDoneThisRun >= maxJobsPerRun) break;

            const villageId = row.getAttribute('id').replace('v_', '');
            const lastCell = row.querySelector(':scope > td:last-child');

            // Ermittle aktuelle Queue-Größe aus dem Dorf
            const currentQueueCount = lastCell.querySelector(':scope > ul')?.children.length || 0;
            if (currentQueueCount >= queueLimit) {
                continue;
            }

            // Schleife durch die Bauvorlage für dieses Dorf
            for (const step of template) {
                const buildingName = step.building;
                const requiredLevel = step.level;

                // Korrektur: Nutze den spezifischen Klassen-Selektor aus Skript 2
                const cell = row.querySelector(`:scope > .b_${buildingName}`);
                if (!cell) continue;

                let currentLevel = parseInt(cell.textContent, 10) || 0;

                // Beachte bereits in der Warteschlange befindliche Gebäude
                const queueIcons = lastCell.querySelectorAll('.queue_icon img');
                queueIcons.forEach(img => {
                    if (img.src.indexOf(buildingName) > 0) {
                        currentLevel++;
                    }
                });

                // Wenn das Ziel-Level noch nicht erreicht ist
                if (currentLevel < requiredLevel) {
                    const buildLink = cell.querySelector(':scope > a');
                    if (buildLink && cell.childElementCount > 0) {
                        logStatus(`Dorf ${villageId}: Klicke '${buildingName}' auf Stufe ${currentLevel + 1}...`);
                        if (guardAction(() => buildLink.click())) {
                            jobsDoneThisRun++;
                        }

                        // Anti-Burst: Kleine, zufällige Pause zwischen den Klicks (300-700ms)
                        await sleep(rand(300, 700));
                    }
                    break; // Nächstes Dorf prüfen (nur 1 Klick pro Dorf pro Schleifendurchlauf)
                }
            }
        }

        // Intelligente Neulade-Intervalle gegen permanentes Spammen
        let reloadDelay;
        if (jobsDoneThisRun > 0) {
            // Wenn gebaut wurde: Nächster Check in ca. 2 bis 4 Minuten
            reloadDelay = rand(120, 240) * 1000;
            logStatus(`${jobsDoneThisRun} Bauaufträge erteilt. Nächster Durchlauf in ca. ${Math.round(reloadDelay / 1000)} Sek.`);
        } else {
            // Wenn nichts zu tun war: Nächster Check in ca. 5 bis 10 Minuten
            reloadDelay = rand(300, 600) * 1000;
            logStatus(`Keine ausbaubaren Gebäude gefunden. Ruhezustand für ca. ${Math.round(reloadDelay / 60000)} Min.`);
        }

        setTimeout(function() {
            if(getVal(KEY_STATUS, 'stopped') === 'running') {
                guardAction(() => window.location.reload());
            }
        }, reloadDelay);
    }

    function attachEventListeners() {
        document.getElementById(UI_IDS.saveBtn).addEventListener('click', function() {
            setVal(KEY_TEMPLATE, document.getElementById(UI_IDS.tplInput).value);
            UI.SuccessMessage('Vorlage gespeichert!');
        });
        document.getElementById(UI_IDS.loadBtn).addEventListener('click', function() {
            document.getElementById(UI_IDS.tplInput).value = defaultBuildTemplate;
            UI.SuccessMessage('Standard-Vorlage geladen.');
        });
        document.getElementById(UI_IDS.startStop).addEventListener('click', function() {
            scriptStatus = !scriptStatus;
            setVal(KEY_STATUS, scriptStatus ? 'running' : 'stopped');
            updateButtonAndStatus();
            if (scriptStatus) {
                startProcess();
            }
        });
    }

    // --- Start ---
    createUI();
    attachEventListeners();

    if (scriptStatus) {
        startProcess();
    }
})();
