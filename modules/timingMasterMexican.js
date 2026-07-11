// ==UserScript==
// @name         DS TM - Mexikaner Edition
// @version      3.6
// @description  DS TM
// @author       Ruberto / Optimized
// @match        https://*.die-staemme.de/game.php?*screen=place&try=confirm*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const params = new URLSearchParams(location.search);
    if (params.get('screen') !== 'place' || params.get('try') !== 'confirm') return;
    const guardAction = window.DSGuards?.guardAction || ((fn) => {
        fn();
        return true;
    });

    let inputMs;
    let input;
    let delay;
    let arrInterval;
    let attInterval;

    // Countdown-Variablen
    function nowHi() { return performance.now(); }
    let countdownInterval;
    let clickEta = null;
    let activeMode = null;
    let lastTick = 0;
    let estRemaining = 0;

    // Random-ID
    const randId = (p='i') => p + Math.random().toString(36).slice(2,9);

    // IDs
    const ID = {
        arrivalTimeInput:  'arrival_time_input',
        arrivalMsInput:    'arrival_ms_input',
        sendTimeInput:     'send_time_input',
        sendMsInput:       'send_ms_input',
        delayInput:        'delayInput',
        delayButton:       'delayButton',
        setArrivalBtn:     'setArrivalBtn',
        setSendBtn:        'setSendBtn',
        showArrTime:       'showArrTime',
        showSendTime:      'showSendTime',
        incomingsDiv:      'incomings_container',
        makeCountdownSpan: () => randId('cd_'),
    };

    // Offset laden
    let delayTime = parseInt(localStorage.getItem('delayTime_combined'));
    if (isNaN(delayTime)) {
        delayTime = 200;
    }

    // UI (Überschrift entfernt)
    const mainUI = `
        <table class="vis" style="width: 100%; margin-top: 10px; border: 2px solid #7d510f;">
            <tbody>
                <tr>
                    <td>Ankunftszeit:</td>
                    <td>
                        <input type="time" id="${ID.arrivalTimeInput}" step="1" style="width: 100px;">
                        <input type="number" id="${ID.arrivalMsInput}" min="0" max="999" placeholder="ms" style="width: 50px;">
                    </td>
                    <td><a id="${ID.setArrivalBtn}" class="btn">Setzen</a></td>
                </tr>
                <tr>
                    <td>Sendezeit:</td>
                    <td>
                        <input type="time" id="${ID.sendTimeInput}" step="1" style="width: 100px;">
                        <input type="number" id="${ID.sendMsInput}" min="0" max="999" placeholder="ms" style="width: 50px;">
                    </td>
                    <td><a id="${ID.setSendBtn}" class="btn">Setzen</a></td>
                </tr>
                <tr>
                    <td>Offset (ms):</td>
                    <td colspan="2">
                        <input id="${ID.delayInput}" value="${delayTime}" style="width: 50px;">
                        <a id="${ID.delayButton}" class="btn">OK</a>
                    </td>
                </tr>
                <tr>
                    <td>Ziel Ankunft:</td>
                    <td colspan="2" id="${ID.showArrTime}"><em>--:--:--.---</em></td>
                </tr>
                <tr>
                    <td>Ziel Senden:</td>
                    <td colspan="2" id="${ID.showSendTime}"><em>--:--:--.---</em></td>
                </tr>
            </tbody>
        </table>
        <div id="${ID.incomingsDiv}" style="margin-top: 10px;"></div>
        <style>
            .command-row.selected-command td { background-color: #ffe65f !important; }
        </style>
    `;

    // UI einfügen
    const confirmationForm = document.getElementById('command-data-form');
    if(confirmationForm) {
        confirmationForm.insertAdjacentHTML('afterend', mainUI);
    }

    // Vorausfüllen
    const relativeTimeElem = document.querySelector(".relative_time");
    if(relativeTimeElem) {
        document.getElementById(ID.arrivalTimeInput).value = relativeTimeElem.textContent.slice(-8);
    }
    const serverTimeElem = document.getElementById("serverTime");
    if(serverTimeElem) {
        document.getElementById(ID.sendTimeInput).value = serverTimeElem.textContent;
    }

    // --- Core Funktionen ---

    // Performance-Funktion: Versteckt die Tabelle und zeigt "Mexikaner regelt"
    function freezeUI() {
        const container = document.getElementById(ID.incomingsDiv);
        if (container) {
            container.innerHTML = '<div style="padding:10px; background:#dec6aa; text-align:center; font-weight:bold; font-size:14px; border:1px solid #7d510f;">Mexikaner regelt</div>';
        }
    }

    // Funktion zum Abschicken (Wieder sicher per CLICK)
    function triggerAttack() {
        const btn = document.getElementById("troop_confirm_submit");
        if (btn) {
            if (guardAction(() => btn.click())) {
                document.title = 'CLICKED!';
            }
        } else {
            console.error("Button nicht gefunden!");
        }
    }

    function parseHMS(str) {
        const [h, m, s] = (str || '').trim().split(':').map(Number);
        if ([h, m, s].some(n => isNaN(n))) return 0;
        return ((h * 60 + m) * 60 + s) * 1000;
    }

    function formatCountdown(ms) {
        if (ms < 0) ms = 0;
        ms = Math.floor(ms);
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const x = Math.floor(ms % 1000);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;
    }

    function updateCountdownUI(remaining, spanId) {
        const span = document.getElementById(spanId);
        if (remaining <= 0) {
            if (span) span.textContent = '🚀 GO!';
            document.title = 'GO';
        } else {
            const txt = formatCountdown(remaining);
            if (span) span.textContent = '⏳ ' + txt;
            document.title = txt;
        }
    }

    function initialEstimate() {
        if (!input) return 0;
        const targetMs = parseHMS(input);
        let nowHMS;
        if (activeMode === 'send') {
            const st = document.getElementById('serverTime');
            if (!st) return 0;
            nowHMS = parseHMS(st.textContent);
        } else {
            const rel = document.querySelector('.relative_time');
            if (!rel) return 0;
            nowHMS = parseHMS(rel.textContent.slice(-8));
        }
        let preCross = targetMs - nowHMS;
        if (preCross < 0) preCross = 0;
        const delayInt = parseInt(delay) || 0;
        return preCross + delayInt;
    }

    let currentCdSpanId = null;

    function startCountdown() {
        clearInterval(countdownInterval);
        clickEta = null;
        estRemaining = initialEstimate();
        lastTick = nowHi();

        // Hier wird die Liste ausgeblendet ("Mexikaner regelt")
        freezeUI();

        countdownInterval = setInterval(() => {
            const t = nowHi();
            const dt = t - lastTick;
            lastTick = t;

            if (clickEta) {
                estRemaining = clickEta - Date.now();
            } else {
                estRemaining -= dt;
                if ((t % 250) < 20) {
                    const fresh = initialEstimate();
                    estRemaining = 0.6 * estRemaining + 0.4 * fresh;
                }
            }
            updateCountdownUI(estRemaining, currentCdSpanId);
        }, 16);
    }

    function markClickScheduled() {
        clickEta = Date.now() + (parseInt(delay) || 0);
    }

    function setArrivalTime() {
        clearInterval(arrInterval);
        clearInterval(attInterval);
        clickEta = null;
        let arrivalTime;
        arrInterval = setInterval(function() {
            const relEl = document.querySelector(".relative_time");
            if(!relEl) return;
            arrivalTime = relEl.textContent;
            if (arrivalTime.slice(-8) >= input) {
                markClickScheduled();
                setTimeout(() => triggerAttack(), delay);
                clearInterval(arrInterval);
            }
        }, 5);
    }

    function setSendTime() {
        clearInterval(arrInterval);
        clearInterval(attInterval);
        clickEta = null;
        let serverTime;
        attInterval = setInterval(function() {
            const servEl = document.getElementById("serverTime");
            if(!servEl) return;
            serverTime = servEl.textContent;
            if (serverTime >= input) {
                markClickScheduled();
                setTimeout(() => triggerAttack(), delay);
                clearInterval(attInterval);
            }
        }, 5);
    }

    function setAttackTime(timeStr, ms) {
        input = timeStr;
        inputMs = ms;
        delay = parseInt(delayTime) + parseInt(inputMs);

        currentCdSpanId = ID.makeCountdownSpan();
        document.getElementById(ID.showArrTime).innerHTML =
            `<strong>${input}:${String(inputMs).padStart(3, "0")}</strong> <span id="${currentCdSpanId}" style="margin-left:6px;color:#555;"></span>`;
        document.getElementById(ID.showSendTime).innerHTML = `<em>--:--:--.---</em>`;

        activeMode = 'arrival';
        startCountdown();
        setArrivalTime();
    }

    // Event Listener
    document.getElementById(ID.setArrivalBtn).onclick = function() {
        const timeValue = document.getElementById(ID.arrivalTimeInput).value;
        const msValue = parseInt(document.getElementById(ID.arrivalMsInput).value) || 0;
        if (timeValue) setAttackTime(timeValue, msValue);
    };

    document.getElementById(ID.setSendBtn).onclick = function() {
        const timeValue = document.getElementById(ID.sendTimeInput).value;
        const msValue = parseInt(document.getElementById(ID.sendMsInput).value) || 0;
        if (timeValue) {
            clearInterval(arrInterval);
            input = timeValue;
            inputMs = msValue;
            delay = parseInt(delayTime) + parseInt(inputMs);
            currentCdSpanId = ID.makeCountdownSpan();
            document.getElementById(ID.showSendTime).innerHTML =
                `<strong>${input}:${String(inputMs).padStart(3, "0")}</strong> <span id="${currentCdSpanId}" style="margin-left:6px;color:#555;"></span>`;
            document.getElementById(ID.showArrTime).innerHTML = `<em>--:--:--.---</em>`;
            activeMode = 'send';
            startCountdown();
            setSendTime();
        }
    };

    document.getElementById(ID.delayButton).onclick = function() {
        delayTime = parseInt(document.getElementById(ID.delayInput).value) || 0;
        localStorage.setItem('delayTime_combined', delayTime);
        if (input && !isNaN(inputMs)) {
            delay = parseInt(delayTime) + parseInt(inputMs);
        }
        alert(`Offset auf ${delayTime}ms gespeichert.`);
    };

    // --- Incomings Modul ---
    const Incomings = {
        init: function() {
            const anchor = document.querySelector("#command-data-form .village_anchor a");
            if(!anchor) return;

            /* global $ */

            const villageUrl = anchor.href;
            const durationEl = $('#date_arrival span');
            if(!durationEl.length) return;

            const duration = durationEl.data('duration') * 1000;

            $.get(villageUrl).done((html) => {
                const commandsTable = $(html).find('.commands-container');
                if (commandsTable.length > 0) {
                    commandsTable.find('tr:first').append('<th>Senden in</th>');

                    commandsTable.find('tr.command-row').each(function() {
                        const isReturning = $(this).find('img[src*="/return_"], img[src*="/back.png"]').length > 0;
                        if(isReturning) {
                             $(this).remove();
                             return;
                        }

                        $(this).css('cursor', 'pointer');
                        const arrivalSpan = $(this).find('td:last span');
                        const arrivalTimeMs = arrivalSpan.data('endtime') * 1000;
                        const sendTimeMs = arrivalTimeMs - duration;

                        $(this).append(`<td class="sendTime"><b><span class="timer" style="color: darkblue" data-endtime="${sendTimeMs / 1000}"></span></b></td>`);

                        $(this).on('click', function() {
                            $('.command-row').removeClass('selected-command');
                            $(this).addClass('selected-command');

                            const arrivalDate = new Date(arrivalTimeMs);
                            const timeString = arrivalDate.toLocaleTimeString('de-DE', { hour12: false });
                            const milliseconds = arrivalDate.getMilliseconds();

                            document.getElementById(ID.arrivalTimeInput).value = timeString;
                            document.getElementById(ID.arrivalMsInput).value = milliseconds;
                        });
                    });

                    $(`#${ID.incomingsDiv}`).append(commandsTable);

                    if (window.Timing && window.Timing.tickHandlers && window.Timing.tickHandlers.timers) {
                        window.Timing.tickHandlers.timers.init();
                    }
                }
            });
        }
    };

    Incomings.init();
})();
