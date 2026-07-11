// ==UserScript==
// @name        Truppen produktion
// @icon                https://dscs.innogamescdn.com/asset/4d47dbcf/graphic//buildings/barracks.png
// @match     https://*&screen=train*
// @match     https://*&screen=barracks*
// @match     https://*&screen=stable*
// @match     https://*&screen=garage*
// @match     https://csc1.divokekmeny.cz/game.php?village=68&screen=train
// @match https://*.divokekmeny.cz/game.php?*screen=train*
// @match https://*.divokekmeny.cz/game.php?*screen=barracks*
// @match https://*.divokekmeny.cz/game.php?*screen=stable*
// @match https://*.plemiona.pl/game.php?*screen=train*
// @match https://*.plemiona.pl/game.php?*screen=barracks*
// @match https://*.plemiona.pl/game.php?*screen=stable*
// @match https://*.die-staemme.de/game.php?*screen=train*

// ==/UserScript==

(async (ModuleLoader, unitConfig) => {
    'use strict';

    if (new URLSearchParams(location.search).get('screen') !== 'train') return;
    const guardAction = window.DSGuards?.guardAction || ((fn) => {
        fn();
        return true;
    });

    //****************************** Nastavení ******************************//
    const reloadInterval = 250000 // 2000 milisekund jsou dvě vteřiny např. pro 5 minut stačí napsat do google 5 minutes to ms = 300000 a každých 5 minut to zadá do fronty požadované jednotky
    const minimumQueueSize = 2; // maximální fronta tzn 15x zadání jednotky, jakmile se něco dostaví přidá to do fronty.
    //*************************** Konec nastavení ***************************//

    // Nastavení pro zobrazení jednotek při rekrutaci
    $("#content_value > p").append($(unitConfig));


    await ModuleLoader.loadModule('utils/notify-utils');
    await ModuleLoader.loadModule('utils/config-utils');


    TwFramework.setIdleTitlePreffix('Rekrutuji jednotky', document.title);

    const addGlobalStyle = (css) => {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    addGlobalStyle('#CR-rtable td {text-align:center;} #CR-rtable #un_qtds td {width:20px;} .CR-rcontainer {padding: 20px 0px; margin: 0;} input.CR-ri{width: 50px;}');

    let unitData = {
        'spear': 0,
        'sword': 0,
        'axe': 1,
        'spy': 0,
        'light': 1,
        'heavy': 0,
        'ram': 1,
        'catapult': 0,
        'snob': 0
    };

    // Try to recruit
    const _recruitIfPossible = () => {
        // if not active, abort!
        if (TwFramework.readConfiguration('CR_active', 2) != 1) {
            return;
        }
        let canRecruit = false;
        Object.keys(unitData)
            .filter(e => unitData[e] > 0)
            .forEach(key => {
                // Initialize input variable
                const input = $(`input[name="${key}"]`);
                if (!input.length) {
                    return;
                }
                input.val('');
                // If there's no recruit order already on the queue
                if ($(`.unit_sprite_smaller.${key}`).length < minimumQueueSize) {
                    input.val(unitData[key]);
                    // Can recruit!
                    if (input[0].style.color === 'black') {
                        canRecruit = true;
                    } else if (input[0].style.color === 'red') {
                        input.val('');
                    }
                }
            });

        if (canRecruit) {
            guardAction(() => $(".btn-recruit").click());
        }
    };

    // Update the UI with the data
    const _updateUI = () => {
        Object.keys(unitData).forEach(key => {
            $(`#CR-u-${key}`).val(unitData[key] > 0 ? unitData[key] : '');
        });
    };

    const _loadButtonLiterals = () => {
        if (TwFramework.readConfiguration('CR_active', 2) == 1) {
            $('#CR-toggle-btn').text('Stoppen');
        } else {
            $('#CR-toggle-btn').text('Rekrutieren');
        }
    };

    $(() => {
        unitData = TwFramework.readConfiguration('CR_unitData', unitData);
        _updateUI();
        Object.keys(unitData).forEach(key => {
            // Updates value on memory
            $(`#CR-u-${key}`).change(evt => {
                unitData[key] = evt.target.value;
            })
        });

        // Writes everything on the screen
        $('input.btn.btn-recruit').click(() => {
            setTimeout(() => {
                unitData = TwFramework.readConfiguration('CR_unitData', unitData);
                _updateUI();
            }, 500);
        });

        // Saves on the localStorage
        $('#CR-save-btn').click(() => {
            TwFramework.saveConfiguration('CR_unitData', unitData);
            UI.Notification.show("https://th.bing.com/th/id/OIP.5R-ae5VM-10Ijm1Dxd7QdAHaHY?pid=Api&rs=1", 'Done!', 'Settings saved successfully!');
        })

        // Start/Stop button
        $('#CR-toggle-btn').click(() => {
            // Toggle current status
            if (TwFramework.readConfiguration('CR_active', 2) == 1) {
                TwFramework.saveConfiguration('CR_active', 2);
            } else TwFramework.saveConfiguration('CR_active', 1);
            _loadButtonLiterals();
        })

        // Run
        _loadButtonLiterals();
        _recruitIfPossible();
    });

    // Loop to check if can recruit
    setInterval(() => guardAction(() => location.reload(true)), reloadInterval);

    // border: 3px solid #e5c27e;
    // border-radius: 22px;
    // padding: 0px 8px;
    // margin-top: 5px;
})({
    // ModuleLoader functions
    loadModule: moduleName => {
        return new Promise((resolve, reject) => {
            const modulePath = moduleName.replace('.', '/');
            const moduleUrl = `https://raw.githubusercontent.com/joaovperin/TribalWars/master/Modules/${modulePath}.js`;
            console.debug('[TwScripts] Loading ', modulePath, ' from URL ', moduleUrl, '...');
            return $.ajax({
                    method: "GET",
                    url: moduleUrl,
                    dataType: "text"
                }).done(res => resolve(eval(res)))
                .fail(req => reject(console.error("[TwScripts] Fail loading module '", moduleName, "'.")));
        })
    }
}, `<div class="CR-rcontainer"><h3>Automatischer Einheitenaufbau</h3>
<table id="CR-rtable" style="margin-bottom: 10px" class="vis" width="100%">
    <tbody>
        <tr>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="spear"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_spear.png" title="Spear fighter" alt="Spear"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="sword"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_sword.png" title="Swordsman" alt="Sword"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="axe"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_axe.png" title="Axeman" alt="Axe"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="spy"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_spy.png" title="Scout" alt="Scout"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="light"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_light.png" title="Light cavalry" alt="Light Cavalry"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="heavy"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_heavy.png" title="Heavy cavalry" alt="Heavy Cavalry"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="ram"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_ram.png" title="Ram" alt="Ram"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="catapult"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_catapult.png" title="Catapult" alt="Catapult"></a>
            </th>
            <th style="text-align:center">
                <a href="#" class="unit_link" data-unit="snob"><img src="https://dsen.innogamescdn.com/asset/10d39b3d/graphic/unit/unit_snob.png" title="Nobleman" alt="Nobleman"></a>
            </th>
        </tr>
        <tr id="un_qtds">
            <td class="unit-item unit-item-spear hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-spear"></td>
            <td class="unit-item unit-item-sword hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-sword"></td>
            <td class="unit-item unit-item-axe hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-axe"></td>
            <td class="unit-item unit-item-spy hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-spy"></td>
            <td class="unit-item unit-item-light hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-light"></td>
            <td class="unit-item unit-item-heavy hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-heavy"></td>
            <td class="unit-item unit-item-ram hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-ram"></td>
            <td class="unit-item unit-item-catapult hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-catapult"></td>
            <td class="unit-item unit-item-snob hidden"><input maxlenght="5" class="CR-ri recruit_unit" type="number" id="CR-u-snob"></td>
        </tr>
    </tbody>
</table>
<button id='CR-toggle-btn' class='btn'>Rekrutieren</button>
<button id='CR-save-btn' class='btn'>Auflegen</button>
</div>`);
