/* * HAUPTLOGIK DG-CHECKER
 * Version Final
 */

const dataLoader = new DataLoader();

const HAZARD_LABELS = {
    "2.1": "img/class_2.1.png",
    "2.2": "img/class_2.2.png",
    "2.3": "img/class_2.3.png",
    "3":   "img/class_3.png",
    "4.1": "img/class_4.1.png",
    "4.2": "img/class_4.2.png",
    "4.3": "img/class_4.3.png",
    "5.1": "img/class_5.1.png",
    "5.2": "img/class_5.2.png",
    "6.1": "img/class_6.1.png",
    "6.2": "img/class_6.2.png",
    "8":   "img/class_8.png",
    "9":   "img/class_9.png"
};
const LABEL_CAO = "img/cao.png";

document.addEventListener('DOMContentLoaded', async () => {
    const success = await dataLoader.loadAllData();
    if (success) {
        fillUnDatalist();
        setupEventListeners();
        addQItemRow();
        addPkgRow();
    }
});

function fillUnDatalist() {
    const unList = document.getElementById('un-list');
    const unNumbers = dataLoader.getAllUNNumbers();
    unNumbers.forEach(un => {
        const option = document.createElement('option');
        option.value = un;
        unList.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('btn-single-check').addEventListener('click', () => switchTab('single'));
    document.getElementById('btn-q-calc').addEventListener('click', () => switchTab('q-calc'));
    document.getElementById('btn-pack-gen').addEventListener('click', () => switchTab('pack-gen'));
    document.getElementById('form-single-check').addEventListener('submit', handleSingleCheck);
    document.getElementById('btn-add-item').addEventListener('click', addQItemRow);
    document.getElementById('btn-calc-q').addEventListener('click', calculateQValue);
    document.getElementById('btn-add-pkg').addEventListener('click', addPkgRow);
    document.getElementById('btn-gen-text').addEventListener('click', generatePkgText);
    document.getElementById('btn-copy-text').addEventListener('click', copyPkgText);
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    window.onclick = function(event) { if (event.target == document.getElementById('pi-modal')) closeModal(); }
}

function switchTab(mode) {
    document.getElementById('section-single-check').classList.add('hidden');
    document.getElementById('section-q-calc').classList.add('hidden');
    document.getElementById('section-pack-gen').classList.add('hidden');
    document.getElementById('btn-single-check').classList.remove('active');
    document.getElementById('btn-q-calc').classList.remove('active');
    document.getElementById('btn-pack-gen').classList.remove('active');

    if (mode === 'single') {
        document.getElementById('section-single-check').classList.remove('hidden');
        document.getElementById('btn-single-check').classList.add('active');
    } else if (mode === 'q-calc') {
        document.getElementById('section-q-calc').classList.remove('hidden');
        document.getElementById('btn-q-calc').classList.add('active');
    } else if (mode === 'pack-gen') {
        document.getElementById('section-pack-gen').classList.remove('hidden');
        document.getElementById('btn-pack-gen').classList.add('active');
    }
}

function handleSingleCheck(event) {
    event.preventDefault(); 
    const unNumber = document.getElementById('un-number').value.trim();
    let packingGroupInput = document.getElementById('packing-group').value; 
    const netQtyInput = parseFloat(document.getElementById('net-qty').value);
    const unit = document.getElementById('qty-unit').value; 
    const resultContainer = document.getElementById('result-container');
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = ''; 

    if (!unNumber || packingGroupInput === "" || isNaN(netQtyInput)) {
        resultContainer.innerHTML = '<p style="color:var(--danger);">❌ Bitte alle Felder (UN, PG, Menge) ausfüllen.</p>';
        return;
    }

    const packingGroupSearch = (packingGroupInput === "null") ? null : packingGroupInput;
    const entry = dataLoader.getDGEntry(unNumber, packingGroupSearch);

    if (!entry) {
        let pgText = packingGroupSearch === null ? "ohne PG" : `PG ${packingGroupSearch}`;
        resultContainer.innerHTML = `<p style="color:var(--danger);">❌ UN ${unNumber} (${pgText}) nicht gefunden.</p>`;
        return;
    }

    if (entry.air_transport_forbidden) {
        resultContainer.innerHTML = `<h3 style="background:var(--danger); color:white; padding:10px; border-radius:var(--radius);">⛔ LUFTTRANSPORT VERBOTEN</h3>`;
        return;
    }

    let qtyInKg = (unit === 'g' || unit === 'ml') ? netQtyInput / 1000 : netQtyInput;

    let paxStatus = (!entry.is_forbidden_pax) && checkLimit(entry.pax_max_qty, qtyInKg);
    let caoStatus = (!entry.is_forbidden_cao) && checkLimit(entry.cao_max_qty, qtyInKg);

    let lqText = "❌ Nicht erlaubt"; let lqColor = "var(--danger)"; let lqPiLink = "-";
    if (entry.lq_allowed) {
        if (entry.lq_max_qty && qtyInKg <= entry.lq_max_qty) {
            lqText = `✅ Möglich (Max. ${entry.lq_max_qty} kg/L)`; lqColor = "var(--success)";
        } else {
            lqText = `⚠️ Menge zu hoch (Limit: ${entry.lq_max_qty} kg/L)`; lqColor = "var(--warning)";
        }
        lqPiLink = createPiLink(entry.lq_instruction);
    }

    let dmText = "❌ Nicht erlaubt"; let dmColor = "var(--danger)";
    if (entry.de_minimis_allowed) {
        if (qtyInKg <= 0.1) { dmText = "✅ Möglich (Max. 1g/1ml innen, 100g außen)"; dmColor = "var(--success)"; }
        else { dmText = "⚠️ Menge zu hoch (> 100g)"; dmColor = "var(--warning)"; }
    }

    const paxPiLink = createPiLink(entry.pax_instruction);
    const caoPiLink = createPiLink(entry.cao_instruction);
    let pgDisplay = entry.packing_group ? entry.packing_group : "-";

    let hazardImgHtml = "";
    if (HAZARD_LABELS[entry.class]) {
        hazardImgHtml += `<img src="${HAZARD_LABELS[entry.class]}" alt="Klasse ${entry.class}" style="height:80px; margin-right:10px;" onerror="this.style.display='none'">`;
    }
    if ((!paxStatus && caoStatus) || entry.is_forbidden_pax) {
        hazardImgHtml += `<img src="${LABEL_CAO}" alt="Cargo Only" style="height:80px;" onerror="this.style.display='none'">`;
    }

    let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:15px; margin-bottom:15px;">
        <div><h3>Ergebnis für UN ${unNumber} (PG ${pgDisplay})</h3><p style="color:var(--text-muted);"><strong>Offizieller Name:</strong> ${entry.proper_shipping_name}</p></div>
        <div style="text-align:right;">${hazardImgHtml}</div>
    </div>
    <table style="width:100%; margin-top:10px;">
        <tr style="background:var(--bg-body);"><th>Modus</th><th>Erlaubt?</th><th>Max. Menge / Pkg</th><th>Vorschrift (PI)</th></tr>
        <tr><td>Passenger (PAX)</td><td style="color:${paxStatus ? 'var(--success)' : 'var(--danger)'}"><strong>${paxStatus ? '✅ OK' : '❌ Verboten'}</strong></td><td>${entry.pax_max_qty} ${entry.pax_max_qty_unit}</td><td>${paxPiLink}</td></tr>
        <tr><td>Cargo Only (CAO)</td><td style="color:${caoStatus ? 'var(--success)' : 'var(--danger)'}"><strong>${caoStatus ? '✅ OK' : '❌ Verboten'}</strong></td><td>${entry.cao_max_qty} ${entry.cao_max_qty_unit}</td><td>${caoPiLink}</td></tr>
    </table>`;

    if (entry.special_provisions && entry.special_provisions.length > 0) {
        html += `<div style="margin-top:20px;"><h4>⚠️ Sonderbestimmungen:</h4><ul>`;
        entry.special_provisions.forEach(code => {
            const spInfo = dataLoader.getSpecialProvision(code);
            html += `<li><strong>${code}:</strong> ${spInfo ? spInfo.description : "Siehe Buch"}</li>`;
        });
        html += `</ul></div>`;
    }

    html += `<div style="margin-top:20px; font-size:0.9rem; background:var(--bg-body); padding:15px; border-radius:var(--radius); border:1px solid var(--border-color);">
        <strong>Spezial-Optionen:</strong><br>EQ-Code: <strong>${entry.eq_code}</strong><br>Limited Quantity (LQ): <span style="color:${lqColor}"><strong>${lqText}</strong> (PI: ${lqPiLink})</span><br>De Minimis: <span style="color:${dmColor}"><strong>${dmText}</strong></span>
    </div>`;
    resultContainer.innerHTML = html;
}

function checkLimit(maxLimit, currentQty) { return (maxLimit !== 0 && maxLimit !== null) ? currentQty <= maxLimit : false; }
function createPiLink(piCode) { if (!piCode || piCode === "Verboten" || piCode === "Forbidden" || piCode === "0") return piCode || "-"; return `<span class="pi-link" onclick="openPiModal('${piCode}')">${piCode} ℹ️</span>`; }
window.openPiModal = function(piId) {
    const modal = document.getElementById('pi-modal');
    const piData = dataLoader.getPackingInstruction(piId);
    if (piData) {
        document.getElementById('modal-title').innerText = `Verpackungsanweisung ${piId} (${piData.mode})`;
        let content = `<p>${piData.description}</p>`;
        if (piData.description.includes("Einzelverpackungen sind NICHT erlaubt")) content += `<p style="color:var(--danger); font-weight:bold; margin-top:10px;">⚠️ ACHTUNG: Nur zusammengesetzte Verpackung erlaubt!</p>`;
        document.getElementById('modal-body').innerHTML = content;
    } else {
        document.getElementById('modal-title').innerText = `PI ${piId}`;
        document.getElementById('modal-body').innerHTML = `<p>Keine Details verfügbar.</p>`;
    }
    modal.classList.remove('hidden');
}
window.closeModal = function() { document.getElementById('pi-modal').classList.add('hidden'); }

function addQItemRow() {
    const list = document.getElementById('q-items-list');
    const div = document.createElement('div'); div.classList.add('q-row');
    // WICHTIG: Klasse 'delete-btn-wrapper' hinzugefügt für das CSS
    div.innerHTML = `<div style="flex:1;"><label>UN-Nummer</label><input type="text" class="q-un" list="un-list" placeholder="2811"></div><div style="flex:1;"><label>PG</label><select class="q-pg"><option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="null">Keine</option></select></div><div style="flex:1;"><label>Menge</label><input type="number" class="q-qty" placeholder="0" step="0.000001"></div><div style="flex:0.5;"><label>Einheit</label><select class="q-unit"><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option></select></div><div class="delete-btn-wrapper"><button type="button" class="btn-delete" onclick="this.parentElement.parentElement.remove()">X</button></div>`;
    list.appendChild(div);
}

function calculateQValue() {
    const rows = document.querySelectorAll('#q-items-list .q-row');
    const mode = document.querySelector('input[name="transport-mode"]:checked').value; 
    const resultBox = document.getElementById('q-result');
    let Q = 0; let detailsHtml = '<ul style="font-size:0.9rem; list-style-type: none; padding-left: 0;">'; let error = false;
    for (let row of rows) {
        const un = row.querySelector('.q-un').value.trim();
        let pgInput = row.querySelector('.q-pg').value; const pg = (pgInput === "null") ? null : pgInput;
        const qty = parseFloat(row.querySelector('.q-qty').value); const unit = row.querySelector('.q-unit').value;
        if (!un || isNaN(qty)) continue; 
        const entry = dataLoader.getDGEntry(un, pg);
        if (!entry) { alert(`Fehler: UN ${un} nicht gefunden.`); error = true; break; }
        let maxQty = (mode === 'PAX') ? entry.pax_max_qty : entry.cao_max_qty;
        if (!maxQty) { alert(`Fehler: UN ${un} ist im Modus ${mode} verboten!`); error = true; break; }
        let currentQtyKg = (unit === 'g' || unit === 'ml') ? qty / 1000 : qty;
        let q_part = currentQtyKg / maxQty; Q += q_part;
        detailsHtml += `<li style="margin-bottom: 5px; border-bottom: 1px solid var(--border-color); padding-bottom:5px;"><strong>UN ${un}:</strong> Rechnung: ${currentQtyKg} / ${maxQty} = <strong>${q_part.toFixed(4)}</strong></li>`;
    }
    if (error) return;
    let finalQ = Math.ceil(Q * 10) / 10; 
    resultBox.classList.remove('hidden');
    let color = (finalQ <= 1.0) ? 'var(--success)' : 'var(--danger)';
    let status = (finalQ <= 1.0) ? '✅ ERLAUBT' : '❌ NICHT ERLAUBT';
    resultBox.innerHTML = `<h3>Q-Wert: ${finalQ.toFixed(1)}</h3><p style="color:${color}; font-size:1.3rem; font-weight:bold;">${status}</p>${detailsHtml}</ul>`;
}

function addPkgRow() {
    const list = document.getElementById('pkg-list');
    const div = document.createElement('div'); div.classList.add('pkg-row');
    // WICHTIG: Klasse 'delete-btn-wrapper' hinzugefügt für das CSS
    div.innerHTML = `<div><label>Anzahl</label><input type="number" class="pkg-count" value="1" min="1"></div><div style="flex:2;"><label>Verpackung</label><select class="pkg-type"><option value="Fibreboard box">Fibreboard box (4G)</option><option value="Plywood box">Plywood box (4D)</option><option value="Wooden box">Wooden box (4C1)</option><option value="Fibre drum">Fibre drum (1G)</option><option value="Plastic drum">Plastic drum (1H2)</option><option value="Steel drum">Steel drum (1A1/1A2)</option><option value="Jerrican">Jerrican (3H1/3H2)</option></select></div><div><label>Menge</label><input type="number" class="pkg-qty" placeholder="0.5" step="0.000001"></div><div><label>Einh.</label><select class="pkg-unit"><option value="kg">kg</option><option value="L">L</option><option value="g">g</option><option value="ml">ml</option></select></div><div class="delete-btn-wrapper"><button type="button" class="btn-delete" onclick="this.parentElement.parentElement.remove()">X</button></div>`;
    list.appendChild(div);
}

function generatePkgText() {
    const rows = document.querySelectorAll('.pkg-row');
    const outputField = document.getElementById('pkg-output-text');
    const overpack = document.getElementById('overpack-check').checked;
    let text = "";
    rows.forEach(row => {
        const count = row.querySelector('.pkg-count').value; const type = row.querySelector('.pkg-type').value;
        const qty = row.querySelector('.pkg-qty').value; const unit = row.querySelector('.pkg-unit').value;
        if (count && qty) text += `${count} ${type} x ${qty} ${unit}\n`;
    });
    if (overpack) text += "\nOverpack used";
    outputField.value = text;
    document.getElementById('pkg-output-container').classList.remove('hidden');
}

function copyPkgText() {
    const copyText = document.getElementById("pkg-output-text"); copyText.select();
    navigator.clipboard.writeText(copyText.value);
    const btn = document.getElementById('btn-copy-text'); const originalText = btn.innerText;
    btn.innerText = "✅ Kopiert!"; setTimeout(() => btn.innerText = originalText, 2000);
}