window.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('dbStatusBadge');
  if (badge) {
    if (typeof BONDS_DB !== 'undefined') {
      badge.textContent = `✓ DB: ${BONDS_DB.count} Bonds (${BONDS_DB.lastUpdatedDisplay.split(',')[0]})`;
      badge.style.background = 'rgba(16,185,129,0.1)';
      badge.style.color = 'var(--green)';
      badge.style.borderColor = 'rgba(16,185,129,0.25)';
    } else {
      badge.textContent = `⚠ DB Offline`;
      badge.style.background = 'rgba(251,146,60,0.1)';
      badge.style.color = 'var(--orange)';
      badge.style.borderColor = 'rgba(251,146,60,0.25)';
    }
  }

  // Click outside listener to close search dropdown
  window.addEventListener('click', (e) => {
    const container = document.getElementById('searchContainer');
    const dropdown = document.getElementById('searchDropdownWrap');
    if (container && dropdown && !container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
});

// ─── BOND STORAGE ─────────────────────────────────────────────────────────────
let _savedBonds = JSON.parse(localStorage.getItem('bondCalcSaved') || '[]');

function _captureFormState(extraFields) {
  return {
    secName:        document.getElementById('secName').value,
    isin:           document.getElementById('isin').value,
    bondType:       document.getElementById('bondType').value,
    bondRating:     document.getElementById('bondRating').value,
    maturityDate:   document.getElementById('maturityDate').value,
    faceValue:      document.getElementById('faceValue').value,
    quantity:       document.getElementById('quantity').value,
    couponRate:     document.getElementById('couponRate').value,
    ipFreq:         document.getElementById('ipFreq').value,
    ipDateType:     document.getElementById('ipDateType').value,
    ipBdAdj:        document.getElementById('ipBdAdj').value,
    fixedDates:     document.getElementById('fixedDates').value,
    domDay:         document.getElementById('domDay').value,
    rdRule:         document.getElementById('rdRule').value,
    rdBdConv:       document.getElementById('rdBdConv').value,
    stampDuty:      document.getElementById('stampDuty').value,
    dayCount:       document.getElementById('dayCount').value,
    isCallable:     document.getElementById('isCallable').value,
    callDate:       document.getElementById('callDate').value,
    putDate:        document.getElementById('putDate').value,
    allotmentDate:  document.getElementById('allotmentDate').value,
    accruedFromType:document.getElementById('accruedFromType').value,
    firstIPDate:    document.getElementById('firstIPDate').value,
    redemptionType: document.getElementById('redemptionType').value,
    stagPct:        document.getElementById('stagPct').value,
    stagFreq:       document.getElementById('stagFreq').value,
    stagStart:      document.getElementById('stagStart').value,
    stagLastN:      document.getElementById('stagLastN').value,
    stagFromDate:   document.getElementById('stagFromDate').value,
    stagFromCoupon: document.getElementById('stagFromCoupon').value,
    manualDates:    [..._manualDates],
    customDenomMap: JSON.parse(JSON.stringify(customDenomMap)),
    customRDMap:    JSON.parse(JSON.stringify(customRDMap)),
    customIPDateMap:JSON.parse(JSON.stringify(customIPDateMap)),
    customRedemRows:(()=>{
      const rows=[];
      document.querySelectorAll('#customRedemBody tr').forEach(tr=>{
        const d=tr.cells[1]?.querySelector('input[type=date]')?.value||'';
        const p=tr.cells[2]?.querySelector('input[type=number]')?.value||'';
        const n=tr.cells[3]?.querySelector('input[type=text]')?.value||'';
        if(d||p) rows.push({date:d,pct:p,note:n});
      });
      return rows;
    })(),
    bondMode:       _bondMode || 'regular',
    cumulTaxSlab:   document.getElementById('cumulTaxSlab') ? document.getElementById('cumulTaxSlab').value : '0.30',
    zcbNotified:    document.getElementById('zcbNotified') ? document.getElementById('zcbNotified').value : 'no',
    zcbTaxSlab:     document.getElementById('zcbTaxSlab') ? document.getElementById('zcbTaxSlab').value : '0.30',
    zcbPrice:       document.getElementById('zcbPrice') ? document.getElementById('zcbPrice').value : '',
    zcbCalcMode:    document.getElementById('zcbCalcMode') ? document.getElementById('zcbCalcMode').value : 'priceToXirr',
    zcbXirrInput:   document.getElementById('zcbXirrInput') ? document.getElementById('zcbXirrInput').value : '',
    zcbIssuePrice:  document.getElementById('zcbIssuePrice') ? document.getElementById('zcbIssuePrice').value : '',
    gsecPeriodicity:document.getElementById('gsecPeriodicity') ? document.getElementById('gsecPeriodicity').value : '2',
    gsecBenchmark:  document.getElementById('gsecBenchmark') ? document.getElementById('gsecBenchmark').value : '',
    gsecYtmInput:   document.getElementById('gsecYtmInput') ? document.getElementById('gsecYtmInput').value : '',
    bondTaxSlab:    document.getElementById('bondTaxSlab') ? document.getElementById('bondTaxSlab').value : '0.30',
    tfbLTCGRate:    document.getElementById('tfbLTCGRate') ? document.getElementById('tfbLTCGRate').value : '0.10',
    weekendConv:    document.getElementById('weekendConv') ? document.getElementById('weekendConv').value : 'sat-sun',
    cumulCompound:  document.getElementById('cumulCompound') ? document.getElementById('cumulCompound').value : '1',
    savedAt:        new Date().toISOString(),
    ...extraFields
  };
}

function saveBond() {
  const meta = window._lastCalcMeta;
  // Build extras from meta if available, otherwise save form state only (no calc needed)
  let extras = { calcMode: document.getElementById('calcMode').value };
  if (meta) {
    const mode = document.getElementById('calcMode').value;
    if (mode === 'priceToXirr') {
      extras = { calcMode: 'priceToXirr', xirr: (meta.xirrRate * 100).toFixed(4) };
    } else {
      extras = { calcMode: 'xirrToPrice', price: meta.pricePct.toFixed(4), xirrInput: document.getElementById('xirrInput').value };
    }
  }

  const bond = _captureFormState(extras);
  // Use ISIN or secName as key; update if already saved
  const key = bond.isin || bond.secName || ('bond_' + Date.now());
  const existingIdx = _savedBonds.findIndex(b => (b.isin && b.isin === bond.isin) || (!b.isin && b.secName === bond.secName));
  if (existingIdx >= 0) {
    if (!confirm(`"${bond.secName || bond.isin}" is already saved. Overwrite?`)) return;
    _savedBonds[existingIdx] = bond;
  } else {
    _savedBonds.push(bond);
  }
  localStorage.setItem('bondCalcSaved', JSON.stringify(_savedBonds));
  renderSavedBonds();
  // Flash confirmation
  const btn = document.querySelector('[onclick="saveBond()"]');
  btn.textContent = '✓ Saved!';
  setTimeout(() => btn.textContent = '💾 Save Bond', 1800);
}

function loadBond(idx) {
  const p = _savedBonds[idx];
  if (!p) return;
  ['secName','isin','bondRating','maturityDate','fixedDates','firstIPDate','lastIP','allotmentDate'].forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = p[id] || '';
  });
  ['faceValue','quantity','couponRate','domDay','stampDuty'].forEach(id => {
    if (document.getElementById(id) && p[id] !== undefined) document.getElementById(id).value = p[id];
  });
  document.getElementById('bondType').value         = p.bondType || 'SENIOR SECURED';
  document.getElementById('ipFreq').value           = p.ipFreq || '4';
  document.getElementById('ipDateType').value       = p.ipDateType || 'fixed';
  document.getElementById('ipBdAdj').value          = p.ipBdAdj || 'none';
  document.getElementById('rdRule').value           = p.rdRule || '15';
  document.getElementById('rdBdConv').value          = p.rdBdConv || 'none';
  document.getElementById('dayCount').value         = p.dayCount || 'actactical';
  document.getElementById('isCallable').value       = p.isCallable || 'no';
  document.getElementById('callDate').value         = p.callDate   || '';
  document.getElementById('putDate').value          = p.putDate    || '';
  onCallableChange();
  document.getElementById('accruedFromType').value  = p.accruedFromType || 'lastip';
  document.getElementById('redemptionType').value   = p.redemptionType || 'bullet';
  document.getElementById('stagPct').value          = p.stagPct || '';
  document.getElementById('stagFreq').value         = p.stagFreq || 'same';
  document.getElementById('stagStart').value        = p.stagStart || 'lastN';
  document.getElementById('stagLastN').value        = p.stagLastN || '4';
  document.getElementById('stagFromDate').value     = p.stagFromDate || '';
  document.getElementById('stagFromCoupon').value   = p.stagFromCoupon || '1';
  // Restore calc mode + price/xirr
  if (p.calcMode) {
    document.getElementById('calcMode').value = p.calcMode;
    onCalcModeChange();
  }
  if (p.calcMode === 'priceToXirr') {
    // Don't restore price — user will enter today's price
    document.getElementById('price').value = '';
  } else if (p.xirrInput) {
    document.getElementById('xirrInput').value = p.xirrInput;
  }
  // Restore value date to today (use local date, not toISOString which is UTC)
  const today = new Date();
  document.getElementById('valueDate').value = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  // Restore manual dates
  _manualDates = p.manualDates || [];
  // Restore custom maps (365/366, record date, IP date overrides)
  Object.keys(customDenomMap).forEach(k => delete customDenomMap[k]);
  Object.keys(customRDMap).forEach(k => delete customRDMap[k]);
  Object.keys(customIPDateMap).forEach(k => delete customIPDateMap[k]);
  if (p.customDenomMap)  Object.assign(customDenomMap,  p.customDenomMap);
  if (p.customRDMap)     Object.assign(customRDMap,     p.customRDMap);
  if (p.customIPDateMap) Object.assign(customIPDateMap, p.customIPDateMap);
  // Restore custom redemption schedule
  if (p.customRedemRows && p.customRedemRows.length > 0) {
    document.getElementById('customRedemBody').innerHTML = '';
    customRedemRowId = 0;
    p.customRedemRows.forEach(r => addCustomRedemRow(r.date, r.pct, r.note));
  }
  // Restore bond mode and cumulative settings
  const _savedMode = p.bondMode || 'regular';
  window._loadingBond = true;
  setBondMode(_savedMode);
  window._loadingBond = false;
  // Re-apply faceValue + quantity after setBondMode (which may reset defaults)
  if (p.faceValue !== undefined && document.getElementById('faceValue')) document.getElementById('faceValue').value = p.faceValue;
  if (p.quantity  !== undefined && document.getElementById('quantity'))  document.getElementById('quantity').value  = p.quantity;
  if (p.cumulCompound && document.getElementById('cumulCompound')) document.getElementById('cumulCompound').value = p.cumulCompound;
  if (p.cumulTaxSlab  && document.getElementById('cumulTaxSlab'))  document.getElementById('cumulTaxSlab').value  = p.cumulTaxSlab;
  if (p.zcbNotified   && document.getElementById('zcbNotified'))   { document.getElementById('zcbNotified').value = p.zcbNotified; onZcbNotifiedChange(); }
  if (p.zcbTaxSlab    && document.getElementById('zcbTaxSlab'))    document.getElementById('zcbTaxSlab').value   = p.zcbTaxSlab;
  if (p.zcbPrice      && document.getElementById('zcbPrice'))      document.getElementById('zcbPrice').value     = p.zcbPrice;
  if (p.zcbCalcMode   && document.getElementById('zcbCalcMode'))   { document.getElementById('zcbCalcMode').value = p.zcbCalcMode; onZcbCalcModeChange(); }
  if (p.zcbXirrInput  && document.getElementById('zcbXirrInput'))  document.getElementById('zcbXirrInput').value  = p.zcbXirrInput;
  if (p.zcbIssuePrice  && document.getElementById('zcbIssuePrice'))  document.getElementById('zcbIssuePrice').value  = p.zcbIssuePrice;
  if (p.gsecPeriodicity&& document.getElementById('gsecPeriodicity'))document.getElementById('gsecPeriodicity').value= p.gsecPeriodicity;
  if (p.gsecBenchmark  && document.getElementById('gsecBenchmark'))  document.getElementById('gsecBenchmark').value  = p.gsecBenchmark;
  if (p.gsecYtmInput   && document.getElementById('gsecYtmInput'))   document.getElementById('gsecYtmInput').value   = p.gsecYtmInput;
  if (p.bondTaxSlab    && document.getElementById('bondTaxSlab'))    document.getElementById('bondTaxSlab').value    = p.bondTaxSlab;
  if (p.tfbLTCGRate    && document.getElementById('tfbLTCGRate'))    document.getElementById('tfbLTCGRate').value    = p.tfbLTCGRate;
  if (p.weekendConv   && document.getElementById('weekendConv'))   document.getElementById('weekendConv').value   = p.weekendConv;
  // Trigger UI updates
  onFreqChange(); onDateTypeChange(); onRDChange(); onDayCountChange(); onAccruedFromChange(); onRedemptionTypeChange();
  checkRecordDate();
  renderLastIPQuickSelect();   // auto-set Last IP from today's value date
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = '';
  renderSavedBonds(idx);
}

// ── Saved bonds dropdown ──────────────────────────────────────────────────
let _sbActiveIdx = null;

function toggleSbDropdown() {
  const dd  = document.getElementById('sbDropdown');
  const btn = document.getElementById('sbTrigger');
  const isOpen = dd.classList.contains('open');
  if (isOpen) { closeSbDropdown(); return; }
  dd.classList.add('open');
  btn.classList.add('open');
  document.getElementById('sbSearch').value = '';
  renderSbList();
  setTimeout(() => document.getElementById('sbSearch').focus(), 60);
}

function closeSbDropdown() {
  document.getElementById('sbDropdown').classList.remove('open');
  document.getElementById('sbTrigger').classList.remove('open');
}

// Close on outside click
document.addEventListener('click', e => {
  const wrap = document.getElementById('sbWrap');
  if (wrap && !wrap.contains(e.target)) closeSbDropdown();
});

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
  return text.replace(re, '<em>$1</em>');
}

function renderSbList() {
  const list  = document.getElementById('sbList');
  const query = (document.getElementById('sbSearch').value || '').trim().toLowerCase();

  // Filter bonds
  const matches = _savedBonds.map((b, i) => ({ b, i })).filter(({ b }) => {
    if (!query) return true;
    const isin   = (b.isin || '').toLowerCase();
    const name   = (b.secName || '').toLowerCase();
    const coupon = String(b.couponRate || '');
    const mat    = (b.maturityDate || '');
    const rating = (b.bondRating || '').toLowerCase();
    const type   = (b.bondType || '').toLowerCase();
    // Match last-4 of ISIN, full ISIN, name words, coupon, maturity year
    return isin.slice(-4) === query ||
           isin.includes(query) ||
           name.includes(query) ||
           coupon.startsWith(query) ||
           mat.includes(query) ||
           rating.includes(query) ||
           type.includes(query);
  });

  if (matches.length === 0) {
    list.innerHTML = `<div class="sb-empty">${_savedBonds.length === 0 ? 'No saved bonds yet — calculate and click 💾 Save Bond' : 'No matches found'}</div>`;
    return;
  }

  const freqLabel = { '1':'Annual','2':'Semi-Annual','4':'Quarterly','12':'Monthly' };

  list.innerHTML = '';
  matches.forEach(({ b, i }) => {
    const item = document.createElement('div');
    item.className = 'sb-item' + (i === _sbActiveIdx ? ' active' : '');

    const nameHl   = highlight(b.secName || b.isin || 'Bond ' + (i+1), query);
    const isinHl   = b.isin ? highlight(b.isin, query) : '';
    const couponHl = highlight(String(b.couponRate || ''), query);
    const matYr    = b.maturityDate ? b.maturityDate.slice(0,7) : '';
    const freq     = freqLabel[b.ipFreq] || b.ipFreq || '';
    const secType  = b.bondType ? b.bondType.replace('SENIOR ','Sr.') : '';
    const savedOn  = b.savedAt ? new Date(b.savedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';

    // Show XIRR or Price depending on what was stored
    let calcInfo = '';
    if (b.xirr)  calcInfo = `XIRR ${b.xirr}%`;
    if (b.price) calcInfo = `Price ${b.price}%`;

    item.innerHTML = `
      <div class="sb-item-body" onclick="loadBond(${i}); closeSbDropdown();">
        <div class="sb-item-name">${nameHl}</div>
        <div class="sb-item-meta">
          ${isinHl ? `<span>ISIN: ${isinHl}</span>` : ''}
          ${couponHl ? `<span>${couponHl}% coupon</span>` : ''}
          ${matYr    ? `<span>Mat: ${matYr}</span>` : ''}
          ${freq     ? `<span>${freq}</span>` : ''}
          ${secType  ? `<span>${secType}</span>` : ''}
          ${calcInfo ? `<span style="color:var(--accent)">${calcInfo}</span>` : ''}
          ${savedOn  ? `<span style="opacity:.6">Saved ${savedOn}</span>` : ''}
        </div>
      </div>
      <button class="sb-item-del" onclick="deleteBond(${i},event)" title="Delete this saved bond">×</button>`;
    list.appendChild(item);
  });
}

function renderSavedBonds(activeIdx) {
  _sbActiveIdx = activeIdx !== undefined ? activeIdx : _sbActiveIdx;
  // Update count badge
  const cnt = document.getElementById('sbCount');
  if (cnt) cnt.textContent = _savedBonds.length;
  // Re-render list if open
  if (document.getElementById('sbDropdown').classList.contains('open')) renderSbList();
}

function deleteBond(idx, e) {
  e.stopPropagation();
  e.preventDefault();
  _savedBonds.splice(idx, 1);
  if (_sbActiveIdx === idx) _sbActiveIdx = null;
  else if (_sbActiveIdx > idx) _sbActiveIdx--;
  localStorage.setItem('bondCalcSaved', JSON.stringify(_savedBonds));
  renderSavedBonds();
  renderSbList();
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTFOLIO MODULE v2 — positions + lots model
// ═══════════════════════════════════════════════════════════════════════════
// Data model:
//   { version: 2, portfolios: [ Portfolio ] }
//   Portfolio = { id, createdAt, updatedAt, client:{name,pan?,mobile?,notes?}, asOfDate, positions:[Position] }
//   Position  = { id, isin, secName, mode, bondTemplate:{...}, createdAt, updatedAt, lots:[Lot] }
//   Lot       = { id, addedAt, label, notes, valueDate, qty, fvTotal, pricePct,
//                 consideration, accruedPaid, bondState:{formInputs,meta,rows,ipDates,mode} }
//
// MIGRATION v1 → v2 (auto):
//   v1.holdings[] is auto-grouped by ISIN (or secName fallback) into v2.positions[].
//   Each holding becomes one lot. Bond template captured from first matching holding.
// Storage key: 'debtlensPortfolios'
// ═══════════════════════════════════════════════════════════════════════════

const PORTFOLIO_STORAGE_KEY = 'debtlensPortfolios';
const PORTFOLIO_SCHEMA_VERSION = 3;

let _portfolioStore = _loadPortfolioStore();
let _activePortfolioId = null;       // currently viewed portfolio in manager
let _expandedPositions = new Set();  // set of position IDs that are expanded in UI

function _loadPortfolioStore() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return { version: PORTFOLIO_SCHEMA_VERSION, portfolios: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.portfolios) parsed.portfolios = [];
    if (!parsed.version) parsed.version = 1;
    // Auto-migrate v1 → v2 on load
    if (parsed.version < 2) {
      console.log('Migrating portfolio store v1 → v2...');
      _migrateV1ToV2(parsed);
      parsed.version = 2;
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(parsed));
    }
    // Auto-migrate v2 → v3: backfill lot.fvAtPurchase from bondState.meta.outstandingAtValueDate.
    // For lots added before v3, fvAtPurchase is missing — derive it now without needing user action.
    if (parsed.version < 3) {
      console.log('Migrating portfolio store v2 → v3 (backfill fvAtPurchase)...');
      _migrateV2ToV3(parsed);
      parsed.version = 3;
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Portfolio store corrupted, resetting:', e);
    return { version: PORTFOLIO_SCHEMA_VERSION, portfolios: [] };
  }
}

function _savePortfolioStore() {
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(_portfolioStore));
    return true;
  } catch (e) {
    alert('Failed to save portfolio: ' + (e.message || 'storage error'));
    return false;
  }
}

function _genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function _findPortfolio(id) {
  return _portfolioStore.portfolios.find(p => p.id === id);
}

function _findPosition(portfolio, posId) {
  return portfolio && portfolio.positions ? portfolio.positions.find(x => x.id === posId) : null;
}

function _findLot(position, lotId) {
  return position && position.lots ? position.lots.find(x => x.id === lotId) : null;
}

// Identify a security uniquely. Use ISIN if present, else fall back to secName.
// Both are normalised (trim + uppercase for ISIN, trim for secName).
function _securityKey(formOrMeta) {
  const isin = (formOrMeta.isin || '').toString().trim().toUpperCase();
  if (isin) return 'ISIN:' + isin;
  const name = (formOrMeta.secName || '').toString().trim();
  return 'NAME:' + name;
}

// Extract the static bond template fields from a form-state object.
// These are the fields that must MATCH for two lots to belong to the same position.
function _extractBondTemplate(formInputs) {
  return {
    isin:           (formInputs.isin || '').toString().trim().toUpperCase(),
    secName:        formInputs.secName || '',
    bondType:       formInputs.bondType || '',
    couponRate:     formInputs.couponRate || '',
    maturityDate:   formInputs.maturityDate || '',
    ipFreq:         formInputs.ipFreq || '',
    ipDateType:     formInputs.ipDateType || '',
    fixedDates:     formInputs.fixedDates || '',
    domDay:         formInputs.domDay || '',
    dayCount:       formInputs.dayCount || '',
    redemptionType: formInputs.redemptionType || 'bullet',
    bondMode:       formInputs.bondMode || 'regular',
    faceValue:      formInputs.faceValue || ''   // per-bond FV (e.g. 1L, 1k); not the total
  };
}

// Compare two bond templates strictly. Returns null if match, else array of mismatched field names.
function _compareBondTemplates(a, b) {
  const fields = ['couponRate', 'maturityDate', 'ipFreq', 'ipDateType', 'dayCount', 'redemptionType', 'bondMode', 'faceValue'];
  const diffs = [];
  for (const f of fields) {
    // Empty-string equivalence (treat '' and undefined as same)
    const av = (a[f] == null || a[f] === '') ? '' : String(a[f]).trim();
    const bv = (b[f] == null || b[f] === '') ? '' : String(b[f]).trim();
    if (av !== bv) diffs.push(f);
  }
  return diffs.length ? diffs : null;
}

// One-time migration: walk every portfolio's flat holdings[] and group by security key into positions[].
function _migrateV1ToV2(store) {
  for (const port of (store.portfolios || [])) {
    const oldHoldings = port.holdings || [];
    const positionsMap = {};   // securityKey → position object
    for (const h of oldHoldings) {
      const fi   = (h.bondState && h.bondState.formInputs) || {};
      const meta = (h.bondState && h.bondState.meta) || {};
      const key  = _securityKey({ isin: fi.isin || meta.isin, secName: fi.secName || meta.secName });
      let pos = positionsMap[key];
      if (!pos) {
        pos = {
          id: _genId('pos'),
          isin:    (fi.isin || meta.isin || '').toString().trim().toUpperCase(),
          secName: fi.secName || meta.secName || h.label || 'Untitled',
          mode:    h.bondState && h.bondState.mode || 'regular',
          bondTemplate: _extractBondTemplate(fi),
          createdAt: h.addedAt || port.createdAt || new Date().toISOString(),
          updatedAt: h.updatedAt || port.updatedAt || new Date().toISOString(),
          lots: []
        };
        positionsMap[key] = pos;
      }
      // Build a lot from this holding
      const lot = {
        id: h.id || _genId('lot'),
        addedAt: h.addedAt || new Date().toISOString(),
        label: h.label || '',
        notes: h.notes || '',
        // valueDate from meta if available, otherwise blank — user can set later
        valueDate: meta.valueDate || meta.settlement || h.bondState?.formInputs?.allotmentDate || '',
        qty:           meta.qty || 1,
        fvTotal:       meta.fvTotal || 0,
        pricePct:      meta.pricePct || null,
        consideration: meta.consideration || meta.principal || 0,
        accruedPaid:   meta.accruedInt || 0,
        bondState: h.bondState || {}
      };
      pos.lots.push(lot);
    }
    port.positions = Object.values(positionsMap);
    delete port.holdings;
  }
}

// v2 → v3 migration: backfill lot.fvAtPurchase from bondState.meta.outstandingAtValueDate
// Older lots stored only fvTotal (= face value at issuance). For bonds entering mid-life
// (e.g. partially-amortized), the buyer's actual claim at purchase is outstandingAtValueDate.
// We restore that value from the calc snapshot, falling back to fvTotal when meta is missing.
function _migrateV2ToV3(store) {
  let backfilled = 0, fallbacks = 0;
  for (const port of (store.portfolios || [])) {
    for (const pos of (port.positions || [])) {
      for (const lot of (pos.lots || [])) {
        if (lot.fvAtPurchase != null) continue;  // already has it
        const meta = (lot.bondState && lot.bondState.meta) || {};
        if (meta.outstandingAtValueDate != null && meta.outstandingAtValueDate >= 0) {
          lot.fvAtPurchase = meta.outstandingAtValueDate;
          backfilled++;
        } else {
          // Fallback for lots whose snapshot didn't capture this field — use fvTotal
          lot.fvAtPurchase = lot.fvTotal || 0;
          fallbacks++;
        }
      }
    }
  }
  console.log(`v2→v3 migration: backfilled ${backfilled} lots from meta, ${fallbacks} fell back to fvTotal`);
}

// Capture full bond snapshot from current calc state.
function _captureBondSnapshot() {
  if (!window._lastCalcMeta || !window._lastCalcRows) return null;
  const serialiseDate = d => d instanceof Date ? d.toISOString() : (d || null);
  const meta = { ...window._lastCalcMeta };
  for (const k of Object.keys(meta)) {
    if (meta[k] instanceof Date) meta[k] = serialiseDate(meta[k]);
  }
  const rows = (window._lastCalcRows || []).map(r => ({
    ...r,
    date: serialiseDate(r.date),
    rd:   serialiseDate(r.rd)
  }));
  const ipDates = (window._lastIpDates || []).map(serialiseDate);
  return {
    formInputs: _captureFormState(),
    meta,
    rows,
    ipDates,
    mode: _bondMode || 'regular',
    capturedAt: new Date().toISOString()
  };
}

function _rehydrateBondSnapshot(snap) {
  if (!snap) return null;
  const parseD = s => s ? new Date(s) : null;
  const meta = { ...(snap.meta || {}) };
  const dateFields = ['valueDate', 'settlement', 'nextIPDate', 'lastIPDate',
                       'effectiveLastIPDate', 'matDate', 'callDate', 'putDate'];
  for (const f of dateFields) if (meta[f]) meta[f] = parseD(meta[f]);
  if (Array.isArray(meta.inflowDates)) meta.inflowDates = meta.inflowDates.map(parseD);
  const rows = (snap.rows || []).map(r => ({ ...r, date: parseD(r.date), rd: r.rd ? parseD(r.rd) : null }));
  const ipDates = (snap.ipDates || []).map(parseD);
  return { ...snap, meta, rows, ipDates };
}

// ── Portfolio CRUD ──────────────────────────────────────────────────────────
function createPortfolio(clientName, extraClient) {
  const now = new Date().toISOString();
  const portfolio = {
    id: _genId('port'),
    createdAt: now,
    updatedAt: now,
    client: { name: (clientName || '').trim(), ...(extraClient || {}) },
    asOfDate: new Date().toISOString().substring(0, 10),
    positions: []
  };
  _portfolioStore.portfolios.push(portfolio);
  _savePortfolioStore();
  return portfolio;
}

function updatePortfolioClient(id, clientPatch) {
  const p = _findPortfolio(id);
  if (!p) return false;
  p.client = { ...p.client, ...clientPatch };
  p.updatedAt = new Date().toISOString();
  return _savePortfolioStore();
}

function deletePortfolio(id) {
  const idx = _portfolioStore.portfolios.findIndex(p => p.id === id);
  if (idx < 0) return false;
  _portfolioStore.portfolios.splice(idx, 1);
  if (_activePortfolioId === id) _activePortfolioId = null;
  return _savePortfolioStore();
}

// ── Position lookup (used by Add-to-Portfolio dialog to detect existing) ────
function findPositionByKey(portfolio, securityKey) {
  if (!portfolio || !portfolio.positions) return null;
  return portfolio.positions.find(pos => _securityKey({ isin: pos.isin, secName: pos.secName }) === securityKey) || null;
}

// ── Add a lot — either to an existing position (matching ISIN) or new position
//
// Returns: { ok:true, position, lot, isNewPosition }
//      OR: { ok:false, reason:'template_mismatch', diffs:[...], existingPosition }
//      OR: { ok:false, reason:'invalid_input' }
function addLotToPortfolio(portfolioId, snapshot, label, notes, lotMeta) {
  const port = _findPortfolio(portfolioId);
  if (!port || !snapshot) return { ok: false, reason: 'invalid_input' };

  const fi = snapshot.formInputs || {};
  const m  = snapshot.meta || {};
  const secKey = _securityKey({ isin: fi.isin || m.isin, secName: fi.secName || m.secName });
  const incomingTemplate = _extractBondTemplate(fi);

  let position = findPositionByKey(port, secKey);
  let isNewPosition = false;

  if (position) {
    // Strict template comparison — block if mismatch
    const diffs = _compareBondTemplates(position.bondTemplate, incomingTemplate);
    if (diffs && diffs.length) {
      return { ok: false, reason: 'template_mismatch', diffs, existingPosition: position };
    }
  } else {
    // Create new position
    position = {
      id: _genId('pos'),
      isin:    incomingTemplate.isin,
      secName: incomingTemplate.secName,
      mode:    snapshot.mode || 'regular',
      bondTemplate: incomingTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lots: []
    };
    port.positions.push(position);
    isNewPosition = true;
  }

  // Build lot
  const now = new Date().toISOString();
  const lot = {
    id: _genId('lot'),
    addedAt: now,
    label: (label || '').trim() || (fi.secName || fi.isin || 'Untitled'),
    notes: (notes || '').trim(),
    valueDate:     (lotMeta && lotMeta.valueDate) || m.valueDate || m.settlement || fi.allotmentDate || '',
    qty:           m.qty || 1,
    fvTotal:       m.fvTotal || 0,
    // FV at Purchase = outstanding face value at the lot's value date.
    // For bullet bonds with no pre-purchase redemption, this equals fvTotal.
    // For partially-amortized bonds entering mid-life (e.g. Piramal already 22.5% redeemed),
    // this is what the buyer actually has a claim on — the meaningful baseline.
    // The calc engine computes this as `outstandingAtValueDate` in meta.
    fvAtPurchase:  (m.outstandingAtValueDate != null && m.outstandingAtValueDate >= 0)
                       ? m.outstandingAtValueDate
                       : (m.fvTotal || 0),
    pricePct:      m.pricePct != null ? m.pricePct : null,
    consideration: m.consideration || m.principal || 0,
    accruedPaid:   m.accruedInt || 0,
    bondState:     snapshot
  };
  position.lots.push(lot);
  position.updatedAt = now;
  port.updatedAt = now;
  _savePortfolioStore();
  return { ok: true, position, lot, isNewPosition };
}

function removeLotFromPosition(portfolioId, positionId, lotId) {
  const port = _findPortfolio(portfolioId);
  if (!port) return false;
  const pos  = _findPosition(port, positionId);
  if (!pos) return false;
  const idx  = pos.lots.findIndex(l => l.id === lotId);
  if (idx < 0) return false;
  pos.lots.splice(idx, 1);
  // If position is now empty, drop it too (advisor would expect this)
  if (pos.lots.length === 0) {
    const pIdx = port.positions.findIndex(x => x.id === positionId);
    if (pIdx >= 0) port.positions.splice(pIdx, 1);
  } else {
    pos.updatedAt = new Date().toISOString();
  }
  port.updatedAt = new Date().toISOString();
  return _savePortfolioStore();
}

function removePosition(portfolioId, positionId) {
  const port = _findPortfolio(portfolioId);
  if (!port) return false;
  const idx = port.positions.findIndex(x => x.id === positionId);
  if (idx < 0) return false;
  port.positions.splice(idx, 1);
  port.updatedAt = new Date().toISOString();
  return _savePortfolioStore();
}

function updateLot(portfolioId, positionId, lotId, patch) {
  const port = _findPortfolio(portfolioId);
  const pos  = _findPosition(port, positionId);
  const lot  = _findLot(pos, lotId);
  if (!lot) return false;
  Object.assign(lot, patch);
  pos.updatedAt = new Date().toISOString();
  port.updatedAt = pos.updatedAt;
  return _savePortfolioStore();
}

// ── JSON export/import ──────────────────────────────────────────────────────
function exportPortfolioJSON(portfolioId) {
  const p = _findPortfolio(portfolioId);
  if (!p) { alert('Portfolio not found'); return; }
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'Debtlens Bond Calculator',
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    portfolio: p
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (p.client.name || 'Portfolio').replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30) || 'Portfolio';
  a.download = `${safeName}_Portfolio_${p.asOfDate || 'export'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportAllPortfoliosJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'Debtlens Bond Calculator',
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    portfolios: _portfolioStore.portfolios
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Debtlens_AllPortfolios_${new Date().toISOString().substring(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function importPortfolioJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        let incoming = [];
        if (parsed.portfolio) incoming = [parsed.portfolio];
        else if (Array.isArray(parsed.portfolios)) incoming = parsed.portfolios;
        else if (Array.isArray(parsed)) incoming = parsed;
        else throw new Error('Unrecognised JSON shape');

        let added = 0, skipped = 0;
        for (const inc of incoming) {
          if (!inc.id || !inc.client) { skipped++; continue; }
          if (_portfolioStore.portfolios.some(p => p.id === inc.id)) { skipped++; continue; }
          // If incoming is v1 (has holdings), migrate it on the fly
          if (inc.holdings && !inc.positions) {
            const tmp = { portfolios: [inc] };
            _migrateV1ToV2(tmp);
          }
          if (!inc.positions) inc.positions = [];
          _portfolioStore.portfolios.push(inc);
          added++;
        }
        _savePortfolioStore();
        resolve({ added, skipped });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ── Outstanding FV helpers ──────────────────────────────────────────────────
// Computes the outstanding face value of a single lot AS OF the given date,
// using the lot's stored cashflow rows (which carry outstandingBefore/After
// per redemption event).
//
// Logic:
//   • If as-of date < lot's value date → outstanding = lot.fvTotal (bond not yet held)
//   • Otherwise walk rows, tracking the most recent row with a principal payment
//     where date ≤ asOfDate; outstanding = that row's outstandingAfter.
//   • If no principal payments yet → outstanding = lot.fvTotal (original).
//   • For matured bonds (last redemption ≤ asOfDate AND outstandingAfter≈0)
//     return 0.
//
// For bullet bonds: outstanding stays = fvTotal until maturity, then drops to 0.
// For staggered bonds: outstanding decays at each redemption event.
// Outstanding face value of a single lot at a given as-of date.
//
// Three regimes:
//   1. asOfDate < lot.valueDate (pre-settlement)
//      → return lot.fvAtPurchase (or fvTotal as fallback). The buyer is committed to this
//        position even if settlement hasn't occurred yet; treating as 0 is misleading because
//        the asset will appear in any forward-looking projection.
//   2. asOfDate ≥ lot.valueDate, no post-purchase redemption events yet
//      → return lot.fvAtPurchase (steady state).
//   3. asOfDate ≥ lot.valueDate, post-purchase redemption(s) have occurred
//      → return outstandingAfter of the most recent past redemption row (taken from bondState.rows).
//
// Special case: if a row's outstandingAfter ≈ 0 AND it's the maturity row, the lot is matured.
//
// All comparisons are between Date objects; lot.valueDate may be ISO string and is parsed.
function _outstandingFvForLot(lot, asOfDate) {
  if (!lot) return 0;
  // Baseline: prefer fvAtPurchase (post-v3 lots), fall back to fvTotal (legacy).
  const baseline = (lot.fvAtPurchase != null && lot.fvAtPurchase >= 0)
                       ? lot.fvAtPurchase
                       : (lot.fvTotal || 0);
  if (!asOfDate) return baseline;

  // If as-of < value date, settlement hasn't occurred. Return baseline anyway —
  // the buyer is committed and reports should reflect their position.
  const lotVD = lot.valueDate ? new Date(lot.valueDate) : null;
  if (lotVD && !isNaN(lotVD.getTime()) && asOfDate < lotVD) {
    return baseline;
  }

  // Walk the post-asOf cashflow rows looking for principal redemptions that have
  // already occurred. Note: bondState.rows is calculated from the lot's value date
  // forward, so any redemption row with date ≤ asOfDate represents a post-purchase event.
  const rows = (lot.bondState && lot.bondState.rows) || [];
  if (rows.length === 0) return baseline;

  let osValue = baseline;
  for (const r of rows) {
    const rd = r.date ? new Date(r.date) : null;
    if (!rd || isNaN(rd.getTime())) continue;
    if (rd > asOfDate) break;          // rows are chronological → stop
    if ((r.principal || 0) > 0.005) {
      // outstandingAfter is the post-redemption balance of the bond (not the lot)
      // Lots store calc state where outstanding values are already in the lot's currency units.
      if (r.outstandingAfter != null) {
        osValue = r.outstandingAfter;
      }
    }
  }
  if (osValue < 0.5) osValue = 0;
  return osValue;
}

// Sum outstanding FV across all lots of a position
function _outstandingFvForPosition(pos, asOfDate) {
  if (!pos || !pos.lots) return 0;
  let total = 0;
  for (const l of pos.lots) total += _outstandingFvForLot(l, asOfDate);
  return total;
}

// ── Position-level metrics (live aggregation from lots) ─────────────────────
// `asOfDate` (optional) drives outstanding-FV calculation; pass today's date
// for live UI views, or the report's projection-start date for Excel reports.
function _positionMetrics(pos, asOfDate) {
  if (!pos || !pos.lots || pos.lots.length === 0) {
    return { lotCount: 0, qty: 0, fvTotal: 0, fvAtPurchase: 0, fvOutstanding: 0, invested: 0, accruedPaid: 0,
             wtdPricePct: 0, wtdYTM: 0, lastValueDate: null, firstValueDate: null,
             isFullyRedeemed: false };
  }
  // Default as-of date = today (for live UI). Reports pass an explicit date.
  const aod = asOfDate ? (asOfDate instanceof Date ? asOfDate : new Date(asOfDate)) : new Date();

  let qty = 0, fvTotal = 0, fvAtPurchase = 0, fvOutstanding = 0, invested = 0, accruedPaid = 0;
  let pxNumer = 0, pxDenom = 0;
  let ytmNumer = 0, ytmDenom = 0;
  let firstD = null, lastD = null;
  for (const l of pos.lots) {
    const m = (l.bondState && l.bondState.meta) || {};
    qty           += (l.qty || 0);
    fvTotal       += (l.fvTotal || 0);
    // fvAtPurchase falls back to fvTotal for legacy lots not yet migrated
    const lotFvAtPurchase = (l.fvAtPurchase != null && l.fvAtPurchase >= 0) ? l.fvAtPurchase : (l.fvTotal || 0);
    fvAtPurchase  += lotFvAtPurchase;
    fvOutstanding += _outstandingFvForLot(l, aod);
    invested      += (l.consideration || 0);
    accruedPaid   += (l.accruedPaid || 0);
    // Weighted price uses fvAtPurchase (the actual base on which price% applied)
    if (lotFvAtPurchase > 0 && l.pricePct != null) {
      pxNumer += l.pricePct * lotFvAtPurchase;
      pxDenom += lotFvAtPurchase;
    }
    const ytm = m.xirrRate;
    if (ytm != null && l.consideration > 0) {
      ytmNumer += ytm * l.consideration;
      ytmDenom += l.consideration;
    }
    if (l.valueDate) {
      const d = new Date(l.valueDate);
      if (!isNaN(d)) {
        if (!firstD || d < firstD) firstD = d;
        if (!lastD  || d > lastD)  lastD  = d;
      }
    }
  }
  return {
    lotCount: pos.lots.length,
    qty, fvTotal, fvAtPurchase, fvOutstanding, invested, accruedPaid,
    wtdPricePct: pxDenom > 0 ? pxNumer / pxDenom : 0,
    wtdYTM:      ytmDenom > 0 ? ytmNumer / ytmDenom : 0,
    firstValueDate: firstD,
    lastValueDate:  lastD,
    // Fully redeemed = was-held but now zero. We use fvAtPurchase as denominator
    // because if a buyer entered at ₹775 and now has ₹0, that's matured for THEIR holding.
    isFullyRedeemed: fvOutstanding < 0.5 && fvAtPurchase > 0.5
  };
}

// ── Portfolio-level summary (rolls up across positions) ─────────────────────
function _portfolioSummary(p, asOfDate) {
  if (!p || !p.positions || p.positions.length === 0) {
    return { positionCount: 0, lotCount: 0, totalFV: 0, totalFVAtPurchase: 0, totalFVOutstanding: 0, totalInvestment: 0, weightedYTM: 0, modes: {} };
  }
  let totalFV = 0, totalFVAtPurchase = 0, totalFVOutstanding = 0, totalInvestment = 0;
  let ytmNumer = 0, ytmDenom = 0;
  let lotCount = 0;
  const modes = {};
  for (const pos of p.positions) {
    const pm = _positionMetrics(pos, asOfDate);
    totalFV            += pm.fvTotal;
    totalFVAtPurchase  += pm.fvAtPurchase;
    totalFVOutstanding += pm.fvOutstanding;
    totalInvestment    += pm.invested;
    if (pm.invested > 0 && pm.wtdYTM) {
      ytmNumer += pm.wtdYTM * pm.invested;
      ytmDenom += pm.invested;
    }
    lotCount += pm.lotCount;
    const mode = pos.mode || 'regular';
    modes[mode] = (modes[mode] || 0) + 1;
  }
  return {
    positionCount: p.positions.length,
    lotCount,
    totalFV,
    totalFVAtPurchase,
    totalFVOutstanding,
    totalInvestment,
    weightedYTM: ytmDenom > 0 ? ytmNumer / ytmDenom : 0,
    modes
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — CONSOLIDATED CASHFLOW ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Produces a 4-sheet Excel report per portfolio:
//   Sheet 1 — Portfolio Summary    (positions, maturity buckets, FY income)
//   Sheet 2 — Consolidated Cashflow (event-level, sorted, gross + post-tax)
//   Sheet 3 — Daily Aggregated     (rolled up by date)
//   Sheet 4 — Per-Position Cashflow (per-bond detail blocks)
// ═══════════════════════════════════════════════════════════════════════════

// Tax category classification for a position.
// Determines: TDS rate on coupons, tax treatment of interest, CG treatment.
function _classifyTaxCategory(position) {
  const tmpl = position.bondTemplate || {};
  const mode = position.mode || tmpl.bondMode || 'regular';
  const bondType = (tmpl.bondType || '').toUpperCase();

  if (mode === 'gsec') {
    return { category: 'gsec', label: 'G-Sec',
             tdsOnCoupon: 0,                  // No TDS on G-Sec interest
             interestTaxable: true,
             notes: 'Sovereign — no TDS on coupons; interest taxable at slab' };
  }
  if (mode === 'taxfree' || bondType.includes('TAX FREE') || bondType.includes('TAX-FREE')) {
    return { category: 'taxfree', label: 'Tax-Free',
             tdsOnCoupon: 0,
             interestTaxable: false,           // Sec 10(15) exempt
             notes: 'Sec 10(15) — interest fully exempt; LTCG @ 10%' };
  }
  if (mode === 'zcb') {
    return { category: 'zcb', label: 'ZCB',
             tdsOnCoupon: 0,                   // No periodic coupon
             interestTaxable: true,            // Accreted value taxed differently — handled in tax report
             notes: 'No coupons; accretion taxed annually (Sec 145A) or at maturity (Sec 50AA for notified)' };
  }
  // Default: regular taxable bond (NCD, corporate)
  // 10% TDS u/s 193 on listed corporate bond interest if interest > ₹5,000/yr to a person
  return { category: 'taxable', label: 'Taxable',
           tdsOnCoupon: 0.10,
           interestTaxable: true,
           notes: 'Sec 193 — 10% TDS on coupon if > ₹5,000/yr; interest taxable at slab' };
}

// Decide whether the current bond has TDS on coupons (drives column visibility in the
// cashflow schedule and other UI surfaces). Reads window._bondMode directly so this
// works in the live calculator context where there's no Position object yet.
//
// TDS treatment by bond mode:
//   • regular (corporate NCD): 10% TDS u/s 193 → returns true
//   • gsec / sdl: no TDS u/s 193 (excluded by proviso to s.193) → false
//   • taxfree (Sec 10(15)(iv)): income exempt, no TDS → false
//   • zcb NOTIFIED (Sec 2(48)): differential is capital gain, not interest → no TDS → false
//   • zcb NON-NOTIFIED: differential treated as interest → 10% TDS u/s 193 applies → true
//   • NIL slab declared (15G/15H): no TDS → false (overrides the above)
function _currentBondHasTDS() {
  const m = (typeof _bondMode === 'string' ? _bondMode : 'regular');
  if (m === 'gsec' || m === 'taxfree') return false;
  if (m === 'zcb') {
    // Differentiate notified vs non-notified
    const notifiedEl = document.getElementById('zcbNotified');
    const isNotified = notifiedEl && notifiedEl.value === 'yes';
    if (isNotified) return false;     // notified → CG, no TDS
    // Non-notified ZCB → interest, TDS applies. Fall through to slab check.
  }
  // NIL slab (Form 15G/15H) also means no TDS — applies to all modes
  const slabEl = document.getElementById(m === 'zcb' ? 'zcbTaxSlab' : 'bondTaxSlab');
  if (slabEl && slabEl.value === 'nil') return false;
  return true;
}

// Toggle Post-TDS column visibility based on current bond mode.
// Hides the column entirely (header + all cells) for G-Sec / Tax-Free / ZCB / NIL slab.
// Also hides the "Net Receivable (Post-TDS 10%)" metric card since it's meaningless.
function _toggleTDSColumnVisibility() {
  const showTDS = _currentBondHasTDS();
  const header = document.getElementById('postTdsColHeader');
  if (header) header.style.display = showTDS ? '' : 'none';
  const cells = document.querySelectorAll('td.postTdsCell');
  cells.forEach(c => c.style.display = showTDS ? '' : 'none');
  // Also hide the Net Receivable (Post-TDS) summary card for non-TDS bonds
  const card = document.getElementById('mPostTDSCard');
  if (card) card.style.display = showTDS ? '' : 'none';
}

// Get this lot's tax slab as a decimal (0.30 = 30%).
// Stored on the form when the bond was calculated.
function _getLotTaxSlab(lot) {
  const fi = (lot.bondState && lot.bondState.formInputs) || {};
  // Different fields per mode
  let raw = fi.bondTaxSlab || fi.cumulTaxSlab || fi.zcbTaxSlab || '0.30';
  let n = parseFloat(raw);
  if (isNaN(n)) n = 0.30;
  // Some forms store as "30" instead of "0.30" — normalize
  if (n > 1) n = n / 100;
  return n;
}

// Parse a date stored as ISO string OR Date OR null
function _toDate(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

// Format a Date as DD-MM-YYYY for Excel display
function _excelDateStr(d) {
  const dt = _toDate(d);
  if (!dt) return '';
  return _fmtDate(dt);
}

// Build cashflow events for a single lot, filtered by as-of date.
// Returns array of events, each:
//   { date, lotId, positionId, positionName, isin, mode, type, gross, tds, postTax, net, note }
// where:
//   gross  = coupon/principal amount (positive = inflow)
//   tds    = tax deducted at source (positive number; subtracted from gross)
//   postTax = gross × (1 − slab)  for taxable interest, or = gross for non-taxable
//   net    = what hits client's bank (gross − tds for inflows; gross for outflows)
function _buildLotCashflows(position, lot, asOfDate, opts) {
  opts = opts || {};
  const events = [];
  const taxCat = _classifyTaxCategory(position);
  const slab = _getLotTaxSlab(lot);

  const rows = (lot.bondState && lot.bondState.rows) || [];
  const positionId = position.id;
  const positionName = position.secName || position.isin || 'Position';
  const isin = position.isin || '';
  const mode = position.mode || 'regular';
  const lotQty = lot.qty || 0;

  // 1. Purchase outflow on the lot's value date — only if value date is after asOfDate
  //    (rare case: future-dated trades; usually past purchases are pre-asOf and excluded)
  const lotVD = _toDate(lot.valueDate);
  if (lotVD && lotVD > asOfDate) {
    const consideration = lot.consideration || 0;
    events.push({
      date: lotVD,
      lotId: lot.id,
      positionId, positionName, isin, mode,
      qty: lotQty,
      type: 'Purchase',
      gross: -consideration,    // outflow
      tds: 0,
      postTax: -consideration,  // no tax effect on outflow
      net: -consideration,
      taxableInterest: 0,
      note: `Lot purchase · qty ${lotQty}`
    });
  }

  // 2. Walk the bond's cashflow rows; include only those AFTER asOfDate
  for (const r of rows) {
    const rd = _toDate(r.date);
    if (!rd) continue;
    if (rd <= asOfDate) continue;       // skip historical/pre-asOf rows

    const interest  = r.interest  || 0;
    const principal = r.principal || 0;

    // Interest leg — coupon
    if (interest > 0.005) {
      const tds = taxCat.tdsOnCoupon * interest;
      const taxableInterest = taxCat.interestTaxable ? interest : 0;
      const postTax = interest - (taxableInterest * slab);
      events.push({
        date: rd,
        lotId: lot.id,
        positionId, positionName, isin, mode,
        qty: lotQty,
        type: 'Coupon',
        gross: interest,
        tds: tds,
        postTax: postTax,
        net: interest - tds,
        taxableInterest,
        note: r.isExDiv ? 'Coupon (ex-div period)' : 'Coupon'
      });
    }

    // Principal leg — staggered redemption or maturity
    if (principal > 0.005) {
      // Capital gains / loss ARE possible here if cost basis ≠ redemption value
      // For simplicity in cashflow: principal redemption = return of capital, no tax effect on cashflow.
      // (CG treatment belongs in the Tax Report sheet.)
      const isMat = !!r.isMat;
      events.push({
        date: rd,
        lotId: lot.id,
        positionId, positionName, isin, mode,
        qty: lotQty,
        type: isMat ? 'Maturity' : 'Principal',
        gross: principal,
        tds: 0,
        postTax: principal,
        net: principal,
        taxableInterest: 0,
        note: isMat ? 'Final redemption' : 'Staggered principal'
      });
    }
  }

  return events;
}

// Aggregate all events from a portfolio
function _buildPortfolioCashflow(portfolio, asOfDate) {
  const events = [];
  if (!portfolio || !portfolio.positions) return events;
  for (const pos of portfolio.positions) {
    for (const lot of (pos.lots || [])) {
      const lotEvents = _buildLotCashflows(pos, lot, asOfDate);
      events.push(...lotEvents);
    }
  }
  // Sort: date asc, then position name, then type order (Purchase < Coupon < Principal < Maturity)
  const typeOrder = { 'Purchase': 0, 'Coupon': 1, 'Principal': 2, 'Maturity': 3, 'Sale': 4 };
  events.sort((a, b) => {
    const dd = a.date - b.date;
    if (dd !== 0) return dd;
    const tn = a.positionName.localeCompare(b.positionName);
    if (tn !== 0) return tn;
    return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
  });
  return events;
}

// Merge events at POSITION level for the Consolidated Cashflow sheet.
// Coupons/Principal/Maturity events on the same date for the same position are
// summed (across lots). Purchase events stay per-lot because each lot has its
// own purchase date and consideration — merging them would lose attribution.
//
// Returns a new sorted event array.
function _mergeEventsPerPosition(events) {
  // Bucket by (date | positionId | type), but ONLY for non-purchase types
  const buckets = new Map();
  const purchases = [];

  for (const e of events) {
    if (e.type === 'Purchase') {
      // Keep per-lot
      purchases.push(e);
      continue;
    }
    const key = e.date.toISOString().substring(0, 10) + '|' + e.positionId + '|' + e.type;
    let b = buckets.get(key);
    if (!b) {
      b = {
        date: e.date,
        positionId: e.positionId,
        positionName: e.positionName,
        isin: e.isin,
        mode: e.mode,
        type: e.type,
        qty: 0,
        gross: 0, tds: 0, postTax: 0, net: 0, taxableInterest: 0,
        lotCount: 0,
        firstNote: e.note || ''
      };
      buckets.set(key, b);
    }
    b.qty += (e.qty || 0);
    b.gross += e.gross;
    b.tds += e.tds;
    b.postTax += e.postTax;
    b.net += e.net;
    b.taxableInterest += (e.taxableInterest || 0);
    b.lotCount += 1;
  }

  // Build merged event objects with informative notes
  const merged = [];
  for (const b of buckets.values()) {
    let note = b.firstNote || b.type;
    // Annotate with qty + lot count when multiple lots merge
    if (b.lotCount > 1) {
      note = `${b.type === 'Maturity' ? 'Final redemption' : (b.firstNote || b.type)} · qty ${b.qty} (across ${b.lotCount} lots)`;
    } else {
      note = `${b.firstNote || b.type} · qty ${b.qty}`;
    }
    merged.push({
      date: b.date,
      positionId: b.positionId,
      positionName: b.positionName,
      isin: b.isin,
      mode: b.mode,
      qty: b.qty,
      type: b.type,
      gross: b.gross,
      tds: b.tds,
      postTax: b.postTax,
      net: b.net,
      taxableInterest: b.taxableInterest,
      note
    });
  }

  // Combine purchases (still per-lot) with merged coupon/principal events; sort
  const all = [...purchases, ...merged];
  const typeOrder = { 'Purchase': 0, 'Coupon': 1, 'Principal': 2, 'Maturity': 3, 'Sale': 4 };
  all.sort((a, b) => {
    const dd = a.date - b.date;
    if (dd !== 0) return dd;
    const tn = a.positionName.localeCompare(b.positionName);
    if (tn !== 0) return tn;
    return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
  });
  return all;
}

// Roll up events by date (for Sheet 3 — Daily Aggregated)
function _aggregateDailyCashflow(events) {
  const byDate = new Map();
  for (const e of events) {
    const key = e.date.toISOString().substring(0, 10);
    let bucket = byDate.get(key);
    if (!bucket) {
      bucket = {
        date: e.date,
        positions: new Set(),
        coupon: 0, couponTDS: 0, couponPostTax: 0, couponNet: 0,
        principal: 0, purchase: 0,
        grossInflow: 0, grossOutflow: 0,
        netInflow: 0, netOutflow: 0
      };
      byDate.set(key, bucket);
    }
    bucket.positions.add(e.positionName);
    if (e.type === 'Coupon') {
      bucket.coupon += e.gross;
      bucket.couponTDS += e.tds;
      bucket.couponPostTax += e.postTax;
      bucket.couponNet += e.net;
    } else if (e.type === 'Principal' || e.type === 'Maturity') {
      bucket.principal += e.gross;
    } else if (e.type === 'Purchase') {
      bucket.purchase += e.gross;  // already negative
    }
    if (e.gross > 0) {
      bucket.grossInflow += e.gross;
      bucket.netInflow += e.net;
    } else if (e.gross < 0) {
      bucket.grossOutflow += e.gross;
      bucket.netOutflow += e.net;
    }
  }
  // Sort by date ascending
  return Array.from(byDate.values()).sort((a, b) => a.date - b.date);
}

// Maturity bucket exposure (by OUTSTANDING face value at as-of date).
// Buckets: Matured/Redeemed (fully redeemed) | Under 1 yr / 1–3 yr / 3–5 yr / Over 5 yr.
// For amortizing bonds, redeemed principal counts in "Matured/Redeemed" bucket;
// outstanding principal is bucketed by remaining time to final maturity.
function _computeMaturityBuckets(portfolio, asOfDate) {
  const buckets = {
    'Matured/Redeemed': { fv: 0, fvOutstanding: 0, invested: 0, count: 0 },
    'Under 1 yr':       { fv: 0, fvOutstanding: 0, invested: 0, count: 0 },
    '1 to 3 yr':        { fv: 0, fvOutstanding: 0, invested: 0, count: 0 },
    '3 to 5 yr':        { fv: 0, fvOutstanding: 0, invested: 0, count: 0 },
    'Over 5 yr':        { fv: 0, fvOutstanding: 0, invested: 0, count: 0 }
  };
  for (const pos of (portfolio.positions || [])) {
    const matStr = pos.bondTemplate && pos.bondTemplate.maturityDate;
    const mat = _toDate(matStr);
    if (!mat) continue;
    const pm = _positionMetrics(pos, asOfDate);
    let key;
    // Fully redeemed positions go to their own bucket
    if (pm.isFullyRedeemed) {
      key = 'Matured/Redeemed';
    } else {
      const yrs = (mat - asOfDate) / (365.25 * 86400000);
      if (yrs < 1)       key = 'Under 1 yr';
      else if (yrs < 3)  key = '1 to 3 yr';
      else if (yrs < 5)  key = '3 to 5 yr';
      else               key = 'Over 5 yr';
    }
    buckets[key].fv += pm.fvAtPurchase;     // Use FV at Purchase as baseline (issuance FV is irrelevant to buyer)
    buckets[key].fvOutstanding += pm.fvOutstanding;
    buckets[key].invested += pm.invested;
    buckets[key].count += 1;
  }
  return buckets;
}

// Indian financial year string for a Date — e.g. "2025-26"
function _fyOf(d) {
  const dt = _toDate(d);
  if (!dt) return '';
  const m = dt.getMonth();  // 0=Jan
  const y = dt.getFullYear();
  // Apr (month index 3) onwards = current FY starts; Jan-Mar = previous FY
  const start = (m >= 3) ? y : (y - 1);
  const end = (start + 1) % 100;
  return `${start}-${String(end).padStart(2, '0')}`;
}

// FY-wise income breakdown from cashflow events.
// Returns { fyOrder:[fyStr,...], byFY:{ fyStr:{ coupon, principal, tds, postTax, net } } }
function _computeFYIncome(events, fyCount) {
  fyCount = fyCount || 6;
  const byFY = {};
  for (const e of events) {
    const fy = _fyOf(e.date);
    if (!fy) continue;
    let b = byFY[fy];
    if (!b) {
      b = { coupon: 0, couponTDS: 0, couponPostTax: 0, couponNet: 0,
            principal: 0, purchase: 0, gross: 0, postTax: 0, net: 0 };
      byFY[fy] = b;
    }
    if (e.type === 'Coupon') {
      b.coupon += e.gross;
      b.couponTDS += e.tds;
      b.couponPostTax += e.postTax;
      b.couponNet += e.net;
    } else if (e.type === 'Principal' || e.type === 'Maturity') {
      b.principal += e.gross;
    } else if (e.type === 'Purchase') {
      b.purchase += e.gross;
    }
    b.gross   += e.gross;
    b.postTax += e.postTax;
    b.net     += e.net;
  }
  const fyOrder = Object.keys(byFY).sort();   // FY strings sort lexicographically because they start with year
  return { fyOrder, byFY };
}

// ── Excel orchestrator ──────────────────────────────────────────────────────
// Builds the 4-sheet workbook and triggers download.
function downloadConsolidatedCashflow(portfolioId, asOfDateStr) {
  const port = _findPortfolio(portfolioId);
  if (!port) { alert('Portfolio not found'); return; }
  if (!port.positions || port.positions.length === 0) {
    alert('No positions in this portfolio. Add at least one bond first.');
    return;
  }
  if (typeof XLSX === 'undefined' || !XLSX.utils) {
    alert('Excel library (SheetJS) not loaded.');
    return;
  }

  const asOfDate = asOfDateStr ? _toDate(asOfDateStr) : _toDate(port.asOfDate || new Date());
  if (!asOfDate) { alert('Invalid as-of date'); return; }

  const events = _buildPortfolioCashflow(port, asOfDate);
  const eventsPerPosition = _mergeEventsPerPosition(events);   // NEW: per-position merge for Sheet 2
  const dailyAgg = _aggregateDailyCashflow(events);
  const buckets = _computeMaturityBuckets(port, asOfDate);
  const fyIncome = _computeFYIncome(events, 6);
  const summary = _portfolioSummary(port, asOfDate);

  const wb = XLSX.utils.book_new();

  // Style constants
  const NAVY = '0F172A', AMBER = 'F59E0B', GREEN = '16A34A', RED = 'DC2626', BLUE = '2563EB';
  const LGRAY = 'F1F5F9', MGRAY = 'E2E8F0';
  const WHITE = 'FFFFFF';
  const MAMBER = 'FEF3C7';

  // Style helper (mirrors pattern from downloadTaxReport)
  // sCell follows the same pattern as the working downloadTaxReport sCell —
  // `patternType: 'solid'` is essential for fill colors to render in Excel.
  // Note: SheetJS Community Edition does not render styles in some cases;
  // styles are still set so they apply if a styled XLSX library is used.
  function sCell(ws, r, c, val, opts) {
    opts = opts || {};
    const addr = XLSX.utils.encode_cell({ r, c });
    const safeVal = (val === undefined || val === null) ? '' : val;
    ws[addr] = { v: safeVal, t: typeof safeVal === 'number' ? 'n' : 's' };
    if (opts.fmt) ws[addr].z = opts.fmt;
    if (opts.bold || opts.fill || opts.color || opts.align || opts.sz || opts.italic || opts.border || opts.wrap) {
      ws[addr].s = {};
      ws[addr].s.font = {
        name: 'Calibri',
        sz: opts.sz || 10,
        bold: !!opts.bold,
        italic: !!opts.italic
      };
      if (opts.color) ws[addr].s.font.color = { rgb: opts.color };
      if (opts.fill)  ws[addr].s.fill = { fgColor: { rgb: opts.fill }, patternType: 'solid' };
      if (opts.align || opts.wrap) {
        ws[addr].s.alignment = {
          horizontal: opts.align || (typeof safeVal === 'number' ? 'right' : 'left'),
          vertical: 'center',
          wrapText: !!opts.wrap
        };
      }
      if (opts.border) {
        ws[addr].s.border = {
          top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
          right:  { style: 'thin', color: { rgb: 'CBD5E1' } }
        };
      }
    }
  }
  function setRange(ws, lastRow, lastCol) {
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
  }

  // ─── Sheet 1: Portfolio Summary ────────────────────────────────────────
  {
    const ws = {};
    ws['!merges'] = [];
    // 7 columns: A wide for labels, then 6 narrower data cols
    ws['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }];
    let row = 0;

    // Title block (spans 7 cols)
    sCell(ws, row, 0, 'PORTFOLIO SUMMARY', { bold: true, fill: NAVY, color: WHITE, sz: 14 });
    for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    sCell(ws, row, 0, `Client: ${port.client.name || '—'}`, { bold: true, fill: LGRAY, sz: 11 });
    for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: LGRAY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    sCell(ws, row, 0, `As of: ${_fmtDate(asOfDate)}    Generated: ${_fmtDate(new Date())}`, { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row += 2;

    // Top-line metrics
    sCell(ws, row, 0, 'TOP-LINE METRICS', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
    for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: AMBER });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    const metricsRows = [
      ['Total Positions', summary.positionCount],
      ['Total Lots', summary.lotCount],
      ['Total FV at Purchase (₹)', summary.totalFVAtPurchase],
      ['Total FV Outstanding (₹)', summary.totalFVOutstanding],
      ['Total Investment (₹)', summary.totalInvestment],
      ['Weighted Avg YTM', summary.weightedYTM]
    ];
    for (const [k, v] of metricsRows) {
      sCell(ws, row, 0, k, { sz: 10, fill: LGRAY });
      const fmt = (k.includes('YTM')) ? '0.00%' : (k.includes('FV') || k.includes('Investment')) ? '#,##0.00' : '#,##0';
      const isOutstandingRow = k.includes('Outstanding');
      const showPurple = isOutstandingRow && Math.abs(summary.totalFVOutstanding - summary.totalFVAtPurchase) > 0.5;
      sCell(ws, row, 1, v, { sz: 10, bold: true, fmt, align: 'right', color: showPurple ? '7C3AED' : undefined });
      row++;
    }
    row++;

    // Positions table (7 cols: Position/ISIN | Type | Qty | FV at Purchase | FV Outstanding | Invested | Wt YTM)
    sCell(ws, row, 0, 'POSITIONS', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
    for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: AMBER });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    const posCols = ['Position / ISIN', 'Type', 'Qty', 'FV at Purchase (₹)', 'FV Outstanding (₹)', 'Invested (₹)', 'Wt. YTM'];
    posCols.forEach((h, i) => sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    for (const pos of port.positions) {
      const pm = _positionMetrics(pos, asOfDate);
      const tax = _classifyTaxCategory(pos);
      const isPartiallyRedeemed = pm.fvOutstanding > 0.5 && pm.fvOutstanding < pm.fvAtPurchase - 0.5;
      const isFullyRedeemed     = pm.isFullyRedeemed;
      // Color cue: purple for partial redemption, grey for fully redeemed/matured
      const osColor = isFullyRedeemed ? '94A3B8' : (isPartiallyRedeemed ? '7C3AED' : undefined);
      sCell(ws, row, 0, `${pos.secName}\n${pos.isin || ''}`, { sz: 10, wrap: true, border: true });
      sCell(ws, row, 1, tax.label, { sz: 9, align: 'center', fill: LGRAY, border: true });
      sCell(ws, row, 2, pm.qty, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 3, pm.fvAtPurchase, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 4, pm.fvOutstanding, { sz: 10, align: 'right', fmt: '#,##0.00', color: osColor, bold: !!osColor, border: true });
      sCell(ws, row, 5, pm.invested, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 6, pm.wtdYTM, { sz: 10, align: 'right', fmt: '0.00%', border: true });
      row++;
    }
    row++;

    // Maturity buckets (5 columns of data: Bucket | Positions | FV Orig | FV O/S | Invested | % of O/S)
    sCell(ws, row, 0, 'MATURITY BUCKET EXPOSURE', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
    for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: AMBER });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    sCell(ws, row, 0, 'Bonds bucketed by remaining time to final maturity. Fully-redeemed lots roll into "Matured/Redeemed". % of O/S = bucket O/S ÷ total O/S.',
          { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    ['Bucket', 'Positions', 'FV at Purchase (₹)', 'FV Outstanding (₹)', 'Invested (₹)', '% of O/S', ''].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    const totalOS = summary.totalFVOutstanding || 1;
    for (const [bucketName, b] of Object.entries(buckets)) {
      const isMatured = bucketName === 'Matured/Redeemed';
      sCell(ws, row, 0, bucketName, { sz: 10, fill: LGRAY, border: true, color: isMatured ? '94A3B8' : undefined });
      sCell(ws, row, 1, b.count, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 2, b.fv, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 3, b.fvOutstanding, { sz: 10, align: 'right', fmt: '#,##0.00', border: true,
                                            color: isMatured ? '94A3B8' : undefined,
                                            bold: !isMatured && b.fvOutstanding < b.fv - 0.5 });
      sCell(ws, row, 4, b.invested, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 5, isMatured ? 0 : b.fvOutstanding / totalOS, { sz: 10, align: 'right', fmt: '0.0%', border: true });
      sCell(ws, row, 6, '', { border: true });
      row++;
    }
    row++;

    // FY-wise expected income (6 data cols: FY | Coupon Gross | TDS | Coupon PT | Principal | Net)
    sCell(ws, row, 0, 'FY-WISE EXPECTED INCOME', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
    for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: AMBER });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 6 } });
    row++;
    ['FY', 'Coupon (Gross)', 'TDS', 'Coupon (Post-Tax)', 'Principal', 'Total Net', ''].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    if (fyIncome.fyOrder.length === 0) {
      sCell(ws, row, 0, 'No future cashflows projected', { sz: 10, italic: true, color: '64748B', border: true });
      for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { border: true });
      row++;
    } else {
      let totalCoupon = 0, totalTDS = 0, totalPT = 0, totalP = 0, totalNet = 0;
      for (const fy of fyIncome.fyOrder) {
        const b = fyIncome.byFY[fy];
        sCell(ws, row, 0, `FY ${fy}`, { sz: 10, fill: LGRAY, border: true });
        sCell(ws, row, 1, b.coupon, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 2, b.couponTDS, { sz: 10, align: 'right', fmt: '#,##0.00', color: RED, border: true });
        sCell(ws, row, 3, b.couponPostTax, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 4, b.principal, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 5, b.net, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, border: true });
        sCell(ws, row, 6, '', { border: true });
        totalCoupon += b.coupon; totalTDS += b.couponTDS; totalPT += b.couponPostTax;
        totalP += b.principal; totalNet += b.net;
        row++;
      }
      sCell(ws, row, 0, 'TOTAL', { bold: true, fill: MAMBER, sz: 10, border: true });
      sCell(ws, row, 1, totalCoupon, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 2, totalTDS, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: RED, fill: MAMBER, border: true });
      sCell(ws, row, 3, totalPT, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 4, totalP, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 5, totalNet, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 6, '', { fill: MAMBER, border: true });
      row++;
    }

    setRange(ws, row + 2, 6);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // ─── Sheet 2: Consolidated Cashflow (per-position merge) ───────────────
  {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 8 },   // FY
      { wch: 28 },  // Position
      { wch: 14 },  // ISIN
      { wch: 11 },  // Type
      { wch: 8 },   // Qty           ← NEW
      { wch: 14 },  // Gross
      { wch: 12 },  // TDS
      { wch: 14 },  // Post-Tax
      { wch: 14 },  // Net
      { wch: 16 },  // Cumulative
      { wch: 32 }   // Note
    ];
    let row = 0;
    sCell(ws, row, 0, `CONSOLIDATED CASHFLOW — ${port.client.name || ''}    [As of ${_fmtDate(asOfDate)}]`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 11; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 11 } });
    row++;
    sCell(ws, row, 0, 'Inflows positive · Outflows (purchases) negative · Cumulative = running net · Coupons/Principal merged per position per date; Purchases per lot', { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 11 } });
    row += 2;

    const headers = ['Date', 'FY', 'Position', 'ISIN', 'Type', 'Qty', 'Gross (₹)', 'TDS (₹)', 'Post-Tax (₹)', 'Net (₹)', 'Cumulative Net', 'Note'];
    headers.forEach((h, i) => sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;

    let cum = 0;
    for (const e of eventsPerPosition) {
      cum += e.net;
      const typeColor = e.type === 'Purchase' ? RED : (e.type === 'Coupon' ? GREEN : BLUE);
      sCell(ws, row, 0, _fmtDate(e.date), { sz: 10, align: 'center', border: true });
      sCell(ws, row, 1, _fyOf(e.date), { sz: 9, align: 'center', color: '64748B', border: true });
      sCell(ws, row, 2, e.positionName, { sz: 10, border: true });
      sCell(ws, row, 3, e.isin, { sz: 9, color: '64748B', border: true });
      sCell(ws, row, 4, e.type, { sz: 10, align: 'center', color: typeColor, bold: true, border: true });
      sCell(ws, row, 5, e.qty || 0, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 6, e.gross, { sz: 10, align: 'right', fmt: '#,##0.00', color: e.gross < 0 ? RED : undefined, border: true });
      sCell(ws, row, 7, e.tds, { sz: 10, align: 'right', fmt: '#,##0.00', color: e.tds > 0 ? RED : undefined, border: true });
      sCell(ws, row, 8, e.postTax, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 9, e.net, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: e.net < 0 ? RED : undefined, border: true });
      sCell(ws, row, 10, cum, { sz: 10, align: 'right', fmt: '#,##0.00', color: cum < 0 ? RED : undefined, border: true });
      sCell(ws, row, 11, e.note, { sz: 9, color: '64748B', border: true });
      row++;
    }

    if (eventsPerPosition.length === 0) {
      sCell(ws, row, 0, 'No cashflow events after as-of date.', { sz: 10, italic: true, color: '64748B', border: true });
      for (let c = 1; c <= 11; c++) sCell(ws, row, c, '', { border: true });
      row++;
    } else {
      // Totals row
      const totGross = eventsPerPosition.reduce((s, e) => s + e.gross, 0);
      const totTDS = eventsPerPosition.reduce((s, e) => s + e.tds, 0);
      const totPT = eventsPerPosition.reduce((s, e) => s + e.postTax, 0);
      const totNet = eventsPerPosition.reduce((s, e) => s + e.net, 0);
      sCell(ws, row, 0, 'TOTAL', { bold: true, fill: MAMBER, sz: 10, border: true });
      for (let c = 1; c <= 5; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
      sCell(ws, row, 6, totGross, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 7, totTDS, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: RED, fill: MAMBER, border: true });
      sCell(ws, row, 8, totPT, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 9, totNet, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      for (let c = 10; c <= 11; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
      row++;
    }

    setRange(ws, row + 1, 11);
    XLSX.utils.book_append_sheet(wb, ws, 'Cashflow');
  }

  // ─── Sheet 3: Daily Aggregated ─────────────────────────────────────────
  {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }
    ];
    let row = 0;
    sCell(ws, row, 0, `DAILY AGGREGATED CASHFLOW — ${port.client.name || ''}`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 8; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 8 } });
    row++;
    sCell(ws, row, 0, `One row per date — multiple positions on same date are summed. As of ${_fmtDate(asOfDate)}.`, { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 8 } });
    row += 2;

    ['Date', 'FY', 'Positions Hit', '# Positions', 'Coupon (Gross)', 'TDS', 'Coupon (Post-Tax)', 'Principal', 'Daily Net'].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;

    let cumNet = 0;
    for (const d of dailyAgg) {
      const positionsList = Array.from(d.positions).join(', ');
      const dayNet = d.netInflow + d.netOutflow;
      cumNet += dayNet;
      sCell(ws, row, 0, _fmtDate(d.date), { sz: 10, align: 'center', border: true });
      sCell(ws, row, 1, _fyOf(d.date), { sz: 9, align: 'center', color: '64748B', border: true });
      sCell(ws, row, 2, positionsList, { sz: 9, wrap: true, border: true });
      sCell(ws, row, 3, d.positions.size, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 4, d.coupon, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 5, d.couponTDS, { sz: 10, align: 'right', fmt: '#,##0.00', color: RED, border: true });
      sCell(ws, row, 6, d.couponPostTax, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 7, d.principal, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 8, dayNet, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: dayNet < 0 ? RED : undefined, border: true });
      row++;
    }
    if (dailyAgg.length === 0) {
      sCell(ws, row, 0, 'No daily aggregated events to display.', { sz: 10, italic: true, color: '64748B', border: true });
      for (let c = 1; c <= 8; c++) sCell(ws, row, c, '', { border: true });
      row++;
    }
    setRange(ws, row + 1, 8);
    XLSX.utils.book_append_sheet(wb, ws, 'Daily');
  }

  // ─── Sheet 4: Per-Position Cashflow ────────────────────────────────────
  {
    const ws = {};
    ws['!merges'] = [];
    // 10 columns: lot block uses all 10; events block uses 9 (last col empty)
    ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 28 }];
    let row = 0;
    sCell(ws, row, 0, `PER-POSITION CASHFLOW — ${port.client.name || ''}`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 9; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
    row += 2;

    for (const pos of port.positions) {
      const pm = _positionMetrics(pos, asOfDate);
      const tax = _classifyTaxCategory(pos);
      const showOutstanding = Math.abs(pm.fvOutstanding - pm.fvAtPurchase) > 0.5;

      // Position header
      sCell(ws, row, 0, `${pos.secName}    [${pos.isin || '—'}]`, { bold: true, fill: AMBER, color: WHITE, sz: 11 });
      for (let c = 1; c <= 9; c++) sCell(ws, row, c, '', { fill: AMBER });
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
      row++;
      const fvLine = showOutstanding
        ? `FV at Purchase: ${pm.fvAtPurchase.toFixed(2)} · FV Outstanding: ${pm.fvOutstanding.toFixed(2)}`
        : `FV at Purchase: ${pm.fvAtPurchase.toFixed(2)}`;
      sCell(ws, row, 0, `Type: ${tax.label}    Lots: ${pm.lotCount}    Qty: ${pm.qty}    ${fvLine}    Invested: ${pm.invested.toFixed(2)}    Wt YTM: ${(pm.wtdYTM*100).toFixed(2)}%`,
              { sz: 9, italic: true, fill: LGRAY, color: '475569' });
      for (let c = 1; c <= 9; c++) sCell(ws, row, c, '', { fill: LGRAY });
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
      row++;

      // Lot summary table — 10 cols (FV at Purchase | FV Outstanding side by side)
      sCell(ws, row, 0, 'Lot #', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 1, 'Value Date', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 2, 'Qty', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 3, 'FV at Purchase (₹)', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 4, 'FV Outstanding (₹)', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 5, 'Price %', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 6, 'Invested (₹)', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 7, 'Accrued Paid', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 8, 'Lot YTM', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      sCell(ws, row, 9, 'Notes', { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true });
      row++;
      pos.lots.forEach((l, li) => {
        const lm = (l.bondState && l.bondState.meta) || {};
        const lotFvAtPurchase = (l.fvAtPurchase != null && l.fvAtPurchase >= 0) ? l.fvAtPurchase : (l.fvTotal || 0);
        const lotOS = _outstandingFvForLot(l, asOfDate);
        const isPartial = lotOS > 0.5 && lotOS < lotFvAtPurchase - 0.5;
        const isFull    = lotOS < 0.5 && lotFvAtPurchase > 0.5;
        const osColor   = isFull ? '94A3B8' : (isPartial ? '7C3AED' : undefined);
        sCell(ws, row, 0, li + 1, { sz: 9, align: 'center', border: true });
        sCell(ws, row, 1, _excelDateStr(l.valueDate), { sz: 9, align: 'center', border: true });
        sCell(ws, row, 2, l.qty, { sz: 9, align: 'right', fmt: '#,##0', border: true });
        sCell(ws, row, 3, lotFvAtPurchase, { sz: 9, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 4, lotOS, { sz: 9, align: 'right', fmt: '#,##0.00', color: osColor, bold: !!osColor, border: true });
        sCell(ws, row, 5, l.pricePct != null ? l.pricePct / 100 : '', { sz: 9, align: 'right', fmt: '0.0000%', border: true });
        sCell(ws, row, 6, l.consideration, { sz: 9, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 7, l.accruedPaid, { sz: 9, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 8, lm.xirrRate || 0, { sz: 9, align: 'right', fmt: '0.00%', border: true });
        sCell(ws, row, 9, l.notes || '', { sz: 9, color: '64748B', border: true });
        row++;
      });
      row++;

      // Cashflow events for this position (after asOf) — kept LOT-LEVEL for full attribution
      const posEvents = events.filter(e => e.positionId === pos.id);
      if (posEvents.length === 0) {
        sCell(ws, row, 0, 'No future cashflows after as-of date for this position.', { sz: 9, italic: true, color: '64748B' });
        ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
        row += 2;
        continue;
      }
      ['Date', 'FY', 'Qty', 'Type', 'Gross', 'TDS', 'Post-Tax', 'Net', 'Note', ''].forEach((h, i) =>
        sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 9, align: 'center', border: true }));
      row++;
      let posTotal = 0;
      for (const e of posEvents) {
        posTotal += e.net;
        sCell(ws, row, 0, _fmtDate(e.date), { sz: 9, align: 'center', border: true });
        sCell(ws, row, 1, _fyOf(e.date), { sz: 9, align: 'center', color: '64748B', border: true });
        sCell(ws, row, 2, e.qty || 0, { sz: 9, align: 'right', fmt: '#,##0', border: true });
        sCell(ws, row, 3, e.type, { sz: 9, align: 'center', bold: true, color: e.type === 'Purchase' ? RED : (e.type === 'Coupon' ? GREEN : BLUE), border: true });
        sCell(ws, row, 4, e.gross, { sz: 9, align: 'right', fmt: '#,##0.00', color: e.gross < 0 ? RED : undefined, border: true });
        sCell(ws, row, 5, e.tds, { sz: 9, align: 'right', fmt: '#,##0.00', color: e.tds > 0 ? RED : undefined, border: true });
        sCell(ws, row, 6, e.postTax, { sz: 9, align: 'right', fmt: '#,##0.00', border: true });
        sCell(ws, row, 7, e.net, { sz: 9, align: 'right', fmt: '#,##0.00', bold: true, color: e.net < 0 ? RED : undefined, border: true });
        sCell(ws, row, 8, e.note || '', { sz: 9, color: '64748B', border: true });
        sCell(ws, row, 9, '', { sz: 9, border: true });
        row++;
      }
      // Position subtotal
      sCell(ws, row, 0, 'POSITION TOTAL', { bold: true, fill: MAMBER, sz: 9, border: true });
      for (let c = 1; c <= 6; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
      sCell(ws, row, 7, posTotal, { sz: 9, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 8, '', { fill: MAMBER, border: true });
      sCell(ws, row, 9, '', { fill: MAMBER, border: true });
      row += 2;
    }

    setRange(ws, row + 1, 9);
    XLSX.utils.book_append_sheet(wb, ws, 'Per-Position');
  }

  // Trigger download
  const safeName = (port.client.name || 'Portfolio').replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30) || 'Portfolio';
  XLSX.writeFile(wb, `${safeName}_Cashflow_${_fmtDate(asOfDate).replace(/-/g, '')}.xlsx`);
}


// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — CONSOLIDATED TAX REPORT
// ═══════════════════════════════════════════════════════════════════════════
// Per-FY tax aggregation across all positions in a portfolio.
// Workbook structure:
//   Sheet 1 — Tax Summary       (aggregates: Sched OS, EI, CG, TDS, liability)
//   Sheet 2 — Schedule OS Detail (taxable interest, per-bond, Sec 145A)
//   Sheet 3 — Schedule EI Detail (tax-free interest under Sec 10(15))         [omitted if none]
//   Sheet 4 — Schedule CG Detail (capital gains, only sold lots)              [omitted if none]
//   Sheet 5 — Per-Lot Worksheet  (audit trail)
//
// CG only included for lots with explicit `lot.sale = {...}` data within the FY.
// Tax slab for interest: per lot (stored at calc time). Listed bond LTCG threshold = 365 days.
// ═══════════════════════════════════════════════════════════════════════════

// Compute per-lot tax for a given FY.
// Returns { schedule, components } where components include all numbers needed for the report.
function _computeLotTaxForFY(position, lot, fyStr) {
  const taxCat = _classifyTaxCategory(position);
  const slab = _getLotTaxSlab(lot);
  const fyStart = parseInt(fyStr.split('-')[0]);
  const fyStartDate = new Date(fyStart, 3, 1);     // 1 Apr
  const fyEndDate   = new Date(fyStart + 1, 2, 31);// 31 Mar

  const meta = (lot.bondState && lot.bondState.meta) || {};
  const rows = (lot.bondState && lot.bondState.rows) || [];
  const couponDec = (meta.couponPct || 0) / 100;
  const dcConv = meta.dcConv || 'act/act';
  const matDate = meta.matDate ? new Date(meta.matDate) : null;
  const valueDate = lot.valueDate ? new Date(lot.valueDate) : (meta.valueDate ? new Date(meta.valueDate) : null);

  const result = {
    lotId: lot.id,
    positionId: position.id,
    positionName: position.secName || position.isin || 'Position',
    isin: position.isin || '',
    label: lot.label || '',
    valueDate,
    qty: lot.qty || 0,
    fvAtPurchase: lot.fvAtPurchase || lot.fvTotal || 0,
    consideration: lot.consideration || 0,
    accruedPaid: lot.accruedPaid || 0,
    pricePct: lot.pricePct,
    taxCategory: taxCat.category,
    taxLabel: taxCat.label,
    taxSlab: slab,
    tdsRate: taxCat.tdsOnCoupon,
    interestTaxable: taxCat.interestTaxable,

    // Outputs (filled below)
    couponsInFY: 0,            // gross coupon received in FY (post-purchase, pre-sale)
    tdsDeducted: 0,            // 10% × couponsInFY (for taxable corp NCDs)
    openingAccrual: 0,         // Sec 145A: accrued at start of FY
    closingAccrual: 0,         // Sec 145A: accrued at end of FY
    sec145Adjustment: 0,       // (closing − opening − accruedPaid + accruedReceivedAtSale)
    taxableInterest: 0,        // What goes to Schedule OS (or Schedule EI if tax-free)
    exemptInterest: 0,         // For tax-free bonds (Sec 10(15))

    isSoldInFY: false,
    saleDate: null,
    salePricePct: null,
    saleProceeds: 0,
    accruedReceivedAtSale: 0,
    holdingDays: 0,
    isLTCG: false,
    capitalGain: 0,
    cgTaxRate: 0,              // 0.125 for LTCG, slab for STCG
    cgTaxLiability: 0
  };

  // ── Coupons received in FY (lot-level) ─────────────────────────────────
  // Walk the rows: include rows where date is in FY AND date > valueDate AND (no sale or date <= saleDate).
  const sale = lot.sale || null;
  const saleDate = sale && sale.date ? new Date(sale.date) : null;
  const saleInFY = saleDate && saleDate >= fyStartDate && saleDate <= fyEndDate;
  result.isSoldInFY = !!saleInFY;
  if (saleInFY) {
    result.saleDate = saleDate;
    result.salePricePct = sale.pricePct;
    result.accruedReceivedAtSale = sale.accruedReceived || 0;
  }

  for (const r of rows) {
    const rd = r.date instanceof Date ? r.date : (r.date ? new Date(r.date) : null);
    if (!rd || isNaN(rd.getTime())) continue;
    if (r.buyerMisses) continue;
    if (valueDate && rd <= valueDate) continue;
    if (rd < fyStartDate || rd > fyEndDate) continue;
    if (saleDate && rd > saleDate) continue;
    const interest = r.interest || 0;
    if (interest > 0.005) {
      result.couponsInFY += interest;
    }
  }

  // ── TDS on coupons (only for taxable corp; 10% u/s 193) ─────────────────
  result.tdsDeducted = result.couponsInFY * taxCat.tdsOnCoupon;

  // ── Sec 145A accrual treatment (per-bond, per-FY) ──────────────────────
  // Opening accrual = accrued from last IP before fyStart up to fyStart, computed on outstanding at that time
  // Closing accrual = accrued from last IP <= fyEnd up to fyEnd
  // Adjustment = closing − opening − accruedPaidIfPurchaseInFY + accruedReceivedAtSaleIfSoldInFY
  // (matches the bond-level tax report's logic)
  // Skip for ZCB (no coupon accrual concept) and tax-free (interest exempt — accrual irrelevant)
  if (!taxCat.interestTaxable || taxCat.category === 'zcb') {
    // No 145A adjustment for these
    result.openingAccrual = 0;
    result.closingAccrual = 0;
    result.sec145Adjustment = 0;
  } else {
    const ipDates = (lot.bondState && lot.bondState.ipDates) || [];
    const ipDateObjs = ipDates.map(d => d instanceof Date ? d : new Date(d)).filter(d => d && !isNaN(d.getTime()));

    // Helper: accrual from previous IP to a target date, on outstanding balance at that point
    const accrualUpTo = (targetDate) => {
      if (!targetDate) return 0;
      // Find the most recent IP date <= targetDate
      const prevIPs = ipDateObjs.filter(d => d <= targetDate);
      const lastIP = prevIPs.length ? prevIPs[prevIPs.length - 1] : (valueDate || null);
      if (!lastIP || lastIP >= targetDate) return 0;
      // Find outstanding at the row just before targetDate
      let outstanding = lot.fvAtPurchase || lot.fvTotal || 0;
      for (const r of rows) {
        const rd = r.date instanceof Date ? r.date : new Date(r.date);
        if (!rd || isNaN(rd.getTime())) continue;
        if (rd > targetDate) break;
        if ((r.principal || 0) > 0.005 && r.outstandingAfter != null) {
          outstanding = r.outstandingAfter;
        }
      }
      // Use couponInterest helper (already in the codebase) for day-count-correct accrual
      try {
        const dc = couponInterest(outstanding, couponDec, lastIP, targetDate, dcConv);
        return dc.interest;
      } catch (e) {
        // Fallback: simple ACT/365
        const days = (targetDate - lastIP) / 86400000;
        return outstanding * couponDec * days / 365;
      }
    };

    // Opening: accrual up to fyStart (only if bond was held on Apr 1)
    if (valueDate && valueDate < fyStartDate && (!matDate || fyStartDate < matDate)) {
      result.openingAccrual = accrualUpTo(fyStartDate);
    }
    // Closing: accrual up to fyEnd (only if held on 31 Mar — i.e. not sold/matured before)
    const stillHeldAtFyEnd = (!saleDate || saleDate > fyEndDate)
                          && (!matDate || matDate > fyEndDate)
                          && valueDate && valueDate <= fyEndDate;
    if (stillHeldAtFyEnd) {
      result.closingAccrual = accrualUpTo(fyEndDate);
    }
    // Accrued paid at purchase (only if purchase happened in this FY)
    const accruedPaidThisFY = (valueDate && valueDate >= fyStartDate && valueDate <= fyEndDate)
                                ? (lot.accruedPaid || 0) : 0;
    // Sec 145A: closing accrual − opening accrual − accruedPaid (deductible) + accruedReceivedAtSale
    // NB: the standard Sec 145A formulation is:
    //   Taxable Interest = Coupons received + (Closing − Opening) − accrued paid at purchase + accrued received at sale
    // We compute the *adjustment* component separately so the report can show it cleanly.
    result.sec145Adjustment = result.closingAccrual
                            - result.openingAccrual
                            - accruedPaidThisFY
                            + result.accruedReceivedAtSale;
  }

  // ── Final taxable / exempt interest figures ─────────────────────────────
  if (taxCat.category === 'taxfree') {
    result.exemptInterest = result.couponsInFY;
    result.taxableInterest = 0;
  } else if (taxCat.category === 'zcb') {
    // ZCB tax handled differently — for now, mark as needing Schedule OS placeholder
    // Full Sec 145A annual accretion / Sec 50AA at-maturity logic deferred
    result.taxableInterest = 0;     // TODO Phase 4: ZCB-specific logic
    result.exemptInterest = 0;
  } else {
    // Taxable corp / G-Sec: coupons + Sec 145A adjustment
    result.taxableInterest = result.couponsInFY + result.sec145Adjustment;
    result.exemptInterest = 0;
  }

  // ── Capital gains (only if sold in FY) ─────────────────────────────────
  if (saleInFY && valueDate) {
    const holdingDays = Math.round((saleDate - valueDate) / 86400000);
    result.holdingDays = holdingDays;
    // Listed-bond LTCG threshold per Finance Act 2024: > 12 months
    result.isLTCG = holdingDays > 365;

    const fvAtPurchase = lot.fvAtPurchase || lot.fvTotal || 0;
    const purchasePrincipal = (lot.pricePct != null) ? (lot.pricePct / 100) * fvAtPurchase : (lot.consideration - lot.accruedPaid);
    // Sale proceeds — outstanding face value at sale date × salePricePct
    const osAtSale = _outstandingFvForLot(lot, saleDate);
    const saleProceeds = (sale.pricePct / 100) * (osAtSale || fvAtPurchase);
    result.saleProceeds = saleProceeds;

    // For amortizing bonds, the cost basis we should compare against is
    // (fvAtPurchase × pricePct%) BUT need to subtract any principal repayments received.
    // Total principal repaid between value date and sale date:
    let principalRepaid = 0;
    for (const r of rows) {
      const rd = r.date instanceof Date ? r.date : new Date(r.date);
      if (!rd || isNaN(rd.getTime())) continue;
      if (valueDate && rd <= valueDate) continue;
      if (rd > saleDate) break;
      principalRepaid += (r.principal || 0);
    }
    // Adjusted cost basis = original purchase principal − principal already received back
    const adjustedCost = Math.max(0, purchasePrincipal - principalRepaid);
    result.capitalGain = saleProceeds - adjustedCost;

    // Tax rate on CG
    if (result.isLTCG) {
      result.cgTaxRate = 0.125;          // 12.5% LTCG (listed bond, post Jul-2024)
    } else {
      result.cgTaxRate = slab;           // STCG at slab for listed bonds
    }
    result.cgTaxLiability = Math.max(0, result.capitalGain) * result.cgTaxRate;
  }

  return result;
}

// Aggregate tax data for the entire portfolio across one FY
function _buildPortfolioTaxReport(portfolio, fyStr) {
  if (!portfolio || !portfolio.positions) return null;

  const lotResults = [];
  for (const pos of portfolio.positions) {
    for (const lot of (pos.lots || [])) {
      const r = _computeLotTaxForFY(pos, lot, fyStr);
      lotResults.push(r);
    }
  }

  // Aggregate by category
  const agg = {
    fy: fyStr,
    totalCoupons:        0,
    totalTDS:            0,
    totalSec145A:        0,
    totalTaxableInterest: 0,    // Schedule OS
    totalExemptInterest:  0,    // Schedule EI (Sec 10(15))
    totalLTCG:            0,
    totalSTCG:            0,
    totalLTCGTax:         0,
    totalSTCGTax:         0,
    totalCapitalGains:    0,
    soldLots: [],
    osLots: [],
    eiLots: [],
    allLots: lotResults
  };

  for (const r of lotResults) {
    agg.totalCoupons += r.couponsInFY;
    agg.totalTDS     += r.tdsDeducted;
    agg.totalSec145A += r.sec145Adjustment;

    if (r.exemptInterest > 0) {
      agg.totalExemptInterest += r.exemptInterest;
      agg.eiLots.push(r);
    }
    if (r.taxableInterest > 0) {
      agg.totalTaxableInterest += r.taxableInterest;
      agg.osLots.push(r);
    }
    if (r.isSoldInFY) {
      agg.soldLots.push(r);
      agg.totalCapitalGains += r.capitalGain;
      if (r.isLTCG) {
        agg.totalLTCG    += r.capitalGain;
        agg.totalLTCGTax += r.cgTaxLiability;
      } else {
        agg.totalSTCG    += r.capitalGain;
        agg.totalSTCGTax += r.cgTaxLiability;
      }
    }
  }

  return agg;
}

// ── Excel orchestrator ──────────────────────────────────────────────────────
function downloadConsolidatedTaxReport(portfolioId, fyStr) {
  const port = _findPortfolio(portfolioId);
  if (!port) { alert('Portfolio not found'); return; }
  if (!port.positions || port.positions.length === 0) {
    alert('No positions in this portfolio.');
    return;
  }
  if (typeof XLSX === 'undefined' || !XLSX.utils) {
    alert('Excel library not loaded.');
    return;
  }

  const taxReport = _buildPortfolioTaxReport(port, fyStr);
  if (!taxReport) { alert('Failed to build tax report'); return; }

  const wb = XLSX.utils.book_new();
  const NAVY = '0F172A', AMBER = 'F59E0B', GREEN = '16A34A', RED = 'DC2626', BLUE = '2563EB', PURPLE = '7C3AED';
  const LGRAY = 'F1F5F9', MGRAY = 'E2E8F0', WHITE = 'FFFFFF', MAMBER = 'FEF3C7';

  function sCell(ws, r, c, val, opts) {
    opts = opts || {};
    const addr = XLSX.utils.encode_cell({ r, c });
    const safeVal = (val === undefined || val === null) ? '' : val;
    ws[addr] = { v: safeVal, t: typeof safeVal === 'number' ? 'n' : 's' };
    if (opts.fmt) ws[addr].z = opts.fmt;
    if (opts.bold || opts.fill || opts.color || opts.align || opts.sz || opts.italic || opts.border || opts.wrap) {
      ws[addr].s = {};
      ws[addr].s.font = { name: 'Calibri', sz: opts.sz || 10, bold: !!opts.bold, italic: !!opts.italic };
      if (opts.color) ws[addr].s.font.color = { rgb: opts.color };
      if (opts.fill)  ws[addr].s.fill = { fgColor: { rgb: opts.fill }, patternType: 'solid' };
      if (opts.align || opts.wrap) {
        ws[addr].s.alignment = { horizontal: opts.align || (typeof safeVal === 'number' ? 'right' : 'left'), vertical: 'center', wrapText: !!opts.wrap };
      }
      if (opts.border) {
        ws[addr].s.border = { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'thin', color: { rgb: 'CBD5E1' } }, left: { style: 'thin', color: { rgb: 'CBD5E1' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } };
      }
    }
  }
  function setRange(ws, lastRow, lastCol) {
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
  }

  const fyLabel = fyStr;
  const fyStart = parseInt(fyStr.split('-')[0]);
  const fyDateRange = `1 Apr ${fyStart} – 31 Mar ${fyStart + 1}`;

  // ─── Sheet 1: Tax Summary ────────────────────────────────────────────────
  {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
    let row = 0;

    sCell(ws, row, 0, `INDIAN FY TAX REPORT — FY ${fyLabel}`, { bold: true, fill: NAVY, color: WHITE, sz: 14 });
    for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;
    sCell(ws, row, 0, `Client: ${port.client.name || '—'}    PAN: ${port.client.pan || '—'}`, { bold: true, fill: LGRAY, sz: 11 });
    for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: LGRAY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;
    sCell(ws, row, 0, `FY Period: ${fyDateRange}    Generated: ${_fmtDate(new Date())}`, { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row += 2;

    // Schedule OS — Income from Other Sources
    sCell(ws, row, 0, 'SCHEDULE OS — INCOME FROM OTHER SOURCES', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
    for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: AMBER });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;
    sCell(ws, row, 0, 'Taxable interest from bonds (post Sec 145A)', { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    const osRows = [
      ['Coupon income received (gross)', taxReport.totalCoupons],
      ['Sec 145A accrual adjustment (closing − opening − paid + recd)', taxReport.totalSec145A],
      ['Taxable interest (Schedule OS)', taxReport.totalTaxableInterest, true]
    ];
    for (const [k, v, isTotal] of osRows) {
      sCell(ws, row, 0, k, { sz: 10, fill: isTotal ? MAMBER : LGRAY, bold: !!isTotal, border: true });
      sCell(ws, row, 1, '', { fill: isTotal ? MAMBER : LGRAY, border: true });
      sCell(ws, row, 2, '', { fill: isTotal ? MAMBER : LGRAY, border: true });
      sCell(ws, row, 3, v, { sz: 10, align: 'right', fmt: '#,##0.00', bold: !!isTotal, fill: isTotal ? MAMBER : undefined, border: true });
      row++;
    }
    row++;

    // Schedule EI — only if there are exempt-income positions
    if (taxReport.totalExemptInterest > 0) {
      sCell(ws, row, 0, 'SCHEDULE EI — EXEMPT INCOME (Sec 10(15))', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
      for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: AMBER });
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
      row++;
      sCell(ws, row, 0, 'Tax-free bond interest (PFC/REC/IRFC etc.)', { sz: 10, fill: LGRAY, border: true });
      sCell(ws, row, 1, '', { fill: LGRAY, border: true });
      sCell(ws, row, 2, '', { fill: LGRAY, border: true });
      sCell(ws, row, 3, taxReport.totalExemptInterest, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: LGRAY, border: true });
      row++;
      row++;
    }

    // Schedule CG — only if there are sales
    if (taxReport.soldLots.length > 0) {
      sCell(ws, row, 0, 'SCHEDULE CG — CAPITAL GAINS', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
      for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: AMBER });
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
      row++;
      sCell(ws, row, 0, 'Listed-bond LTCG threshold > 12 months @ 12.5% · STCG ≤ 12 months at slab (Finance Act 2024)',
            { sz: 9, italic: true, color: '64748B' });
      ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
      row++;
      const cgRows = [
        ['Long-Term Capital Gains (>12 months)',  taxReport.totalLTCG, ''],
        ['  Tax @ 12.5%', '', '', taxReport.totalLTCGTax],
        ['Short-Term Capital Gains (≤12 months)', taxReport.totalSTCG, ''],
        ['  Tax at slab (varies by lot)', '', '', taxReport.totalSTCGTax],
        ['Total Capital Gains', taxReport.totalCapitalGains, '', '', true],
        ['Total CG Tax', '', '', taxReport.totalLTCGTax + taxReport.totalSTCGTax, true]
      ];
      for (const r of cgRows) {
        const isTotal = r[4] === true;
        sCell(ws, row, 0, r[0], { sz: 10, fill: isTotal ? MAMBER : LGRAY, bold: !!isTotal, border: true });
        sCell(ws, row, 1, r[1] !== '' ? r[1] : '', { sz: 10, align: 'right', fmt: '#,##0.00', fill: isTotal ? MAMBER : undefined, bold: !!isTotal, border: true });
        sCell(ws, row, 2, '', { fill: isTotal ? MAMBER : undefined, border: true });
        sCell(ws, row, 3, r[3] !== '' && r[3] != null ? r[3] : '', { sz: 10, align: 'right', fmt: '#,##0.00', fill: isTotal ? MAMBER : undefined, bold: !!isTotal, border: true, color: r[0].startsWith('Total CG Tax') ? RED : undefined });
        row++;
      }
      row++;
    }

    // TDS Credit
    sCell(ws, row, 0, 'TDS CREDIT (FORM 26AS)', { bold: true, fill: AMBER, color: WHITE, sz: 11 });
    for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: AMBER });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;
    sCell(ws, row, 0, 'Total TDS deducted on coupons (10% u/s 193, listed taxable bonds)', { sz: 10, fill: LGRAY, border: true });
    sCell(ws, row, 1, '', { fill: LGRAY, border: true });
    sCell(ws, row, 2, '', { fill: LGRAY, border: true });
    sCell(ws, row, 3, taxReport.totalTDS, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: LGRAY, color: GREEN, border: true });
    row += 2;

    setRange(ws, row + 1, 3);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // ─── Sheet 2: Schedule OS Detail ────────────────────────────────────────
  {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
    let row = 0;
    sCell(ws, row, 0, `SCHEDULE OS DETAIL — FY ${fyLabel}`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 7; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
    row++;
    sCell(ws, row, 0, 'Per-lot taxable interest with Sec 145A treatment. Adjustment = Closing accrual − Opening accrual − Accrued paid at purchase + Accrued received at sale.', { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
    row += 2;
    ['Bond / ISIN', 'Qty', 'Type', 'Coupons (₹)', 'Open. Accrual', 'Close. Accrual', 'Sec 145A Adj.', 'Taxable Int. (₹)'].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    let totC = 0, totA = 0;
    for (const r of taxReport.osLots) {
      sCell(ws, row, 0, `${r.positionName}\n${r.isin}`, { sz: 10, wrap: true, border: true });
      sCell(ws, row, 1, r.qty, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 2, r.taxLabel, { sz: 9, align: 'center', fill: LGRAY, border: true });
      sCell(ws, row, 3, r.couponsInFY, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 4, r.openingAccrual, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 5, r.closingAccrual, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 6, r.sec145Adjustment, { sz: 10, align: 'right', fmt: '#,##0.00', color: r.sec145Adjustment < 0 ? RED : undefined, border: true });
      sCell(ws, row, 7, r.taxableInterest, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, border: true });
      totC += r.couponsInFY; totA += r.sec145Adjustment;
      row++;
    }
    if (taxReport.osLots.length === 0) {
      sCell(ws, row, 0, 'No taxable interest contributions in this FY.', { sz: 10, italic: true, color: '64748B', border: true });
      for (let c = 1; c <= 7; c++) sCell(ws, row, c, '', { border: true });
      row++;
    } else {
      sCell(ws, row, 0, 'TOTAL', { bold: true, fill: MAMBER, sz: 10, border: true });
      for (let c = 1; c <= 2; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
      sCell(ws, row, 3, totC, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      for (let c = 4; c <= 5; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
      sCell(ws, row, 6, totA, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      sCell(ws, row, 7, taxReport.totalTaxableInterest, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
      row++;
    }
    setRange(ws, row + 1, 7);
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule OS');
  }

  // ─── Sheet 3: Schedule EI Detail (only if exempt income exists) ────────
  if (taxReport.totalExemptInterest > 0) {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [{ wch: 36 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
    let row = 0;
    sCell(ws, row, 0, `SCHEDULE EI DETAIL — FY ${fyLabel}`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 3; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;
    sCell(ws, row, 0, 'Tax-free bond interest under Sec 10(15)(iv) — fully exempt; no TDS.', { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row += 2;
    ['Bond / ISIN', 'Qty', 'Type', 'Exempt Interest (₹)'].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    for (const r of taxReport.eiLots) {
      sCell(ws, row, 0, `${r.positionName}\n${r.isin}`, { sz: 10, wrap: true, border: true });
      sCell(ws, row, 1, r.qty, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 2, r.taxLabel, { sz: 9, align: 'center', fill: LGRAY, border: true });
      sCell(ws, row, 3, r.exemptInterest, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, border: true });
      row++;
    }
    sCell(ws, row, 0, 'TOTAL EXEMPT INTEREST', { bold: true, fill: MAMBER, sz: 10, border: true });
    for (let c = 1; c <= 2; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
    sCell(ws, row, 3, taxReport.totalExemptInterest, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
    row++;
    setRange(ws, row + 1, 3);
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule EI');
  }

  // ─── Sheet 4: Schedule CG Detail (only if sales exist) ─────────────────
  if (taxReport.soldLots.length > 0) {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 11 }, { wch: 13 }, { wch: 14 }];
    let row = 0;
    sCell(ws, row, 0, `SCHEDULE CG DETAIL — FY ${fyLabel}`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 9; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
    row++;
    sCell(ws, row, 0, 'Capital gains on lots sold during FY. Cost basis adjusted for any pre-sale principal repayments.', { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
    row += 2;
    ['Bond / ISIN', 'Buy Date', 'Sale Date', 'Holding (days)', 'Sale Proceeds', 'Adj. Cost Basis', 'Capital Gain', 'LTCG/STCG', 'Tax Rate', 'CG Tax'].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    for (const r of taxReport.soldLots) {
      const adjCost = r.saleProceeds - r.capitalGain;
      const cgType = r.isLTCG ? 'LTCG' : 'STCG';
      sCell(ws, row, 0, `${r.positionName}\n${r.isin}`, { sz: 10, wrap: true, border: true });
      sCell(ws, row, 1, _fmtDate(r.valueDate), { sz: 10, align: 'center', border: true });
      sCell(ws, row, 2, _fmtDate(r.saleDate), { sz: 10, align: 'center', border: true });
      sCell(ws, row, 3, r.holdingDays, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 4, r.saleProceeds, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 5, adjCost, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 6, r.capitalGain, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: r.capitalGain < 0 ? RED : GREEN, border: true });
      sCell(ws, row, 7, cgType, { sz: 10, align: 'center', bold: true, color: r.isLTCG ? GREEN : BLUE, border: true });
      sCell(ws, row, 8, r.cgTaxRate, { sz: 10, align: 'right', fmt: '0.0%', border: true });
      sCell(ws, row, 9, r.cgTaxLiability, { sz: 10, align: 'right', fmt: '#,##0.00', color: RED, bold: true, border: true });
      row++;
    }
    // Subtotals
    sCell(ws, row, 0, 'TOTAL LTCG', { bold: true, fill: MAMBER, sz: 10, border: true });
    for (let c = 1; c <= 5; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
    sCell(ws, row, 6, taxReport.totalLTCG, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
    sCell(ws, row, 7, '', { fill: MAMBER, border: true });
    sCell(ws, row, 8, '', { fill: MAMBER, border: true });
    sCell(ws, row, 9, taxReport.totalLTCGTax, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: RED, fill: MAMBER, border: true });
    row++;
    sCell(ws, row, 0, 'TOTAL STCG', { bold: true, fill: MAMBER, sz: 10, border: true });
    for (let c = 1; c <= 5; c++) sCell(ws, row, c, '', { fill: MAMBER, border: true });
    sCell(ws, row, 6, taxReport.totalSTCG, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, fill: MAMBER, border: true });
    sCell(ws, row, 7, '', { fill: MAMBER, border: true });
    sCell(ws, row, 8, '', { fill: MAMBER, border: true });
    sCell(ws, row, 9, taxReport.totalSTCGTax, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, color: RED, fill: MAMBER, border: true });
    row++;
    setRange(ws, row + 1, 9);
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule CG');
  }

  // ─── Sheet 5: Per-Lot Worksheet (audit trail) ──────────────────────────
  {
    const ws = {};
    ws['!merges'] = [];
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 11 }, { wch: 9 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    let row = 0;
    sCell(ws, row, 0, `PER-LOT WORKSHEET — FY ${fyLabel}`, { bold: true, fill: NAVY, color: WHITE, sz: 12 });
    for (let c = 1; c <= 9; c++) sCell(ws, row, c, '', { fill: NAVY });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
    row++;
    sCell(ws, row, 0, 'Audit trail: every lot in portfolio with all source numbers feeding the FY computation.', { sz: 9, italic: true, color: '64748B' });
    ws['!merges'].push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
    row += 2;
    ['Bond / ISIN', 'Value Date', 'Type', 'Qty', 'FV at Purchase', 'Coupons in FY', 'Sec 145A Adj.', 'Tax. Int.', 'CG (if sold)', 'Sale Date'].forEach((h, i) =>
      sCell(ws, row, i, h, { bold: true, fill: MGRAY, sz: 10, align: 'center', border: true }));
    row++;
    for (const r of taxReport.allLots) {
      sCell(ws, row, 0, `${r.positionName}\n${r.isin}`, { sz: 10, wrap: true, border: true });
      sCell(ws, row, 1, _fmtDate(r.valueDate), { sz: 10, align: 'center', border: true });
      sCell(ws, row, 2, r.taxLabel, { sz: 9, align: 'center', fill: LGRAY, border: true });
      sCell(ws, row, 3, r.qty, { sz: 10, align: 'right', fmt: '#,##0', border: true });
      sCell(ws, row, 4, r.fvAtPurchase, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 5, r.couponsInFY, { sz: 10, align: 'right', fmt: '#,##0.00', border: true });
      sCell(ws, row, 6, r.sec145Adjustment, { sz: 10, align: 'right', fmt: '#,##0.00', color: r.sec145Adjustment < 0 ? RED : undefined, border: true });
      sCell(ws, row, 7, r.taxableInterest, { sz: 10, align: 'right', fmt: '#,##0.00', bold: true, border: true });
      sCell(ws, row, 8, r.isSoldInFY ? r.capitalGain : '', { sz: 10, align: 'right', fmt: '#,##0.00', color: r.isSoldInFY && r.capitalGain < 0 ? RED : undefined, border: true });
      sCell(ws, row, 9, r.isSoldInFY ? _fmtDate(r.saleDate) : '—', { sz: 10, align: 'center', color: r.isSoldInFY ? undefined : '94A3B8', border: true });
      row++;
    }
    setRange(ws, row + 1, 9);
    XLSX.utils.book_append_sheet(wb, ws, 'Per-Lot');
  }

  // Trigger download
  const safeName = (port.client.name || 'Portfolio').replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30) || 'Portfolio';
  XLSX.writeFile(wb, `${safeName}_TaxReport_FY${fyLabel}.xlsx`);
}

// ── UI: Tax Report dialog (FY selector) ─────────────────────────────────────
function showPortfolioTaxReportDialog(portfolioId) {
  const p = _findPortfolio(portfolioId);
  if (!p) return;
  if (!p.positions || p.positions.length === 0) {
    alert('No positions in this portfolio.');
    return;
  }
  document.getElementById('portTaxDialogPortId').value = portfolioId;
  // Default to current FY
  const today = new Date();
  const curFyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const fySel = document.getElementById('portTaxFY');
  // Build options: 5 FYs back through current
  fySel.innerHTML = '';
  for (let s = curFyStart - 4; s <= curFyStart; s++) {
    const fy = `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
    const opt = document.createElement('option');
    opt.value = fy;
    opt.textContent = `FY ${fy}  (Apr ${s} – Mar ${s + 1})`;
    if (s === curFyStart) opt.selected = true;
    fySel.appendChild(opt);
  }
  const summary = _portfolioSummary(p);
  document.getElementById('portTaxDialogSummary').textContent =
    `${p.client.name || 'Client'} · ${summary.positionCount} positions · ${summary.lotCount} lots`;
  document.getElementById('portTaxDialogOverlay').style.display = 'flex';
}
function closePortfolioTaxReportDialog() {
  document.getElementById('portTaxDialogOverlay').style.display = 'none';
}
function _generatePortfolioTaxReport() {
  const id = document.getElementById('portTaxDialogPortId').value;
  const fy = document.getElementById('portTaxFY').value;
  if (!fy) { alert('Please select an FY'); return; }
  closePortfolioTaxReportDialog();
  setTimeout(() => downloadConsolidatedTaxReport(id, fy), 100);
}

// ── UI: Mark Lot as Sold dialog ─────────────────────────────────────────────
let _saleDialogPortId = null, _saleDialogPosId = null, _saleDialogLotId = null;

// Auto-compute accrued received at sale for a lot (mirror of computeSaleAccruedAuto
// which reads from window._lastCalcMeta). This version reads from the lot's stored
// snapshot so it works inside the Portfolio Manager sale dialog.
//
// Logic:
//   • CUM-DIV  (sale ≤ next IP's record date):  accrued = O/S × coupon × (lastIP → saleDate) / denom (positive)
//   • EX-DIV   (sale >  next IP's record date): accrued = O/S × coupon × (saleDate → nextIP) / denom (negative)
// Uses couponInterest() for day-count-correct math (ACT/ACT, 30/360, G-Sec, etc.)
function _computeLotSaleAccruedAuto() {
  const saleDateStr = document.getElementById('saleDialogDate').value;
  if (!saleDateStr) return;
  if (!_saleDialogPortId || !_saleDialogPosId || !_saleDialogLotId) return;

  const p   = _findPortfolio(_saleDialogPortId);
  const pos = _findPosition(p, _saleDialogPosId);
  const lot = _findLot(pos, _saleDialogLotId);
  if (!lot) return;

  const meta = (lot.bondState && lot.bondState.meta) || {};
  const rows = (lot.bondState && lot.bondState.rows) || [];
  const accrField = document.getElementById('saleDialogAccrued');
  if (!accrField) return;

  // ZCB has no coupon accrual
  if (pos.mode === 'zcb' || !meta.couponPct) {
    accrField.value = '0.00';
    return;
  }

  const saleDate = parseLocalDate(saleDateStr);
  if (!saleDate || isNaN(saleDate.getTime())) return;

  // Sanity: sale must be after value date
  const valueDate = lot.valueDate ? parseLocalDate(lot.valueDate) : (meta.valueDate ? new Date(meta.valueDate) : null);
  if (valueDate && saleDate <= valueDate) return;

  // On/after maturity → bond redeemed, no accrued
  const matDate = meta.matDate ? new Date(meta.matDate) : null;
  if (matDate && saleDate >= matDate) { accrField.value = '0.00'; return; }

  // Find next IP row strictly after saleDate
  const nextRow = rows.find(r => {
    const rd = r.date instanceof Date ? r.date : (r.date ? new Date(r.date) : null);
    return rd && !isNaN(rd.getTime()) && rd > saleDate;
  });
  if (!nextRow) { accrField.value = '0.00'; return; }

  const nextIP = nextRow.date instanceof Date ? nextRow.date : new Date(nextRow.date);
  const outstandingForSale = nextRow.outstandingBefore || lot.fvAtPurchase || lot.fvTotal || 0;
  if (outstandingForSale <= 0) { accrField.value = '0.00'; return; }

  // Find prev IP ≤ saleDate from stored ipDates
  const ipDates = (lot.bondState && lot.bondState.ipDates) || [];
  const ipDateObjs = ipDates
    .map(d => d instanceof Date ? d : (d ? new Date(d) : null))
    .filter(d => d && !isNaN(d.getTime()));
  let prevIP = ipDateObjs.filter(d => d <= saleDate).sort((a, b) => b - a)[0];
  if (!prevIP) prevIP = (meta.effectiveLastIPDate ? new Date(meta.effectiveLastIPDate)
                       : meta.lastIPDate ? new Date(meta.lastIPDate)
                       : valueDate);
  if (!prevIP) return;

  // Ex-div check: nextRow.rd is the record date for the upcoming coupon
  const nextRD = nextRow.rd instanceof Date ? nextRow.rd : (nextRow.rd ? new Date(nextRow.rd) : null);
  const isExDivSale = !!(nextRD && saleDate > nextRD);

  const accrualFromDate = isExDivSale ? nextIP : prevIP;
  const couponDec = (meta.couponPct || 0) / 100;   // couponPct stored as percent (10.15) → decimal
  try {
    const dc = couponInterest(outstandingForSale, couponDec, accrualFromDate, saleDate, meta.dcConv);
    accrField.value = dc.interest.toFixed(2);
  } catch (e) {
    // Fallback ACT/365
    const days = (saleDate - accrualFromDate) / 86400000;
    accrField.value = (outstandingForSale * couponDec * days / 365).toFixed(2);
  }
}

function showMarkLotAsSoldDialog(portfolioId, positionId, lotId) {
  const p = _findPortfolio(portfolioId);
  const pos = _findPosition(p, positionId);
  const lot = _findLot(pos, lotId);
  if (!lot) return;
  _saleDialogPortId = portfolioId;
  _saleDialogPosId = positionId;
  _saleDialogLotId = lotId;
  document.getElementById('saleDialogLotInfo').textContent =
    `${pos.secName || pos.isin} · Lot from ${_fmtDate(lot.valueDate)} · qty ${lot.qty}`;
  // Pre-fill from existing sale or empty
  const sale = lot.sale || {};
  document.getElementById('saleDialogDate').value = sale.date || '';
  document.getElementById('saleDialogPrice').value = sale.pricePct != null ? sale.pricePct : '';
  document.getElementById('saleDialogAccrued').value = sale.accruedReceived != null ? sale.accruedReceived : '';
  document.getElementById('saleDialogRemoveBtn').style.display = (lot.sale ? 'inline-block' : 'none');
  document.getElementById('saleDialogOverlay').style.display = 'flex';
}
function closeSaleDialog() {
  document.getElementById('saleDialogOverlay').style.display = 'none';
}
function _saveSaleDialog() {
  const date = document.getElementById('saleDialogDate').value;
  const pricePct = parseFloat(document.getElementById('saleDialogPrice').value);
  const accruedReceived = parseFloat(document.getElementById('saleDialogAccrued').value) || 0;
  if (!date) { alert('Sale date is required'); return; }
  if (isNaN(pricePct) || pricePct <= 0) { alert('Sale price (% of FV) is required'); return; }
  const p = _findPortfolio(_saleDialogPortId);
  const pos = _findPosition(p, _saleDialogPosId);
  const lot = _findLot(pos, _saleDialogLotId);
  if (!lot) return;
  lot.sale = { date, pricePct, accruedReceived };
  pos.updatedAt = new Date().toISOString();
  p.updatedAt = pos.updatedAt;
  _savePortfolioStore();
  closeSaleDialog();
  _renderPortfolioManager();
}
function _removeSaleDialog() {
  if (!confirm('Remove sale entry for this lot?')) return;
  const p = _findPortfolio(_saleDialogPortId);
  const pos = _findPosition(p, _saleDialogPosId);
  const lot = _findLot(pos, _saleDialogLotId);
  if (!lot) return;
  delete lot.sale;
  pos.updatedAt = new Date().toISOString();
  p.updatedAt = pos.updatedAt;
  _savePortfolioStore();
  closeSaleDialog();
  _renderPortfolioManager();
}


// ── UI: Cashflow generation dialog (as-of date selector) ────────────────────
function showCashflowDialog(portfolioId) {
  const p = _findPortfolio(portfolioId);
  if (!p) return;
  if (!p.positions || p.positions.length === 0) {
    alert('No positions in this portfolio. Add bonds first.');
    return;
  }
  document.getElementById('cashflowDialogPortId').value = portfolioId;
  const today = new Date().toISOString().substring(0, 10);
  document.getElementById('cashflowAsOf').value = p.asOfDate || today;
  // Show position summary
  const summary = _portfolioSummary(p);
  document.getElementById('cashflowDialogSummary').textContent =
    `${p.client.name || 'Client'} · ${summary.positionCount} positions · ${summary.lotCount} lots · FV ${_fmtInr(summary.totalFV, 0)}`;
  document.getElementById('cashflowDialogOverlay').style.display = 'flex';
}
function closeCashflowDialog() {
  document.getElementById('cashflowDialogOverlay').style.display = 'none';
}
function _generateCashflow() {
  const id = document.getElementById('cashflowDialogPortId').value;
  const asOf = document.getElementById('cashflowAsOf').value;
  if (!asOf) { alert('Please select an as-of date'); return; }
  closeCashflowDialog();
  setTimeout(() => downloadConsolidatedCashflow(id, asOf), 100);
}


function clearCalc() {
  // Soft reset: only clear price/XIRR inputs, sell analysis, and results
  // Bond structure (dates, coupon, redemption schedule, custom maps) is preserved
  document.getElementById('price').value     = '';
  document.getElementById('xirrInput').value = '';
  document.getElementById('calcMode').value  = 'priceToXirr';
  document.getElementById('enableSale').checked = false;
  document.getElementById('sellDate').value   = '';
  document.getElementById('sellPrice').value  = '';
  if(document.getElementById('sellYield')) document.getElementById('sellYield').value = '';
  if(document.getElementById('sellInputMode')) document.getElementById('sellInputMode').value = 'price';
  if(document.getElementById('sellDerivedPrice')) document.getElementById('sellDerivedPrice').style.display='none';
  onSellInputModeChange();
  document.getElementById('taxSlab').value    = '0.30';
  if (document.getElementById('weekendConv')) document.getElementById('weekendConv').value = 'sat-sun';
  document.getElementById('saleFields').style.display = 'none';
  document.getElementById('saleSummaryCard').classList.remove('show');
  onCalcModeChange();
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = '';
  document.getElementById('accruedStatus').classList.remove('show');
  document.getElementById('cumulResultsPanel').style.display = 'none';
  document.getElementById('cumulTaxCard').style.display = 'none';
  document.getElementById('zcbResultsPanel').style.display = 'none';
  const _txs = document.getElementById('taxXirrStrip');
  if (_txs) _txs.style.display = 'none';
  clearError();
  // Reset value date to today
  const _td = new Date();
  document.getElementById('valueDate').value = _td.getFullYear()+'-'+String(_td.getMonth()+1).padStart(2,'0')+'-'+String(_td.getDate()).padStart(2,'0');
}

function newBond() {
  ['secName','isin','maturityDate','couponRate','price','fixedDates','lastIP','firstIPDate','bondRating','xirrInput','allotmentDate'].forEach(id => {
    if(document.getElementById(id)) document.getElementById(id).value = '';
  });
  // Default value date to today
  const _td = new Date();
  document.getElementById('valueDate').value = _td.getFullYear()+'-'+String(_td.getMonth()+1).padStart(2,'0')+'-'+String(_td.getDate()).padStart(2,'0');
  _manualDates = [];
  document.getElementById('manualDatesContainer').innerHTML = '';
  document.getElementById('customRedemBody').innerHTML = ''; customRedemRowId = 0; updateCustomRedemTotal();
  document.getElementById('manualDatesSummary').textContent = '';
  document.getElementById('faceValue').value  = 100000;
  document.getElementById('quantity').value   = 1;
  document.getElementById('ipFreq').value     = '4';
  document.getElementById('ipDateType').value = 'fixed';
  document.getElementById('ipBdAdj').value = 'none';
  document.getElementById('rdRule').value     = '15';
  document.getElementById('stampDuty').value  = 0.0001;
  document.getElementById('bondType').value   = 'SENIOR SECURED';
  document.getElementById('rdBdConv').value   = 'none';
  document.getElementById('calcMode').value   = 'priceToXirr';
  document.getElementById('isCallable').value = 'no';
  document.getElementById('callDate').value   = '';
  document.getElementById('putDate').value    = '';
  onCallableChange();
  document.getElementById('enableSale').checked = false;
  document.getElementById('sellDate').value   = '';
  document.getElementById('sellPrice').value  = '';
  if(document.getElementById('sellYield')) document.getElementById('sellYield').value = '';
  if(document.getElementById('sellInputMode')) document.getElementById('sellInputMode').value = 'price';
  if(document.getElementById('sellDerivedPrice')) document.getElementById('sellDerivedPrice').style.display='none';
  onSellInputModeChange();
  document.getElementById('taxSlab').value    = '0.30';
  document.getElementById('saleFields').style.display = 'none';
  document.getElementById('saleSummaryCard').classList.remove('show');
  // Clear all custom cell maps
  Object.keys(customDenomMap).forEach(k => delete customDenomMap[k]);
  Object.keys(customRDMap).forEach(k => delete customRDMap[k]);
  Object.keys(customIPDateMap).forEach(k => delete customIPDateMap[k]);
  onCalcModeChange();
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = '';
  document.getElementById('accruedStatus').classList.remove('show');
  document.getElementById('cumulResultsPanel').style.display = 'none';
  document.getElementById('cumulTaxCard').style.display = 'none';
  document.getElementById('zcbResultsPanel').style.display = 'none';
  setBondMode('regular');
  renderSavedBonds();
  clearError();
}

function onCalcModeChange() {
  const mode   = document.getElementById('calcMode').value;
  const isGsec = _bondMode === 'gsec';

  // Show / hide the G-Sec-only options (ytmHToPrice, ytmAToPrice)
  const opt1 = document.getElementById('calcModeOpt1');
  const opt2 = document.getElementById('calcModeOpt2');
  const opt3 = document.getElementById('calcModeOpt3');
  const opt4 = document.getElementById('calcModeOpt4');
  if (opt1 && opt2 && opt3 && opt4) {
    if (isGsec) {
      opt1.textContent = 'Enter Price → Calculate YTM';
      opt2.style.display = 'none';   // hide XNPV option
      opt3.style.display = '';       // show YTM(H) option
      opt4.style.display = '';       // show YTM(A) option
      // If currently on xirrToPrice (which is hidden for G-Sec), switch to priceToXirr
      if (mode === 'xirrToPrice') document.getElementById('calcMode').value = 'priceToXirr';
    } else {
      opt1.textContent = 'Enter Price → Calculate XIRR';
      opt2.style.display = '';       // show XNPV option
      opt3.style.display = 'none';   // hide YTM(H) option
      opt4.style.display = 'none';   // hide YTM(A) option
      // If currently on a G-Sec YTM mode, switch back to priceToXirr
      if (mode === 'ytmHToPrice' || mode === 'ytmAToPrice')
        document.getElementById('calcMode').value = 'priceToXirr';
    }
  }

  const currentMode = document.getElementById('calcMode').value;
  const isYtmToPrice = currentMode === 'ytmHToPrice' || currentMode === 'ytmAToPrice';

  // Update YTM input label based on selected option
  const lbl = document.getElementById('gsecYtmInputLbl');
  const hint = document.getElementById('gsecYtmInputHint');
  if (lbl) lbl.textContent = currentMode === 'ytmAToPrice'
    ? 'Target YTM(A) — Annual Effective (%)'
    : 'Target YTM(H) — Semi-Annual (%)';
  if (hint) hint.textContent = currentMode === 'ytmAToPrice'
    ? 'Annual YTM — converted to YTM(H) = 2×[(1+YTM(A))^0.5−1] then priced via 30/360 formula'
    : 'Semi-Annual YTM (FIMMDA standard) — priced directly via 30/360 bond formula';

  // Show/hide input fields
  const gsecYtmBlock = document.getElementById('gsecYtmInputBlock');
  if (gsecYtmBlock) gsecYtmBlock.style.display = (isGsec && isYtmToPrice) ? '' : 'none';
  const priceField = document.getElementById('priceField');
  if (priceField) priceField.style.display = (isGsec && isYtmToPrice) ? 'none' : '';
  const xirrField = document.getElementById('xirrInputField');
  if (xirrField) xirrField.style.display = (!isGsec && currentMode === 'xirrToPrice') ? 'block' : 'none';
  const opt     = document.getElementById('isCallable').value;
  const hasCall = opt === 'call' || opt === 'both';
  const hasPut  = opt === 'put'  || opt === 'both';
  document.getElementById('priceField').style.display     = mode === 'priceToXirr' ? 'block' : 'none';
  document.getElementById('xirrInputField').style.display = mode === 'xirrToPrice' ? 'block' : 'none';
  document.getElementById('ytcInputField').style.display  = (mode === 'xirrToPrice' && hasCall) ? 'block' : 'none';
  document.getElementById('ytpInputField').style.display  = (mode === 'xirrToPrice' && hasPut)  ? 'block' : 'none';
}

function onCallableChange() {
  const opt     = document.getElementById('isCallable').value;
  const hasCall = opt === 'call' || opt === 'both';
  const hasPut  = opt === 'put'  || opt === 'both';
  document.getElementById('callDateGroup').style.display = hasCall ? 'block' : 'none';
  document.getElementById('putDateGroup').style.display  = hasPut  ? 'block' : 'none';
  onCalcModeChange();
  updateSellModeOptions(); // keep sell dropdown in sync
}

// Show/hide YTC and YTP options in the sell input mode dropdown
// based on whether the bond is callable/putable
function updateSellModeOptions() {
  const opt     = document.getElementById('isCallable').value;
  const hasCall = opt === 'call' || opt === 'both';
  const hasPut  = opt === 'put'  || opt === 'both';
  const sel     = document.getElementById('sellInputMode');
  if (!sel) return;

  // Remove existing ytc / ytp options first
  Array.from(sel.options).forEach(o => {
    if (o.value === 'ytc' || o.value === 'ytp') o.remove();
  });

  // Re-add only the relevant ones (after the ytm option)
  const ytmIdx = Array.from(sel.options).findIndex(o => o.value === 'ytm');
  const insertAt = ytmIdx >= 0 ? ytmIdx + 1 : sel.options.length;

  if (hasCall) {
    const opt = document.createElement('option');
    opt.value = 'ytc'; opt.textContent = 'Enter YTC → Derive Price';
    sel.add(opt, sel.options[insertAt] || null);
  }
  if (hasPut) {
    const opt = document.createElement('option');
    opt.value = 'ytp'; opt.textContent = 'Enter YTP → Derive Price';
    // insert after ytc if present
    const ytcIdx = Array.from(sel.options).findIndex(o => o.value === 'ytc');
    sel.add(opt, sel.options[ytcIdx >= 0 ? ytcIdx + 1 : sel.options.length] || null);
  }

  // If current selection was ytc/ytp but bond no longer has it, reset to price
  const current = sel.value;
  if ((current === 'ytc' && !hasCall) || (current === 'ytp' && !hasPut)) {
    sel.value = 'price';
    onSellInputModeChange();
  }
}


function onFreqChange() { onDateTypeChange(); }
function onDateTypeChange() {
  const t = document.getElementById('ipDateType').value;
  document.getElementById('grpFixed').classList.toggle('show', t === 'fixed');
  document.getElementById('grpDOM').classList.toggle('show', t === 'dom');
  document.getElementById('grpManual').classList.toggle('show', t === 'manual');
  // Show BD adjustment only for auto-computed date types (not fixed/manual)
  document.getElementById('grpIpBdAdj').style.display = (t === 'last' || t === 'first' || t === 'dom') ? '' : 'none';
  // Hide frequency selector when manual (irrelevant)
  document.getElementById('ipFreq').closest('.field').style.opacity = t === 'manual' ? '0.4' : '1';
  document.getElementById('ipFreq').closest('.field').style.pointerEvents = t === 'manual' ? 'none' : '';
  if (t === 'manual' && document.getElementById('manualDatesContainer').children.length === 0) {
    // Pre-populate with a few empty rows to get started
    addManualDateRow(); addManualDateRow(); addManualDateRow();
  }
}

// ─── MANUAL DATES ENGINE ──────────────────────────────────────────────────────
let _manualDates = []; // ISO strings

function getMaturityISO() {
  return document.getElementById('maturityDate').value || '';
}

function renderManualRows() {
  const container = document.getElementById('manualDatesContainer');
  const matISO = getMaturityISO();
  container.innerHTML = '';

  _manualDates.forEach((iso, idx) => {
    const isMat = iso && iso === matISO;
    const row = document.createElement('div');
    row.className = 'manual-date-row' + (isMat ? ' is-mat' : '');

    const num = document.createElement('span');
    num.className = 'row-num';
    num.textContent = idx + 1;

    const inp = document.createElement('input');
    inp.type = 'date';
    inp.value = iso || '';
    // 'input' keeps value in sync without destroying the DOM (allows keyboard typing)
    inp.addEventListener('input', () => {
      _manualDates[idx] = inp.value;
      updateManualSummary();
    });
    // Only re-sort and re-render when the field loses focus (not on every keystroke)
    inp.addEventListener('blur', () => {
      _manualDates[idx] = inp.value;
      sortAndRenderManual();
    });

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.title = 'Remove';
    del.innerHTML = '×';
    if (isMat) { del.disabled = true; del.style.opacity = '0.3'; del.title = 'Maturity date — always included'; }
    del.addEventListener('click', () => {
      _manualDates.splice(idx, 1);
      sortAndRenderManual();
    });

    const tag = document.createElement('span');
    tag.style.cssText = 'font-size:9px;white-space:nowrap;';
    if (isMat) { tag.innerHTML = '<span class="tag rd" style="font-size:8px;">Maturity</span>'; }

    row.appendChild(num);
    row.appendChild(inp);
    row.appendChild(tag);
    row.appendChild(del);
    container.appendChild(row);
  });

  updateManualSummary();
}

function sortAndRenderManual() {
  // Sort valid dates, keep blanks at end
  const valid = _manualDates.filter(d => !!d).sort();
  const blanks = _manualDates.filter(d => !d);
  _manualDates = [...valid, ...blanks];
  renderManualRows();
}

function addManualDateRow(isoVal) {
  _manualDates.push(isoVal || '');
  renderManualRows();
  // Scroll to bottom
  const c = document.getElementById('manualDatesContainer');
  setTimeout(() => c.scrollTop = c.scrollHeight, 50);
}

function updateManualSummary() {
  const valid = _manualDates.filter(d => !!d);
  const el = document.getElementById('manualDatesSummary');
  if (valid.length === 0) { el.textContent = 'No dates entered yet.'; return; }
  el.textContent = `${valid.length} date${valid.length > 1 ? 's' : ''} entered`;
  const matISO = getMaturityISO();
  const hasmat = valid.includes(matISO);
  if (matISO && !hasmat) {
    el.innerHTML += ` · <span style="color:var(--gold);">⚠ Maturity (${fmtDate(matISO)}) not in list — will be auto-added</span>`;
  }
}

function getManualIPDates() {
  // Returns sorted Date objects from valid manual entries + maturity
  const matISO = getMaturityISO();
  const set = new Set(_manualDates.filter(d => !!d));
  if (matISO) set.add(matISO);
  return [...set].sort().map(s => parseLocalDate(s));
}

// Paste modal
function pasteManualDates() {
  document.getElementById('pasteTextarea').value = '';
  document.getElementById('pastePreview').textContent = '';
  document.getElementById('pasteOverlay').classList.add('show');
  setTimeout(() => document.getElementById('pasteTextarea').focus(), 100);
}
function closePasteModal() {
  document.getElementById('pasteOverlay').classList.remove('show');
}

const MONTH_NAMES = {
  january:0, february:1, march:2, april:3, may:4, june:5,
  july:6, august:7, september:8, october:9, november:10, december:11,
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
};

function parsePastedDate(raw) {
  const s = raw.trim();
  if (!s) return null;

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);

  // DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2]-1, +m[1]);

  // DD/Mon/YYYY or DD-Mon-YYYY or DD Mon YYYY
  m = s.match(/^(\d{1,2})[\s\/\-]([A-Za-z]+)[\s\/\-](\d{4})$/);
  if (m) {
    const mo = MONTH_NAMES[m[2].toLowerCase()];
    if (mo !== undefined) return new Date(+m[3], mo, +m[1]);
  }

  // "Friday, 8 August, 2025" or "Thursday, 8 May, 2025"
  m = s.match(/[A-Za-z]+,?\s+(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (m) {
    const mo = MONTH_NAMES[m[2].toLowerCase()];
    if (mo !== undefined) return new Date(+m[3], mo, +m[1]);
  }

  return null;
}

function parsePasteInput(text) {
  // Split on newlines, commas, semicolons
  const tokens = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const results = [];
  for (const t of tokens) {
    const d = parsePastedDate(t);
    if (d && !isNaN(d)) results.push(isoStr(d));
  }
  return [...new Set(results)].sort();
}

function previewPaste() {
  const text = document.getElementById('pasteTextarea').value;
  const dates = parsePasteInput(text);
  const el = document.getElementById('pastePreview');
  if (!dates.length) { el.textContent = ''; return; }
  el.textContent = `✓ ${dates.length} date${dates.length > 1 ? 's' : ''} recognised`;
}

function importPastedDates() {
  const text = document.getElementById('pasteTextarea').value;
  const dates = parsePasteInput(text);
  if (!dates.length) { alert('No valid dates found. Check format.'); return; }

  // Merge with existing (replace blanks, add new)
  const existing = new Set(_manualDates.filter(d => !!d));
  dates.forEach(d => existing.add(d));
  _manualDates = [...existing].sort();
  closePasteModal();
  renderManualRows();
}
function onRDChange() {
  const v = document.getElementById('rdRule').value;
  document.getElementById('grpCustomRD').style.display = v === 'custom' ? 'block' : 'none';
  checkRecordDate();
}

function syncAllotmentToDOA() {
  const allotVal = document.getElementById('allotmentDate').value;
  if (!allotVal) return;
  const accruedType = document.getElementById('accruedFromType').value;
  if (accruedType === 'doa') {
    // In DOA mode: lastIP IS the allotment date — always keep in sync
    const lastIPEl = document.getElementById('lastIP');
    if (lastIPEl) {
      lastIPEl.value = allotVal;
      checkRecordDate();
    }
  }
  // Always trigger quick-select refresh so IP pills reflect new allotment anchor
  renderLastIPQuickSelect();
}

function onAccruedFromChange() {
  const v = document.getElementById('accruedFromType').value;
  // Auto-fill DOA/lastIP from allotment date when switching to DOA mode
  if (v === 'doa') {
    // Switching to DOA mode: always populate lastIP from allotment date
    const allotVal = document.getElementById('allotmentDate').value;
    const lastIPEl = document.getElementById('lastIP');
    if (allotVal && lastIPEl) {
      lastIPEl.value = allotVal;
    }
  }
  const label   = document.getElementById('lastIPLabel');
  const hint    = document.getElementById('lastIPHint');
  const topHint = document.getElementById('accruedFromHint');
  const firstIPField = document.getElementById('firstIPField');
  if (v === 'doa') {
    label.textContent   = 'Date of Allotment (DOA)';
    // Make the field readonly in DOA mode — value is always = allotment date
    const _lipInp = document.getElementById('lastIP');
    if (_lipInp) { _lipInp.readOnly = true; _lipInp.style.opacity = '0.7'; _lipInp.style.cursor = 'not-allowed'; _lipInp.title = 'Auto-synced from Allotment Date in Bond Parameters'; }
    hint.textContent    = 'Date bond was allotted/issued — no coupon paid before this';
    topHint.textContent = 'Accrued counts from Date of Allotment (new/freshly issued bond)';
    topHint.style.color = 'var(--gold)';
    firstIPField.classList.add('show');
    checkFirstIPHint();
  } else {
    label.textContent   = 'Last IP Date';
    const _lipInp2 = document.getElementById('lastIP');
    if (_lipInp2) { _lipInp2.readOnly = false; _lipInp2.style.opacity = ''; _lipInp2.style.cursor = ''; _lipInp2.title = ''; }
    hint.textContent    = 'Most recent coupon payment date before settlement';
    topHint.textContent = 'Accrued counts from the last coupon payment date';
    topHint.style.color = '';
    firstIPField.classList.remove('show');
    document.getElementById('firstIPHint').style.display = 'none';
  }
  checkRecordDate();
}

function checkFirstIPHint() {
  const doaStr = document.getElementById('lastIP').value;
  const firstIPStr = document.getElementById('firstIPDate').value;
  const hintEl = document.getElementById('firstIPHint');
  const mdStr  = document.getElementById('maturityDate').value;
  const freq   = parseInt(document.getElementById('ipFreq').value);
  const dateType = document.getElementById('ipDateType').value;
  const fixedStr = getFixedStr();
  const domDay = parseInt(document.getElementById('domDay').value);

  if (!doaStr || !mdStr) { hintEl.style.display = 'none'; return; }

  const doa = parseLocalDate(doaStr);
  // Find the first regular IP date after DOA
  const allIPs = generateIPDates(doaStr, mdStr, freq, dateType, fixedStr, domDay);
  const firstRegularIP = allIPs.find(d => d > doa);

  if (!firstRegularIP) { hintEl.style.display = 'none'; return; }

  const daysToFirstRegular = daysBetween(doa, firstRegularIP);

  if (firstIPStr) {
    // Show details of the long first coupon + projected subsequent schedule
    const firstIP = parseLocalDate(firstIPStr);
    const longDays = daysBetween(doa, firstIP);
    const intMo = 12 / freq;
    const md = parseLocalDate(mdStr);

    // Generate the 2–3 next dates from the override forward
    const bdAdj = getIPBdAdj();
    const nextDates = [];
    let cur = addMonths(firstIP, intMo);
    while (cur <= md && nextDates.length < 3) {
      nextDates.push(fmtDate(snapIPDate(cur, dateType, domDay, bdAdj)));
      cur = addMonths(cur, intMo);
    }

    hintEl.style.display = 'block';
    hintEl.style.background = 'rgba(26,96,53,0.07)';
    hintEl.style.border = '1px solid rgba(26,96,53,0.2)';
    hintEl.style.color = 'var(--green)';
    const freqLabel = {1:'Annual',2:'Semi-Annual',4:'Quarterly',12:'Monthly'}[freq] || `every ${intMo}mo`;
    hintEl.innerHTML =
      `✓ Long first coupon: <strong>${longDays} days</strong> from DOA (${fmtDate(doa)}) → ${fmtDate(firstIP)}<br>` +
      `Subsequent dates (${freqLabel} from first IP): ${nextDates.join(' → ')}${nextDates.length === 3 ? ' → …' : ''}`;
  } else if (daysToFirstRegular < 30) {
    hintEl.style.display = 'block';
    hintEl.style.background = 'rgba(184,134,11,0.08)';
    hintEl.style.border = '1px solid rgba(184,134,11,0.25)';
    hintEl.style.color = 'var(--gold)';
    const skippedLabel = fmtDate(firstRegularIP);
    const suggestedNext = allIPs.find(d => d > firstRegularIP);
    const suggestedLabel = suggestedNext ? fmtDate(suggestedNext) : '—';
    hintEl.innerHTML = `⚠ Only <strong>${daysToFirstRegular} days</strong> from DOA to first regular IP (${skippedLabel}).<br>` +
      `Issuer may skip this and pay a <strong>long first coupon</strong> on ${suggestedLabel}. ` +
      `Set the override date above if applicable.`;
  } else {
    hintEl.style.display = 'none';
  }
}

const DC_LABELS = {
  'act365':     'Acts/365',
  'act366':     'Acts/366',
  'actactical': 'Acts/Acts (Cal.Yr)',
  'actactfy':   'Acts/Acts (Ind.FY)',
  'act360':     'Acts/360',
  '30360':      '30/360',
  'custom':     'Custom Override'
};
const DC_HINTS = {
  'act365':     'Denominator is always 365 regardless of leap year.',
  'act366':     'Denominator is always 366 regardless of leap year.',
  'actactical': 'Denominator = 366 if the coupon period falls in a leap calendar year, else 365. Matches Satin Excel.',
  'actactfy':   'Denominator = 366 if the coupon period falls in an Indian FY (Apr–Mar) where Feb 29 exists, else 365.',
  'act360':     'Denominator is always 360. Common in money market instruments.',
  '30360':      'Each month = 30 days. Days = 360*(Y2-Y1) + 30*(M2-M1) + (D2-D1), capped at 30.',
  'custom':     'Manually set 365 or 366 per coupon period. Use Quick Presets or toggle each period below.'
};
function onDayCountChange() {
  const v = document.getElementById('dayCount').value;
  document.getElementById('dayCountHint').textContent   = DC_HINTS[v] || '';
  document.getElementById('fyYearGroup').style.display      = v === 'actactfy' ? 'block' : 'none';
  document.getElementById('customDenomPanel').style.display = v === 'custom'   ? 'block' : 'none';
  document.getElementById('dayCountBadge').textContent = DC_LABELS[v] || v;
  const hdr = document.getElementById('denomColHeader');
  if (hdr) hdr.innerHTML = v === 'custom' ? 'Denom <span style="font-size:8px;opacity:0.7;">(click)</span>' : 'Denom';
  if (document.getElementById('resultsPanel')?.classList.contains('show')) calculate();
}

// ─── REDEMPTION TYPE ──────────────────────────────────────────────────────────

// ── Sync Custom Redemption Dates from IP Schedule ────────────────────────────
// Populates the custom redemption table with ALL IP dates from the bond's
// interest payment schedule. User only needs to enter the % for each date.
// If forceOverwrite=true (Sync button clicked), existing rows are replaced.
// If forceOverwrite=false (auto on mode switch), only runs if table is empty.
// Preserves existing % values when dates match (for re-sync after IP change).
function syncCustomRedemFromIPSchedule(forceOverwrite) {
  const mdStr   = document.getElementById('maturityDate').value;
  const vdStr   = document.getElementById('valueDate').value;
  const allotStr= document.getElementById('allotmentDate').value;
  const freq    = parseInt(document.getElementById('ipFreq').value) || 4;
  const dateType= document.getElementById('ipDateType').value;
  const fixedStr = getFixedStr();
  const domDay  = parseInt(document.getElementById('domDay').value) || 1;
  const accruedFromType = document.getElementById('accruedFromType').value;
  const firstIPOverrideStr = document.getElementById('firstIPDate').value;

  if (!mdStr) { alert('Set Maturity Date first, then sync.'); return; }

  // Get ALL IP dates from bond inception (not just future ones from VD)
  // Use allotment date if available so past IP dates are included
  let allDates = [];
  if (dateType === 'manual') {
    allDates = getManualIPDates();
  } else if (accruedFromType === 'doa' && firstIPOverrideStr) {
    // DOA with first IP override
    const firstIPOverride = parseLocalDate(firstIPOverrideStr);
    const md = parseLocalDate(mdStr);
    const intMo = 12 / freq;
    const bdAdj = getIPBdAdj();
    const dates = [firstIPOverride];
    let cur = addMonths(firstIPOverride, intMo);
    while (cur <= md) {
      dates.push(snapIPDate(cur, dateType, domDay, bdAdj));
      cur = addMonths(cur, intMo);
    }
    if (!dates.some(d => isoStr(d) === isoStr(md))) dates.push(new Date(md));
    allDates = dates;
  } else if (allotStr) {
    // Use allotment date so ALL IP dates (including past) are included
    allDates = getAllIPDatesFromAllotment(allotStr, mdStr, freq, dateType, fixedStr, domDay);
  } else {
    // No allotment — use wide window (10 years before maturity)
    const wideStart = isoStr(addDays(parseLocalDate(mdStr), -3650));
    allDates = generateIPDatesRaw(wideStart, mdStr, freq, dateType, fixedStr, domDay);
  }

  if (!allDates || allDates.length === 0) {
    alert('Could not generate IP dates. Check your IP schedule settings.');
    return;
  }

  const tbody = document.getElementById('customRedemBody');

  // Preserve existing % values keyed by date (for re-sync)
  const existingPcts = {};
  const existingNotes = {};
  if (!forceOverwrite) {
    tbody.querySelectorAll('tr').forEach(tr => {
      const d = tr.cells[1]?.querySelector('input[type=date]')?.value || '';
      const p = tr.cells[2]?.querySelector('input[type=number]')?.value || '';
      const n = tr.cells[3]?.querySelector('input[type=text]')?.value || '';
      if (d) { existingPcts[d] = p; existingNotes[d] = n; }
    });
  }

  // Clear and rebuild
  tbody.innerHTML = '';
  customRedemRowId = 0;

  allDates.forEach(d => {
    const iso = isoStr(d);
    const existPct  = existingPcts[iso] || '';
    const existNote = existingNotes[iso] || '';
    addCustomRedemRow(iso, existPct, existNote);
  });

  updateCustomRedemTotal();

  // Show a brief confirmation
  const syncBtn = document.querySelector('[onclick="syncCustomRedemFromIPSchedule(true)"]');
  if (syncBtn) {
    const orig = syncBtn.innerHTML;
    syncBtn.innerHTML = '✓ Synced ' + allDates.length + ' dates';
    syncBtn.style.color = 'var(--green)';
    syncBtn.style.borderColor = 'rgba(26,96,53,0.5)';
    setTimeout(() => {
      syncBtn.innerHTML = orig;
      syncBtn.style.color = '';
      syncBtn.style.borderColor = '';
    }, 2000);
  }
}

function onRedemptionTypeChange() {
  const v = document.getElementById('redemptionType').value;
  const hint = document.getElementById('redemptionTypeHint');
  document.getElementById('grpStaggered').style.display   = v === 'staggered' ? 'block' : 'none';
  document.getElementById('grpCustomRedem').style.display = v === 'custom'    ? 'block' : 'none';
  if (v === 'staggered') {
    hint.textContent = 'Principal repaid in installments. Interest reduces on remaining balance.';
    updateStaggeredPreview();
  } else if (v === 'custom') {
    hint.textContent = 'IP dates are auto-filled from your schedule — just enter % for each date.';
    // Auto-populate IP dates if table is empty
    if (document.getElementById('customRedemBody').children.length === 0) {
      syncCustomRedemFromIPSchedule(false);
    }
    updateCustomRedemTotal();
  } else {
    hint.textContent = '100% of principal returned on maturity date only.';
    document.getElementById('staggeredPreview').style.display = 'none';
  }
}

// ── CUSTOM REDEMPTION ENGINE ──────────────────────────────────────────────────
let customRedemRowId = 0;

function addCustomRedemRow(date='', pct='', note='') {
  const tbody = document.getElementById('customRedemBody');
  const id = ++customRedemRowId;
  const tr = document.createElement('tr');
  tr.id = 'credem_' + id;
  tr.innerHTML = `
    <td style="color:var(--text-dim);font-size:10px;">${tbody.children.length + 1}</td>
    <td><input type="date" value="${date}" onchange="updateCustomRedemTotal()" style="width:130px;" /></td>
    <td><input type="number" value="${pct}" min="0" max="100" step="any" placeholder="0.0000"
         oninput="updateCustomRedemTotal()" style="width:80px;text-align:right;" /> <span style="font-size:10px;color:var(--text-dim);">%</span></td>
    <td><input type="text" value="${note}" placeholder="e.g. Issuer discretion" style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 6px;border:1px solid var(--border);border-radius:2px;background:var(--surface);color:var(--text);width:100%;"/></td>
    <td><button class="del-btn" onclick="removeCustomRedemRow(${id})">&#x2715;</button></td>`;
  tbody.appendChild(tr);
  updateCustomRedemTotal();
}

function removeCustomRedemRow(id) {
  const el = document.getElementById('credem_' + id);
  if (el) el.remove();
  document.querySelectorAll('#customRedemBody tr').forEach((tr, i) => { tr.cells[0].textContent = i + 1; });
  updateCustomRedemTotal();
}

function updateCustomRedemTotal() {
  let total = 0;
  document.querySelectorAll('#customRedemBody tr').forEach(tr => {
    const p = tr.cells[2]?.querySelector('input[type=number]');
    if (p) total += parseFloat(p.value) || 0;
  });
  const bar = document.getElementById('redemTotalBar');
  document.getElementById('redemTotal').textContent = (Math.round(total * 10000) / 10000).toFixed(4) + '%';
  const diff = Math.abs(100 - total);
  const rowCount = document.querySelectorAll('#customRedemBody tr').length;
  if (diff < 0.01) { bar.className = 'redem-total-bar ok'; document.getElementById('redemTotalMsg').textContent = '\u2713 Totals 100% \u2014 valid (' + rowCount + ' IP dates)'; }
  else if (total > 100) { bar.className = 'redem-total-bar err'; document.getElementById('redemTotalMsg').textContent = '\u26a0 Exceeds 100% \u2014 reduce some entries'; }
  else { bar.className = 'redem-total-bar warn'; document.getElementById('redemTotalMsg').textContent = `Remaining: ${(100 - total).toFixed(4)}% — or click ↺ Sync IP Dates to add maturity balance`; }
}

function getCustomRedemMap() {
  const map = new Map();
  document.querySelectorAll('#customRedemBody tr').forEach(tr => {
    const di = tr.cells[1]?.querySelector('input[type=date]');
    const pi = tr.cells[2]?.querySelector('input[type=number]');
    if (!di || !di.value) return;
    const pct = parseFloat(pi?.value);
    // Include ALL rows that have a date — even pct=0 or empty.
    // This ensures the date appears in redemptionDateSet so the outstanding
    // principal is tracked correctly. Rows with no % contribute 0 principal CF.
    const frac = (!isNaN(pct) && pct > 0) ? pct / 100 : 0;
    map.set(di.value, (map.get(di.value) || 0) + frac);
  });
  return map;
}

function addCustomRedemPreset(type) {
  const mdStr = document.getElementById('maturityDate').value;
  const vdStr = document.getElementById('valueDate').value;
  if (!mdStr) { alert('Set Maturity Date first.'); return; }
  if (type === 'clear') {
    document.getElementById('customRedemBody').innerHTML = '';
    customRedemRowId = 0; updateCustomRedemTotal(); return;
  }

  if (type === 'equal') {
    // Use EXISTING rows in the table (already synced from IP schedule).
    // If table is empty, sync first then apply equal split.
    const rows = document.querySelectorAll('#customRedemBody tr');
    if (rows.length === 0) {
      syncCustomRedemFromIPSchedule(false);
    }
    const allRows = document.querySelectorAll('#customRedemBody tr');
    const n = allRows.length;
    if (n === 0) { alert('No IP dates in table. Click ↺ Sync IP Dates first.'); return; }
    // 4 decimal places, last row gets the remainder so total = exactly 100%
    const pct     = Math.round(100 / n * 10000) / 10000;   // e.g. 4.1667
    const running = Math.round(pct * (n - 1) * 10000) / 10000;
    const rem     = Math.round((100 - running) * 10000) / 10000;
    allRows.forEach((tr, i) => {
      const inp = tr.cells[2]?.querySelector('input[type=number]');
      const noteInp = tr.cells[3]?.querySelector('input[type=text]');
      if (inp)     inp.value  = i === n - 1 ? rem : pct;
      if (noteInp && !noteInp.value) noteInp.value = 'Equal split';
    });
    updateCustomRedemTotal();
    return;
  }

  // lastN: generate fresh from allotment/schedule and pick last N
  const freq     = parseInt(document.getElementById('ipFreq').value) || 4;
  const dateType = document.getElementById('ipDateType').value;
  const fixedStr = getFixedStr();
  const domDay   = parseInt(document.getElementById('domDay').value) || 1;
  const allotStr = document.getElementById('allotmentDate').value;
  let ipDates;
  if (allotStr) {
    ipDates = getAllIPDatesFromAllotment(allotStr, mdStr, freq, dateType, fixedStr, domDay);
  } else {
    ipDates = generateIPDates(vdStr || mdStr, mdStr, freq, dateType, fixedStr, domDay);
  }
  document.getElementById('customRedemBody').innerHTML = '';
  customRedemRowId = 0;
  if (type === 'lastN') {
    const n     = parseInt(prompt('How many IP dates from the end?', '4')) || 4;
    const slice = ipDates.slice(-n);
    const pct     = Math.round(100 / n * 10000) / 10000;
    const running = Math.round(pct * (n - 1) * 10000) / 10000;
    const rem     = Math.round((100 - running) * 10000) / 10000;
    slice.forEach((d, i) => addCustomRedemRow(isoStr(d), i === n - 1 ? rem : pct, 'Last ' + n));
  }
  updateCustomRedemTotal();
}

function openRedemPasteModal() {
  document.getElementById('pasteRedemTextarea').value = '';
  document.getElementById('pasteRedemPreview').textContent = '';
  document.getElementById('pasteRedemOverlay').classList.add('show');
  setTimeout(() => document.getElementById('pasteRedemTextarea').focus(), 100);
}
function closeRedemPasteModal() { document.getElementById('pasteRedemOverlay').classList.remove('show'); }
function parseRedemPasteLine(line) {
  var raw = line.trim(); if (!raw) return null;
  var parts = raw.indexOf('\t') >= 0 ? raw.split('\t').map(s=>s.trim()) : raw.split(',').map(s=>s.trim());
  if (parts.length < 2) return null;
  var d = parsePastedDate(parts[0]); if (!d || isNaN(d)) return null;
  var pct = parseFloat(parts[1]); if (isNaN(pct) || pct <= 0) return null;
  return { date: isoStr(d), pct, note: parts.length >= 3 ? parts.slice(2).join(', ').trim() : '' };
}
function previewRedemPaste() {
  const parsed = document.getElementById('pasteRedemTextarea').value.split(/[\n;]+/).filter(s=>s.trim()).map(parseRedemPasteLine).filter(Boolean);
  const el = document.getElementById('pasteRedemPreview');
  if (!parsed.length) { el.textContent = ''; return; }
  const total = parsed.reduce((s,r)=>s+r.pct,0), ok = Math.abs(100-total)<0.01;
  el.innerHTML = `\u2713 <strong>${parsed.length}</strong> rows recognised &middot; Total: <strong style="color:${ok?'var(--green)':'var(--gold)'}">${total.toFixed(4)}%</strong>`;
}
function importRedemPaste() {
  const parsed = document.getElementById('pasteRedemTextarea').value.split(/[\n;]+/).filter(s=>s.trim()).map(parseRedemPasteLine).filter(Boolean);
  if (!parsed.length) { alert('No valid rows found.\nFormat: DATE , %'); return; }
  parsed.forEach(r => addCustomRedemRow(r.date, r.pct, r.note));
  closeRedemPasteModal(); updateCustomRedemTotal();
}

function onStagStartChange() {
  const v = document.getElementById('stagStart').value;
  document.getElementById('grpStagLastN').style.display     = v === 'lastN'      ? 'block' : 'none';
  document.getElementById('grpStagFromDate').style.display  = v === 'fromDate'   ? 'block' : 'none';
  document.getElementById('grpStagFromCoupon').style.display= v === 'fromCoupon' ? 'block' : 'none';
  updateStaggeredPreview();
}

function updateStaggeredPreview() {
  const previewEl = document.getElementById('staggeredPreview');
  const vdStr  = document.getElementById('valueDate').value;
  const mdStr  = document.getElementById('maturityDate').value;
  if (!mdStr) { previewEl.style.display = 'none'; return; }

  const stagPct    = parseFloat(document.getElementById('stagPct').value);
  const stagStart  = document.getElementById('stagStart').value;
  if (isNaN(stagPct) || stagPct <= 0) { previewEl.style.display = 'none'; return; }

  // For 'firstIP': generate from (lastIP - 1 day) so lastIPDate itself is included
  // This gives correct total count (incl. already-paid installments)
  const lastIPStr = document.getElementById('lastIP').value;
  let startStr = vdStr || mdStr;
  if (stagStart === 'firstIP') {
    // Use allotmentDate as start so getAllIPDatesFromAllotment (inside getStaggeredDates)
    // can apply the 14-day min-gap filter, excluding spurious dates like 18-Dec-2025
    // for a bond allotted 16-Dec-2025 with an 18/Dec coupon pattern.
    const allotStr = document.getElementById('allotmentDate').value;
    startStr = allotStr || (lastIPStr || mdStr);
  }
  const redemDates = getStaggeredDates(startStr, mdStr);
  previewEl.style.display = 'block';

  if (!redemDates || redemDates.length === 0) {
    previewEl.className = 'staggered-preview error';
    previewEl.textContent = 'Could not compute redemption schedule. Check IP dates and start settings.';
    return;
  }

  const total = (stagPct * redemDates.length).toFixed(4);
  const diff  = Math.abs(100 - parseFloat(total));
  const ok    = diff < 0.01;

  // Count how many are already paid (before value date)
  const vd = vdStr ? parseLocalDate(vdStr) : null;
  const paidCount = vd ? redemDates.filter(d => d < vd).length : 0;
  const futureCount = redemDates.length - paidCount;

  previewEl.className = ok ? 'staggered-preview' : 'staggered-preview error';
  let html = `<strong>${redemDates.length} installments</strong> × ${stagPct}% = <strong>${total}%</strong> ${ok ? '✓' : `⚠ Should total 100% (off by ${diff.toFixed(4)}%)`}<br>`;
  if (paidCount > 0) {
    html += `<span style="color:var(--text-dim);">${paidCount} already paid before value date · ${futureCount} remaining</span><br>`;
  }
  html += `<strong>First redemption:</strong> ${fmtDate(redemDates[0])}${paidCount > 0 ? ' <span style="color:var(--text-dim);font-size:9px;">(paid)</span>' : ''}<br>`;
  html += `<strong>Last redemption:</strong> ${fmtDate(redemDates[redemDates.length - 1])}`;
  if (!ok) html += `<br><span style="color:var(--red);">Adjust % or installment count so total = 100%.</span>`;
  previewEl.innerHTML = html;
}

// Returns sorted array of Date objects that are redemption dates (staggered)
// Used only for the live preview — calculate() builds its own from ipDates directly
function getStaggeredDates(vdStr, mdStr) {
  const freq    = parseInt(document.getElementById('ipFreq').value);
  const dateType= document.getElementById('ipDateType').value;
  const fixedStr = getFixedStr();
  const domDay  = parseInt(document.getElementById('domDay').value);
  const stagFreqVal = document.getElementById('stagFreq').value;
  const stagStart   = document.getElementById('stagStart').value;
  const stagLastN   = parseInt(document.getElementById('stagLastN').value) || 4;
  const stagFromCoupon = parseInt(document.getElementById('stagFromCoupon').value) || 1;
  const stagFromDateStr = document.getElementById('stagFromDate').value;
  const firstIPOverrideStr = document.getElementById('firstIPDate').value;
  const accruedFromType = document.getElementById('accruedFromType').value;

  const effectiveFreq = stagFreqVal === 'same' ? freq : parseInt(stagFreqVal);
  const freqRatio = Math.max(1, Math.round(freq / effectiveFreq));

  // Generate the full coupon date list the same way calculate() would
  let allDates;
  if (dateType === 'manual') {
    allDates = getManualIPDates();
  } else if (accruedFromType === 'doa' && firstIPOverrideStr) {
    const firstIPOverride = parseLocalDate(firstIPOverrideStr);
    const intMo = 12 / freq;
    const md = parseLocalDate(mdStr);
    const bdAdj = getIPBdAdj();
    const dates = [firstIPOverride];
    let cur = addMonths(firstIPOverride, intMo);
    while (cur <= md) {
      dates.push(snapIPDate(cur, dateType, domDay, bdAdj));
      cur = addMonths(cur, intMo);
    }
    if (!dates.some(d => isoStr(d) === isoStr(md))) dates.push(new Date(md));
    allDates = dates;
  } else {
    // Use allotment date (with 14-day min-gap filter) so past IP dates are included.
    // This ensures firstIP and lastN modes see all redemption dates, not just future ones.
    const _allotEl = document.getElementById('allotmentDate');
    const _allotStr = _allotEl ? _allotEl.value : '';
    allDates = _allotStr
      ? getAllIPDatesFromAllotment(_allotStr, mdStr, freq, dateType, fixedStr, domDay)
      : generateIPDatesRaw(vdStr, mdStr, freq, dateType, fixedStr, domDay);
  }

  const md = parseLocalDate(mdStr);
  const sorted = allDates.filter(d => d <= md).sort((a,b) => a-b);
  if (sorted.length === 0) return [];

  let candidateDates;
  if (stagStart === 'firstIP') {
    const strided = [];
    for (let i = 0; i < sorted.length; i += freqRatio) strided.push(sorted[i]);
    candidateDates = strided;
  } else if (stagStart === 'lastN') {
    const strided = [];
    for (let i = sorted.length - 1; i >= 0; i -= freqRatio) strided.unshift(sorted[i]);
    candidateDates = strided.slice(-stagLastN);
  } else if (stagStart === 'fromCoupon') {
    const strided = [];
    for (let i = stagFromCoupon - 1; i < sorted.length; i += freqRatio) strided.push(sorted[i]);
    candidateDates = strided;
  } else if (stagStart === 'fromDate' && stagFromDateStr) {
    const fromD = parseLocalDate(stagFromDateStr);
    const startIdx = sorted.findIndex(d => d >= fromD);
    if (startIdx >= 0) {
      const strided = [];
      for (let i = startIdx; i < sorted.length; i += freqRatio) strided.push(sorted[i]);
      candidateDates = strided;
    } else candidateDates = [];
  } else {
    candidateDates = sorted.slice(-4);
  }
  return candidateDates || [];
}


// After computing a subsequent date from firstIPOverride+N*intMo,
// snap it to the correct calendar anchor (last day, 1st, dom) and apply BD adj.
function snapIPDate(rawDate, dateType, domDay, bdAdj) {
  if (dateType === 'last') {
    // Last day of that same month
    const snapped = new Date(rawDate.getFullYear(), rawDate.getMonth() + 1, 0);
    return adjustIPBD(snapped, bdAdj);
  } else if (dateType === 'first') {
    // 1st of that same month
    const snapped = new Date(rawDate.getFullYear(), rawDate.getMonth(), 1);
    return adjustIPBD(snapped, bdAdj);
  } else if (dateType === 'dom') {
    // Specific day of that same month (clamp to month end)
    const lastDay = new Date(rawDate.getFullYear(), rawDate.getMonth() + 1, 0).getDate();
    const day = Math.min(domDay, lastDay);
    const snapped = new Date(rawDate.getFullYear(), rawDate.getMonth(), day);
    return adjustIPBD(snapped, bdAdj);
  }
  // fixed / manual — keep as-is
  return new Date(rawDate);
}
// generateIPDates without the manual shortcut (for staggered freq override)
function generateIPDatesRaw(vdStr, mdStr, freq, dateType, fixedStr, domDay, ipBdConv) {
  const vd = parseLocalDate(vdStr), md = parseLocalDate(mdStr);
  const intMo = 12 / freq;
  const bdAdj = ipBdConv || 'none';
  const dates = [];
  if (dateType === 'first') {
    let cur = new Date(vd.getFullYear(), vd.getMonth() + 1, 1);
    while (cur <= md) { dates.push(adjustIPBD(new Date(cur), bdAdj)); cur = addMonths(cur, intMo); }
  } else if (dateType === 'last') {
    let cur = new Date(vd.getFullYear(), vd.getMonth() + 1, 0);
    while (cur <= md) { dates.push(adjustIPBD(new Date(cur), bdAdj)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1 + intMo, 0); }
  } else if (dateType === 'dom') {
    let cur = new Date(vd.getFullYear(), vd.getMonth(), domDay);
    if (cur < vd) cur = addMonths(cur, intMo);
    while (cur <= md) { dates.push(adjustIPBD(new Date(cur), bdAdj)); cur = addMonths(cur, intMo); }
  } else {
    const parsed = (fixedStr || '').split(',')
      .map(parseFixedDate)
      .filter(p => !isNaN(p.day) && !isNaN(p.month));
    if (parsed.length === 0) {
      // Empty or invalid fixedStr — fall back to semi-annual from vd month/day
      // so the schedule is at least plausible rather than completely empty
      const intMo2 = 12 / freq;
      let cur2 = new Date(vd.getFullYear(), vd.getMonth(), vd.getDate());
      // Step back to find a natural anchor (same day, step forward by freq)
      while (cur2 <= md) {
        if (cur2 > vd) dates.push(adjustIPBD(new Date(cur2), bdAdj));
        cur2 = addMonths(cur2, intMo2);
      }
    } else {
      let yr = vd.getFullYear() - 1;
      while (yr <= md.getFullYear() + 1) {
        for (const p of parsed) {
          const d = new Date(yr, p.month, p.day);
          if (d > vd && d <= md) dates.push(new Date(d));
        }
        yr++;
      }
      dates.sort((a, b) => a - b);
    }
  }
  if (!dates.some(d => isoStr(d) === isoStr(md))) dates.push(new Date(md));
  return dates;
}

// ─── LIVE RECORD DATE STATUS CHECK ───────────────────────────────────────────
function getRDDays() {
  const v = document.getElementById('rdRule').value;
  if (v === '0') return 0;
  if (v === 'custom') return parseInt(document.getElementById('customRD').value) || 15;
  return parseInt(v);
}

// Returns true if date is a non-business day based on weekend convention.
// conv: 'sat-sun' (default) = Sat+Sun both off; 'sun-only' = only Sunday off.
function isWeekend(d, conv) {
  const day = d.getDay();
  const wc  = conv || getWeekendConv();
  if (wc === 'sun-only') return day === 0;          // Sunday only
  return day === 0 || day === 6;                     // Saturday + Sunday (default)
}

function getWeekendConv() {
  const el = document.getElementById('weekendConv');
  return el ? el.value : 'sat-sun';
}

// Adjust a record date for business day convention
// conv: 'none' | 'preceding' | 'following' | 'modifiedfollowing'
function adjustRDBD(date, conv) {
  if (conv === 'none' || !conv) return new Date(date);
  const wc       = getWeekendConv();
  const origDate = new Date(date);
  const d        = new Date(date);
  if (!isWeekend(d, wc)) return d;
  if (conv === 'preceding') {
    while (isWeekend(d, wc)) d.setDate(d.getDate() - 1);
  } else if (conv === 'following') {
    while (isWeekend(d, wc)) d.setDate(d.getDate() + 1);
  } else if (conv === 'modifiedfollowing') {
    const fwd = new Date(origDate);
    while (isWeekend(fwd, wc)) fwd.setDate(fwd.getDate() + 1);
    if (fwd.getMonth() === origDate.getMonth()) {
      return fwd;
    } else {
      const bwd = new Date(origDate);
      while (isWeekend(bwd, wc)) bwd.setDate(bwd.getDate() - 1);
      return bwd;
    }
  }
  return d;
}

function getRDBDConv() {
  const el = document.getElementById('rdBdConv');
  return el ? el.value : 'none';
}

function getIPBdAdj() {
  const el = document.getElementById('ipBdAdj');
  return el ? el.value : 'none';
}

// Adjust an IP date for business day convention
// conv: 'none' | 'preceding' | 'following' | 'modifiedfollowing'
// Modified Following (ISDA): move forward to next business day, BUT if that
// crosses into a different calendar month, move BACKWARD to preceding BD instead.
// This preserves the coupon schedule so IP dates stay in their original month.
function adjustIPBD(date, conv) {
  if (conv === 'none' || !conv) return new Date(date);
  const wc       = getWeekendConv();
  const origDate = new Date(date);
  const d        = new Date(date);
  if (!isWeekend(d, wc)) return d;

  if (conv === 'preceding') {
    while (isWeekend(d, wc)) d.setDate(d.getDate() - 1);
  } else if (conv === 'following') {
    while (isWeekend(d, wc)) d.setDate(d.getDate() + 1);
  } else if (conv === 'modifiedfollowing') {
    // Try following first
    const fwd = new Date(origDate);
    while (isWeekend(fwd, wc)) fwd.setDate(fwd.getDate() + 1);
    if (fwd.getMonth() === origDate.getMonth()) {
      // Following stays in same month → use it
      return fwd;
    } else {
      // Following crosses month boundary → use preceding instead
      const bwd = new Date(origDate);
      while (isWeekend(bwd, wc)) bwd.setDate(bwd.getDate() - 1);
      return bwd;
    }
  }
  return d;
}

// Compute the effective record date for a given IP date
function computeRecordDate(ipDate, rdDays) {
  if (rdDays <= 0) return null;
  const raw = addDays(ipDate, -rdDays);
  return adjustRDBD(raw, getRDBDConv());
}


// ── Last IP Quick-Select ──────────────────────────────────────────────────────
// Shows the last 4 IP dates before the value date as clickable pills
// so the user never has to manually type the last IP date.
// Called whenever value date, maturity date, IP schedule, or lastIP changes.
function renderLastIPQuickSelect() {
  const qs = document.getElementById('lastIPQuickSelect');
  if (!qs) return;

  const vdStr  = document.getElementById('valueDate').value;
  const mdStr  = document.getElementById('maturityDate').value;
  const allotStr = document.getElementById('allotmentDate').value;
  const accruedType = document.getElementById('accruedFromType').value;
  const firstIPOverStr = document.getElementById('firstIPDate').value;

  // Need at least maturity date to generate IP schedule
  if (!mdStr || !allotStr) { qs.style.display = 'none'; return; }

  const freq     = parseInt(document.getElementById('ipFreq').value) || 4;
  const dateType = document.getElementById('ipDateType').value;
  const fixedStr = getFixedStr();
  const domDay   = parseInt(document.getElementById('domDay').value) || 1;
  const currentVal = document.getElementById('lastIP').value;

  // Generate full IP date list from the earliest possible start
  let allDates = [];
  try {
    if (dateType === 'manual') {
      allDates = getManualIPDates();
    } else if (accruedType === 'doa' && firstIPOverStr) {
      // DOA with first IP override — build from firstIPOverride
      const firstIPOverride = parseLocalDate(firstIPOverStr);
      const md = parseLocalDate(mdStr);
      const intMo = 12 / freq;
      const bdAdj = getIPBdAdj();
      const dates = [firstIPOverride];
      let cur = addMonths(firstIPOverride, intMo);
      while (cur <= md) {
        dates.push(snapIPDate(cur, dateType, domDay, bdAdj));
        cur = addMonths(cur, intMo);
      }
      if (!dates.some(d => isoStr(d) === isoStr(md))) dates.push(new Date(md));
      allDates = dates;
    } else if (allotStr) {
      allDates = getAllIPDatesFromAllotment(allotStr, mdStr, freq, dateType, fixedStr, domDay);
    } else {
      // Wide window fallback
      const wideStart = isoStr(addDays(parseLocalDate(mdStr), -3650));
      allDates = generateIPDatesRaw(wideStart, mdStr, freq, dateType, fixedStr, domDay);
    }
  } catch(e) { qs.style.display = 'none'; return; }

  if (!allDates || allDates.length === 0) { qs.style.display = 'none'; return; }

  // Sort and exclude maturity date (not an accrual start for secondary trades)
  const md = parseLocalDate(mdStr);
  const vd = vdStr ? parseLocalDate(vdStr) : null;
  const sorted = allDates
    .filter(d => isoStr(d) !== isoStr(md))
    .sort((a, b) => a - b);

  if (sorted.length === 0) { qs.style.display = 'none'; return; }

  // Show up to 4 dates: the 3 most recent before VD + 1 upcoming after VD
  // So user can also pick a future IP in edge cases (e.g. DOA)
  const pastDates   = vd ? sorted.filter(d => d <  vd) : [];
  const futureDates = vd ? sorted.filter(d => d >= vd) : sorted;

  // Last 3 past + first 1 future
  const showDates = [
    ...pastDates.slice(-3),
    ...futureDates.slice(0, 1),
  ];

  if (showDates.length === 0) { qs.style.display = 'none'; return; }

  // Auto-set Last IP:
  // Normal case:  set to most recent past IP date
  // Ex-div case:  when VD > record date of the NEXT upcoming IP, bond is ex-div
  //               → set Last IP to the UPCOMING IP (next coupon date)
  //               so accrued calculation knows it starts from there (negative accrued)
  const mostRecentPast = pastDates.length > 0 ? isoStr(pastDates[pastDates.length - 1]) : null;
  const nextIPDate     = futureDates.length > 0 ? futureDates[0] : null;

  // Check if VD is past the record date of the next IP (= ex-div condition)
  let _isExDivForPill = false;
  if (vd && nextIPDate) {
    const rdDays = getRDDays();
    if (rdDays > 0) {
      const nextRD = computeRecordDate(nextIPDate, rdDays);
      if (nextRD && vd > nextRD) _isExDivForPill = true;
    }
  }

  const lipEl = document.getElementById('lastIP');
  const _accruedType2 = document.getElementById('accruedFromType').value;
  // In DOA mode: lastIP is ALWAYS the allotment date — never auto-fill from IP pills
  if (_accruedType2 !== 'doa' && !lipEl.value) {
    // Auto-fill only when field is blank and NOT in DOA mode
    if (_isExDivForPill && nextIPDate) {
      lipEl.value = isoStr(nextIPDate);
      checkRecordDate();
    } else if (mostRecentPast) {
      lipEl.value = mostRecentPast;
      checkRecordDate();
    }
  }

  const _isDOAMode = document.getElementById('accruedFromType').value === 'doa';
  let html = '<div class="lip-qs-label">' + (_isDOAMode ? 'Previous IP Dates (reference)' : 'Last IP (auto)') + '</div><div class="lip-qs-pills">';
  showDates.forEach(d => {
    const iso       = isoStr(d);
    const isPast    = vd ? d < vd : false;
    const isCurrent = (iso === currentVal);
    const isNewest  = (iso === mostRecentPast);
    const isExDivIP = !isPast && _isExDivForPill && nextIPDate && (iso === isoStr(nextIPDate));
    const label     = d.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});

    let badge = '';
    if (isCurrent && isExDivIP)   badge = '<span class="pill-badge" style="background:rgba(251,146,60,0.15);color:var(--orange);border-color:rgba(251,146,60,0.3);">EX-DIV ✓</span>';
    else if (isCurrent)           badge = '<span class="pill-badge">✓ Selected</span>';
    else if (isExDivIP)           badge = '<span class="pill-badge" style="background:rgba(251,146,60,0.15);color:var(--orange);border-color:rgba(251,146,60,0.3);">EX-DIV</span>';
    else if (isNewest && !isCurrent) badge = '<span class="pill-badge">Latest</span>';
    else if (!isPast)             badge = '<span style="font-size:8px;color:var(--orange);margin-left:2px;">upcoming</span>';

    // future class now just styles the pill orange — it IS clickable (pointer-events removed from CSS)
    const cls = ['lip-qs-pill', isCurrent ? 'active' : '', !isPast && !isCurrent ? 'future' : ''].join(' ').trim();
    html += `<button class="${cls}" onclick="setLastIPFromPill('${iso}')" title="Set Last IP to ${label}">${label} ${badge}</button>`;
  });
  html += '</div>';

  qs.innerHTML  = html;
  qs.style.display = 'block';
}

function setLastIPFromPill(isoDateStr) {
  // In DOA mode, lastIP IS the allotment date — do NOT overwrite it from pills
  const accruedType = document.getElementById('accruedFromType').value;
  if (accruedType === 'doa') return;
  document.getElementById('lastIP').value = isoDateStr;
  checkRecordDate();
  // Defer re-render so the click event fully completes before innerHTML
  // is replaced — otherwise the browser loses the click mid-event.
  // Also do NOT call checkFirstIPHint() here: in DOA mode it reads lastIP
  // as the DOA date which causes a misleading hint flash.
  setTimeout(() => {
    renderLastIPQuickSelect();
  }, 0);
}

function checkRecordDate() {
  const vd    = document.getElementById('valueDate').value;
  const lip   = document.getElementById('lastIP').value;
  const el    = document.getElementById('accruedStatus');
  if (!vd || !lip) { el.classList.remove('show'); return; }

  const rdDays    = getRDDays();
  const valueDate = parseLocalDate(vd);
  const lastIPDate = parseLocalDate(lip);
  const freq      = parseInt(document.getElementById('ipFreq').value);
  const ipDt      = document.getElementById('ipDateType').value;
  const fixedStr  = getFixedStr();
  const dom       = parseInt(document.getElementById('domDay').value);
  const accruedType = document.getElementById('accruedFromType').value;
  const allotStr  = document.getElementById('allotmentDate').value;

  // Generate full schedule anchored to allotment (same logic as calculate())
  let allIPs;
  if (allotStr) {
    allIPs = getAllIPDatesFromAllotment(allotStr, document.getElementById('maturityDate').value || isoStr(addYears(valueDate, 30)), freq, ipDt, fixedStr, dom);
  } else {
    allIPs = generateIPDates(vd, addYears(vd, 30), freq, ipDt, fixedStr, dom);
  }

  // Apply effectiveLastIPDate: in DOA mode, use most recent paid IP if any
  let effectiveLastIP = lastIPDate;
  if (accruedType === 'doa') {
    const paidIPs = allIPs.filter(d => d <= valueDate && d > lastIPDate);
    if (paidIPs.length > 0) effectiveLastIP = paidIPs[paidIPs.length - 1];
  }

  const nextIP = allIPs.find(d => d > valueDate);
  if (!nextIP) { el.classList.remove('show'); return; }

  const recordDate = rdDays > 0 ? computeRecordDate(nextIP, rdDays) : null;
  // Ex-div: accrued is negative days from VD to nextIP
  const _isExDivBar = !!(recordDate && valueDate > recordDate);
  const accDays = _isExDivBar
    ? daysBetween(nextIP, valueDate)   // negative (VD < nextIP)
    : daysBetween(effectiveLastIP, valueDate);
  const accrualLabel = _isExDivBar
    ? `Next IP ${fmtDate(nextIP)} (ex-div)`
    : (accruedType === 'doa' && effectiveLastIP !== lastIPDate)
      ? `Last IP (auto) ${fmtDate(effectiveLastIP)}`
      : (accruedType === 'doa' ? `DOA ${fmtDate(effectiveLastIP)}` : `Last IP ${fmtDate(effectiveLastIP)}`);

  let html = '';
  if (!recordDate || valueDate <= recordDate) {
    el.className = 'accrued-status cum show';
    html = `<strong>✓ CUM-DIVIDEND</strong> — Settlement ≤ Record date. Buyer WILL receive the ${fmtDate(nextIP)} coupon.<br>`;
    html += `Accrued = ${accDays} days (${accrualLabel} → Value Date ${fmtDate(valueDate)}) — buyer pays seller.`;
  } else {
    el.className = 'accrued-status ex show';
    html = `<strong>⚠ EX-DIVIDEND</strong> — Settlement > Record date (${fmtDate(recordDate)}). Buyer WILL NOT receive ${fmtDate(nextIP)} coupon.<br>`;
    html += `Accrued = ${accDays} days (${accrualLabel} → Value Date ${fmtDate(valueDate)}) — buyer still pays accrued to seller. Seller collects next coupon.`;
  }
  el.innerHTML = html;
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function isLeap(y)  { return (y%4===0 && y%100!==0) || y%400===0; }
function addDays(d, n) { const r = parseLocalDate(d); r.setDate(r.getDate() + n); return r; }
function addYears(d, n) { const r = parseLocalDate(d); r.setFullYear(r.getFullYear() + n); return r; }
function daysBetween(a, b) { return Math.round((parseLocalDate(b) - parseLocalDate(a)) / 86400000); }
function isoStr(d)  { const r = parseLocalDate(d); return r.getFullYear() + '-' + String(r.getMonth()+1).padStart(2,'0') + '-' + String(r.getDate()).padStart(2,'0'); }
function fmtDate(d) { return parseLocalDate(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}); }

function parseLocalDate(val) {
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const [y, m, d] = String(val).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addMonths(date, m) {
  const d = new Date(date), day = d.getDate();
  d.setMonth(d.getMonth() + m);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

// ─── DAY COUNT ENGINE ─────────────────────────────────────────────────────────
// Returns { days, denom } for a coupon period [fromDate, toDate]
// ── CUSTOM DENOM ENGINE ──────────────────────────────────────────────────────────────────────────────
const customDenomMap = {}; // key = "YYYY-M", value = 365 | 366
const customRDMap    = {}; // key = isoStr(ipDate), value = offset-days (integer, may differ from global rdDays)

function customDenomKey(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + (d.getMonth() + 1);
}

function getCustomDenom(toDate) {
  return customDenomMap[customDenomKey(toDate)] || 365;
}

function getFormIpDates() {
  const vdStr = document.getElementById('valueDate').value;
  const mdStr = document.getElementById('maturityDate').value;
  if (!vdStr || !mdStr) return [];
  const freq     = parseInt(document.getElementById('ipFreq').value) || 4;
  const dateType = document.getElementById('ipDateType').value;
  const fixedStr = getFixedStr();
  const domDay   = parseInt(document.getElementById('domDay').value) || 1;
  return generateIPDates(vdStr, mdStr, freq, dateType, fixedStr, domDay);
}

function applyDenomPreset(preset) {
  const ipDates = window._lastIpDates || getFormIpDates();
  if (!ipDates.length) { alert('Please set Value Date, Maturity Date and IP schedule first.'); return; }
  Object.keys(customDenomMap).forEach(k => delete customDenomMap[k]);
  Object.keys(customRDMap).forEach(k => delete customRDMap[k]);
  Object.keys(customIPDateMap).forEach(k => delete customIPDateMap[k]);
  ipDates.forEach(ip => {
    const d = new Date(ip), yr = d.getFullYear(), mo = d.getMonth() + 1;
    const key = yr + '-' + mo;
    if      (preset === 'all366')  { customDenomMap[key] = 366; }
    else if (preset === 'leapcal') { if (isLeap(yr))             customDenomMap[key] = 366; }
    else if (preset === 'leapq1')  { if (isLeap(yr) && mo <= 3)  customDenomMap[key] = 366; }
    else if (preset === 'leapfy')  { const fy = mo <= 3 ? yr-1 : yr; if (isLeap(fy)) customDenomMap[key] = 366; }
    // 'reset' leaves everything as default 365
  });
  calculate();
}

function toggleDenomPill(key) {
  customDenomMap[key] = (customDenomMap[key] === 366) ? 365 : 366;
  refreshDenomPills();
  // Recalculate so accrued interest updates immediately
  if (document.getElementById('dayCount').value === 'custom') {
    if (_bondMode === 'cumulative') calculateCumulative();
    else if (_bondMode === 'zcb') calculateZCB();
    else calculate();
  }
}

function refreshDenomPills() {
  document.querySelectorAll('[data-denom-key]').forEach(btn => {
    const val = customDenomMap[btn.dataset.denomKey] || 365;
    btn.textContent = btn.dataset.label + ' \u00b7 ' + val;
    btn.className = 'denom-mini-btn' + (val === 366 ? ' on366' : '');
  });
}

function toggleCellDenom(isoDateStr, spanEl) {
  const d = new Date(isoDateStr);
  const key = d.getFullYear() + '-' + (d.getMonth() + 1);
  const next = (customDenomMap[key] || 365) === 365 ? 366 : 365;
  customDenomMap[key] = next;
  spanEl.textContent = next;
  spanEl.style.borderColor = next === 366 ? 'rgba(184,134,11,0.5)' : 'var(--border-light)';
  spanEl.style.background  = next === 366 ? 'rgba(184,134,11,0.08)' : 'transparent';
  spanEl.style.color       = next === 366 ? 'var(--gold)' : 'inherit';
  calculate();
}


function toggleCellRD(isoDateStr, spanEl) {
  // Cycle: default → default-1 → default → default+1 → default
  // Actually: show an inline input; user types a number
  // We use a simple approach: click opens prompt for offset value
  const current = customRDMap[isoDateStr] !== undefined
    ? customRDMap[isoDateStr]
    : getRDDays();
  const newVal = prompt('Record date days before IP date for ' + isoDateStr + ':', current);
  if (newVal === null) return; // cancelled
  const parsed = parseInt(newVal);
  if (isNaN(parsed) || parsed < 0) { alert('Enter a non-negative integer.'); return; }
  customRDMap[isoDateStr] = parsed;
  // Recompute this RD and update the span + adjacent rd-row
  const ipDate = parseLocalDate(isoDateStr);
  const newRD  = parsed > 0 ? computeRecordDate(ipDate, parsed) : null;
  const isCustom = customRDMap[isoDateStr] !== undefined && customRDMap[isoDateStr] !== getRDDays();
  spanEl.textContent = newRD ? fmtDate(newRD) : '—';
  spanEl.style.color      = isCustom ? 'var(--gold)' : '';
  spanEl.style.borderColor= isCustom ? 'rgba(184,134,11,0.5)' : 'var(--border-light)';
  spanEl.style.background = isCustom ? 'rgba(184,134,11,0.08)' : 'transparent';
  spanEl.title = isCustom ? 'Custom: '+parsed+' days (click to edit)' : 'Click to customise days';
  // Update the rd-row if showRD is enabled
  const rdRow = spanEl.closest('tr').previousElementSibling;
  if (rdRow && rdRow.classList.contains('rd-row')) {
    const rdCell = rdRow.querySelector('td:nth-child(2)');
    if (rdCell) rdCell.textContent = newRD ? fmtDate(newRD) : '—';
    const noteCell = rdRow.querySelector('td:nth-child(4)');
    if (noteCell) noteCell.textContent = parsed + ' days before ' + fmtDate(parseLocalDate(isoDateStr)) + ' coupon';
  }
}

function getEffectiveRD(ipDate) {
  const key = isoStr(ipDate);
  const days = customRDMap[key] !== undefined ? customRDMap[key] : getRDDays();
  return days > 0 ? computeRecordDate(ipDate, days) : null;
}
function buildDenomPills(ipDates, lastIPDate) {
  const container = document.getElementById('denomPillContainer');
  if (!container) return;
  const seen = new Set(), items = [];
  ipDates.forEach(ip => {
    const key = customDenomKey(ip);
    if (!seen.has(key)) {
      seen.add(key);
      const d = new Date(ip);
      items.push({ key, label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) });
    }
  });
  container.innerHTML = '';
  const byYear = {};
  items.forEach(it => { const yr = it.key.split('-')[0]; (byYear[yr] = byYear[yr] || []).push(it); });
  Object.entries(byYear).forEach(([yr, months]) => {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:9px;color:var(--accent2);letter-spacing:1px;text-transform:uppercase;margin:8px 0 4px;font-weight:600;';
    hdr.textContent = yr + (isLeap(+yr) ? ' \u2014 Leap Year' : '');
    container.appendChild(hdr);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
    months.forEach(it => {
      const btn = document.createElement('button');
      const val = customDenomMap[it.key] || 365;
      btn.className = 'denom-mini-btn' + (val === 366 ? ' on366' : '');
      btn.dataset.denomKey = it.key;
      btn.dataset.label    = it.label;
      btn.textContent = it.label + ' \u00b7 ' + val;
      btn.title = 'Click to toggle 365 / 366';
      btn.onclick = () => toggleDenomPill(it.key);
      row.appendChild(btn);
    });
    container.appendChild(row);
  });
}

function getDayCount(fromDate, toDate, convention) {
  const from = new Date(fromDate), to = new Date(toDate);
  const actualDays = daysBetween(from, to);

  switch (convention) {
    case 'act365': return { days: actualDays, denom: 365 };
    case 'act366': return { days: actualDays, denom: 366 };

    case 'actactical': {
      // The denominator is determined by the coupon (IP) date year.
      // Convention: use the LATER of fromDate/toDate — the IP date.
      // In normal (CUM-DIV): toDate = IP date → to.getFullYear() ✓
      // In ex-div:           fromDate = nextIPDate, toDate = valueDate
      //   → toDate is BEFORE fromDate → must use fromDate year instead.
      // This ensures: next IP 13-Jan-2028 (leap) → denom=366, even when VD=31-Dec-2027.
      const ipYear = actualDays < 0
        ? from.getFullYear()   // ex-div: fromDate IS the IP date
        : to.getFullYear();    // normal: toDate IS the IP date
      return { days: actualDays, denom: isLeap(ipYear) ? 366 : 365 };
    }

    case 'actactfy': {
      // Indian FY runs Apr 1 – Mar 31. FY is leap if fyStartYear is a leap year.
      // In ex-div: fromDate = nextIPDate (the actual IP date), toDate = valueDate.
      // Use the later date (the IP date) to determine the FY.
      const ipDate = actualDays < 0 ? from : to;
      const yr = ipDate.getFullYear();
      const mo = ipDate.getMonth(); // 0-based
      const fyStartYear = mo < 3 ? yr - 1 : yr;
      return { days: actualDays, denom: isLeap(fyStartYear) ? 366 : 365 };
    }

    case 'act360': return { days: actualDays, denom: 360 };
    case 'custom':  return { days: actualDays, denom: getCustomDenom(actualDays < 0 ? fromDate : toDate) };  // ex-div: use fromDate (nextIPDate) for denom lookup

    case '30360': {
      // 30/360 US convention
      let y1 = from.getFullYear(), m1 = from.getMonth()+1, d1 = from.getDate();
      let y2 = to.getFullYear(),   m2 = to.getMonth()+1,   d2 = to.getDate();
      if (d1 === 31) d1 = 30;
      if (d2 === 31 && d1 === 30) d2 = 30;
      const days360 = 360*(y2-y1) + 30*(m2-m1) + (d2-d1);
      return { days: days360, denom: 360 };
    }

    case 'custom': return { days: actualDays, denom: getCustomDenom(actualDays < 0 ? fromDate : toDate) };
    default: return { days: actualDays, denom: 365 };
  }
}

// Convenience: interest amount for a coupon period
function couponInterest(fvTotal, couponRate, fromDate, toDate, convention) {
  const { days, denom } = getDayCount(fromDate, toDate, convention);
  return { interest: fvTotal * couponRate * days / denom, days, denom };
}

// Helper: get fixedDates string — for G-Sec always derives from maturity date
// so user never needs to manually enter IP dates in G-Sec mode
function getFixedStr() {
  if (_bondMode === 'gsec') {
    const _mdStr = document.getElementById('maturityDate').value;
    if (_mdStr) {
      const _mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const _a = parseLocalDate(_mdStr);
      const _m1 = _a.getMonth(), _m2 = (_m1+6)%12;
      return _a.getDate() + '/' + _mNames[_m1] + ', ' + _a.getDate() + '/' + _mNames[_m2];
    }
  }
  return document.getElementById('fixedDates').value;
}

const MONTHS = {
  // 3-letter abbreviated
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
  // Full names
  January:0,February:1,March:2,April:3,June:5,July:6,August:7,
  September:8,October:9,November:10,December:11,
  // Numeric (0-indexed used internally by JS Date)
  '01':0,'02':1,'03':2,'04':3,'05':4,'06':5,'07':6,'08':7,'09':8,'10':9,'11':10,'12':11,
  // Numeric without leading zero
  '1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':7,'9':8
};
function parseFixedDate(s) {
  // Accept: DD/Mon, DD/Month, DD/MM, DD-Mon, DD-Month, DD-MM
  // e.g. "12/Jun", "12/June", "12/06", "12-Jun", "31/Mar", "01/January"
  const str = s.trim();
  // Split on / or -
  const parts = str.split(/[\/\-]/);
  if (parts.length < 2) return { day: NaN, month: NaN };
  const dd  = parseInt(parts[0]);
  const mon = parts[1].trim();
  // Try named month first, then numeric
  let month = MONTHS[mon];
  if (month === undefined) {
    // Try capitalising first letter (handles "jun" → "Jun", "june" → "June")
    const cap = mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase();
    month = MONTHS[cap];
  }
  if (month === undefined) {
    // Try numeric with/without leading zero
    const n = parseInt(mon);
    if (!isNaN(n) && n >= 1 && n <= 12) month = n - 1; // convert 1-based to 0-based
  }
  return { day: dd, month: month };
}

function generateIPDates(vdStr, mdStr, freq, dateType, fixedStr, domDay) {
  const vd = parseLocalDate(vdStr), md = parseLocalDate(mdStr);
  const intMo = 12 / freq;
  const bdAdj = getIPBdAdj();
  const dates = [];

  if (dateType === 'manual') {
    return getManualIPDates().filter(d => d > vd && d <= md);
  }

  if (dateType === 'first') {
    let cur = new Date(vd.getFullYear(), vd.getMonth() + 1, 1);
    while (cur <= md) { if (cur > vd) dates.push(adjustIPBD(new Date(cur), bdAdj)); cur = addMonths(cur, intMo); }
  } else if (dateType === 'last') {
    let cur = new Date(vd.getFullYear(), vd.getMonth() + 1, 0);
    while (cur <= md) { if (cur > vd) dates.push(adjustIPBD(new Date(cur), bdAdj)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1 + intMo, 0); }
  } else if (dateType === 'dom') {
    let cur = new Date(vd.getFullYear(), vd.getMonth(), domDay);
    if (cur <= vd) cur = addMonths(cur, intMo);
    while (cur <= md) { dates.push(adjustIPBD(new Date(cur), bdAdj)); cur = addMonths(cur, intMo); }
  } else {
    // fixed — no BD adjustment (issuer specifies exact dates)
    const parsed = fixedStr.split(',').map(parseFixedDate);
    let yr = vd.getFullYear() - 1;
    while (yr <= md.getFullYear() + 1) {
      for (const p of parsed) {
        const d = new Date(yr, p.month, p.day);
        if (d > vd && d <= md) dates.push(new Date(d));
      }
      yr++;
    }
    dates.sort((a, b) => a - b);
  }

  // Apply per-IP date overrides from cash flow table
  for (let i = 0; i < dates.length; i++) {
    const key = isoStr(dates[i]);
    if (customIPDateMap[key]) {
      dates[i] = parseLocalDate(customIPDateMap[key]);
    }
  }

  if (!dates.some(d => isoStr(d) === isoStr(md))) dates.push(new Date(md));
  return dates;
}

// ─── XIRR Newton-Raphson ─────────────────────────────────────────────────────
function xirrCalc(cfs, dates, guess = 0.1) {
  const t0 = dates[0];
  for (let i = 0; i < 500; i++) {
    let npv = 0, d = 0;
    for (let j = 0; j < cfs.length; j++) {
      const t = (dates[j] - t0) / (365 * 86400000);
      const denom = Math.pow(1 + guess, t);
      npv += cfs[j] / denom;
      d   -= t * cfs[j] / (denom * (1 + guess));
    }
    const next = guess - npv / d;
    if (Math.abs(next - guess) < 1e-9) return next;
    guess = next;
  }
  return guess;
}

// ─── FORMAT helpers ───────────────────────────────────────────────────────────
const fmt  = (n, dec=2) => '₹' + n.toLocaleString('en-IN', {minimumFractionDigits:dec, maximumFractionDigits:dec});
const fmtN = (n, dec=2) => n.toLocaleString('en-IN', {minimumFractionDigits:dec, maximumFractionDigits:dec});

function showError(msg) {
  const el = document.getElementById('errBox');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = '';
}
function clearError() { document.getElementById('errBox').classList.remove('show'); }

// ─── XNPV ────────────────────────────────────────────────────────────────────
function xnpvCalc(rate, cfs, dates) {
  const t0 = dates[0];
  return cfs.reduce((sum, cf, i) => {
    const t = (dates[i] - t0) / (365 * 86400000);
    return sum + cf / Math.pow(1 + rate, t);
  }, 0);
}


// ── All IP dates from allotment with minimum-gap filter ──────────────────────
// For staggered firstIP mode, generates all IP dates from the allotment date
// onwards BUT filters out any date that is fewer than minGapDays after allotment.
// This prevents spurious dates: e.g. a bond allotted 16-Dec-2025 with an 18/Dec
// pattern would otherwise include 18-Dec-2025 (only 2 days after allotment).
// minGapDays = 14: no bond can pay its first coupon within 14 days of allotment.
function getAllIPDatesFromAllotment(allotStr, mdStr, freq, dateType, fixedStr, domDay) {
  const allotD   = parseLocalDate(allotStr);
  const minGap   = 14; // days — minimum gap between allotment and first valid coupon
  const rawDates = generateIPDatesRaw(allotStr, mdStr, freq, dateType, fixedStr, domDay, getIPBdAdj());
  return rawDates.filter(d => {
    const gap = Math.round((d - allotD) / 86400000);
    return gap >= minGap;
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// CUMULATIVE BOND ENGINE
// ═══════════════════════════════════════════════════════════════════════════

let _bondMode = 'regular'; // 'regular' | 'cumulative' | 'zcb' | 'gsec'

function setBondMode(mode) {
  _bondMode = mode;
  const isC   = mode === 'cumulative';
  const isZ   = mode === 'zcb';
  const isG   = mode === 'gsec';
  const isTFB = mode === 'taxfree';
  const isReg = mode === 'regular';

  // Toggle button styles
  document.getElementById('modeRegularBtn').classList.toggle('active', isReg);
  document.getElementById('modeCumulBtn').classList.toggle('active', isC);
  document.getElementById('modeZcbBtn').classList.toggle('active', isZ);
  document.getElementById('modeGsecBtn').classList.toggle('active', isG);
  document.getElementById('modeTfbBtn').classList.toggle('active', isTFB);

  // Show/hide cumulative-only fields
  document.getElementById('cumulCompoundField').style.display = isC ? '' : 'none';
  document.getElementById('cumulTaxField').style.display      = isC ? '' : 'none';

  // Show/hide ZCB-only fields and price blocks
  document.getElementById('zcbFields').style.display         = isZ ? '' : 'none';
  document.getElementById('zcbPriceBlock').style.display     = isZ ? '' : 'none';
  // regularPriceBlock shown for all except ZCB; G-Sec relabels it via onCalcModeChange
  document.getElementById('regularPriceBlock').style.display = isZ ? 'none' : '';
  setTimeout(onCalcModeChange, 0); // relabel options for G-Sec or restore for regular
  // Show/hide G-Sec specific fields
  document.getElementById('gsecFields').style.display = isG ? '' : 'none';

  // Show/hide Tax-Free Bond fields
  document.getElementById('tfbFields').style.display = isTFB ? '' : 'none';
  // TFB: hide TDS-related fields (stamp still applies), show/hide TEY boxes
  ['tfbTEYBox','tfbSavingBox'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isTFB ? '' : 'none';
  });

  // Coupon rate: hide for ZCB (no coupon), visible for G-Sec
  const couponField = document.getElementById('couponRate')?.closest('.field');
  if (couponField) couponField.style.display = isZ ? 'none' : '';

  // G-Sec/SDL: auto-configure all settings per RBI/FIMMDA convention
  if (isG) {
    document.getElementById('dayCount').value    = '30360';   onDayCountChange();
    document.getElementById('ipFreq').value      = '2';       onFreqChange();
    document.getElementById('ipDateType').value  = 'fixed';   onDateTypeChange();
    document.getElementById('rdRule').value      = '0';       onRDChange();

    // Auto-fill fixedDates from allotment or maturity date
    // G-Secs pay semi-annual coupons on the same day/month as allotment or maturity
    // e.g. Allotment 22-Apr-2024, Maturity 12-Jun-2063 → IP dates = 12/Jun, 12/Dec
    (function() {
      const _fdEl = document.getElementById('fixedDates');
      if (_fdEl && !_fdEl.value.trim()) {
        // Prefer maturity date as anchor (most G-Secs pay on same day/month as maturity)
        const _mdStr = document.getElementById('maturityDate').value;
        const _alStr = document.getElementById('allotmentDate').value;
        const _anchor = _mdStr ? parseLocalDate(_mdStr) : (_alStr ? parseLocalDate(_alStr) : null);
        if (_anchor) {
          const _day = _anchor.getDate();
          const _mon1 = _anchor.getMonth(); // 0-indexed
          const _mon2 = (_mon1 + 6) % 12;   // 6 months later
          const _mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          _fdEl.value = _day + '/' + _mNames[_mon1] + ', ' + _day + '/' + _mNames[_mon2];
          renderLastIPQuickSelect();
        }
      }
    })();
    document.getElementById('faceValue').value   = '100';     // G-Sec FV is always ₹100
    document.getElementById('stampDuty').value   = '0';       // No stamp duty on G-Secs
    document.getElementById('isCallable').value  = 'no';      onCallableChange();
    // Hide fields not applicable to G-Secs
    const _callRow = document.getElementById('isCallable')?.closest('.field-row') ||
                     document.getElementById('isCallable')?.closest('.field');
    if (_callRow) _callRow.style.display = 'none';
    const _ratingField = document.getElementById('bondRating')?.closest('.field');
    if (_ratingField) _ratingField.style.display = 'none';
    const _typeField = document.getElementById('bondType')?.closest('.field');
    if (_typeField) _typeField.style.display = 'none';
    const _stampField = document.getElementById('stampDuty')?.closest('.field');
    if (_stampField) _stampField.style.display = 'none';
    // Show G-Sec metric boxes, hide XIRR template (not applicable for G-Secs)
    ['gsecYTMBox','gsecEARBox'].forEach(id => document.getElementById(id).style.display = '');
    const _xirrBtn = document.getElementById('xirrTemplateBtn');
    if (_xirrBtn) _xirrBtn.style.display = 'none';
  } else {
    // Restore hidden fields when leaving G-Sec mode
    const _callRow = document.getElementById('isCallable')?.closest('.field-row') ||
                     document.getElementById('isCallable')?.closest('.field');
    if (_callRow) _callRow.style.display = '';
    const _ratingField = document.getElementById('bondRating')?.closest('.field');
    if (_ratingField) _ratingField.style.display = '';
    const _typeField = document.getElementById('bondType')?.closest('.field');
    if (_typeField) _typeField.style.display = '';
    const _stampField = document.getElementById('stampDuty')?.closest('.field');
    if (_stampField) _stampField.style.display = '';
    // Restore XIRR template button
    const _xirrBtnR = document.getElementById('xirrTemplateBtn');
    if (_xirrBtnR) _xirrBtnR.style.display = '';
    // Reset stamp duty and face value to defaults — but NOT when loading a saved bond
    if (!isC && !isZ && !window._loadingBond) {
      document.getElementById('stampDuty').value = '0.0001';
      document.getElementById('faceValue').value = '100000';
    }
    // Restore In-Hand panel when leaving G-Sec mode
    const _panels2 = document.getElementById('taxXirrPanels');
    if (_panels2) {
      _panels2.style.gridTemplateColumns = '1fr 1fr';
      if (_panels2.children[0]) _panels2.children[0].style.display = '';
    }
    // Hide G-Sec specific metric boxes
    ['gsecYTMBox','gsecEARBox','gsecSpreadBox'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  // Show/hide cards not applicable to cumulative / ZCB
  ['cardIPSchedule','cardRedemption','cardRecordDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (isC || isZ) ? 'none' : '';
  });

  // Allotment date label
  const allotLabel = [...document.querySelectorAll('label')].find(l => l.textContent.includes('Allotment'));
  if (allotLabel) {
    allotLabel.innerHTML = (isC || isZ)
      ? 'Allotment / Issue Date <span style="color:var(--red);font-size:9px;">(Required)</span>'
      : 'Allotment / Issue Date <span style="font-size:9px;color:var(--text-dim);font-weight:400;">(Optional)</span>';
  }

  // Hide all results panels
  document.getElementById('zcbResultsPanel').style.display   = 'none';
  document.getElementById('cumulResultsPanel').style.display = 'none';
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = 'none';  // hide placeholder when results shown
  document.getElementById('cumulTaxCard').style.display      = 'none';

  // Sale card — only for regular bonds
  const saleCard = document.getElementById('saleInputCard');
  if (saleCard) saleCard.style.display = (isC || isZ) ? 'none' : '';
}

function onZcbCalcModeChange() {
  const isPrice = document.getElementById('zcbCalcMode').value === 'priceToXirr';
  document.getElementById('zcbPriceField').style.display = isPrice ? '' : 'none';
  document.getElementById('zcbXIRRField').style.display  = isPrice ? 'none' : '';
}

function onZcbNotifiedChange() {
  const isNotified = document.getElementById('zcbNotified').value === 'yes';
  const hint = document.getElementById('zcbNotifiedHint');
  if (hint) hint.textContent = isNotified
    ? 'Notified ZCB (Sec 2(48)): Only LTCG (>12 months @ 12.5%) or STCG (≤12 months @ slab). No TDS u/s 193 since differential is capital gain, not interest.'
    : 'Non-notified ZCB: Differential between issue and redemption is treated as interest income (taxed at slab). 10% TDS u/s 193 typically applies at redemption.';
  // Refresh TDS column visibility if calc results are showing
  if (typeof _toggleTDSColumnVisibility === 'function') _toggleTDSColumnVisibility();
}

// ── Main cumulative calculate ────────────────────────────────────────────────
function calculateCumulative() {
  clearError();

  const vdStr      = document.getElementById('valueDate').value;
  const mdStr      = document.getElementById('maturityDate').value;
  const allotStr   = document.getElementById('allotmentDate').value;
  const fvPerBond  = parseFloat(document.getElementById('faceValue').value);
  const qty        = parseFloat(document.getElementById('quantity').value) || 1;
  const couponPct  = parseFloat(document.getElementById('couponRate').value);
  const n          = parseInt(document.getElementById('cumulCompound').value) || 1;
  const stampPct   = parseFloat(document.getElementById('stampDuty').value) / 100;
  const mode       = document.getElementById('calcMode').value;

  if (!vdStr)    return showError('Enter Value / Settlement Date.');
  if (!mdStr)    return showError('Enter Maturity Date.');
  if (!allotStr) return showError('Allotment Date is required for cumulative bonds.');
  if (isNaN(fvPerBond) || fvPerBond <= 0) return showError('Invalid Face Value.');
  if (isNaN(couponPct) || couponPct <= 0) return showError('Invalid Coupon Rate.');

  const vd    = parseLocalDate(vdStr);
  const md    = parseLocalDate(mdStr);
  const allot = parseLocalDate(allotStr);
  const fvTotal = fvPerBond * qty;
  const r     = couponPct / 100;

  if (vd >= md)    return showError('Value Date must be before Maturity Date.');
  if (allot >= md) return showError('Allotment Date must be before Maturity Date.');

  // ── Time calculations (in years, using actual/365) ─────────────────────────
  const tAllotToMat = daysBetween(allot, md) / 365;  // total bond life
  const tAllotToVD  = daysBetween(allot, vd) / 365;  // elapsed since allotment
  const tVDtoMat    = daysBetween(vd, md) / 365;      // remaining to maturity

  // ── Maturity value (from allotment) ────────────────────────────────────────
  // FV × (1 + r/n)^(n × T_total)
  const maturityValue = fvTotal * Math.pow(1 + r/n, n * tAllotToMat);

  // ── Intrinsic value at value date ─────────────────────────────────────────
  // What the bond is worth on VD based purely on compounding from allotment
  const intrinsicAtVD = fvTotal * Math.pow(1 + r/n, n * tAllotToVD);

  // ── Effective Annual Rate ──────────────────────────────────────────────────
  const ear = Math.pow(1 + r/n, n) - 1;

  // ── Accrued Interest = compounded interest from allotment to VD ─────────────
  // = Intrinsic Value at VD − Original Face Value
  // Buyer pays seller for the interest that has accumulated (compounded) since allotment.
  const accruedCumul = intrinsicAtVD - fvTotal;   // e.g. FV×(1+r/n)^(n×t) − FV

  // ── Price / XIRR depending on mode ─────────────────────────────────────────
  // Price is always entered/quoted as % of original Face Value (not intrinsic).
  // Consideration = Principal + Accrued Interest (same structure as regular bonds)
  let pricePct, principal, consideration, xirrRate, derivedPricePct;

  if (mode === 'priceToXirr') {
    pricePct      = parseFloat(document.getElementById('price').value);
    if (isNaN(pricePct) || pricePct <= 0) return showError('Invalid Price.');
    principal     = fvTotal * pricePct / 100;          // FV × price%
    consideration = principal + accruedCumul;          // principal + accrued
    // XIRR: outflow = -consideration, inflow = maturityValue
    xirrRate      = Math.pow(maturityValue / consideration, 1 / tVDtoMat) - 1;
    derivedPricePct = pricePct;
  } else {
    // XIRR → derive consideration, then back out price
    const targetXIRR = parseFloat(document.getElementById('xirrInput').value) / 100;
    if (isNaN(targetXIRR) || targetXIRR <= 0) return showError('Invalid Target XIRR.');
    consideration = maturityValue / Math.pow(1 + targetXIRR, tVDtoMat);
    principal     = consideration - accruedCumul;      // principal = consideration − accrued
    pricePct      = principal / fvTotal * 100;         // price% = principal / FV × 100
    derivedPricePct = pricePct;
    xirrRate      = targetXIRR;
  }

  const stampAmt    = Math.round(consideration * stampPct);
  const settlement  = consideration + stampAmt;
  const totalGain   = maturityValue - consideration;
  const discPrem    = consideration - intrinsicAtVD;   // + = premium, − = discount

  const freqLabels  = {1:'Annual',2:'Semi-Annual',4:'Quarterly',12:'Monthly'};

  // ── Display results ─────────────────────────────────────────────────────────
  const fmt = (v, d=2) => '₹' + v.toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});

  // Hero bar
  document.getElementById('cumulXIRR').textContent         = (xirrRate*100).toFixed(4) + '%';
  document.getElementById('cumulXIRRSub').textContent      = mode==='priceToXirr' ? 'From buy price to maturity payout' : 'Target yield entered';
  document.getElementById('cumulMatVal').textContent       = fmt(maturityValue);
  document.getElementById('cumulMatValSub').textContent    = qty + ' × ₹' + fvPerBond.toLocaleString('en-IN') + ' × (1+' + (r/n*100).toFixed(4) + '%)^' + (n*tAllotToMat).toFixed(2);
  document.getElementById('cumulHeroRightLbl').textContent = mode==='priceToXirr' ? 'Price (% of FV principal)' : 'Derived Price (% FV)';
  document.getElementById('cumulPricePaid').textContent    = derivedPricePct.toFixed(4) + '%';
  document.getElementById('cumulPricePaidSub').textContent = fmt(principal) + ' principal';

  // Metrics
  document.getElementById('cumulPrincipal').textContent    = fmt(principal);
  document.getElementById('cumulPrincipalSub').textContent = derivedPricePct.toFixed(4) + '% × ' + fmt(fvTotal,0);

  document.getElementById('cumulAccrued').textContent      = fmt(accruedCumul);
  document.getElementById('cumulAccruedSub').textContent   = fmt(intrinsicAtVD) + ' − ' + fmt(fvTotal,0) + ' | ' + Math.round(tAllotToVD*365) + ' days';

  document.getElementById('cumulConsideration').textContent = fmt(consideration);

  document.getElementById('cumulStamp').textContent        = fmt(stampAmt, 0);
  document.getElementById('cumulStampSub').textContent     = (stampPct*100).toFixed(4) + '% of ' + fmt(consideration);

  document.getElementById('cumulIntrinsic').textContent    = fmt(intrinsicAtVD);
  document.getElementById('cumulIntrinsicSub').textContent = Math.round(tAllotToVD*365) + ' days from allotment';

  document.getElementById('cumulDiscPrem').textContent     = (discPrem >= 0 ? '+' : '') + fmt(discPrem);
  document.getElementById('cumulDiscPrem').className       = 'm-val ' + (Math.abs(discPrem) < 1 ? '' : discPrem > 0 ? 'orange' : 'green');
  document.getElementById('cumulDiscPremSub').textContent  = Math.abs(discPrem) < 1 ? 'At intrinsic value' : discPrem > 0 ? 'Premium to intrinsic' : 'Discount to intrinsic';

  document.getElementById('cumulTotalGain').textContent    = fmt(totalGain);
  document.getElementById('cumulTotalGainSub').textContent = fmt(maturityValue) + ' − ' + fmt(consideration);

  document.getElementById('cumulHolding').textContent      = Math.round(tVDtoMat*365) + ' days';
  document.getElementById('cumulHoldingSub').textContent   = tVDtoMat.toFixed(4) + ' years to maturity';

  document.getElementById('cumulFreqDisplay').textContent  = freqLabels[n] || n + '×/yr';
  document.getElementById('cumulFreqSub').textContent      = 'Compounded ' + n + ' time(s) per year';

  document.getElementById('cumulEAR').textContent          = (ear*100).toFixed(4) + '%';
  document.getElementById('cumulEARSub').textContent       = '(1 + ' + (r/n*100).toFixed(4) + '%)^' + n + ' − 1';

  document.getElementById('cumulTallot').textContent       = tAllotToVD.toFixed(4) + ' yrs';
  document.getElementById('cumulTallotSub').textContent    = Math.round(tAllotToVD*365) + ' days since allotment';

  // Formula note
  document.getElementById('cumulFNote').innerHTML =
    '<strong>Compounding:</strong> ' + freqLabels[n] + ' (n=' + n + ') · r/n = ' + (r/n*100).toFixed(4) + '% per period<br>' +
    '<strong>Maturity Value:</strong> ' + fmt(fvTotal,0) + ' × (1 + ' + (r/n*100).toFixed(4) + '%)^' + (n*tAllotToMat).toFixed(4) + ' = ' + fmt(maturityValue) + '<br>' +
    '<strong>Intrinsic at VD:</strong> ' + fmt(fvTotal,0) + ' × (1 + ' + (r/n*100).toFixed(4) + '%)^' + (n*tAllotToVD).toFixed(4) + ' = ' + fmt(intrinsicAtVD) + '<br>' +
    '<strong>Principal:</strong> ' + fmt(fvTotal,0) + ' × ' + derivedPricePct.toFixed(4) + '% = ' + fmt(principal) + '<br>' +
    '<strong>Accrued Interest:</strong> ' + fmt(intrinsicAtVD) + ' − ' + fmt(fvTotal,0) + ' = ' + fmt(accruedCumul) + ' (' + Math.round(tAllotToVD*365) + ' days compounding)<br>' +
    '<strong>Consideration:</strong> ' + fmt(principal) + ' + ' + fmt(accruedCumul) + ' = ' + fmt(consideration) + '<br>' +
    '<strong>Stamp Duty:</strong> ' + fmt(consideration) + ' × ' + (stampPct*100).toFixed(4) + '% = ' + fmt(stampAmt,0) + '<br>' +
    '<strong>Settlement:</strong> ' + fmt(consideration) + ' + ' + fmt(stampAmt,0) + ' = ' + fmt(settlement) + '<br>' +
    '<strong>XIRR:</strong> (MaturityValue / Consideration)^(1 / ' + tVDtoMat.toFixed(4) + ') − 1 = ' + (xirrRate*100).toFixed(4) + '%';

  // ── Tax Analysis — both Accrual and Receipt basis ───────────────────────────
  const taxSlabRate  = parseFloat(document.getElementById('cumulTaxSlab').value) || 0.30;

  // Build year-by-year accrual rows (ALLOTMENT → MATURITY)
  const taxRows = [];
  let yearStart = new Date(allot);
  let yearNum   = 0;
  while (yearStart < md) {
    yearNum++;
    let yearEnd = new Date(yearStart);
    yearEnd.setFullYear(yearEnd.getFullYear() + 1);
    if (yearEnd > md) yearEnd = new Date(md);
    const tOpen  = daysBetween(allot, yearStart) / 365;
    const tClose = daysBetween(allot, yearEnd)   / 365;
    const openVal  = fvTotal * Math.pow(1 + r/n, n * tOpen);
    const closeVal = fvTotal * Math.pow(1 + r/n, n * tClose);
    const interest = closeVal - openVal;
    const taxAmt   = interest * taxSlabRate;
    const netAmt   = interest - taxAmt;
    const fy = yearStart.getFullYear() + '-' + String(yearEnd.getFullYear()).slice(-2);
    taxRows.push({ yearNum, label: fy, openVal, closeVal, interest, taxAmt, netAmt,
                   yearStart: new Date(yearStart), yearEnd: new Date(yearEnd) });
    yearStart = new Date(yearEnd);
  }

  const totalInterest = taxRows.reduce((s, r) => s + r.interest, 0);
  const totalTax      = taxRows.reduce((s, r) => s + r.taxAmt, 0);
  const totalNet      = taxRows.reduce((s, r) => s + r.netAmt, 0);

  // ── ACCRUAL BASIS rendering ──────────────────────────────────────────────────
  // Under accrual, entire gain is taxed annually → no capital gain tax at maturity
  const tbody = document.getElementById('cumulTaxBody');
  tbody.innerHTML = '';
  taxRows.forEach(row => {
    const tr = document.createElement('tr');
    const isPast = row.yearEnd <= vd;
    tr.style.opacity = isPast ? '0.55' : '1';
    tr.innerHTML = `
      <td class="dim">${row.yearNum}</td>
      <td>${row.label}${isPast ? ' <span class="tag cum" style="font-size:8px;">Paid</span>' : ''}</td>
      <td class="r">${fmt(row.openVal)}</td>
      <td class="r">${fmt(row.closeVal)}</td>
      <td class="r pos">${fmt(row.interest)}</td>
      <td class="r" style="color:var(--red);">−${fmt(row.taxAmt)}</td>
      <td class="r">${fmt(row.netAmt)}</td>`;
    tbody.appendChild(tr);
  });
  // Totals row
  const trTot = document.createElement('tr');
  trTot.style.cssText = 'font-weight:600;border-top:2px solid var(--border);';
  trTot.innerHTML = `
    <td colspan="4" style="font-size:10px;color:var(--text-dim);">TOTAL — All years (accrual)</td>
    <td class="r pos">${fmt(totalInterest)}</td>
    <td class="r" style="color:var(--red);">−${fmt(totalTax)}</td>
    <td class="r">${fmt(totalNet)}</td>`;
  tbody.appendChild(trTot);
  // Maturity row: CG = 0 since all interest already taxed annually
  const trMatAccrual = document.createElement('tr');
  trMatAccrual.style.cssText = 'background:var(--green-bg);';
  trMatAccrual.innerHTML = `
    <td colspan="4" style="font-size:10px;color:var(--green);">
      At Maturity — Capital Gain Tax
      <span style="font-size:9px;color:var(--text-dim);"> (interest fully taxed annually → ₹0 CG tax)</span>
    </td>
    <td class="r" style="color:var(--text-dim);">—</td>
    <td class="r" style="color:var(--green);">₹0</td>
    <td class="r" style="color:var(--green);font-weight:600;">${fmt(maturityValue)} received</td>`;
  tbody.appendChild(trMatAccrual);
  // Summary row
  const trSumA = document.createElement('tr');
  trSumA.style.cssText = 'background:var(--accent-bg);font-weight:700;border-top:2px solid var(--border);';
  trSumA.innerHTML = `
    <td colspan="4" style="font-size:10px;color:var(--accent2);">NET IN HAND (Accrual basis)</td>
    <td class="r" style="color:var(--accent2);">${fmt(maturityValue)}</td>
    <td class="r" style="color:var(--red);">−${fmt(totalTax)}</td>
    <td class="r" style="color:var(--accent2);font-size:13px;">${fmt(maturityValue - totalTax)}</td>`;
  tbody.appendChild(trSumA);

  document.getElementById('cumulTaxNote').innerHTML =
    '<strong>Method:</strong> Annual accrual (Section 145A) — each year\'s interest taxed at ' + Math.round(taxSlabRate*100) + '% slab<br>' +
    '<strong>Total tax over bond life:</strong> ' + fmt(totalTax) + ' (spread across ' + taxRows.length + ' years)<br>' +
    '<strong>Capital gain at maturity:</strong> ₹0 — entire gain already taxed year by year<br>' +
    '<strong>Net in hand:</strong> ' + fmt(maturityValue) + ' − ' + fmt(totalTax) + ' = <strong>' + fmt(maturityValue - totalTax) + '</strong><br>' +
    '<span style="color:var(--text-dim);">Note: Tax is paid each year even though no cash is received — cash flow mismatch. XIRR above does not reflect this tax drag.</span>';

  // ── RECEIPT BASIS rendering ──────────────────────────────────────────────────
  // Under receipt basis: no tax during holding. Full gain taxed in maturity year at slab.
  // If sold before maturity: LTCG (>12mo @ 12.5%) or STCG (≤12mo @ slab)
  const isLTCGcumul  = tVDtoMat > 1;
  const cgTaxRate    = isLTCGcumul ? 0.125 : taxSlabRate;
  // At maturity: entire interest income = maturityValue - principal, taxed at slab
  const receiptTaxAtMaturity = totalInterest * taxSlabRate;
  const receiptNetAtMaturity = maturityValue - receiptTaxAtMaturity;
  // If sold before maturity (capital gain treatment)
  const capGainCumul = maturityValue - principal;
  const cgTax        = capGainCumul > 0 ? capGainCumul * cgTaxRate : 0;
  const netCapGain   = capGainCumul - cgTax;

  const tbodyR = document.getElementById('cumulTaxBodyReceipt');
  tbodyR.innerHTML = '';
  let cumGain = 0;
  taxRows.forEach(row => {
    cumGain += row.interest;
    const isPast = row.yearEnd <= vd;
    const isMaturYr = row.yearEnd >= md;
    const tr = document.createElement('tr');
    tr.style.opacity = isPast ? '0.55' : '1';
    if (isMaturYr) tr.style.cssText = 'background:var(--gold-bg);font-weight:600;';
    tr.innerHTML = `
      <td class="dim">${row.yearNum}</td>
      <td>${row.label}${isMaturYr ? ' <span class="tag" style="background:var(--gold-bg);color:var(--gold);font-size:8px;">Maturity Year</span>' : (isPast ? ' <span class="tag cum" style="font-size:8px;">Holding</span>' : '')}</td>
      <td class="r pos">${fmt(row.interest)}</td>
      <td class="r" style="color:${isMaturYr ? 'var(--red)' : 'var(--text-dim)'};">${isMaturYr ? '−'+fmt(receiptTaxAtMaturity) : '—'}</td>
      <td class="r" style="color:${isMaturYr ? 'var(--red)' : 'var(--text-dim)'};">${isMaturYr ? fmt(receiptTaxAtMaturity) : '₹0'}</td>
      <td class="r">${fmt(cumGain)}</td>`;
    tbodyR.appendChild(tr);
  });
  // Net in hand row
  const trSumR = document.createElement('tr');
  trSumR.style.cssText = 'background:var(--accent-bg);font-weight:700;border-top:2px solid var(--border);';
  trSumR.innerHTML = `
    <td colspan="3" style="font-size:10px;color:var(--accent2);">NET IN HAND (Receipt basis — held to maturity)</td>
    <td class="r" style="color:var(--red);">−${fmt(receiptTaxAtMaturity)}</td>
    <td class="r" style="color:var(--red);">${fmt(receiptTaxAtMaturity)}</td>
    <td class="r" style="color:var(--accent2);font-size:13px;">${fmt(receiptNetAtMaturity)}</td>`;
  tbodyR.appendChild(trSumR);
  // If sold before maturity — capital gain section
  const trCGR = document.createElement('tr');
  trCGR.style.cssText = 'background:var(--purple-bg);border-top:2px solid var(--border);';
  trCGR.innerHTML = `
    <td colspan="3" style="font-size:10px;">
      If sold before maturity — ${isLTCGcumul ? 'LTCG @ 12.5%' : 'STCG @ ' + Math.round(taxSlabRate*100) + '%'}
      <span style="font-size:9px;color:var(--text-dim);"> (${isLTCGcumul ? '>12 months held' : '≤12 months held'})</span>
    </td>
    <td class="r" style="color:var(--purple);">${fmt(capGainCumul)}</td>
    <td class="r" style="color:var(--red);">−${fmt(cgTax)}</td>
    <td class="r" style="color:var(--purple);font-weight:600;">${fmt(netCapGain)}</td>`;
  tbodyR.appendChild(trCGR);

  document.getElementById('cumulTaxNoteReceipt').innerHTML =
    '<strong>Method:</strong> Receipt basis — no tax during holding, full interest income taxed at ' + Math.round(taxSlabRate*100) + '% slab in maturity year<br>' +
    '<strong>Total interest income at maturity:</strong> ' + fmt(totalInterest) + ' taxed at ' + Math.round(taxSlabRate*100) + '% = ' + fmt(receiptTaxAtMaturity) + '<br>' +
    '<strong>Net in hand:</strong> ' + fmt(maturityValue) + ' − ' + fmt(receiptTaxAtMaturity) + ' = <strong>' + fmt(receiptNetAtMaturity) + '</strong><br>' +
    '<strong>If sold before maturity:</strong> ' + (isLTCGcumul ? 'Held >12 months → LTCG @ 12.5%' : 'Held ≤12 months → STCG @ ' + Math.round(taxSlabRate*100) + '%') + ' on gain of ' + fmt(capGainCumul) + ' = tax ' + fmt(cgTax) + '<br>' +
    '<span style="color:var(--gold);">⚠ Caveat: Receipt basis is debated — Section 145A mandates accrual for most taxpayers. Consult a CA for your specific situation.</span>';

  document.getElementById('cumulTaxRateBadge').textContent = 'Slab: ' + Math.round(taxSlabRate*100) + '% · ' + (isLTCGcumul ? 'LTCG eligible' : 'STCG if sold');

  document.getElementById('cumulTaxCard').style.display = 'block';
  document.getElementById('cumulResultsPanel').style.display = 'block';
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = 'none';  // hide placeholder when results shown

  // Store for download
  window._lastCumulCalc = {
    vd, md, allot, fvTotal, fvPerBond, qty, couponPct, n, r,
    maturityValue, intrinsicAtVD, accruedCumul,
    principal, consideration, stampAmt, settlement,
    xirrRate, derivedPricePct, tVDtoMat, tAllotToMat, tAllotToVD,
    ear, taxSlabRate, capGainCumul, cgTax, totalTax,
    receiptTaxAtMaturity, receiptNetAtMaturity, isLTCGcumul,
    secName: document.getElementById('secName').value,
    isin: document.getElementById('isin').value,
    bondType: document.getElementById('bondType').value,
    bondRating: document.getElementById('bondRating').value,
  };
}

// ── XIRR Template download for cumulative ────────────────────────────────────
function downloadCumulXIRR() {
  const m = window._lastCumulCalc;
  if (!m) { alert('Please calculate first.'); return; }

  const wb = XLSX.utils.book_new();
  const ws = {};

  function sc(row,col,val,s) {
    const addr = XLSX.utils.encode_cell({r:row-1,c:col-1});
    ws[addr] = { v:val, t:(typeof val==='number'?'n':'s'), s:s||{} };
    if (s&&s.numFmt) ws[addr].z = s.numFmt;
  }
  function exSer(d) {
    const dt = (d instanceof Date)?d:parseLocalDate(d);
    const base = new Date(Date.UTC(1899,11,30));
    return Math.round((Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())-base)/86400000);
  }

  // Refreshed palette (v17): warmer navy + soft amber, lightweight border helper.
  // Warm "Premium Indian Finance" palette (v18)
  const CHESTNUT='7C2D12', CREAM='FEF3C7', HONEY='FCD34D', PEACH='FED7AA', IVORY='FFFBEB', AMBORDER='FDE68A', DARKTXT='78350F';
  const NAVY=CHESTNUT, AMBER=CREAM, AMBER_DARK=HONEY, LGRAY=IVORY, MGRAY=AMBORDER;
  // Backward-compat aliases
  const DARK = NAVY;
  const YEL  = AMBER;
  const _b = () => ({
    top:    { style: 'thin', color: { rgb: MGRAY } },
    bottom: { style: 'thin', color: { rgb: MGRAY } },
    left:   { style: 'thin', color: { rgb: MGRAY } },
    right:  { style: 'thin', color: { rgb: MGRAY } }
  });
  const bold = (sz, color, fill, fmt) => {
    // Backward-compat: old code passed '393939' text on black fill (deliberately dim/invisible).
    // On the new navy fill, that's still nearly invisible. Auto-override to white when fill is navy.
    let resolvedColor = color;
    if (fill === NAVY && (color === '393939' || !color)) resolvedColor = CREAM;
    return {
      font: { name:'Calibri', sz:sz||12, bold:true, color: resolvedColor ? {rgb:resolvedColor} : undefined },
      fill: fill ? { patternType:'solid', fgColor:{rgb:fill} } : undefined,
      numFmt: fmt,
      alignment: { vertical: 'center' },
      border: _b()
    };
  };
  const norm = (sz, fmt) => ({
    font: { name:'Calibri', sz: sz||12 },
    numFmt: fmt,
    alignment: { vertical: 'center' },
    border: _b()
  });

  const freqLabels = {1:'Annual',2:'Semi-Annual',4:'Quarterly',12:'Monthly'};
  const cleanName = (m.secName||'BOND').replace(/^\d+(\.\d+)?%\s*/i,'');
  const title = (m.couponPct?m.couponPct.toFixed(2)+'% ':'')+cleanName+' [CUMULATIVE — '+freqLabels[m.n]+']';

  // Row 1: title
  sc(1,1,title,bold(12,'393939',DARK)); sc(1,2,'',bold(12,'393939',DARK));
  sc(1,3,'',bold(12,'393939',DARK)); sc(1,4,'',bold(12,'393939',DARK));
  sc(1,5,m.bondRating||'',bold(12,'393939',DARK));
  sc(1,8,m.bondType||'',bold(12,'393939',DARK));
  // Row 2
  sc(2,2,m.couponPct,norm(12)); sc(2,8,m.isin||'',norm(12));
  // Row 3: headers
  sc(3,1,'Date',bold(12)); sc(3,2,'Cash Flow',bold(12,null,DARK));
  sc(3,3,'Compounding',bold(12)); sc(3,4,'Allotment',bold(12));
  sc(3,5,'FV per Bond',bold(12)); sc(3,6,'Maturity Value',bold(12));
  sc(3,7,'n (freq)',bold(12)); sc(3,8,'r/n',bold(12));
  // Row 3 headers — match regular XIRR template layout
  sc(3,4,'Accrued',bold(12)); sc(3,5,'Principal',bold(12));
  sc(3,6,'Intrinsic VD',bold(12)); sc(3,7,'Mat Value',bold(12));

  // Row 4: buy outflow = -(principal + accrued) = -consideration
  sc(4,1,exSer(m.vd),{font:{name:'Calibri',sz:12},numFmt:'dd-mm-yyyy'});
  sc(4,2,-m.consideration,{font:{name:'Calibri',sz:12,bold:true},numFmt:'#,##0.00'});  // outflow
  sc(4,3,-m.accruedCumul,{font:{name:'Calibri',sz:12},numFmt:'#,##0.00'});             // accrued component
  sc(4,4,m.accruedCumul,{font:{name:'Calibri',sz:12},numFmt:'#,##0.00'});              // accrued in Rs
  sc(4,5,m.principal,{font:{name:'Calibri',sz:12},numFmt:'#,##0.00'});                 // principal in Rs
  sc(4,6,m.intrinsicAtVD,{font:{name:'Calibri',sz:12},numFmt:'#,##0.00'});             // intrinsic at VD
  sc(4,7,m.maturityValue,{font:{name:'Calibri',sz:12},numFmt:'#,##0.00'});             // maturity value
  sc(4,8,m.qty||1,norm(12));

  // Row 5: maturity inflow
  sc(5,1,exSer(m.md),{font:{name:'Calibri',sz:12},numFmt:'dd-mm-yyyy'});
  sc(5,2,m.maturityValue,{font:{name:'Calibri',sz:12,bold:true},numFmt:'#,##0.00'});

  // Row 7: XIRR using consideration as outflow
  sc(7,1,'XIRR',bold(12,null,DARK));
  ws[XLSX.utils.encode_cell({r:6,c:1})] = {
    f: 'XIRR(B4:B5,A4:A5,0.1)',
    v: (typeof m.xirrRate === 'number' && isFinite(m.xirrRate)) ? m.xirrRate : null,
    t: 'n',
    s: bold(12,'FFFFFF',DARK),
    z: '0.0000%'
  };
  sc(7,3,'',{font:{name:'Calibri',sz:12},fill:{patternType:'solid',fgColor:{rgb:DARK}}});

  // Summary section
  sc(7,4,'Principal',bold(11)); sc(7,5,'Accrued Int',bold(11));
  sc(7,6,'Consideration',bold(11)); sc(7,7,'Mat Value',bold(11)); sc(7,8,'Settlement',bold(11));
  sc(8,4,m.principal,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(8,5,m.accruedCumul,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(8,6,m.consideration,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(8,7,m.maturityValue,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(8,8,m.settlement,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(9,8,m.stampAmt,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(9,9,'Stamp Duty',{font:{name:'Calibri',sz:11},fill:{patternType:'solid',fgColor:{rgb:YEL}}});
  sc(10,8,m.settlement,{font:{name:'Calibri',sz:11},numFmt:'#,##0.00'});
  sc(10,9,'Total settlement value',{font:{name:'Calibri',sz:11},fill:{patternType:'solid',fgColor:{rgb:YEL}}});

  ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:9,c:8}});
  ws['!cols'] = [{wch:54},{wch:14},{wch:14},{wch:14},{wch:14},{wch:16},{wch:8},{wch:10},{wch:22}];
  ws['!rows'] = Array.from({length:10},()=>({hpt:15.75}));
  XLSX.utils.book_append_sheet(wb, ws, 'Cumulative XIRR');

  const safeName = (m.secName||'Bond').replace(/[^a-zA-Z0-9 %]/g,'').trim().substring(0,30)||'Bond';
  XLSX.writeFile(wb, safeName+'_Cumulative_XIRR.xlsx');
}


// ═══════════════════════════════════════════════════════════════════════════
// ZERO COUPON BOND ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function calculateZCB() {
  clearError();

  const vdStr      = document.getElementById('valueDate').value;
  const mdStr      = document.getElementById('maturityDate').value;
  const allotStr   = document.getElementById('allotmentDate').value;
  const fvPerBond  = parseFloat(document.getElementById('faceValue').value);
  const qty        = parseFloat(document.getElementById('quantity').value) || 1;
  const zcbMode    = document.getElementById('zcbCalcMode').value;
  const stampPct   = parseFloat(document.getElementById('stampDuty').value) / 100;
  const isNotified = document.getElementById('zcbNotified').value === 'yes';
  const taxSlabRate= parseFloat(document.getElementById('zcbTaxSlab').value) || 0.30;

  if (!vdStr)    return showError('Enter Value / Settlement Date.');
  if (!mdStr)    return showError('Enter Maturity Date.');
  if (!allotStr) return showError('Allotment Date is required for ZCB.');
  if (isNaN(fvPerBond) || fvPerBond <= 0) return showError('Invalid Face Value.');

  const vd    = parseLocalDate(vdStr);
  const md    = parseLocalDate(mdStr);
  const allot = parseLocalDate(allotStr);
  const fvTotal = fvPerBond * qty;

  if (vd >= md)    return showError('Value Date must be before Maturity Date.');
  if (allot >= md) return showError('Allotment Date must be before Maturity Date.');

  const tVDtoMat    = daysBetween(vd, md) / 365;
  const tAllotToVD  = daysBetween(allot, vd) / 365;
  const tAllotToMat = daysBetween(allot, md) / 365;

  let pricePerBond, priceTotal, xirrRate;

  if (zcbMode === 'priceToXirr') {
    pricePerBond = parseFloat(document.getElementById('zcbPrice').value);
    if (isNaN(pricePerBond) || pricePerBond <= 0) return showError('Enter Issue / Purchase Price per bond (₹).');
    if (pricePerBond >= fvPerBond) return showError('Purchase Price must be less than Face Value for a zero coupon bond.');
    priceTotal = pricePerBond * qty;
    // XIRR = (FV / Price)^(1/T) − 1
    xirrRate = Math.pow(fvTotal / priceTotal, 1 / tVDtoMat) - 1;
  } else {
    // Enter XIRR → derive price
    const targetXIRR = parseFloat(document.getElementById('zcbXirrInput').value) / 100;
    if (isNaN(targetXIRR) || targetXIRR <= 0) return showError('Enter Target XIRR / YTM (%).');
    // Price = FV / (1 + XIRR)^T
    priceTotal   = fvTotal / Math.pow(1 + targetXIRR, tVDtoMat);
    pricePerBond = priceTotal / qty;
    xirrRate     = targetXIRR;
    // Update the price field for reference
    document.getElementById('zcbPrice').value = pricePerBond.toFixed(2);
  }

  // YTM from original issue (allotment) to maturity
  // Same formula but using allotment-to-maturity period
  const ytmFromIssue = Math.pow(fvTotal / priceTotal, 1 / tAllotToMat) - 1;

  // Accreted value at VD = priceTotal × (1 + XIRR)^tAllotToVD
  // (using the XIRR derived from purchase price, which IS the accreted value at VD)
  const accretedAtVD = priceTotal; // purchase price IS the accreted value at VD

  // Total discount
  const discountPerBond = fvPerBond - pricePerBond;
  const discountTotal   = fvTotal - priceTotal;
  const totalGain       = discountTotal;

  // Settlement
  const stampAmt    = Math.round(priceTotal * stampPct);
  const settlement  = priceTotal + stampAmt;

  const fmt = (v, d=2) => '₹' + v.toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});

  // ── Original Issue Price (optional) ──────────────────────────────────────
  const issuePricePerBond = parseFloat(document.getElementById('zcbIssuePrice').value);
  const hasIssuePrice     = !isNaN(issuePricePerBond) && issuePricePerBond > 0 && issuePricePerBond < fvPerBond;
  const issuePriceTotal   = hasIssuePrice ? issuePricePerBond * qty : null;
  // YTM at original issue (allotment to maturity)
  const ytmAtIssue        = hasIssuePrice ? Math.pow(fvTotal / issuePriceTotal, 1 / tAllotToMat) - 1 : null;
  // Capital gain for original allottee selling at current price (VD price)
  const allotteeGain      = hasIssuePrice ? priceTotal - issuePriceTotal : null;
  const isAllotteeLTCG    = tAllotToVD > 1;
  const allotteeCGRate    = isAllotteeLTCG ? 0.125 : taxSlabRate;
  const allotteeCGTax     = (hasIssuePrice && allotteeGain > 0) ? allotteeGain * allotteeCGRate : null;
  const allotteeNet       = (allotteeCGTax !== null) ? allotteeGain - allotteeCGTax : null;

  // ── Display results ────────────────────────────────────────────────────────
  document.getElementById('zcbResultTitle').textContent   = isNotified ? 'Notified Zero Coupon Bond — Summary' : 'Zero Coupon Bond — Summary';
  document.getElementById('zcbNotifiedBadge').style.display = isNotified ? '' : 'none';

  document.getElementById('zcbXIRR').textContent          = (xirrRate*100).toFixed(4) + '%';
  document.getElementById('zcbXIRRSub').textContent       = 'From purchase price to face value at maturity';
  document.getElementById('zcbFVTotal').textContent       = fmt(fvTotal);
  document.getElementById('zcbFVSub').textContent         = qty + ' × ₹' + fvPerBond.toLocaleString('en-IN');
  document.getElementById('zcbGain').textContent          = fmt(totalGain);
  document.getElementById('zcbGainSub').textContent       = 'FV − Purchase Price';

  document.getElementById('zcbPurchaseTotal').textContent = fmt(priceTotal);
  document.getElementById('zcbPurchaseSub').textContent   = qty + ' × ₹' + pricePerBond.toLocaleString('en-IN');
  document.getElementById('zcbStamp').textContent         = fmt(stampAmt, 0);
  document.getElementById('zcbStampSub').textContent      = (stampPct*100).toFixed(4) + '% of ' + fmt(priceTotal);
  document.getElementById('zcbSettlement').textContent    = fmt(settlement);
  document.getElementById('zcbAccreted').textContent      = fmt(accretedAtVD);
  document.getElementById('zcbAccretedSub').textContent   = 'Market price = accreted value at VD';
  document.getElementById('zcbHolding').textContent       = Math.round(tVDtoMat*365) + ' days';
  document.getElementById('zcbHoldingSub').textContent    = tVDtoMat.toFixed(4) + ' years to maturity';
  document.getElementById('zcbDiscount').textContent      = fmt(discountPerBond);
  document.getElementById('zcbDiscountSub').textContent   = '₹' + fvPerBond.toLocaleString('en-IN') + ' − ₹' + pricePerBond.toLocaleString('en-IN') + ' per bond';

  // ── Issue price metrics ─────────────────────────────────────────────────────
  if (hasIssuePrice) {
    document.getElementById('zcbIssuePriceBox').style.display = '';
    document.getElementById('zcbYTMIssueBox').style.display   = '';

    document.getElementById('zcbIssuePriceVal').textContent = fmt(issuePricePerBond) + ' per bond';
    document.getElementById('zcbIssuePriceSub').textContent = qty + ' bonds = ' + fmt(issuePriceTotal);
    document.getElementById('zcbYTMIssue').textContent      = (ytmAtIssue*100).toFixed(4) + '%';
    document.getElementById('zcbYTMIssueSub').textContent   = 'From allotment ' + fmtDate(allot) + ' to maturity';

    if (isNotified) {
      // Notified ZCB: entire gain is capital gain — show LTCG/STCG
      document.getElementById('zcbAllotteeGainBox').style.display = '';
      document.getElementById('zcbAllotteeNetBox').style.display  = '';
      document.getElementById('zcbAllotteeGainBox').querySelector('.m-lbl').textContent = 'Allottee Capital Gain (if selling now)';
      document.getElementById('zcbAllotteeGain').textContent    = fmt(allotteeGain);
      document.getElementById('zcbAllotteeGain').className      = 'm-val ' + (allotteeGain > 0 ? 'green' : 'red');
      document.getElementById('zcbAllotteeGainSub').textContent = fmt(priceTotal) + ' (sell) − ' + fmt(issuePriceTotal) + ' (issue) · ' + (isAllotteeLTCG ? 'LTCG' : 'STCG');
      document.getElementById('zcbAllotteeNet').textContent     = fmt(allotteeNet);
      document.getElementById('zcbAllotteeNetSub').textContent  = 'After ' + (isAllotteeLTCG ? '12.5% LTCG' : Math.round(taxSlabRate*100) + '% STCG') + ' = −' + fmt(allotteeCGTax);
    } else {
      // Regular ZCB (Section 145A): gain is NOT capital gain — taxed annually as interest
      // Showing capital gain here would be misleading — the gain is already taxed year by year
      document.getElementById('zcbAllotteeGainBox').style.display = '';
      document.getElementById('zcbAllotteeNetBox').style.display  = 'none';
      document.getElementById('zcbAllotteeGainBox').querySelector('.m-lbl').textContent = 'Allottee Gain (if selling now)';
      document.getElementById('zcbAllotteeGain').textContent    = fmt(allotteeGain);
      document.getElementById('zcbAllotteeGain').className      = 'm-val ' + (allotteeGain > 0 ? 'green' : 'red');
      document.getElementById('zcbAllotteeGainSub').textContent = fmt(priceTotal) + ' (sell) − ' + fmt(issuePriceTotal) + ' (issue) · Taxed as interest u/s 145A — not capital gain';
    }
  } else {
    ['zcbIssuePriceBox','zcbYTMIssueBox','zcbAllotteeGainBox','zcbAllotteeNetBox'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
  }

  document.getElementById('zcbFNote').innerHTML =
    '<strong>Type:</strong> ' + (isNotified ? 'Notified Zero Coupon Bond (Sec 2(48))' : 'Regular Zero Coupon Bond') + '<br>' +
    '<strong>XIRR (your price):</strong> (FV ÷ ' + fmt(pricePerBond) + ')^(1÷' + tVDtoMat.toFixed(4) + ') − 1 = ' + (xirrRate*100).toFixed(4) + '%<br>' +
    (hasIssuePrice ? '<strong>YTM at Issue (allotment):</strong> (FV ÷ ' + fmt(issuePricePerBond) + ')^(1÷' + tAllotToMat.toFixed(4) + ') − 1 = ' + (ytmAtIssue*100).toFixed(4) + '%<br>' : '') +
    '<strong>Purchase Price:</strong> ' + fmt(pricePerBond) + ' per bond × ' + qty + ' = ' + fmt(priceTotal) + '<br>' +
    '<strong>Stamp Duty:</strong> ' + fmt(priceTotal) + ' × ' + (stampPct*100).toFixed(4) + '% = ' + fmt(stampAmt,0) + '<br>' +
    '<strong>Settlement:</strong> ' + fmt(priceTotal) + ' + ' + fmt(stampAmt,0) + ' = ' + fmt(settlement) + '<br>' +
    '<strong>Total Gain at Maturity:</strong> ' + fmt(fvTotal) + ' − ' + fmt(priceTotal) + ' = ' + fmt(totalGain) +
    (hasIssuePrice
      ? isNotified
        ? '<br><strong>Original Allottee — Capital Gain (if selling now):</strong> ' + fmt(priceTotal) + ' − ' + fmt(issuePriceTotal) + ' = ' + fmt(allotteeGain) + ' → ' + (isAllotteeLTCG?'LTCG 12.5%':'STCG '+Math.round(taxSlabRate*100)+'%') + ' tax ' + fmt(allotteeCGTax) + ' → net ' + fmt(allotteeNet)
        : '<br><strong>Original Allottee — Gain (if selling now):</strong> ' + fmt(priceTotal) + ' − ' + fmt(issuePriceTotal) + ' = ' + fmt(allotteeGain) + ' · Section 145A: entire discount taxed as interest income annually — no separate capital gain tax'
      : '');

  // ── Tax section ───────────────────────────────────────────────────────────
  const isLTCG    = tVDtoMat > 1;
  const cgTaxRate = isLTCG ? 0.125 : taxSlabRate;

  if (isNotified) {
    // Notified ZCB: ONLY capital gains, no annual accrual
    document.getElementById('zcbTaxRegular').style.display  = 'none';
    document.getElementById('zcbTaxNotified').style.display = '';
    document.getElementById('zcbTaxTitle').textContent      = 'Tax Analysis — Notified ZCB';
    document.getElementById('zcbTaxBadge').textContent      = 'No annual accrual tax';

    const cgTax   = totalGain * cgTaxRate;
    const netGain = totalGain - cgTax;
    const fvNet   = fvTotal - cgTax;

    document.getElementById('zcbNotifGain').textContent    = fmt(totalGain);
    document.getElementById('zcbNotifCGType').textContent  = isLTCG ? 'LTCG Tax (12.5%)' : 'STCG Tax (' + Math.round(taxSlabRate*100) + '%)';
    document.getElementById('zcbNotifTax').textContent     = '−' + fmt(cgTax);
    document.getElementById('zcbNotifTaxSub').textContent  = isLTCG ? 'Held >12 months — LTCG @ 12.5%' : 'Held ≤12 months — STCG @ ' + Math.round(taxSlabRate*100) + '%';
    document.getElementById('zcbNotifNet').textContent     = fmt(netGain);
    document.getElementById('zcbNotifNetSub').textContent  = fmt(fvTotal) + ' received − ' + fmt(cgTax) + ' tax';

    // Compare with regular ZCB (annual accrual at slab) to show saving
    let regularTax = 0;
    let tempStart  = new Date(allot);
    while (tempStart < md) {
      let tempEnd = new Date(tempStart); tempEnd.setFullYear(tempEnd.getFullYear()+1);
      if (tempEnd > md) tempEnd = new Date(md);
      const tO = daysBetween(allot, tempStart)/365;
      const tC = daysBetween(allot, tempEnd)/365;
      const accO = priceTotal * Math.pow(1+xirrRate, tO);
      const accC = priceTotal * Math.pow(1+xirrRate, tC);
      regularTax += (accC - accO) * taxSlabRate;
      tempStart = new Date(tempEnd);
    }
    const saving = regularTax - cgTax;
    document.getElementById('zcbNotifSaving').textContent    = fmt(saving);
    document.getElementById('zcbNotifSavingSub').textContent = 'Regular ZCB tax would be ' + fmt(regularTax) + ' (annual accrual @ ' + Math.round(taxSlabRate*100) + '%)';

    document.getElementById('zcbNotifNote').innerHTML =
      '<strong>Tax treatment:</strong> Notified ZCB under Section 2(48) — no annual accrual tax liability<br>' +
      '<strong>Capital gain:</strong> ' + fmt(fvTotal) + ' − ' + fmt(priceTotal) + ' = ' + fmt(totalGain) + '<br>' +
      '<strong>' + (isLTCG?'LTCG @ 12.5%':'STCG @ '+Math.round(taxSlabRate*100)+'%') + ':</strong> ' + fmt(cgTax) + '<br>' +
      '<strong>Net in hand:</strong> ' + fmt(fvNet) + '<br>' +
      '<strong>Tax saving vs regular ZCB:</strong> ' + fmt(saving) + ' saved by being notified';
  } else {
    // Regular ZCB: annual accrual on discount (Section 145A)
    document.getElementById('zcbTaxRegular').style.display  = '';
    document.getElementById('zcbTaxNotified').style.display = 'none';
    document.getElementById('zcbTaxTitle').textContent      = 'Tax Analysis — Regular ZCB (Section 145A)';
    document.getElementById('zcbTaxBadge').textContent      = 'Slab: ' + Math.round(taxSlabRate*100) + '%';

    const tbody = document.getElementById('zcbTaxBody');
    tbody.innerHTML = '';
    let totalAccrual = 0, totalTaxAmt = 0;
    let yrStart = new Date(allot);
    let yrNum   = 0;
    while (yrStart < md) {
      yrNum++;
      let yrEnd = new Date(yrStart); yrEnd.setFullYear(yrEnd.getFullYear()+1);
      if (yrEnd > md) yrEnd = new Date(md);
      const tO = daysBetween(allot, yrStart)/365;
      const tC = daysBetween(allot, yrEnd)/365;
      const accO = priceTotal * Math.pow(1+xirrRate, tO);
      const accC = priceTotal * Math.pow(1+xirrRate, tC);
      const accrual = accC - accO;
      const taxAmt  = accrual * taxSlabRate;
      totalAccrual += accrual; totalTaxAmt += taxAmt;
      const fy = yrStart.getFullYear() + '-' + String(yrEnd.getFullYear()).slice(-2);
      const isPast = yrEnd <= vd;
      const tr = document.createElement('tr');
      tr.style.opacity = isPast ? '0.55' : '1';
      tr.innerHTML = `
        <td class="dim">${yrNum}</td>
        <td>${fy}${isPast ? ' <span class="tag cum" style="font-size:8px;">Paid</span>' : ''}</td>
        <td class="r">${fmt(accO)}</td>
        <td class="r">${fmt(accC)}</td>
        <td class="r pos">${fmt(accrual)}</td>
        <td class="r" style="color:var(--red);">−${fmt(taxAmt)}</td>
        <td class="r">${fmt(accrual - taxAmt)}</td>`;
      tbody.appendChild(tr);
      yrStart = new Date(yrEnd);
    }
    // Totals
    const trTot = document.createElement('tr');
    trTot.style.cssText = 'font-weight:600;border-top:2px solid var(--border);';
    trTot.innerHTML = `
      <td colspan="2" style="font-size:10px;font-weight:600;letter-spacing:0.03em;color:var(--text-dim);">TOTAL — All Years</td>
      <td class="r" style="color:var(--text-dim);">—</td>
      <td class="r" style="color:var(--text-dim);">—</td>
      <td class="r pos">${fmt(totalAccrual)}</td>
      <td class="r" style="color:var(--red);">−${fmt(totalTaxAmt)}</td>
      <td class="r">${fmt(totalAccrual - totalTaxAmt)}</td>`;
    tbody.appendChild(trTot);
    // Net in hand
    const trNet = document.createElement('tr');
    trNet.style.cssText = 'background:var(--accent-bg);font-weight:700;border-top:2px solid var(--border);';
    trNet.innerHTML = `
      <td colspan="2" style="font-size:10px;color:var(--accent2);font-weight:700;">NET IN HAND at Maturity</td>
      <td class="r" style="color:var(--text-dim);">—</td>
      <td class="r" style="color:var(--text-dim);">—</td>
      <td class="r" style="color:var(--accent2);">${fmt(fvTotal)}</td>
      <td class="r" style="color:var(--red);">−${fmt(totalTaxAmt)}</td>
      <td class="r" style="color:var(--accent2);font-size:13px;font-weight:700;">${fmt(fvTotal - totalTaxAmt)}</td>`;
    tbody.appendChild(trNet);

    document.getElementById('zcbTaxNote').innerHTML =
      '<strong>Method:</strong> Annual accrual of discount taxed at ' + Math.round(taxSlabRate*100) + '% slab (Section 145A)<br>' +
      '<strong>Accrual = </strong>Opening Accreted Value × XIRR = interest for that year (no coupon paid — tax paid from own pocket)<br>' +
      '<strong>Total accrual tax:</strong> ' + fmt(totalTaxAmt) + ' over ' + yrNum + ' years<br>' +
      '<strong>Net in hand:</strong> ' + fmt(fvTotal) + ' − ' + fmt(totalTaxAmt) + ' = ' + fmt(fvTotal - totalTaxAmt) + '<br>' +
      '<span style="color:var(--gold);">⚠ Tip: If this were a Notified ZCB, LTCG @ 12.5% would apply — select "Yes" above to compare.</span>';
  }

  document.getElementById('zcbResultsPanel').style.display = 'block';
  document.getElementById('cumulResultsPanel').style.display = 'none';
  document.getElementById('resultsPanel').classList.remove('show');
  const _ph2 = document.getElementById('resultsPlaceholder');
  if (_ph2) _ph2.style.display = 'none';  // hide placeholder when results shown
}

// ─── MAIN CALCULATE ───────────────────────────────────────────────────────────
function calculate() {
  clearError();

  const mode     = document.getElementById('calcMode').value;
  const vdStr    = document.getElementById('valueDate').value;
  const mdStr    = document.getElementById('maturityDate').value;
  const fvPerBond= parseFloat(document.getElementById('faceValue').value);
  const qty      = parseFloat(document.getElementById('quantity').value);
  const couponPct= parseFloat(document.getElementById('couponRate').value);
  const freq     = parseInt(document.getElementById('ipFreq').value);
  const dateType = document.getElementById('ipDateType').value;
  // For G-Sec: always derive fixedDates from maturity date (same day, 6-monthly)
  // This is robust — never depends on the fixedDates field being manually filled
  let fixedStr = document.getElementById('fixedDates').value;
  if (_bondMode === 'gsec' && mdStr) {
    const _mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const _matAnchor = parseLocalDate(mdStr);
    const _m1 = _matAnchor.getMonth();
    const _m2 = (_m1 + 6) % 12;
    const _dd = _matAnchor.getDate();
    fixedStr = _dd + '/' + _mNames[_m1] + ', ' + _dd + '/' + _mNames[_m2];
    // Also update the UI field so user can see what dates are being used
    document.getElementById('fixedDates').value = fixedStr;
  }
  const domDay   = parseInt(document.getElementById('domDay').value);
  const lastIPStr= document.getElementById('lastIP').value;
  const firstIPOverrideStr = document.getElementById('firstIPDate').value;
  const rdDays   = getRDDays();
  const showRD   = document.getElementById('showRD').value === 'yes';
  const stampPct = parseFloat(document.getElementById('stampDuty').value) / 100;
  const dcConv   = document.getElementById('dayCount').value;
  const accruedFromType = document.getElementById('accruedFromType').value;

  const _optMode   = document.getElementById('isCallable').value;
  const isCallable = _optMode === 'call' || _optMode === 'both';
  const isPutable  = _optMode === 'put'  || _optMode === 'both';
  const callDateStr = document.getElementById('callDate').value;
  const putDateStr  = document.getElementById('putDate').value;
  const callDate    = (isCallable && callDateStr) ? parseLocalDate(callDateStr) : null;
  const putDate     = (isPutable  && putDateStr)  ? parseLocalDate(putDateStr)  : null;

  if (!vdStr || !mdStr) return showError('Enter Value Date and Maturity Date.');
  const _allotCheck = document.getElementById('allotmentDate').value;
  // Make issue date truly optional if not doing DOA calculation
  if (!_allotCheck && accruedFromType === 'doa') return showError('Allotment / Issue Date is required when calculating Accrued Interest from Issue Date.');
  if (isCallable && callDate && callDate <= parseLocalDate(vdStr)) return showError('Call Date must be after Value Date.');
  if (isPutable  && putDate  && putDate  <= parseLocalDate(vdStr)) return showError('Put Date must be after Value Date.');
  if (isNaN(fvPerBond) || fvPerBond <= 0) return showError('Invalid Face Value.');
  if (isNaN(couponPct) || couponPct < 0)  return showError('Invalid Coupon Rate.');
  if (dateType === 'manual' && getManualIPDates().length === 0) return showError('No payment dates entered. Add dates in Manual Dates mode.');
  if (!lastIPStr) return showError(accruedFromType === 'doa' ? 'Enter Date of Allotment.' : 'Enter Last IP Date.');

  let pricePct, targetXIRR;
  const _isGsecYtmMode = (mode === 'ytmHToPrice' || mode === 'ytmAToPrice');
  if (mode === 'priceToXirr') {
    pricePct = parseFloat(document.getElementById('price').value);
    if (isNaN(pricePct) || pricePct <= 0) return showError('Invalid Price.');
  } else if (!_isGsecYtmMode) {
    // Regular xirrToPrice: read from xirrInput
    targetXIRR = parseFloat(document.getElementById('xirrInput').value) / 100;
    if (isNaN(targetXIRR) || targetXIRR <= 0) return showError('Invalid Target XIRR.');
  }
  const valueDate  = parseLocalDate(vdStr);
  const matDate    = parseLocalDate(mdStr);
  const lastIPDate = parseLocalDate(lastIPStr);
  const coupon     = couponPct / 100;
  const fvTotal    = fvPerBond * qty;

  if (matDate <= valueDate) return showError('Maturity Date must be after Value Date.');

  // Generate all IP dates
  // KEY FIX: Anchor IP dates to allotment date, NOT value date.
  // generateIPDates(vdStr) seeds from the value date month, so changing VD
  // shifts the entire schedule. e.g. VD=30-May-2029 on a quarterly last-day bond
  // generates: 30-Jun, 30-Sep, 31-Dec instead of 31-May, 31-Aug, 30-Nov, 31-Dec.
  // Using allotment date as anchor makes dates stable regardless of VD changes.
  const _allotStrForIP = document.getElementById('allotmentDate').value;
  let ipDates;
  if (dateType === 'manual' || (accruedFromType === 'doa' && firstIPOverrideStr)) {
    // Manual and DOA modes handle their own schedule — no VD dependency anyway
    ipDates = generateIPDates(vdStr, mdStr, freq, dateType, fixedStr, domDay);
  } else if (_allotStrForIP) {
    // Allotment date present → generate full schedule from allotment
    // Past dates (before valueDate) are automatically skipped in the row loop below
    ipDates = getAllIPDatesFromAllotment(_allotStrForIP, mdStr, freq, dateType, fixedStr, domDay);
  } else {
    // No allotment date → use a wide lookback window (10 years) so dates are
    // NOT seeded from VD — this prevents the schedule from shifting with VD
    const _wideStart = isoStr(addDays(parseLocalDate(mdStr), -3650));
    ipDates = generateIPDatesRaw(_wideStart, mdStr, freq, dateType, fixedStr, domDay, getIPBdAdj());
    if (!ipDates.some(d => isoStr(d) === isoStr(matDate))) ipDates.push(new Date(matDate));
  }

  // ── First IP Override (DOA long-first-coupon logic) ────────────────────────
  if (accruedFromType === 'doa' && firstIPOverrideStr) {
    const firstIPOverride = parseLocalDate(firstIPOverrideStr);
    const intMo = 12 / freq;
    const bdAdj = getIPBdAdj();
    const subsequentDates = [];
    let cur = addMonths(firstIPOverride, intMo);
    while (cur <= matDate) {
      // Snap to last-day / 1st / dom of that month and apply BD adjustment
      subsequentDates.push(snapIPDate(cur, dateType, domDay, bdAdj));
      cur = addMonths(cur, intMo);
    }
    if (!subsequentDates.some(d => isoStr(d) === isoStr(matDate))) {
      subsequentDates.push(new Date(matDate));
    }
    ipDates = [firstIPOverride, ...subsequentDates];
    // Apply per-row date overrides
    ipDates = ipDates.map(d => {
      const key = isoStr(d);
      return customIPDateMap[key] ? parseLocalDate(customIPDateMap[key]) : d;
    });
  }
  // nextIPDate: first IP date AFTER value date (not after lastIPDate)
  // This correctly handles ex-div where user enters the upcoming coupon as lastIP
  const nextIPDate = ipDates.find(d => d > valueDate);
  if (!nextIPDate) return showError('Could not determine next IP date. Check IP date configuration.');

  // Use getEffectiveRD so custom per-IP record date overrides are respected
  const nextRD = getEffectiveRD(nextIPDate);
  const isExDiv = !!(nextRD && valueDate > nextRD);

  // ── Staggered redemption schedule ─────────────────────────────────────────
  const redemptionType = document.getElementById('redemptionType').value;
  const isStaggered   = redemptionType === 'staggered';
  const isCustomRedem = redemptionType === 'custom';
  const customRedemMap = isCustomRedem ? getCustomRedemMap() : new Map();
  const stagPct = isStaggered ? (parseFloat(document.getElementById('stagPct').value) / 100) : 0;

  // Build redemptionDateSet directly from the already-computed ipDates array
  // so dates always match exactly (no risk of addMonths mismatch)
  let redemptionDateSet = new Set();
  if (isCustomRedem) { customRedemMap.forEach((_, k) => redemptionDateSet.add(k)); }
  if (isStaggered) {
    const stagStart      = document.getElementById('stagStart').value;
    const stagLastN      = parseInt(document.getElementById('stagLastN').value) || 4;
    const stagFromCoupon = parseInt(document.getElementById('stagFromCoupon').value) || 1;
    const stagFromDateStr= document.getElementById('stagFromDate').value;
    const stagFreqVal    = document.getElementById('stagFreq').value;
    const effectiveFreq  = stagFreqVal === 'same' ? freq : parseInt(stagFreqVal);

    // If redemption frequency differs from coupon frequency, pick every Nth coupon date
    const freqRatio = Math.round(freq / effectiveFreq); // e.g. monthly coupons, quarterly redemption → ratio=3

    let candidateDates;
    if (stagStart === 'firstIP') {
      const strided = [];
      for (let i = 0; i < ipDates.length; i += Math.max(1, freqRatio)) strided.push(ipDates[i]);
      candidateDates = strided;
    } else if (stagStart === 'lastN') {
      const strided = [];
      for (let i = ipDates.length - 1; i >= 0; i -= Math.max(1, freqRatio)) {
        strided.unshift(ipDates[i]);
      }
      candidateDates = strided.slice(-stagLastN);
    } else if (stagStart === 'fromCoupon') {
      const strided = [];
      for (let i = stagFromCoupon - 1; i < ipDates.length; i += Math.max(1, freqRatio)) {
        strided.push(ipDates[i]);
      }
      candidateDates = strided;
    } else if (stagStart === 'fromDate' && stagFromDateStr) {
      const fromD = parseLocalDate(stagFromDateStr);
      const startIdx = ipDates.findIndex(d => d >= fromD);
      if (startIdx >= 0) {
        const strided = [];
        for (let i = startIdx; i < ipDates.length; i += Math.max(1, freqRatio)) {
          strided.push(ipDates[i]);
        }
        candidateDates = strided;
      } else {
        candidateDates = [];
      }
    } else {
      candidateDates = ipDates.slice(-4);
    }

    (candidateDates || []).forEach(d => redemptionDateSet.add(isoStr(d)));
  }

  // Determine outstanding principal at value date (after all past redemptions already paid)
  let outstandingAtValueDate = fvTotal;
  let outstandingForAccrued  = fvTotal; // same as above but WITHOUT ex-div deductions

  if (isStaggered) {
    if (document.getElementById('stagStart').value === 'firstIP') {
      const _allotStrOS = document.getElementById('allotmentDate').value;
      const allIPsForOS = _allotStrOS
        ? getAllIPDatesFromAllotment(_allotStrOS, isoStr(matDate),
            freq, dateType, document.getElementById('fixedDates').value,
            parseInt(document.getElementById('domDay').value) || 1)
        : generateIPDatesRaw(isoStr(addDays(lastIPDate, -1)), isoStr(matDate),
            freq, dateType, document.getElementById('fixedDates').value,
            parseInt(document.getElementById('domDay').value) || 1, getIPBdAdj());
      for (const d of allIPsForOS) {
        const isPast   = d < valueDate;
        const isExDivD = isExDiv && isoStr(d) === isoStr(nextIPDate);
        if (isPast || isExDivD) outstandingAtValueDate -= stagPct * fvTotal;
        if (isPast)             outstandingForAccrued  -= stagPct * fvTotal; // ex-div NOT deducted
      }
    } else {
      for (const d of [...redemptionDateSet].sort()) {
        const rd = parseLocalDate(d);
        const isPast   = rd < valueDate;
        const isExDivD = isExDiv && isoStr(rd) === isoStr(nextIPDate);
        if (isPast || isExDivD) outstandingAtValueDate -= stagPct * fvTotal;
        if (isPast)             outstandingForAccrued  -= stagPct * fvTotal;
      }
    }
    outstandingAtValueDate = Math.max(outstandingAtValueDate, 0);
    outstandingForAccrued  = Math.max(outstandingForAccrued,  0);
  }
  if (isCustomRedem) {
    for (const [d, frac] of [...customRedemMap.entries()].sort()) {
      if (frac <= 0) continue;
      const rd = parseLocalDate(d);
      const isPast   = rd < valueDate;
      const isExDivD = isExDiv && isoStr(rd) === isoStr(nextIPDate);
      if (isPast || isExDivD) outstandingAtValueDate -= frac * fvTotal;
      if (isPast)             outstandingForAccrued  -= frac * fvTotal; // ex-div NOT deducted
    }
    outstandingAtValueDate = Math.max(outstandingAtValueDate, 0);
    outstandingForAccrued  = Math.max(outstandingForAccrued,  0);
  }

  // ── Effective accrual start date ───────────────────────────────────────────
  // In DOA mode: accrual starts from DOA ONLY if no coupon has been paid yet.
  // Once any IP date has passed (IP date ≤ valueDate), accrual resets at that date.
  // Rule: find the LAST IP date in the full schedule that is ≤ valueDate.
  //   - If found  → that is the accrual start (coupon was paid, accrual resets)
  //   - If not    → use lastIPDate as-is (DOA, no coupon paid yet)
  // This applies to ALL modes — in lastIP mode, lastIPDate is already correct.
  // In DOA mode, it auto-corrects once coupons start flowing.
  let effectiveLastIPDate = lastIPDate;
  if (accruedFromType === 'doa') {
    // Look through the full IP schedule for the most recent paid coupon
    const _paidIPs = ipDates.filter(d => d <= valueDate && d > lastIPDate);
    if (_paidIPs.length > 0) {
      // At least one coupon has been paid after DOA — use the most recent one
      effectiveLastIPDate = _paidIPs[_paidIPs.length - 1];
    }
    // If no paid IPs found → effectiveLastIPDate stays as lastIPDate (= DOA)
  }

  // Accrued interest calculation:
  // CUM-DIV: from effectiveLastIPDate → VD (positive days, buyer pays seller)
  // EX-DIV:  from VD → nextIPDate (negative days, buyer is credited back)
  //   e.g. VD=24-Mar, nextIP=28-Mar → -4 days × 80% outstanding = -₹59.18 credited to buyer
  //   The accrual base is outstandingForAccrued (80%, pre-ex-div-redemption)
  const _accrualFromDate = isExDiv ? nextIPDate : effectiveLastIPDate;
  const dcAccrued    = couponInterest(outstandingForAccrued, coupon, _accrualFromDate, valueDate, dcConv);
  const accruedDays  = dcAccrued.days;
  const accruedDenom = dcAccrued.denom;
  const accruedInt   = dcAccrued.interest;

  // ── Build cash flow rows ───────────────────────────────────────────────────
  let rows = [];
  let lastDate = effectiveLastIPDate;  // use effective (auto-detected last paid IP)
  let runningPrincipal = outstandingAtValueDate; // tracks outstanding AFTER each redemption
  const isLongFirstCoupon = accruedFromType === 'doa' && !!firstIPOverrideStr;

  for (let i = 0; i < ipDates.length; i++) {
    const ipDate   = ipDates[i];

    // IP dates strictly before value date: advance period tracker, skip row.
    // Redemptions on these dates already deducted from outstandingAtValueDate.
    if (ipDate < valueDate) {
      lastDate = ipDate;
      continue;
    }

    const isMat    = isoStr(ipDate) === isoStr(matDate);
    const isRedemptionDate = (isStaggered || isCustomRedem) && redemptionDateSet.has(isoStr(ipDate));

    // Coupon interest on the running (outstanding) principal for this period
    const dc       = couponInterest(runningPrincipal, coupon, lastDate, ipDate, dcConv);

    // Principal cashflow: for staggered, partial on redemption dates + any remainder on maturity
    let princCF = 0;
    if (isStaggered) {
      if (isRedemptionDate) {
        // If this is also maturity, pay whatever is left (handles rounding)
        if (isMat) {
          princCF = runningPrincipal; // pay the exact remaining balance
        } else {
          princCF = Math.min(stagPct * fvTotal, runningPrincipal);
        }
      } else if (isMat && runningPrincipal > 0) {
        // Maturity with remaining balance (non-redemption maturity date)
        princCF = runningPrincipal;
      }
    } else if (isCustomRedem) {
      if (isRedemptionDate) {
        const fraction = customRedemMap.get(isoStr(ipDate)) || 0;
        princCF = isMat ? runningPrincipal : Math.min(fraction * fvTotal, runningPrincipal);
      } else if (isMat && runningPrincipal > 0) {
        princCF = runningPrincipal;
      }
    } else {
      princCF = isMat ? fvTotal : 0;
    }

    const rd         = getEffectiveRD(ipDate);
    const buyerMisses= isExDiv && (isoStr(ipDate) === isoStr(nextIPDate));
    const isFirstLong= isLongFirstCoupon && i === 0;

    // For ex-div missed row: outstandingAtValueDate already excludes seller's redemption.
    // Don't reduce buyer's outstanding for missed payments — keeps interest correct.
    const principalAfter = buyerMisses ? runningPrincipal : Math.max(runningPrincipal - princCF, 0);

    rows.push({
      date: ipDate,
      type: isMat ? 'Maturity' : (isFirstLong ? 'Long First Coupon' : (isRedemptionDate ? 'Coupon + Redemption' : 'Coupon')),
      days: dc.days, denom: dc.denom,
      interest: dc.interest,
      principal: princCF,
      cashflow: dc.interest + princCF,
      outstandingBefore: runningPrincipal,
      outstandingAfter: principalAfter,
      rd, isMat, buyerMisses, isFirstLong, isRedemptionDate
    });

    // Reduce running principal only when buyer actually receives the payment
    if (princCF > 0 && !buyerMisses) runningPrincipal = principalAfter;
    lastDate = ipDate;
  }

  // Remove ex-div missed rows entirely from the generated schedule and all reports
  rows = rows.filter(r => !r.buyerMisses);

  const inflowCFs    = rows.map(r => r.cashflow);
  const inflowDates  = rows.map(r => r.date);

  // ── Mode-specific: price↔XIRR / YTM ──────────────────────────────────────────
  const pricingBase = fvTotal;
  let price, principal, consideration, stampAmt, settlement, xirrRate, derivedPricePct;

  if (_bondMode === 'gsec') {
    // ── G-SEC: use 30/360 bond pricing formula for both directions ─────────────
    // These helpers are duplicated here from the G-Sec YTM display block above
    // so they work whether we are in price→YTM or YTM→price mode.
    function _d360(d1, d2) {
      let y1=d1.getFullYear(),m1=d1.getMonth()+1,d1_=d1.getDate();
      let y2=d2.getFullYear(),m2=d2.getMonth()+1,d2_=d2.getDate();
      if(d1_===31)d1_=30; if(d2_===31&&d1_===30)d2_=30;
      return 360*(y2-y1)+30*(m2-m1)+(d2_-d1_);
    }
    function _prevCpn(d,mo) {
      let m=d.getMonth()-mo+1,yr=d.getFullYear();
      while(m<=0){m+=12;yr--;} const last=new Date(yr,m,0).getDate();
      return new Date(yr,m-1,Math.min(d.getDate(),last));
    }
    function _gsecDirtyFromYtmH(ytmH, settlement_, maturity_) {
      let d=new Date(maturity_); const fc=[];
      while(d>settlement_){fc.unshift(new Date(d));d=_prevCpn(d,6);}
      const lastCP=d,nextCP=fc[0],N=fc.length;
      const E=_d360(lastCP,nextCP),A=_d360(lastCP,settlement_),DSC=_d360(settlement_,nextCP);
      const C=coupon/2*100, frac=DSC/E;
      const v=1/(1+ytmH/2);
      let p=0;
      for(let k=0;k<N;k++) p+=C*Math.pow(v,frac+k);
      p+=100*Math.pow(v,frac+N-1);
      return {dirty:p, accrued:A/E*C, N, E, A, DSC};
    }

    const _cm = document.getElementById('calcMode').value;
    const gsecMode = (_cm === 'ytmHToPrice' || _cm === 'ytmAToPrice') ? 'ytmToPrice' : 'priceToYtm';

    if (gsecMode === 'ytmToPrice') {
      // YTM → Price using 30/360 bond formula (EXACT inverse of YTM calculation)
      const ytmType  = _cm === 'ytmAToPrice' ? 'annual' : 'semi';
      const ytmInput = parseFloat((document.getElementById('gsecYtmInput')||{}).value) / 100;
      if (isNaN(ytmInput) || ytmInput <= 0) return showError('Enter Target YTM for G-Sec price derivation.');
      // Convert YTM(A) to YTM(H) if needed
      const ytmH = ytmType === 'annual'
        ? 2 * (Math.pow(1 + ytmInput, 0.5) - 1)  // YTM(A) → YTM(H)
        : ytmInput;                                  // already semi-annual
      const ytmA = Math.pow(1 + ytmH/2, 2) - 1;
      const res = _gsecDirtyFromYtmH(ytmH, valueDate, matDate);
      const cleanPrice = res.dirty - res.accrued;
      pricePct         = cleanPrice;
      price            = pricePct / 100;
      principal        = pricingBase * price;
      consideration    = isExDiv ? principal - Math.abs(accruedInt) : principal + accruedInt;
      stampAmt         = Math.round(consideration * stampPct);
      settlement       = consideration + stampAmt;
      derivedPricePct  = pricePct;
      xirrRate         = ytmH; // display YTM(H) as primary rate
      // Store derived YTM for display override
      window._gsecDerivedYtmH = ytmH;
      window._gsecDerivedYtmA = ytmA;
    } else {
      // Price → YTM (normal flow — YTM computed in G-Sec block below)
      // Use the main price field (same as regular mode)
      if (isNaN(pricePct) || pricePct <= 0) return showError('Enter Price for G-Sec.');
      price         = pricePct / 100;
      principal     = pricingBase * price;
      consideration = isExDiv ? principal - Math.abs(accruedInt) : principal + accruedInt;
      stampAmt      = Math.round(consideration * stampPct);
      settlement    = consideration + stampAmt;
      xirrRate      = xirrCalc([-consideration, ...inflowCFs], [valueDate, ...inflowDates]);
      derivedPricePct = pricePct;
      window._gsecDerivedYtmH = null;
      window._gsecDerivedYtmA = null;
    }

  } else if (mode === 'priceToXirr') {
    price         = pricePct / 100;
    principal     = pricingBase * price;
    consideration = isExDiv ? principal - Math.abs(accruedInt) : principal + accruedInt;
    stampAmt      = Math.round(consideration * stampPct);
    settlement    = consideration + stampAmt;
    xirrRate      = xirrCalc([-consideration, ...inflowCFs], [valueDate, ...inflowDates]);
    derivedPricePct = pricePct;
  } else {
    const pvInflows2 = inflowCFs.reduce((sum, cf, i) => {
      const t = (inflowDates[i] - valueDate) / (365 * 86400000);
      return sum + cf / Math.pow(1 + targetXIRR, t);
    }, 0);
    consideration    = pvInflows2;
    stampAmt         = Math.round(consideration * stampPct);
    principal        = isExDiv ? consideration + Math.abs(accruedInt) : consideration - accruedInt;
    price            = principal / pricingBase;
    pricePct         = price * 100;
    derivedPricePct  = pricePct;
    settlement       = consideration + stampAmt;
    xirrRate         = targetXIRR;
  }

  const pricePerUnit = fvPerBond * price;
  const annualCoupon = fvPerBond * coupon;
  const currentYield = annualCoupon / pricePerUnit;
  const holdDays     = daysBetween(valueDate, matDate);
  const holdingYrs   = holdDays / 365;

  // ── Yield to Call computation ──────────────────────────────────────────────
  let ytcRate = null, ytcHoldDays = null;
  if (isCallable && callDate && callDate > valueDate) {
    // Build call-scenario cash flows: all rows up to and including call date
    // On call date: interest for period + ALL remaining outstanding principal
    let ytcCFs = [], ytcDates = [], remainingAtCall = outstandingAtValueDate;
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      // Skip ex-div missed row: buyer gets 0; outstanding already excludes seller's redemption
      if (row.buyerMisses) continue;
      if (row.date <= callDate) {
        if (row.date < callDate) {
          // Normal coupon + scheduled principal (buyer receives)
          const buyerCF = (isStaggered || isCustomRedem) ? (row.buyerMisses ? 0 : row.cashflow) : row.cashflow;
          ytcCFs.push(buyerCF);
          ytcDates.push(row.date);
          remainingAtCall -= row.principal;
        } else {
          // Coupon period ending exactly on call date
          ytcCFs.push(row.interest + remainingAtCall);
          ytcDates.push(row.date);
          remainingAtCall = 0;
          break;
        }
      } else {
        // First row after call date: accrue interest for partial period (callDate - prevDate)
        const prevDate = ri > 0 ? rows[ri-1].date : valueDate;
        const { days: callDays, denom: callDenom } = getDayCount(prevDate, callDate, dcConv);
        const partialInt = outstandingAtValueDate * coupon * callDays / callDenom;
        // Actually use full outstanding still at that point
        const osAtCall = remainingAtCall;
        ytcCFs.push(partialInt + osAtCall);
        ytcDates.push(callDate);
        remainingAtCall = 0;
        break;
      }
    }
    // If call date is after all rows (shouldn't happen but guard)
    if (remainingAtCall > 0) {
      ytcCFs.push(remainingAtCall);
      ytcDates.push(callDate);
    }
    if (ytcCFs.length > 0) {
      ytcRate = xirrCalc([-consideration, ...ytcCFs], [valueDate, ...ytcDates]);
      ytcHoldDays = daysBetween(valueDate, callDate);
    }
  }
  // ── Yield to Put computation ──────────────────────────────────────────────
  let ytpRate = null, ytpHoldDays = null;
  if (isPutable && putDate && putDate > valueDate) {
    let ytpCFs = [], ytpDates = [], remainingAtPut = outstandingAtValueDate;
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      if (row.date <= putDate) {
        if (row.date < putDate) {
          ytpCFs.push(row.cashflow);
          ytpDates.push(row.date);
          remainingAtPut -= row.principal;
        } else {
          // Coupon period ending exactly on put date
          ytpCFs.push(row.interest + remainingAtPut);
          ytpDates.push(row.date);
          remainingAtPut = 0;
          break;
        }
      } else {
        // Partial period: valueDate → putDate
        const prevDate = ri > 0 ? rows[ri-1].date : valueDate;
        const { days: putDays, denom: putDenom } = getDayCount(prevDate, putDate, dcConv);
        const osAtPut = remainingAtPut;
        ytpCFs.push(osAtPut * coupon * putDays / putDenom + osAtPut);
        ytpDates.push(putDate);
        remainingAtPut = 0;
        break;
      }
    }
    if (remainingAtPut > 0) { ytpCFs.push(remainingAtPut); ytpDates.push(putDate); }
    if (ytpCFs.length > 0) {
      ytpRate     = xirrCalc([-consideration, ...ytpCFs], [valueDate, ...ytpDates]);
      ytpHoldDays = daysBetween(valueDate, putDate);
    }
  }

  // ── Yield to Worst ─────────────────────────────────────────────────────────
  const ytwCandidates = [xirrRate];
  if (ytcRate !== null) ytwCandidates.push(ytcRate);
  if (ytpRate !== null) ytwCandidates.push(ytpRate);
  const ytwRate = (isCallable || isPutable) ? Math.min(...ytwCandidates) : null;

  const totalCouponIncome = rows.filter(r => !r.buyerMisses).reduce((s, r) => s + r.interest, 0);

  // ── Post-Tax XIRR Computation ──────────────────────────────────────────────
  // Three measures:
  // 1. Pre-Tax XIRR     = xirrRate (already computed above)
  // 2. In-Hand XIRR     = XIRR using coupons after 10% TDS only (cash actually received)
  // 3. True Post-Tax    = XIRR with full slab tax, balance paid at ITR filing date
  //
  // Capital gain at maturity = maturity_CF_principal - purchase_price
  // LTCG (>12mo) @ 12.5%, STCG (<=12mo) @ slab rate
  (function() {
    try {
      // G-Sec: No TDS on G-Secs — hide In-Hand XIRR panel, show only Post-Tax XIRR
      if (_bondMode === 'gsec') {
        const _strip = document.getElementById('taxXirrStrip');
        const _panels = document.getElementById('taxXirrPanels');
        // Collapse to single column — hide In-Hand, show only Post-Tax
        if (_panels) _panels.style.gridTemplateColumns = '1fr';
        const _ihPanel = _panels ? _panels.children[0] : null;
        if (_ihPanel) _ihPanel.style.display = 'none';
        const _ptPanel = _panels ? _panels.children[1] : null;
        if (_ptPanel) { _ptPanel.style.borderRight = 'none'; }
        // Recompute Post-Tax XIRR (full slab, no TDS since G-Sec has none)
        // For G-Sec: full slab on coupon income, CG at maturity
        const _slab2   = _isNIL ? 0 : _slab;
        const _ptCFs2  = rows.map(r => {
          if (r.buyerMisses) return (isStaggered||isCustomRedem) ? 0 : r.principal;
          return r.interest * (1 - _slab2) + r.principal;
        });
        // G-Sec: CG not included in XIRR — payable at ITR filing
        const _gsecPostTax = xirrCalc([-consideration, ..._ptCFs2], [valueDate, ...inflowDates]);
        const _gsecCGInfo = _capGain > 0
          ? ' · ' + (_isLTCG?'LTCG':'STCG') + ' Tax ' + fmt(_cgTax) + ' payable at ITR filing'
          : _capGain < 0 ? ' · Cap Loss — no CG tax' : '';
        _strip.style.display = '';
        document.getElementById('ptxPostTaxLbl').textContent = 'Post-Tax XIRR';
        document.getElementById('ptxPostTax').textContent    = (_gsecPostTax * 100).toFixed(4) + '%';
        document.getElementById('ptxPostTaxSub').textContent =
          'Full ' + Math.round(_slab2*100) + '% slab on coupon · No TDS on G-Secs' + _gsecCGInfo;
        document.getElementById('ptxNote').textContent =
          'G-Sec: No TDS · Coupon taxed at ' + Math.round(_slab2*100) + '% slab · CG excluded from XIRR · ' +
          (_capGain > 0 ? 'Cap Gain ' + fmt(_capGain) + ' → ' + (_isLTCG?'LTCG':'STCG') + ' Tax ' + fmt(_cgTax) + ' payable at ITR filing'
           : _capGain < 0 ? 'Cap Loss ' + fmt(Math.abs(_capGain)) + ' — no CG tax' : 'No capital gain');
        return;
      }

      const _slabRaw  = document.getElementById('bondTaxSlab').value;
      const _isNIL   = _slabRaw === 'nil';
      const _slab    = _isNIL ? 0 : (parseFloat(_slabRaw) || 0.30);

      // NIL slab (Form 15G/15H): no TDS, no income tax on interest, no CG tax concern
      // Show only a single XIRR — same as pre-tax XIRR (no deductions apply)
      if (_isNIL) {
        document.getElementById('taxXirrStrip').style.display = '';
        // Collapse to 1 panel by making both panels show same value
        document.getElementById('ptxInHandLbl').textContent  = 'XIRR (NIL Tax — Form 15G/15H)';
        document.getElementById('ptxInHand').textContent     = (xirrRate * 100).toFixed(4) + '%';
        document.getElementById('ptxInHandSub').textContent  = 'No TDS · No income tax · Form 15G/15H filed';
        document.getElementById('ptxPostTaxLbl').textContent = 'XIRR (NIL Tax)';
        document.getElementById('ptxPostTax').textContent    = (xirrRate * 100).toFixed(4) + '%';
        document.getElementById('ptxPostTaxSub').textContent = 'Pre-tax = In-hand = Post-tax (all identical)';
        document.getElementById('ptxNote').textContent       =
          'NIL Tax: Form 15G/15H filed · No TDS deducted · No income tax on interest · ' +
          'Capital gains (if any) still apply when filing ITR — consult your CA.';
        return;
      }
      const _tdsRate = 0.10;
      const _isLTCG  = holdingYrs > 1;
      const _isTFB   = _bondMode === 'taxfree';
      const _tfbLTCGRate = parseFloat(document.getElementById('tfbLTCGRate')?.value || '0.10');
      const _cgRate  = _isTFB ? (_isLTCG ? _tfbLTCGRate : _slab) : (_isLTCG ? 0.125 : _slab);

      // ── Capital Gain / Loss — correct for ALL bond types incl. staggered ────
      // Example: 75% outstanding → future principal = 75,000 not 1,00,000.
      const _totalFuturePrincipal = rows
        .filter(r => !r.buyerMisses)
        .reduce((s, r) => s + r.principal, 0);
      const _capGain = _totalFuturePrincipal - principal; // cost basis = principal paid (excl. accrued interest)
      // Gain → tax at LTCG/STCG rate. Loss → no outflow (set-off rules vary)
      const _cgTax   = _capGain > 0 ? _capGain * _cgRate : 0; // loss = no tax, just shown

      // ── TAX-FREE BOND ────────────────────────────────────────────────────────
      // Pre-tax, In-Hand and Post-Tax XIRR are ALL identical because:
      //   - No TDS on coupons, coupon fully exempt, zero income tax
      //   - Only capital gain at maturity applies
      if (_isTFB) {
        // Tax-Free Bond: coupon fully exempt, no TDS, no income tax on interest.
        // XIRR = raw cash flows (no deductions). CG messaging is irrelevant here.
        // TEY box shows the tax-equivalent yield — that is the only tax metric needed.
        const _tfbCFs = [-consideration], _tfbDates = [valueDate];
        rows.forEach(r => {
          _tfbCFs.push(r.buyerMisses ? ((isStaggered||isCustomRedem)?0:r.principal) : r.cashflow);
          _tfbDates.push(r.date);
        });
        const _tfbXIRR = xirrCalc(_tfbCFs, _tfbDates);
        const _tey = _tfbXIRR / (1 - _slab);

        document.getElementById('taxXirrStrip').style.display = '';
        document.getElementById('ptxInHandLbl').textContent  = 'Tax-Free XIRR';
        document.getElementById('ptxInHand').textContent     = (_tfbXIRR * 100).toFixed(4) + '%';
        document.getElementById('ptxInHandSub').textContent  = 'No TDS · Coupon fully exempt · All yields identical';
        document.getElementById('ptxPostTaxLbl').textContent = 'Tax-Free XIRR';
        document.getElementById('ptxPostTax').textContent    = (_tfbXIRR * 100).toFixed(4) + '%';
        document.getElementById('ptxPostTaxSub').textContent = 'Coupon fully exempt · No TDS · No income tax';
        const _teyEl = document.getElementById('tfbTEYVal');
        if (_teyEl) {
          _teyEl.textContent = (_tey * 100).toFixed(4) + '%';
          document.getElementById('tfbTEYSub').textContent =
            'XIRR ' + (_tfbXIRR*100).toFixed(4) + '% ÷ (1 − ' + Math.round(_slab*100) + '%)';
          document.getElementById('tfbSavingVal').textContent = fmt(totalCouponIncome * _slab);
          document.getElementById('tfbSavingSub').textContent =
            fmt(totalCouponIncome) + ' × ' + Math.round(_slab*100) + '% = tax you save';
        }
        document.getElementById('ptxNote').textContent =
          'Tax-Free Bond u/s 10(15)(iv)(h) · Coupon fully exempt · No TDS · No income tax · ' +
          'Tax-Equiv Yield (XIRR ÷ (1−slab)): ' + (_tey*100).toFixed(4) + '%';
        return;
      }

      // ── REGULAR BOND ─────────────────────────────────────────────────────────
      // In-Hand XIRR : TDS 10% deducted at each coupon (actual cash received)
      // Post-Tax XIRR: full slab deducted at each coupon (no ITR deferral)
      // CG tax deducted from final maturity CF in both cases

      // Build In-Hand and Post-Tax cash flows
      // CG tax is NOT included in XIRR cash flows — LTCG/STCG is paid at ITR filing
      // (typically 4-10 months after maturity), not on the maturity date itself.
      // It is shown as an informational note only.
      const _ihCFs    = rows.map(r => {
        if (r.buyerMisses) return (isStaggered||isCustomRedem) ? 0 : r.principal;
        return r.interest * (1 - _tdsRate) + r.principal;
      });
      const _inHandXIRR = xirrCalc([-consideration, ..._ihCFs], [valueDate, ...inflowDates]);

      const _ptCFs    = rows.map(r => {
        if (r.buyerMisses) return (isStaggered||isCustomRedem) ? 0 : r.principal;
        return r.interest * (1 - _slab) + r.principal;
      });
      const _postTaxXIRR = xirrCalc([-consideration, ..._ptCFs], [valueDate, ...inflowDates]);

      document.getElementById('taxXirrStrip').style.display = '';
      document.getElementById('ptxInHandLbl').textContent  = 'In-Hand XIRR';
      document.getElementById('ptxInHand').textContent     = (_inHandXIRR * 100).toFixed(4) + '%';
      document.getElementById('ptxInHandSub').textContent  =
        'After 10% TDS · ' + Math.round(_slab*100) + '% slab';
      document.getElementById('ptxPostTaxLbl').textContent = 'Post-Tax XIRR';
      document.getElementById('ptxPostTax').textContent    = (_postTaxXIRR * 100).toFixed(4) + '%';
      const _cgLabel = _capGain > 0 ? 'Cap Gain' : _capGain < 0 ? 'Cap Loss' : 'No CG';
      const _cgInfoStr = _capGain > 0
        ? ' · ' + (_isLTCG?'LTCG':'STCG') + ' Tax ' + fmt(_cgTax) + ' payable at ITR filing (not in XIRR)'
        : _capGain < 0 ? ' · Cap Loss — no CG tax' : '';
      document.getElementById('ptxPostTaxSub').textContent =
        'Full ' + Math.round(_slab*100) + '% slab on coupon income' + _cgInfoStr;
      document.getElementById('ptxNote').textContent =
        'Slab: ' + Math.round(_slab*100) + '% · TDS: 10% · ' +
        'In-Hand = TDS deducted only · Post-Tax = full slab on coupon (CG excluded — paid at ITR) · ' +
        _cgLabel + ': ' + fmt(_totalFuturePrincipal) + ' − ' + fmt(principal) +
        ' = ' + fmt(Math.abs(_capGain)) + (_capGain > 0 ? ' → ' + (_isLTCG?'LTCG':'STCG') + ' @ ' + (_cgRate*100).toFixed(1) + '% = ' + fmt(_cgTax) + ' (payable at ITR filing)' : ' (loss — no tax)') + ' · ' +
        'Spread: ' + ((_inHandXIRR-_postTaxXIRR)*10000).toFixed(1) + ' bps';
    } catch(e) {
      document.getElementById('taxXirrStrip').style.display = 'none';
    }
  })();

  // ── Ex-div notice ──────────────────────────────────────────────────────────
  const noticeEl = document.getElementById('exdivNotice');
  if (isExDiv) {
    noticeEl.className = 'exdiv-notice show ex-notice';
    document.getElementById('noticeTitle').textContent = '⚠ EX-DIVIDEND — Settlement after Record Date';
    document.getElementById('noticeBody').innerHTML =
      `Settlement (${fmtDate(valueDate)}) > Record date (${fmtDate(nextRD)}) for the ${fmtDate(nextIPDate)} coupon. ` +
      `Buyer will <strong>NOT receive</strong> this coupon — seller will collect it. ` +
      `Accrued of ${fmt(Math.abs(accruedInt))} (${Math.abs(accruedDays)} days × ${couponPct}% ÷ ${accruedDenom} × ${fmt(outstandingForAccrued,0)} — Value Date ${fmtDate(valueDate)} → Next IP ${fmtDate(nextIPDate)}) ` +
      `is <strong>credited back to buyer</strong> (subtracted from price).`;
  } else {
    noticeEl.className = 'exdiv-notice show cum-notice';
    document.getElementById('noticeTitle').textContent = '✓ CUM-DIVIDEND — Settlement on or before Record Date';
    document.getElementById('noticeBody').innerHTML =
      `Settlement (${fmtDate(valueDate)}) ${nextRD ? '≤ Record date (' + fmtDate(nextRD) + ')' : '(no record date configured)'} — ` +
      `Buyer <strong>WILL receive</strong> the ${fmtDate(nextIPDate)} coupon. ` +
      (isExDiv
        ? `Accrued of ${fmt(Math.abs(accruedInt))} (${Math.abs(accruedDays)} days, next IP ${fmtDate(nextIPDate)}) credited back to buyer.`
        : `Accrued of ${fmt(accruedInt)} (${accruedDays} days from ${accruedFromType === 'doa' && effectiveLastIPDate !== lastIPDate ? 'Last IP ' : (accruedFromType === 'doa' ? 'DOA ' : 'Last IP ')}${fmtDate(effectiveLastIPDate)}) paid by buyer to seller.`);
  }

  // ── Summary hero ───────────────────────────────────────────────────────────
  if (_bondMode === 'gsec') {
    const _cm2 = document.getElementById('calcMode').value;
    const _gsecMode = (_cm2 === 'ytmHToPrice' || _cm2 === 'ytmAToPrice') ? 'ytmToPrice' : 'priceToYtm';
    if (_gsecMode === 'ytmToPrice') {
      document.getElementById('heroLeftLabel').textContent  = 'Derived Price (% FV)';
      document.getElementById('heroLeftSub').textContent    = '30/360 bond formula · FIMMDA';
      document.getElementById('heroRightLabel').textContent = 'Current Yield';
      document.getElementById('heroRightSub').textContent   = 'Annual Coupon ÷ Price';
      document.getElementById('rXIRR').textContent          = derivedPricePct.toFixed(4) + '%';
      document.getElementById('rDerivedPrice').textContent  = (currentYield * 100).toFixed(4) + '%';
    } else {
      document.getElementById('heroLeftLabel').textContent  = 'YTM (H) — Semi-Annual';
      document.getElementById('heroLeftSub').textContent    = '30/360 · FIMMDA convention';
      document.getElementById('heroRightLabel').textContent = 'Current Yield';
      document.getElementById('heroRightSub').textContent   = 'Annual Coupon ÷ Price';
      // YTM(H) is set later in the G-Sec block; placeholder here
      document.getElementById('rDerivedPrice').textContent  = (currentYield * 100).toFixed(4) + '%';
    }
  } else if (mode === 'priceToXirr') {
    document.getElementById('heroLeftLabel').textContent  = 'XIRR (Annualised)';
    document.getElementById('heroLeftSub').textContent    = 'Acts/365 Newton-Raphson';
    document.getElementById('heroRightLabel').textContent = 'Current Yield';
    document.getElementById('heroRightSub').textContent   = 'Annual Coupon ÷ Price';
    document.getElementById('rXIRR').textContent          = (xirrRate * 100).toFixed(4) + '%';
    document.getElementById('rDerivedPrice').textContent  = (currentYield * 100).toFixed(4) + '%';
  } else {
    document.getElementById('heroLeftLabel').textContent  = 'Target XIRR (Input)';
    document.getElementById('heroLeftSub').textContent    = 'Used for XNPV pricing';
    document.getElementById('heroRightLabel').textContent = 'Derived Price (% FV)';
    document.getElementById('heroRightSub').textContent   = 'Via XNPV discounting';
    document.getElementById('rXIRR').textContent          = (xirrRate * 100).toFixed(4) + '%';
    document.getElementById('rDerivedPrice').textContent  = derivedPricePct.toFixed(4) + '%';
  }

  document.getElementById('rSettle').textContent       = fmt(settlement);
  document.getElementById('rSettleSub').textContent    = qty + ' × ₹' + fvPerBond.toLocaleString('en-IN');

  // ── Alt price basis (remaining principal / NSE-BSE) for amortizing bonds ──
  // The calc uses issuance FV as the pricing base. For bullet bonds, that equals
  // remaining principal at value date. For amortizing bonds entering mid-life
  // (e.g. Piramal at 77.5% O/S), they diverge — and NSE/BSE/Harmoney quote on
  // remaining-principal basis. Show that as a secondary line.
  // Conversion: pricePct_remaining = pricePct_issuance × (fvPerBond / osPerUnit)
  // Note: in priceToXirr mode the right tile shows Current Yield, so skip there.
  try {
    const altEl = document.getElementById('heroRightAlt');
    if (altEl && _bondMode !== 'gsec' && _bondMode !== 'zcb' && mode !== 'priceToXirr') {
      const osPerUnit = (outstandingAtValueDate && qty > 0) ? (outstandingAtValueDate / qty) : fvPerBond;
      // Only show alt when O/S < issuance FV (i.e. there has been pre-purchase redemption)
      if (osPerUnit > 0 && osPerUnit < fvPerBond - 0.5) {
        const altPct = derivedPricePct * (fvPerBond / osPerUnit);
        altEl.innerHTML = '≡ <strong>' + altPct.toFixed(4) + '%</strong> of remaining principal · NSE/BSE basis  '
                       + '<span style="color:var(--text-dim);font-weight:400;">(O/S ₹' + Math.round(osPerUnit).toLocaleString('en-IN')
                       + ' / unit · issuance ₹' + fvPerBond.toLocaleString('en-IN') + ')</span>';
        altEl.style.display = 'block';
      } else {
        altEl.style.display = 'none';
      }
    } else if (altEl) {
      altEl.style.display = 'none';
    }
  } catch (e) { /* non-fatal */ }

  // ── G-Sec YTM — Excel YIELD formula (FIMMDA standard, 30/360 basis) ─────────
  if (_bondMode === 'gsec') {
    // Implementation matches Excel: =YIELD(settlement, maturity, coupon, price, 100, 2, 0)
    // basis=0 → US 30/360; freq=2 → semi-annual
    // YTM(H) = semi-annual rate solved from bond pricing formula
    // YTM(A) = (1 + YTM(H)/2)^2 − 1  [same as Excel H2=G2/2*G2/2+G2]
    function _days360US(d1, d2) {
      let y1=d1.getFullYear(), m1=d1.getMonth()+1, d1_=d1.getDate();
      let y2=d2.getFullYear(), m2=d2.getMonth()+1, d2_=d2.getDate();
      if (d1_===31) d1_=30;
      if (d2_===31 && d1_===30) d2_=30;
      return 360*(y2-y1) + 30*(m2-m1) + (d2_-d1_);
    }
    function _prevCoupon(d, months) {
      let m = d.getMonth() - months + 1; // 1-based
      let yr = d.getFullYear();
      while (m <= 0) { m += 12; yr--; }
      const last = new Date(yr, m, 0).getDate(); // last day of month
      return new Date(yr, m-1, Math.min(d.getDate(), last));
    }
    // Build semi-annual coupon schedule backwards from maturity
    function _gsecYTM(settlement, maturity, couponRate, cleanPrice, redemption) {
      const freq = 2, months = 6;
      // Find last and next coupon dates relative to settlement
      let d = new Date(maturity);
      const futureCoupons = [];
      while (d > settlement) {
        futureCoupons.unshift(new Date(d));
        d = _prevCoupon(d, months);
      }
      const lastCP = d; // last coupon before or on settlement
      if (futureCoupons.length === 0) return null;
      const nextCP = futureCoupons[0];
      const N   = futureCoupons.length;   // total remaining coupons
      const E   = _days360US(lastCP, nextCP); // days in coupon period (always 180)
      const A   = _days360US(lastCP, settlement); // accrued days
      const DSC = _days360US(settlement, nextCP); // days to next coupon
      const C   = couponRate / 2 * 100;  // semi-annual coupon in % of par
      const frac = DSC / E;
      // Dirty price = clean + accrued (accrued = A/E * C)
      const accrued   = A / E * C;
      const dirtyPrice = cleanPrice + accrued;
      // Bond price formula (all in % of par):
      // dirty = sum_{k=0}^{N-1} C * v^(frac+k) + redemption * v^(frac+N-1)
      // where v = 1/(1+y/2), y = annual semi-annual YTM
      function priceAtY(y) {
        const v = 1 / (1 + y/2);
        let p = 0;
        for (let k = 0; k < N; k++) p += C * Math.pow(v, frac + k);
        p += redemption * Math.pow(v, frac + N - 1);
        return p;
      }
      // Newton-Raphson solve for y
      let y = couponRate;
      for (let i = 0; i < 500; i++) {
        const p  = priceAtY(y);
        const dp = (priceAtY(y + 1e-9) - p) / 1e-9;
        if (Math.abs(dp) < 1e-15) break;
        const yn = y - (p - dirtyPrice) / dp;
        if (Math.abs(yn - y) < 1e-10) { y = yn; break; }
        y = yn;
      }
      return { ytmH: y, ytmA: Math.pow(1 + y/2, 2) - 1, N, E, A, DSC, accrued, dirtyPrice };
    }

    const _gsecResult = _gsecYTM(valueDate, matDate, coupon, pricePct, 100);
    if (_gsecResult) {
      const _ytmH = _gsecResult.ytmH;
      const _ytmA = _gsecResult.ytmA;

      document.getElementById('gsecYTMBox').style.display = '';
      document.getElementById('gsecEARBox').style.display = '';
      document.getElementById('gsecYTMLbl').textContent   = 'YTM — Semi-Annual (H)';
      document.getElementById('gsecYTMVal').textContent   = (_ytmH * 100).toFixed(4) + '%';
      document.getElementById('gsecYTMSub').textContent   = 'Excel YIELD 30/360 basis · ' + _gsecResult.N + ' coupons · DSC=' + _gsecResult.DSC + ' E=' + _gsecResult.E;
      document.getElementById('gsecEARVal').textContent   = (_ytmA * 100).toFixed(4) + '%';
      document.getElementById('gsecEARSub').textContent   = 'YTM(A) = (1 + ' + (_ytmH*50).toFixed(4) + '%)² − 1';
      // Rename EAR label to YTM(A) as per Excel
      document.getElementById('gsecEARBox').querySelector('.m-lbl').textContent = 'YTM — Annual (A)';

      // G-Spread vs benchmark
      const _benchmarkEl  = document.getElementById('gsecBenchmark');
      const _benchmarkYTM = _benchmarkEl ? parseFloat(_benchmarkEl.value) / 100 : NaN;
      const _spreadBox    = document.getElementById('gsecSpreadBox');
      if (!isNaN(_benchmarkYTM) && _benchmarkYTM > 0) {
        const _spread = (_ytmH - _benchmarkYTM) * 10000;
        _spreadBox.style.display = '';
        document.getElementById('gsecSpreadVal').textContent = (_spread >= 0 ? '+' : '') + _spread.toFixed(1) + ' bps';
        document.getElementById('gsecSpreadSub').textContent =
          'YTM(H) ' + (_ytmH*100).toFixed(4) + '% − Benchmark ' + (_benchmarkYTM*100).toFixed(4) + '%';
        document.getElementById('gsecSpreadVal').className = 'm-val ' + (_spread >= 0 ? 'orange' : 'green');
      } else {
        _spreadBox.style.display = 'none';
      }

      // Hero: show YTM(H) prominently, YTM(A) as sub
      document.getElementById('heroLeftLabel').textContent = 'YTM (H) — Semi-Annual';
      document.getElementById('heroLeftSub').textContent   = 'YTM(A) ' + (_ytmA*100).toFixed(4) + '% · 30/360 · FIMMDA';
      document.getElementById('rXIRR').textContent         = (_ytmH * 100).toFixed(4) + '%';
    }
  } else {
    ['gsecYTMBox','gsecEARBox','gsecSpreadBox'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  // ── Metrics ────────────────────────────────────────────────────────────────
  // Show the exact price value that was used in this calculation (anti-confusion)
  const priceUsed = document.getElementById('priceUsedDisplay');
  if (priceUsed) {
    if (mode === 'priceToXirr') {
      priceUsed.textContent = `Price used in this calculation: ${pricePct.toFixed(4)}%`;
      priceUsed.style.display = 'block';
    } else {
      priceUsed.style.display = 'none';
    }
  }
  document.getElementById('mPrincipal').textContent    = fmt(principal);
  document.getElementById('mPrincipalSub').textContent =
    (isStaggered || isCustomRedem)
      ? `${pricePct.toFixed(4)}% × orig FV ${fmt(fvTotal, 0)} | O/S = ${fmt(outstandingAtValueDate, 0)}`
      : `${pricePct.toFixed(4)}% × ${fmt(fvTotal, 0)}`;

  const aBox = document.getElementById('accruedBox');
  document.getElementById('mAccrued').textContent      = fmt(Math.abs(accruedInt));
  document.getElementById('mAccruedSub').textContent   = isExDiv
    ? `${Math.abs(accruedDays)} days | O/S ${fmt(outstandingForAccrued, 0)} | ex-div: credited to buyer`
    : `${accruedDays} days | O/S ${fmt(outstandingForAccrued, 0)} | ${isExDiv ? 'Next IP ' + fmtDate(nextIPDate) + ' (ex-div)' : (accruedFromType === 'doa' && effectiveLastIPDate !== lastIPDate ? 'Last IP (auto) ' + fmtDate(effectiveLastIPDate) : (accruedFromType === 'doa' ? 'DOA ' + fmtDate(effectiveLastIPDate) : 'Last IP ' + fmtDate(effectiveLastIPDate)))} → buyer pays seller`;
  aBox.className = isExDiv ? 'm-box orange' : 'm-box gold';
  document.getElementById('mAccrued').className        = isExDiv ? 'm-val orange' : 'm-val gold';

  document.getElementById('mConsideration').textContent = fmt(consideration);
  document.getElementById('mStamp').textContent         = fmt(stampAmt, 0);
  document.getElementById('mStampSub').textContent      = `${(stampPct*100).toFixed(4)}% of consideration`;
  document.getElementById('mTotalCoupon').textContent   = fmt(totalCouponIncome);
  // Paid (on or before VD) vs receivable (after VD) breakdown
  const _couponRows  = rows.filter(r => !r.isMat && !r.buyerMisses);
  const _paidRows    = _couponRows.filter(r => r.date <= valueDate);
  const _futureRows  = _couponRows.filter(r => r.date > valueDate);
  const _paidAmt     = _paidRows.reduce((s, r) => s + r.interest, 0);
  const _futureAmt   = _futureRows.reduce((s, r) => s + r.interest, 0);
  document.getElementById('mCouponSub').textContent =
    _couponRows.length + ' payments · ₹' +
    _paidAmt.toLocaleString('en-IN',{maximumFractionDigits:0}) + ' paid · ₹' +
    _futureAmt.toLocaleString('en-IN',{maximumFractionDigits:0}) + ' receivable';
  document.getElementById('mPostTDS').textContent       = fmt(totalCouponIncome * 0.9);
  document.getElementById('mPostTDSSub').textContent    = 'Gross ' + fmt(totalCouponIncome) + ' − TDS ' + fmt(totalCouponIncome*0.1);
  document.getElementById('mHolding').textContent       = holdDays + ' days';
  document.getElementById('mHoldingSub').textContent    = holdingYrs.toFixed(4) + ' years';
  document.getElementById('mCurrentYield').textContent  = (currentYield * 100).toFixed(4) + '%';

  // YTC boxes
  const ytcBox = document.getElementById('ytcBox');
  if (ytcRate !== null && isCallable) {
    ytcBox.style.display = '';
    document.getElementById('mYTC').textContent    = (ytcRate * 100).toFixed(4) + '%';
    document.getElementById('mYTCSub').textContent = 'If called on ' + fmtDate(callDate);
    document.getElementById('ytcHoldingBox').style.display = '';
    document.getElementById('mYTCHolding').textContent     = ytcHoldDays + ' days';
    document.getElementById('mYTCHoldingSub').textContent  = (ytcHoldDays/365).toFixed(4) + ' years to call';
  } else {
    ytcBox.style.display = 'none';
    document.getElementById('ytcHoldingBox').style.display = 'none';
  }

  // YTP boxes
  const ytpBox = document.getElementById('ytpBox');
  if (ytpRate !== null && isPutable) {
    ytpBox.style.display = '';
    document.getElementById('mYTP').textContent    = (ytpRate * 100).toFixed(4) + '%';
    document.getElementById('mYTPSub').textContent = 'If put on ' + fmtDate(putDate);
    document.getElementById('ytpHoldingBox').style.display = '';
    document.getElementById('mYTPHolding').textContent     = ytpHoldDays + ' days';
    document.getElementById('mYTPHoldingSub').textContent  = (ytpHoldDays/365).toFixed(4) + ' years to put';
  } else {
    ytpBox.style.display = 'none';
    document.getElementById('ytpHoldingBox').style.display = 'none';
  }

  // YTW box
  const ytwBox = document.getElementById('ytwBox');
  if (ytwRate !== null) {
    ytwBox.style.display = '';
    const ytwSource = ytwRate === xirrRate ? 'YTM'
                    : (ytwRate === ytcRate  ? 'YTC (call date)'
                    : 'YTP (put date)');
    document.getElementById('mYTW').textContent    = (ytwRate * 100).toFixed(4) + '%';
    document.getElementById('mYTWSub').textContent = 'Worst case = ' + ytwSource;
  } else {
    ytwBox.style.display = 'none';
  }

  const dPriceBox = document.getElementById('derivedPriceBox');
  const dPriceLbl = document.getElementById('derivedPriceLbl');
  const dPriceVal = document.getElementById('mDerivedPrice');
  const dPriceSub = document.getElementById('mDerivedPriceSub');
  if (mode === 'priceToXirr') {
    dPriceBox.style.display = 'none';
  } else {
    dPriceBox.style.display = '';
    dPriceLbl.textContent   = 'Derived Price (XNPV)';
    dPriceVal.textContent   = derivedPricePct.toFixed(4) + '%';
    dPriceSub.textContent   = `= ${fmt(pricePerUnit)} per bond`;
  }

  // ── Formula note ───────────────────────────────────────────────────────────
  document.getElementById('fNote').innerHTML =
    (isCallable && callDate ? `<span class="callable-badge">&#9888; Callable — Call Date: ${fmtDate(callDate)}</span> ` : '') +
    (isPutable  && putDate  ? `<span class="putable-badge">&#128275; Putable — Put Date: ${fmtDate(putDate)}</span><br>` : '') +
    `<strong>Day Count:</strong> ${DC_LABELS[dcConv]} — denominator = ${accruedDenom}<br>` +
    (isStaggered ? `<strong>Redemption:</strong> Staggered — ${(stagPct*100).toFixed(4)}% per installment × ${redemptionDateSet.size} dates. O/S at value date = ${fmt(outstandingAtValueDate, 0)}<br>` : '') +
    `<strong>Principal:</strong> ${fmt(fvTotal,0)} (orig FV) × ${pricePct.toFixed(4)}% = ${fmt(principal)}${(isStaggered||isCustomRedem) ? " | O/S at VD = " + fmt(outstandingAtValueDate,0) : ""}<br>` +
    `<strong>Accrued Interest:</strong> ${fmt(outstandingForAccrued,0)} × ${couponPct}% × ${accruedDays}/${accruedDenom} = ${fmt(accruedInt)} [${isExDiv ? 'Value Date ' + fmtDate(valueDate) + ' → Next IP ' + fmtDate(nextIPDate) + ' (ex-div, credited to buyer)' : (accruedFromType === 'doa' && effectiveLastIPDate !== lastIPDate ? 'Last IP (auto) ' + fmtDate(effectiveLastIPDate) : (accruedFromType === 'doa' ? 'DOA' : 'Last IP') + ' ' + fmtDate(effectiveLastIPDate)) + ' → Value Date ' + fmtDate(valueDate)}]<br>` +
    `<strong>Consideration:</strong> ${fmt(principal)} ${isExDiv ? '−' : '+'} ${fmt(accruedInt)} = ${fmt(consideration)} (${isExDiv ? 'EX-DIV' : 'CUM-DIV'})<br>` +
    `<strong>Stamp Duty:</strong> ${fmt(consideration)} × ${(stampPct*100).toFixed(4)}% = ${fmt(stampAmt,0)}<br>` +
    `<strong>Settlement:</strong> ${fmt(consideration)} + ${fmt(stampAmt,0)} = ${fmt(settlement)}<br>` +
    (mode === 'priceToXirr'
      ? `<strong>XIRR:</strong> Solve NPV(−${fmt(consideration)} on ${fmtDate(valueDate)} + ${rows.length} inflows) = 0 → ${(xirrRate*100).toFixed(4)}%`
      : `<strong>XNPV:</strong> Σ CF/(1+${(targetXIRR*100).toFixed(4)}%)^t = ${fmt(consideration)} → Price = ${derivedPricePct.toFixed(4)}% of FV`);

  // ── Cash flow table ────────────────────────────────────────────────────────
  // Build reverse lookup: overriddenIso → originalIso (for editable date cells)
  const _ipDateRevMap = {};
  Object.entries(customIPDateMap).forEach(([origKey, overriddenVal]) => {
    _ipDateRevMap[overriddenVal] = origKey;
  });
  const tbody = document.getElementById('cfBody');
  tbody.innerHTML = '';

  const tr0 = document.createElement('tr');
  tr0.className = 'invest-row';
  tr0.innerHTML = `<td>0</td><td>${fmtDate(valueDate)}</td><td>Investment</td>
    <td class="r">—</td>
    <td class="r dim">—</td>
    <td class="r dim">${fmt(outstandingAtValueDate, 0)}</td>
    <td class="r neg">${fmt(accruedInt)}</td>
    <td class="r neg">—</td>
    <td class="r neg">${fmt(consideration)}</td>
    <td>—</td>
    <td><span class="tag ${isExDiv ? 'ex' : 'cum'}">${isExDiv ? 'EX-DIV' : 'CUM-DIV'}</span></td>`;
  tbody.appendChild(tr0);

  rows.forEach((r, i) => {
    if (showRD && r.rd) {
      const trRD = document.createElement('tr');
      trRD.className = 'rd-row';
      trRD.innerHTML = `<td></td><td></td>
        <td><span class="tag rd">Record Date</span></td>
        <td class="r dim" colspan="7">${fmtDate(r.rd)} &nbsp;·&nbsp; ${customRDMap[isoStr(r.date)]!==undefined?customRDMap[isoStr(r.date)]:rdDays} days before ${fmtDate(r.date)} coupon</td>
        <td></td><td></td>`;
      tbody.appendChild(trRD);
    }
    const tr = document.createElement('tr');
    if (r.isMat) tr.className = 'mat-row';
    if (r.buyerMisses) tr.className = 'missed-row';
    if (r.isFirstLong) tr.className = 'long-first-row';
    if (r.isRedemptionDate && !r.isMat && !r.buyerMisses) tr.className = 'redemption-row';

    const intDisplay = r.buyerMisses
      ? `<span class="dim">${fmt(r.interest)} (seller)</span>`
      : `<span class="pos">${fmt(r.interest)}</span>`;

    const today = new Date(); today.setHours(0,0,0,0);
    const cfDate = new Date(r.date); cfDate.setHours(0,0,0,0);
    const isPast = cfDate <= today;

    const statusTag = r.buyerMisses
      ? `<span class="tag ex">Missed (Ex-Div)</span>`
      : r.isFirstLong
        ? `<span class="tag long-first">Long First Coupon</span>`
        : r.isMat
          ? `<span class="tag ${isPast ? 'rd' : 'upcoming-mat'}">Maturity${isPast ? ' (Received)' : ' (Upcoming)'}</span>`
          : r.isRedemptionDate
            ? `<span class="tag redemption">${isPast ? 'Redemption (Paid)' : 'Redemption (Pending)'}</span>`
            : isPast
              ? `<span class="tag cum">Received</span>`
              : `<span class="tag pending">Yet to Receive</span>`;

    // Show outstandingBefore = the balance on which interest for this row is calculated.
    // This lets the user verify: outstandingBefore × coupon% × days/denom = interest shown.
    const osDisplay = (isStaggered || isCustomRedem)
      ? `<span class="${r.outstandingBefore === 0 ? 'dim' : ''}">${fmt(r.outstandingBefore, 0)}</span>`
      : `<span class="dim">—</span>`;

    const princDisplay = r.principal > 0
      ? (r.buyerMisses ? `<span class="dim">${fmt(r.principal)} (seller)</span>` : `<span class="pos">${fmt(r.principal)}</span>`)
      : '—';

    const cfDisplay = r.buyerMisses && !r.isMat
      ? `<span class="dim">—</span>`
      : `<span class="pos">${fmt(r.buyerMisses ? r.principal : r.cashflow)}</span>`;

    // Post-TDS: principal returned in full; only interest portion has 10% TDS
    const _intForTDS   = (r.buyerMisses && !r.isMat) ? 0 : (r.buyerMisses ? 0 : r.interest);
    const _princForTDS = (r.buyerMisses && !r.isMat) ? 0 : (r.buyerMisses ? r.principal : r.principal);
    const _postTDSVal  = _princForTDS + (_intForTDS * 0.9);
    const postTDSDisplay = (r.buyerMisses && !r.isMat)
      ? `<span class="dim">—</span>`
      : `<span class="pos" style="font-size:10px;color:#4a9e8a;">${fmt(_postTDSVal)}</span>`;

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>
        ${(() => {
          const _origKey = _ipDateRevMap[isoStr(r.date)] || isoStr(r.date);
          const _isCustom = !!customIPDateMap[_origKey];
          const _origLabel = _isCustom ? fmtDate(parseLocalDate(_origKey)) : '';
          return `<div class="ip-date-cell">
            <span class="date-val${_isCustom ? ' customised' : ''}"
              onclick="openIPDatePopover('${_origKey}', this)"
              title="${_isCustom ? 'Custom: orig ' + _origLabel + ' (click to edit)' : 'Click to adjust this IP date'}">
              ${fmtDate(r.date)}
            </span>
            <div class="ip-date-popover">
              <label>ADJUST IP DATE</label>
              <input type="date" value="${customIPDateMap[_origKey] || _origKey}" />
              <div class="field-hint" style="margin-bottom:5px;color:var(--text-dim);">Original: ${_isCustom ? _origLabel : isoStr(r.date)}</div>
              <div class="pop-btns">
                <button class="pop-apply" onclick="applyIPDateOverride('${_origKey}', this.closest('.ip-date-popover'))">✓ Apply</button>
                <button class="pop-reset" onclick="resetIPDateOverride('${_origKey}', this.closest('.ip-date-popover'))">↺ Reset</button>
              </div>
            </div>
          </div>`;
        })()}
      </td>
      <td>${r.type}</td>
      <td class="r">${r.days}</td>
      <td class="r" id="denomcell_${isoStr(r.date)}" style="${dcConv==='custom'?'cursor:pointer;user-select:none;':''}">
        ${dcConv==='custom'
          ? `<span onclick="toggleCellDenom('${isoStr(r.date)}',this)" style="display:inline-block;min-width:28px;padding:1px 5px;border-radius:2px;border:1px solid ${(customDenomMap[customDenomKey(r.date)]||365)===366?'rgba(184,134,11,0.5)':'var(--border-light)'};background:${(customDenomMap[customDenomKey(r.date)]||365)===366?'rgba(184,134,11,0.08)':'transparent'};color:${(customDenomMap[customDenomKey(r.date)]||365)===366?'var(--gold)':'inherit'};font-size:11px;cursor:pointer;" title="Click to toggle 365/366">${customDenomMap[customDenomKey(r.date)]||365}</span>`
          : r.denom
        }
      </td>
      <td class="r">${osDisplay}</td>
      <td class="r">${intDisplay}</td>
      <td class="r">${princDisplay}</td>
      <td class="r">${cfDisplay}</td>
      <td class="r postTdsCell">${postTDSDisplay}</td>
      <td class="dim" style="font-size:10px;">
        <span onclick="toggleCellRD('${isoStr(r.date)}',this)"
          style="display:inline-block;padding:1px 5px;border-radius:2px;
            border:1px solid ${customRDMap[isoStr(r.date)]!==undefined&&customRDMap[isoStr(r.date)]!==getRDDays()?'rgba(184,134,11,0.5)':'var(--border-light)'};
            background:${customRDMap[isoStr(r.date)]!==undefined&&customRDMap[isoStr(r.date)]!==getRDDays()?'rgba(184,134,11,0.08)':'transparent'};
            color:${customRDMap[isoStr(r.date)]!==undefined&&customRDMap[isoStr(r.date)]!==getRDDays()?'var(--gold)':'inherit'};
            cursor:pointer;font-size:10px;"
          title="${customRDMap[isoStr(r.date)]!==undefined&&customRDMap[isoStr(r.date)]!==getRDDays()?'Custom: '+customRDMap[isoStr(r.date)]+' days (click to edit)':'Click to customise record date days'}">
          ${r.rd ? fmtDate(r.rd) : '—'}
        </span>
      </td>
      <td>${statusTag}</td>`;
    tbody.appendChild(tr);
  });

  // Hide Post-TDS column for bond modes with no TDS (G-Sec / Tax-Free).
  // Per s.193 / Sec 10(15)(iv) — no TDS on these instruments.
  _toggleTDSColumnVisibility();

  document.getElementById('resultsPanel').classList.add('show');
  const _ph = document.getElementById('resultsPlaceholder');
  if (_ph) _ph.style.display = 'none';

  // Store for Excel export
  window._lastIpDates = ipDates;
  if (document.getElementById('dayCount').value === 'custom') buildDenomPills(ipDates, lastIPDate);
  window._lastCalcRows = rows;
  window._lastCalcMeta = {
    valueDate, consideration, isExDiv, accruedInt, principal,
    secName:    document.getElementById('secName').value,
    isStaggered, outstandingAtValueDate, outstandingForAccrued, isExDiv, nextIPDate,
    xirrRate, pricePct: derivedPricePct, stampAmt, settlement,
    isCallable, callDate, ytcRate,
    isPutable, putDate, ytpRate, ytwRate,
    isin: document.getElementById('isin').value,
    bondType: document.getElementById('bondType').value,
    bondRating: document.getElementById('bondRating').value,
    fvTotal, fvPerBond, qty,
    couponPct, dcConv,
    lastIPDate, effectiveLastIPDate, matDate, stampPct,
    allotmentDate: document.getElementById('allotmentDate').value || '',
    inflowCFs: [...inflowCFs], inflowDates: [...inflowDates]
  };
  calculateSale();
}

// Init
// ── Bond tax slab change handler ──────────────────────────────────────────────
function onBondTaxSlabChange() {
  const isNIL = document.getElementById('bondTaxSlab').value === 'nil';
  const strip  = document.getElementById('taxXirrStrip');
  // Hide the two-panel strip when NIL — only one XIRR exists
  // The strip will be properly rebuilt on next calculate()
  if (strip) strip.style.display = 'none';
}

// ── Tax tab switcher ──────────────────────────────────────────────────────────
function switchTaxTab(tab) {
  const isAccrual = tab === 'accrual';
  document.getElementById('taxPanelAccrual').style.display = isAccrual ? '' : 'none';
  document.getElementById('taxPanelReceipt').style.display = isAccrual ? 'none' : '';
  const btnA = document.getElementById('taxTabAccrual');
  const btnR = document.getElementById('taxTabReceipt');
  if (btnA && btnR) {
    btnA.style.background   = isAccrual ? 'var(--accent)' : 'var(--surface)';
    btnA.style.color        = isAccrual ? '#fff' : 'var(--text-dim)';
    btnR.style.background   = isAccrual ? 'var(--surface)' : 'var(--accent)';
    btnR.style.color        = isAccrual ? 'var(--text-dim)' : '#fff';
  }
}

// ── ISIN Database Search ──────────────────────────────────────────────────────
// API endpoint — change this to your deployed server URL
const BONDCALC_API = window.BONDCALC_API || 'http://localhost:3001';

let _searchTimer = null;

function onISINSearchInput(val) {
  clearTimeout(_searchTimer);
  const dd = document.getElementById('searchDropdownWrap');
  if (dd) dd.style.display = 'block';
  
  const issuerFilter = (document.getElementById('filterIssuer').value || '').trim();
  const endsWithFilter = (document.getElementById('filterEndsWith').value || '').trim();
  
  if (val.length === 0 && issuerFilter.length === 0 && endsWithFilter.length === 0 && typeof BONDS_DB === 'undefined') { 
    document.getElementById('isinDropdown').innerHTML = '<div style="padding:12px 14px;font-size:11px;color:var(--text-dim);">Type to search…</div>';
    return; 
  }
  _searchTimer = setTimeout(() => searchISINs(val, issuerFilter, endsWithFilter), 300);
}

async function searchISINs(query, issuerFilter, endsWithFilter) {
  const dd = document.getElementById('isinDropdown');
  dd.innerHTML = '<div style="padding:12px 14px;font-size:11px;color:var(--text-dim);">Searching…</div>';

  const catColors = {
    gsec:'var(--teal)', taxfree:'var(--green)', zcb:'var(--purple)',
    nbfc:'var(--orange)', psu:'var(--accent2)', hfc:'var(--gold)', corporate:'var(--text-dim)', sdl:'var(--teal)', 't-bill':'var(--purple)'
  };
  const catLabels = {
    gsec:'G-Sec', taxfree:'Tax-Free', zcb:'ZCB', nbfc:'NBFC',
    psu:'PSU', hfc:'HFC', corporate:'Corp', sdl:'SDL', 't-bill':'T-Bill'
  };

  function renderResults(results, isLocal = false) {
    if (!results || results.length === 0) {
      dd.innerHTML = `<div style="padding:12px 14px;">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">No results for "${query}"</div>
        <button onclick="requestISIN('${query}')" style="font-size:10px;color:var(--accent2);background:var(--accent-bg);
          border:1px solid rgba(14,165,233,0.2);border-radius:6px;padding:5px 12px;cursor:pointer;">
          + Request this ISIN to be added
        </button>
      </div>`;
      return;
    }
    dd.innerHTML = results.map(b => {
      const cat = (b.bondType || b.category || '').toLowerCase();
      const catCol = catColors[cat] || 'var(--text-dim)';
      const catLab = catLabels[cat] || b.bondType || b.category || 'Bond';
      const bName = b.shortName || b.name || '';
      return `
      <div onclick="loadISINFromDB('${b.isin}')"
        style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;"
        onmouseover="this.style.background='rgba(14,165,233,0.06)'"
        onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="min-width:0;">
            <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${bName}
            </div>
            <div style="font-size:10px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;margin-top:2px;">
              <span style="color:var(--accent2);font-weight:600;">${b.last4 || b.isin.slice(-4)}</span> · ${b.isin} · ${b.couponRate}% · Mat: ${b.maturityDate}
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
            <span style="font-size:9px;padding:2px 7px;border-radius:12px;font-weight:500;
              background:rgba(14,165,233,0.1);color:${catCol};">
              ${catLab}
            </span>
            ${isLocal ? '<span style="font-size:8px;color:var(--green);padding:1px 5px;border-radius:8px;background:var(--green-bg);">✓ DB</span>' : (!b.verified ? '<span style="font-size:8px;color:var(--orange);padding:1px 5px;border-radius:8px;background:var(--orange-bg);">⚠ Unverified</span>' : '')}
          </div>
        </div>
      </div>`}).join('') +
      (results.length >= 20 ? `<div style="padding:8px 14px;font-size:10px;color:var(--text-dim);text-align:center;">Refine search to see more</div>` : '');
  }

  // 1. Search Local Database
  if (typeof BONDS_DB !== 'undefined' && BONDS_DB.bonds) {
    const q = query.trim().toUpperCase();
    const iFilter = issuerFilter.toUpperCase();
    const eFilter = endsWithFilter.toUpperCase();
    
    let matches = BONDS_DB.bonds.filter(b => {
      let match = true;
      
      // Main query match
      if (q) {
        if (!( (b.last4 && b.last4.includes(q)) || 
               b.isin.includes(q) || 
               b.name.toUpperCase().includes(q) || 
               (b.issuer && b.issuer.toUpperCase().includes(q)) || 
               b.couponRate.toString().includes(q) )) {
          match = false;
        }
      }
      
      // Issuer Filter
      if (match && iFilter) {
        if (!b.issuer || !b.issuer.toUpperCase().includes(iFilter)) {
          // Fallback to name if issuer field is empty
          if (!b.name.toUpperCase().includes(iFilter)) match = false;
        }
      }
      
      // Ends With Filter
      if (match && eFilter) {
        if (!b.isin.endsWith(eFilter)) match = false;
      }
      
      return match;
    });
    
    if (matches.length > 0) {
      renderResults(matches.slice(0, 30), true);
      return; // Stop here if local DB has it
    } else if (q || iFilter || eFilter) {
      renderResults([], true); // Show no results if specifically filtering locally
      return;
    }
  }

  // 2. Fallback to API
  try {
    const res  = await fetch(`${BONDCALC_API}/api/search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    renderResults(data.results || [], false);
  } catch (err) {
    dd.innerHTML = `<div style="padding:12px 14px;font-size:11px;color:var(--text-dim);">API unavailable — searching local DB only.</div>`;
  }
}

async function loadISINFromDB(isin) {
  const ddWrap = document.getElementById('searchDropdownWrap');
  if (ddWrap) ddWrap.style.display = 'none';
  document.getElementById('isinSearchInput').value = isin;

  const badge = document.getElementById('isinStatusBadge');

  // Show loading state
  if (badge) {
    badge.style.display = 'block';
    badge.style.background = 'rgba(14,165,233,0.1)';
    badge.style.color = 'var(--accent2)';
    badge.style.border = '1px solid rgba(14,165,233,0.2)';
    badge.textContent = '⟳ Loading ' + isin + '…';
  }

  let bondData = null;
  let isLocal = false;
  
  // 1. Try local DB
  if (typeof BONDS_DB !== 'undefined' && BONDS_DB.bonds) {
    bondData = BONDS_DB.bonds.find(b => b.isin === isin);
    if (bondData) isLocal = true;
  }
  
  // 2. Fallback to API
  if (!bondData) {
    try {
      const res  = await fetch(`${BONDCALC_API}/api/bond/${isin}`);
      const data = await res.json();
      if (!data.found) {
        if (badge) {
          badge.style.background = 'var(--red-bg)';
          badge.style.color = 'var(--red)';
          badge.style.border = '1px solid rgba(244,63,94,0.2)';
          badge.textContent = '✗ ' + (data.message || 'ISIN not found');
        }
        return;
      }
      bondData = data.bond;
      bondData.verified = data.verified;
    } catch (err) {
      if (badge) {
        badge.style.background = 'var(--red-bg)';
        badge.style.color = 'var(--red)';
        badge.textContent = '✗ API error — check server connection';
      }
      return;
    }
  }

  const b = bondData;

  // Auto-set bond mode based on category
  const cat = (b.bondType || b.category || '').toLowerCase();
  const modeMap = { 'g-sec':'gsec', taxfree:'taxfree', zcb:'zcb', sdl:'gsec', 't-bill':'zcb' };
  if (modeMap[cat]) setBondMode(modeMap[cat]);
  else setBondMode('regular');

  // Fill all fields
  if (b.name)          document.getElementById('secName').value        = b.name;
  if (b.isin)          document.getElementById('isin').value           = b.isin;
  if (b.rating)        document.getElementById('bondRating').value     = b.rating;
  if (b.couponRate)    document.getElementById('couponRate').value     = b.couponRate;
  if (b.faceValue)     document.getElementById('faceValue').value      = b.faceValue;
  if (b.maturityDate)  document.getElementById('maturityDate').value   = b.maturityDate;
  if (b.allotmentDate || b.issueDate) document.getElementById('allotmentDate').value = (b.allotmentDate || b.issueDate);
  if (b.stampDuty !== undefined) document.getElementById('stampDuty').value = b.stampDuty;

  // IP schedule
  const freqMap = { 'Annual': '1', 'Semi-Annual': '2', 'Quarterly': '4', 'Monthly': '12', 'Zero Coupon': '0' };
  let freq = b.frequency ? (freqMap[b.frequency] || '1') : b.ipFreq;
  if (freq !== undefined) { document.getElementById('ipFreq').value = freq; onFreqChange(); }
  if (b.ipDateType) { document.getElementById('ipDateType').value = b.ipDateType; onDateTypeChange(); }
  if (b.ipDates && b.ipDateType === 'fixed') document.getElementById('fixedDates').value = b.ipDates;
  if (b.dayCount)  { document.getElementById('dayCount').value = b.dayCount; onDayCountChange(); }

  // Record date
  if (b.recordDateDays !== undefined) {
    document.getElementById('rdRule').value = String(b.recordDateDays) in {0:1,7:1,15:1,30:1}
      ? String(b.recordDateDays) : (b.recordDateDays > 0 ? 'custom' : '0');
    onRDChange();
  }

  // Callable
  if (b.callable) { document.getElementById('isCallable').value = b.callable; onCallableChange(); }
  if (b.callDate)  document.getElementById('callDate').value = b.callDate;
  if (b.putDate)   document.getElementById('putDate').value  = b.putDate;

  // Security type
  const typeMap = { 'SENIOR SECURED':'SENIOR SECURED','SECURED':'SECURED',
                    'UNSECURED':'UNSECURED','SENIOR UNSECURED':'SENIOR UNSECURED' };
  if (b.securityType && typeMap[b.securityType]) {
    document.getElementById('bondType').value = typeMap[b.securityType];
  }

  // Trigger auto last IP
  renderLastIPQuickSelect();

  // Show verified / unverified badge
  if (badge) {
    if (isLocal) {
      badge.style.background = 'var(--green-bg)';
      badge.style.color = 'var(--green)';
      badge.style.border = '1px solid rgba(16,185,129,0.25)';
      badge.textContent = '✓ DB Loaded — ' + b.isin;
    } else if (bondData.verified) {
      badge.style.background = 'var(--green-bg)';
      badge.style.color = 'var(--green)';
      badge.style.border = '1px solid rgba(16,185,129,0.25)';
      badge.textContent = '✓ Verified API — ' + b.isin;
    } else {
      badge.style.background = 'var(--orange-bg)';
      badge.style.color = 'var(--orange)';
      badge.style.border = '1px solid rgba(251,146,60,0.25)';
      badge.textContent = '⚠ Unverified data — cross-check before use';
    }
  }
}

async function requestISIN(isin) {
  try {
    await fetch(`${BONDCALC_API}/api/request-isin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isin: isin.toUpperCase(), notes: 'Requested via search' }),
    });
    document.getElementById('isinDropdown').innerHTML =
      '<div style="padding:12px 14px;font-size:11px;color:var(--green);">✓ Request submitted. We will add this ISIN within 48 hours.</div>';
  } catch(e) {
    console.log('Request failed:', e);
  }
}

async function reportISINError(isin, field, currentValue, correctValue) {
  try {
    await fetch(`${BONDCALC_API}/api/report-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isin, field, currentValue, correctValue }),
    });
    alert('Error reported. Thank you — we will review and update.');
  } catch(e) {
    alert('Could not submit report. Please try again.');
  }
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
function toggleTheme() {
  const html  = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  if (isDark) {
    html.setAttribute('data-theme', 'light');
    document.getElementById('themeIcon').textContent  = '🌙';
    document.getElementById('themeLabel').textContent = 'Dark';
    localStorage.setItem('bondCalcTheme', 'light');
  } else {
    html.removeAttribute('data-theme');
    document.getElementById('themeIcon').textContent  = '☀️';
    document.getElementById('themeLabel').textContent = 'Light';
    localStorage.setItem('bondCalcTheme', 'dark');
  }
}

window.onload = () => {
  // Restore saved theme preference
  const savedTheme = localStorage.getItem('bondCalcTheme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('themeIcon').textContent  = '🌙';
    document.getElementById('themeLabel').textContent = 'Dark';
  }

  // Always set value date to today on fresh page load
  // (no !vdEl.value guard — browser autofill should not override today's date)
  const vdEl = document.getElementById('valueDate');
  if (vdEl) {
    const t = new Date();
    vdEl.value = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
  }
  renderSavedBonds();
  onRedemptionTypeChange();
  updateSellModeOptions(); // set YTC/YTP visibility based on initial bond type
  renderLastIPQuickSelect(); // show quick-select on initial load
};


// ─── EARLY SALE CALCULATOR ────────────────────────────────────────────────────
function onEnableSaleChange() {
  const on = document.getElementById('enableSale').checked;
  document.getElementById('saleFields').style.display = on ? 'block' : 'none';
  if (!on) {
    document.getElementById('saleSummaryCard').classList.remove('show');
  } else if (window._lastCalcMeta) {
    calculateSale();
  }
}


// ── Sell Input Mode ───────────────────────────────────────────────────────────
function onSellInputModeChange() {
  const mode = document.getElementById('sellInputMode').value;
  const isYield = mode !== 'price';
  document.getElementById('sellPriceField').style.display  = isYield ? 'none'  : '';
  document.getElementById('sellYieldField').style.display  = isYield ? ''      : 'none';

  const labels = { ytm: 'Sell YTM (%)', ytc: 'Sell YTC — Yield to Call (%)', ytp: 'Sell YTP — Yield to Put (%)' };
  const hints  = {
    ytm: 'Price derived via XNPV from sell date to maturity',
    ytc: 'Price derived via XNPV from sell date to call date',
    ytp: 'Price derived via XNPV from sell date to put date',
  };
  if (isYield) {
    document.getElementById('sellYieldLabel').textContent = labels[mode] || 'Sell Yield (%)';
    document.getElementById('sellYieldHint').textContent  = hints[mode]  || '';
  }
  // Clear derived price display
  document.getElementById('sellDerivedPrice').style.display = 'none';
  // Re-run sale calc
  calculateSale();
}

// Derive sell price from entered yield via XNPV, then populate sellPrice and trigger calc
function deriveSellPrice() {
  const m    = window._lastCalcMeta;
  const rows = window._lastCalcRows;
  if (!m || !rows) return;

  // Guard against infinite recursion deriveSellPrice ↔ calculateSale
  if (window._derivingSellPrice) return;

  const mode       = document.getElementById('sellInputMode').value;
  const sellDateStr= document.getElementById('sellDate').value;
  const yieldPct   = parseFloat(document.getElementById('sellYield').value);
  if (!sellDateStr || isNaN(yieldPct) || yieldPct <= 0) {
    document.getElementById('sellDerivedPrice').style.display = 'none';
    return;
  }

  const sellDate = parseLocalDate(sellDateStr);
  const rate     = yieldPct / 100;
  const fvTotal  = m.fvTotal;
  const dcConv   = m.dcConv || 'actactical';

  // Outstanding FV at sell date
  let osAtSell = m.outstandingAtValueDate;
  for (const row of rows) {
    if (row.date <= sellDate && row.principal > 0) osAtSell -= row.principal;
  }
  osAtSell = Math.max(osAtSell, 0);

  // Find last IP before sell date (for accrued)
  // Find last IP on or before sell date (use <= so that if sell date IS an IP date,
  // lastIPBeforeSell = sell date itself → accDays = 0, matching how calculate()
  // handles valueDate = IP date where autoSetLastIP sets lastIP = that date)
  // Start from effectiveLastIPDate (the last paid IP at VD, not raw DOA)
  let lastIPBeforeSell = m.effectiveLastIPDate || m.lastIPDate;
  for (const row of rows) {
    if (row.date <= sellDate) lastIPBeforeSell = row.date;
    else break;
  }
  const { days: accDays, denom: accDenom } = getDayCount(lastIPBeforeSell, sellDate, dcConv);
  const sellAccrued = osAtSell * (m.couponPct / 100) * accDays / accDenom;

  // Build future cash flows from sell date to the relevant end date
  let endDate = m.matDate;
  if (mode === 'ytc' && m.callDate) endDate = m.callDate;
  if (mode === 'ytp' && m.putDate)  endDate = m.putDate;

  // Collect cashflows: future rows from sell date to end date
  const futureCFs    = [];
  const futureDates  = [];
  let runningOS      = osAtSell;
  let prevDate       = lastIPBeforeSell;

  for (const row of rows) {
    if (row.date <= sellDate) { prevDate = row.date; continue; }
    if (row.date > endDate)   break;
    const isFinal = (row.date >= endDate) || row.isMat;
    // If this is past the end date for YTC/YTP, add a synthetic final row
    const cf = row.buyerMisses ? 0 : row.cashflow;
    futureCFs.push(cf);
    futureDates.push(row.date);
    if (row.date >= endDate) break;
  }

  // If no rows found (e.g. YTC/YTP end date between IP dates), build synthetic cashflow
  if (futureCFs.length === 0 || futureDates[futureDates.length-1] < endDate) {
    // Add a bullet redemption at endDate with accrued from prevDate
    const lastSeen = futureDates.length > 0 ? futureDates[futureDates.length-1] : sellDate;
    const { days: d2, denom: dn2 } = getDayCount(lastSeen, endDate, dcConv);
    const finalInt = osAtSell * (m.couponPct / 100) * d2 / dn2;
    futureCFs.push(finalInt + osAtSell);
    futureDates.push(endDate);
  }

  // XNPV from sell date: Σ CF / (1+r)^t  where t = (date - sellDate) / 365
  const t0 = sellDate;
  const xnpv = futureCFs.reduce((sum, cf, i) => {
    const t = (futureDates[i] - t0) / (365 * 86400000);
    return sum + cf / Math.pow(1 + rate, t);
  }, 0);

  // xnpv = sellConsideration = sellPrincipal + sellAccrued
  // => sellPrincipal = xnpv - sellAccrued
  const sellPrincipal = xnpv - sellAccrued;
  const derivedPricePct = (sellPrincipal / fvTotal) * 100;

  if (derivedPricePct <= 0 || !isFinite(derivedPricePct)) {
    document.getElementById('sellDerivedPrice').style.display = 'none';
    return;
  }

  // Show derived price and copy to sellPrice field
  document.getElementById('sellPrice').value = derivedPricePct.toFixed(4);
  const dp = document.getElementById('sellDerivedPrice');
  dp.innerHTML = '&#x21ba; Derived price: <strong>' + derivedPricePct.toFixed(4) + '%</strong>'
    + ' &nbsp;=&nbsp; ₹' + (sellPrincipal).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})
    + ' &nbsp;·&nbsp; Accrued: ₹' + sellAccrued.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
  dp.style.display = 'block';

  // Trigger sale calculation with derived price
  // Set guard so calculateSale() doesn't re-enter deriveSellPrice() and recurse infinitely.
  window._derivingSellPrice = true;
  try {
    calculateSale();
  } finally {
    window._derivingSellPrice = false;
  }
}

function calculateSale() {
  const enabled = document.getElementById('enableSale').checked;
  const card    = document.getElementById('saleSummaryCard');
  if (!enabled) { card.classList.remove('show'); return; }

  const m    = window._lastCalcMeta;
  const rows = window._lastCalcRows;
  if (!m || !rows) { card.classList.remove('show'); return; }

  const sellDateStr  = document.getElementById('sellDate').value;
  const sellInputMode = document.getElementById('sellInputMode') ? document.getElementById('sellInputMode').value : 'price';
  // If in yield mode, re-derive price whenever sell date changes — UNLESS we're being
  // called from inside deriveSellPrice() (which has already populated sellPrice).
  // The _derivingSellPrice guard prevents infinite recursion between the two functions.
  if (sellInputMode !== 'price' && sellDateStr && document.getElementById('sellYield').value && !window._derivingSellPrice) {
    deriveSellPrice();
    return; // deriveSellPrice calls calculateSale() again after updating sellPrice
  }
  const sellPricePct = parseFloat(document.getElementById('sellPrice').value);
  if (!sellDateStr || isNaN(sellPricePct)) { card.classList.remove('show'); return; }

  const sellDate   = parseLocalDate(sellDateStr);
  const buyDate    = m.valueDate;
  const fvTotal    = m.fvTotal;
  const fvPerBond  = m.fvPerBond;
  const qty        = m.qty;
  const couponPct  = m.couponPct;
  const dcConv     = m.dcConv || 'actactical';
  const taxSlab    = parseFloat(document.getElementById('taxSlab').value);

  // Validate
  if (sellDate <= buyDate) {
    document.getElementById('saleFNote').textContent = '⚠ Sell date must be after buy (value) date.';
    card.classList.add('show'); return;
  }
  if (sellDate >= m.matDate) {
    document.getElementById('saleFNote').textContent = '⚠ Sell date must be before maturity date. Use the normal XIRR for hold-to-maturity.';
    card.classList.add('show'); return;
  }

  // ── Buy principal (original FV × buy price%) ───────────────────────────────
  const buyPrincipal  = fvTotal * (m.pricePct / 100);

  // ── Outstanding FV at sell date ────────────────────────────────────────────
  // Walk rows to find outstanding after all redemptions before/on sell date
  let osAtSell = m.outstandingAtValueDate;
  for (const row of rows) {
    if (row.date <= sellDate && row.principal > 0) osAtSell -= row.principal;
  }
  osAtSell = Math.max(osAtSell, 0);

  // ── Sell principal (outstanding FV × sell price%) ──────────────────────────
  // Indian market: sell price quoted as % of ORIGINAL FV (same as buy)
  const sellPrincipal = fvTotal * (sellPricePct / 100);

  // ── Accrued interest at sell date ──────────────────────────────────────────
  // Find last IP date before sell date
  // Use <= so sell date = IP date gives accrued = 0 (consistent with calculate())
  // Start from effectiveLastIPDate (the last paid IP at VD, not raw DOA)
  let lastIPBeforeSell = m.effectiveLastIPDate || m.lastIPDate;
  for (const row of rows) {
    if (row.date <= sellDate) lastIPBeforeSell = row.date;
    else break;
  }
  const { days: sellAccDays, denom: sellAccDenom } = getDayCount(lastIPBeforeSell, sellDate, dcConv);
  const sellAccrued = osAtSell * (couponPct / 100) * sellAccDays / sellAccDenom;

  // ── Coupons received between buy and sell ──────────────────────────────────
  // Include only rows strictly after buyDate and strictly before sellDate
  // (the sell accrued covers the partial period up to sell date)
  let couponIncome        = 0;
  let redemptionsReceived = 0;  // principal redemptions received between buy and sell
  const saleCFs      = [];
  const saleDates    = [];
  const saleRows     = [];

  for (const row of rows) {
    if (row.date <= buyDate) continue;
    if (row.date >= sellDate) break;
    if (row.buyerMisses) continue;
    couponIncome += row.interest;
    if (row.principal > 0) redemptionsReceived += row.principal;
    saleCFs.push(row.cashflow);
    saleDates.push(row.date);
    saleRows.push(row);
  }

  // ── Sell consideration (what buyer pays you) ───────────────────────────────
  const sellConsideration = sellPrincipal + sellAccrued;

  // ── XIRR on full holding period ────────────────────────────────────────────
  // For ex-div bonds, the buyer pays a reduced consideration (principal − accrued credit)
  // because the seller keeps the upcoming coupon. The naive cashflow row stream from rows[]
  // starts the first received-coupon's interest accrual from the missed IP (e.g. 13-May)
  // rather than from value date — so the buyer's first received CF is short by the credit
  // amount. Without compensation, XIRR under-reports by ~25-30 bps.
  //
  // Fix: add the ex-div credit as a separate inflow at the first-received-IP date (effectively
  // boosting that first inflow to cover the full VD→first-IP period). This matches the
  // Excel template's approach of computing the first row's interest from VD.
  const isExDivBuy = !!m.isExDiv;
  const accrCredit = isExDivBuy ? Math.abs(m.accruedInt || 0) : 0;
  let allCFs, allDates;
  if (isExDivBuy && saleCFs.length > 0 && accrCredit > 0) {
    // Add the credit alongside the first inflow date (first non-missed coupon after buy)
    const firstRecvDate = saleDates[0];
    const adjustedSaleCFs = [...saleCFs];
    adjustedSaleCFs[0] = adjustedSaleCFs[0] + accrCredit;
    allCFs   = [-m.consideration, ...adjustedSaleCFs, sellConsideration];
    allDates = [buyDate,           ...saleDates,      sellDate];
  } else {
    allCFs   = [-m.consideration, ...saleCFs, sellConsideration];
    allDates = [buyDate,           ...saleDates, sellDate];
  }
  const realisedXIRR = xirrCalc(allCFs, allDates);

  // ── Capital gain ───────────────────────────────────────────────────────────
  // For staggered bonds: capital gain = (sell principal + redemptions received) - buy principal
  const capGain       = (sellPrincipal + redemptionsReceived) - buyPrincipal;
  const holdingDays   = daysBetween(buyDate, sellDate);
  const isLTCG        = holdingDays > 365;
  const taxRate       = isLTCG ? 0.125 : taxSlab;
  const taxAmt        = capGain > 0 ? capGain * taxRate : 0;  // no tax on loss
  // ── Derived interest quantities ────────────────────────────────────────────
  const grossInterest   = couponIncome + sellAccrued;    // IP coupons + accrued received from buyer
  // TDS (10%) applies only to actual IP coupon payments received.
  // Accrued interest at settlement is a price-adjustment between buyer/seller — not subject to TDS.
  const tdsSale         = couponIncome * 0.10;
  const netInterest     = grossInterest - tdsSale;       // couponIncome×90% + sellAccrued (full)
  const netCapGain      = capGain - taxAmt;              // may be negative (loss)

  // ── Store for XIRR download ─────────────────────────────────────────────────
  window._lastSaleCalc = {
    buyDate, sellDate, fvTotal, pricePct: m.pricePct, sellPricePct,
    buyPrincipal, sellPrincipal, sellAccrued, sellAccDays, sellAccDenom,
    couponIncome, redemptionsReceived, saleCFs, saleDates, saleRows, sellConsideration,
    lastIPBeforeSell,
    accruedInt: m.accruedInt,
    buyAccruedDays: m.isExDiv ? daysBetween(m.nextIPDate, m.valueDate) : daysBetween(m.effectiveLastIPDate || m.lastIPDate, m.valueDate),
    buyAccruedDenom: m.isExDiv ? getDayCount(m.nextIPDate, m.valueDate, m.dcConv||'actactical').denom : getDayCount(m.effectiveLastIPDate || m.lastIPDate, m.valueDate, m.dcConv||'actactical').denom,
    secType: document.getElementById('secType')&&document.getElementById('secType').value||'',
    capGain, taxAmt, taxRate, isLTCG, realisedXIRR, holdingDays,
    grossInterest, tdsSale, netInterest, netCapGain,
    consideration: m.consideration, accruedInt: m.accruedInt, isExDiv: m.isExDiv,
    secName: m.secName, isin: m.isin, couponPct: m.couponPct, fvPerBond: m.fvPerBond, qty: m.qty
  };

  const fmt2  = v => new Intl.NumberFormat('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(v);
  const fmtRs = v => '₹' + fmt2(v);

  document.getElementById('saleXIRR').textContent      = realisedXIRR !== null ? (realisedXIRR*100).toFixed(4)+'%' : 'N/A';
  document.getElementById('saleXIRRSub').textContent   = 'Buy ' + fmtDate(buyDate) + ' → Sell ' + fmtDate(sellDate);
  document.getElementById('saleHolding').textContent   = holdingDays + ' days';
  document.getElementById('saleHoldingSub').textContent= (holdingDays/365).toFixed(4) + ' years · ' + (isLTCG ? 'LTCG' : 'STCG');
  document.getElementById('saleBuyPrincipal').textContent    = fmtRs(buyPrincipal);
  document.getElementById('saleBuyPrincipalSub').textContent = fvTotal.toLocaleString('en-IN',{maximumFractionDigits:0}) + ' FV × ' + m.pricePct.toFixed(4) + '%';
  document.getElementById('saleSellPrincipal').textContent   = fmtRs(sellPrincipal);
  document.getElementById('saleSellPrincipalSub').textContent= fvTotal.toLocaleString('en-IN',{maximumFractionDigits:0}) + ' FV × ' + sellPricePct.toFixed(4) + '%';

  // Show redemptions row only for staggered bonds
  const redemRow = document.getElementById('saleRedemRow');
  if (redemptionsReceived > 0) {
    redemRow.style.display = '';
    document.getElementById('saleRedemAmt').textContent = '+' + fmtRs(redemptionsReceived);
  } else {
    redemRow.style.display = 'none';
  }
  const cgEl = document.getElementById('saleCapGain');
  cgEl.textContent  = (capGain >= 0 ? '+' : '') + fmtRs(capGain);
  cgEl.className    = 'tax-val ' + (capGain > 0 ? 'gain' : capGain < 0 ? 'loss' : 'neutral');

  document.getElementById('saleGainType').textContent  = isLTCG ? 'LTCG (held > 12 months)' : 'STCG (held ≤ 12 months)';
  document.getElementById('saleTaxRate').textContent   = (taxRate*100).toFixed(1) + '%' + (isLTCG ? ' flat' : ' slab rate');
  document.getElementById('saleTaxAmt').textContent    = capGain > 0 ? fmtRs(taxAmt) : '— (no tax on capital loss)';

  const ncgEl = document.getElementById('saleNetCapGain');
  ncgEl.textContent = (netCapGain >= 0 ? '+' : '') + fmtRs(netCapGain);
  ncgEl.className   = 'tax-val ' + (netCapGain > 0 ? 'gain' : netCapGain < 0 ? 'loss' : 'neutral');

  document.getElementById('saleGrossInterest').textContent = fmtRs(grossInterest);
  document.getElementById('saleCouponIP').textContent      = fmtRs(couponIncome) + ` (${saleCFs.length} payment${saleCFs.length!==1?'s':''})`;
  document.getElementById('saleAccruedSell').textContent   = fmtRs(sellAccrued) + ` (${sellAccDays}/${sellAccDenom} days)`;
  document.getElementById('saleTDSAmt').textContent        = '−' + fmtRs(tdsSale);
  document.getElementById('saleNetInterest').textContent   = fmtRs(netInterest);

  document.getElementById('saleFNote').innerHTML =
    `<strong>Buy Consideration:</strong> ${fmtRs(m.consideration)} (Principal ${fmtRs(buyPrincipal)} ${m.isExDiv?'−':'+'}  Accrued ${fmtRs(m.accruedInt)})<br>` +
    `<strong>Sell Consideration:</strong> ${fmtRs(sellConsideration)} (Principal ${fmtRs(sellPrincipal)} + Accrued at sell ${fmtRs(sellAccrued)} [${sellAccDays}/${sellAccDenom} days])<br>` +
    `<strong>Gross Interest Earned:</strong> ${fmtRs(couponIncome)} coupons + ${fmtRs(sellAccrued)} accrued = ${fmtRs(grossInterest)}<br>` +
    `<strong>TDS (10% on coupons only):</strong> −${fmtRs(tdsSale)} | Net Interest: ${fmtRs(couponIncome)} × 90% + ${fmtRs(sellAccrued)} accrued = ${fmtRs(netInterest)}<br>` +
    (redemptionsReceived > 0
      ? `<strong>Capital Gain:</strong> Sell Principal ${fmtRs(sellPrincipal)} + Redemptions received ${fmtRs(redemptionsReceived)} − Buy Principal ${fmtRs(buyPrincipal)} = ${(capGain>=0?'+':'')}${fmtRs(capGain)}<br>`
      : `<strong>Capital Gain:</strong> Sell Principal ${fmtRs(sellPrincipal)} − Buy Principal ${fmtRs(buyPrincipal)} = ${(capGain>=0?'+':'')}${fmtRs(capGain)}<br>`) +
    `<strong>Net Capital Gain:</strong> ${(capGain>=0?'+':'')}${fmtRs(capGain)} − Tax ${fmtRs(taxAmt)} = ${(netCapGain>=0?'+':'')}${fmtRs(netCapGain)}`;

  // Show the sale XIRR download button
  document.getElementById('saleXIRRBtn').style.display = '';

  card.classList.add('show');
}


// ─── SALE XIRR TEMPLATE DOWNLOAD ─────────────────────────────────────────────
function downloadSaleXIRR() {
  const s = window._lastSaleCalc;
  if (!s) { alert('Please run the early sale calculation first.'); return; }

  const wb = XLSX.utils.book_new();
  const ws = {};

  // Refreshed palette (v17): warmer navy + soft amber, with borders + alt-row banding.
  // Warm "Premium Indian Finance" palette (v18)
  const CHESTNUT='7C2D12', CREAM='FEF3C7', HONEY='FCD34D', PEACH='FED7AA', IVORY='FFFBEB', AMBORDER='FDE68A', DARKTXT='78350F';
  const NAVY=CHESTNUT, AMBER=CREAM, AMBER_DARK=HONEY, LGRAY=IVORY, MGRAY=AMBORDER;
  const _b = () => ({
    top:    { style: 'thin', color: { rgb: MGRAY } },
    bottom: { style: 'thin', color: { rgb: MGRAY } },
    left:   { style: 'thin', color: { rgb: MGRAY } },
    right:  { style: 'thin', color: { rgb: MGRAY } }
  });

  const sty2 = (o) => ({
    font: { name:'Calibri', sz:o.sz||11, bold:!!o.bold,
            color:o.color?{rgb:o.color}:undefined },
    alignment: o.align ? { horizontal:o.align, vertical:'center' } : { vertical: 'center' },
    fill: o.fill?{patternType:'solid',fgColor:{rgb:o.fill}}:undefined,
    numFmt: o.fmt||undefined,
    border: o.noBorder ? undefined : _b()
  });

  // Note SheetJS rgb expects 6-char hex (no FF alpha prefix). Strip 'FF' if it accidentally appears.
  const S_HDR  = sty2({sz:11,bold:true,fill:NAVY,color:'FFFFFF'});
  const S_HDRE = sty2({fill:NAVY});
  const S_BOLD = sty2({sz:11,bold:true,fill:LGRAY});
  const S_DATE = sty2({sz:11,fmt:'dd-mmm-yyyy'});
  const S_NUM2 = sty2({sz:11,fmt:'#,##0.00',align:'right'});
  const S_DATA = sty2({sz:11});
  // Banded variants for alt-row striping
  const S_DATE_B = sty2({sz:11,fmt:'dd-mmm-yyyy',fill:LGRAY});
  const S_NUM2_B = sty2({sz:11,fmt:'#,##0.00',align:'right',fill:LGRAY});
  const S_DATA_B = sty2({sz:11,fill:LGRAY});
  const S_AMT_B  = sty2({sz:11,fmt:'#,##0.00',fill:LGRAY});
  const S_LBL  = sty2({sz:11,bold:true,fill:LGRAY});
  const S_XPCT = sty2({sz:13,bold:true,fmt:'0.00%',color:HONEY,fill:CHESTNUT});
  const S_XAMN = sty2({sz:11,bold:true,fmt:'#,##0.00',color:CREAM,fill:CHESTNUT});
  const S_YEL  = sty2({sz:11,bold:true,fill:PEACH,color:DARKTXT});
  const S_AMT  = sty2({sz:11,fmt:'#,##0.00'});

  function sc(r,col,val,style) {
    const addr = XLSX.utils.encode_cell({r:r-1,c:col-1});
    const t = (typeof val==='number')?'n':'s';
    ws[addr] = {v:val,t,s:style};
    if (style && style.numFmt) ws[addr].z = style.numFmt;
  }
  function sf(r,col,formula,style) {
    const addr = XLSX.utils.encode_cell({r:r-1,c:col-1});
    ws[addr] = {f:formula,t:'n',s:style};
    if (style && style.numFmt) ws[addr].z = style.numFmt;
  }
  function exSer2(d) {
    const dt = d instanceof Date ? d : parseLocalDate(d);
    return Math.round((dt - new Date(1899,11,30)) / 86400000);
  }

  const fvPerBond = s.fvPerBond || 1e5;
  const qty       = s.qty || 1;
  const fvTotal   = s.fvTotal;

  // Row 1 — title
  const cleanName = (s.secName||'BOND').replace(/^\d+(\.\d+)?%\s*/i,'');
  const title = (s.couponPct?s.couponPct.toFixed(2)+'% ':'')+cleanName
              + ' [Realised XIRR — Sold '+fmtDDMMYYYY(s.sellDate)+']';
  sc(1,1,title,S_HDR);
  [2,3,4,5,6,7].forEach(col=>sc(1,col,'',S_HDRE));
  sc(1,8,s.secType||'SENIOR SECURED',S_HDR);

  // Row 2 — coupon / ISIN
  sc(2,2,s.couponPct||0, sty2({sz:11,bold:true,fmt:'0.00'}));
  sc(2,8,s.isin||'',     sty2({sz:11,bold:true,align:'right'}));

  // Row 3 — column headers
  sc(3,1,'Date',         sty2({sz:11,bold:true}));
  sc(3,2,s.pricePct||100,sty2({sz:10,bold:true,fmt:'0.00'}));
  sc(3,3,s.realisedXIRR||0,sty2({sz:10,bold:true,fmt:'0.00%'}));
  sc(3,4,'Days',         sty2({sz:10,bold:true}));
  sc(3,5,'Interest',     sty2({sz:10,bold:true}));
  sc(3,6,'DOA/Last ip',  sty2({sz:10,bold:true}));
  sc(3,7,'Value Date',   sty2({sz:10,bold:true}));
  sc(3,8,fvPerBond,      sty2({sz:10,bold:true,fmt:'#,##0'}));

  // Row 4 — Buy / Investment outflow
  // E4 = accrued per 100 at buy date
  const buyAccDays  = s.buyAccruedDays  || 0;
  const buyAccDenom = s.buyAccruedDenom || 365;
  const e4val       = (s.accruedInt && fvTotal)
    ? Math.round(s.accruedInt * 100 / fvTotal * 1e8) / 1e8
    : 0;
  sc(4,1,exSer2(s.buyDate),S_DATE);
  sf(4,2,'-(B3+E4)',      S_NUM2);
  sf(4,3,'-E4',           S_NUM2);
  sc(4,4,buyAccDays,      S_DATA);
  sc(4,5,e4val,           S_NUM2);
  sc(4,6,exSer2(s.buyDate),S_DATE);
  sf(4,7,'A4',            S_DATE);
  sc(4,8,qty,             S_DATA);

  // Rows 5+ — coupon rows received between buy and sell
  const saleRows   = s.saleRows || [];
  const numCoupons = saleRows.length;
  const fdr        = 5;

  // We need to know xirrRow for I column formula — calc first
  const sellRow = fdr + numCoupons;
  const lblRow  = sellRow + 1;
  const xirrRow = sellRow + 2;
  const stpRow  = xirrRow + 1;
  const totRow  = xirrRow + 2;

  saleRows.forEach((row, i) => {
    const r      = fdr + i;
    const denom  = row.denom || 365;
    // outstanding fraction for staggered bonds
    const osFrac = (fvTotal && row.outstandingBefore)
      ? Math.round(row.outstandingBefore / fvTotal * 1e6) / 1e6 : 1;
    const eFormula = Math.abs(osFrac-1.0)<0.0001
      ? 'B2*D'+r+'/'+denom
      : 'B2*D'+r+'/'+denom+'*'+osFrac;
    const fFormula = (r===fdr) ? 'F4' : 'G'+(r-1);
    // Has principal redemption (staggered)?
    const hasPrinc = row.principal > 0;

    // Alt-row banding (i=0 unbanded, i=1 banded, i=2 unbanded, …)
    const banded = (i % 2) === 1;
    const sDate = banded ? S_DATE_B : S_DATE;
    const sNum  = banded ? S_NUM2_B : S_NUM2;
    const sData = banded ? S_DATA_B : S_DATA;
    const sAmt  = banded ? S_AMT_B  : S_AMT;

    sc(r,1,exSer2(row.date),sDate);
    sf(r,2,hasPrinc?'E'+r+'+H'+r:'E'+r, sNum);
    sf(r,3,'B'+r,           sNum);
    sf(r,4,'G'+r+'-F'+r,    sData);
    sf(r,5,eFormula,         sNum);
    sf(r,6,fFormula,         sDate);
    sf(r,7,'A'+r,            sDate);
    if (hasPrinc) {
      const pct = Math.round(row.principal/fvTotal*100*10000)/10000;
      sc(r,8,pct,sData);
    }
    // I col = Face Value × interest per 100
    sf(r,9,'H3*H4*E'+r+'/100', sAmt);
  });

  // Sell row
  // E_sell = accrued per 100 at sell = sellAccrued*100/fvTotal
  const eValSell = Math.round(s.sellAccrued * 100 / fvTotal * 1e8) / 1e8;
  const fFormSell= (sellRow===fdr) ? 'F4' : 'G'+(sellRow-1);

  sc(sellRow,1,exSer2(s.sellDate),S_DATE);
  sf(sellRow,2,'E'+sellRow+'+H'+sellRow, S_NUM2);  // accrued + sell price%
  sf(sellRow,3,'B'+sellRow,              S_NUM2);
  sc(sellRow,4,s.sellAccDays||0,         S_DATA);
  sc(sellRow,5,eValSell,                 S_NUM2);  // accrued per 100 FV
  sf(sellRow,6,fFormSell,                S_DATE);
  sf(sellRow,7,'A'+sellRow,              S_DATE);
  sc(sellRow,8,s.sellPricePct,           S_DATA);  // ← sell price % (yellow key cell)

  // Label row
  sc(lblRow,5,'Face Value',  S_LBL);
  sc(lblRow,6,'Principal',   S_LBL);
  sc(lblRow,7,'Interest',    S_LBL);
  sc(lblRow,8,'Settlement',  S_LBL);

  // XIRR row
  // Write XIRR with BOTH the formula (for transparency/verification) AND the
  // pre-computed value (so Excel/LibreOffice display the deterministic JS-computed
  // result instead of potentially diverging on iterative XIRR convergence).
  sc(xirrRow,1,'XIRR',S_BOLD);
  {
    const xirrCellAddr = XLSX.utils.encode_cell({ r: xirrRow-1, c: 1 });
    const cachedXirr = (typeof s.realisedXIRR === 'number' && isFinite(s.realisedXIRR)) ? s.realisedXIRR : null;
    ws[xirrCellAddr] = {
      f: 'XIRR(B4:B'+sellRow+',A4:A'+sellRow+',0.1)',
      v: cachedXirr,           // pre-computed value from xirrCalc — what Excel displays
      t: 'n',
      s: S_XPCT
    };
    if (S_XPCT && S_XPCT.numFmt) ws[xirrCellAddr].z = S_XPCT.numFmt;
  }
  sf(xirrRow,3,'XNPV(C3,C4:C'+sellRow+',A4:A'+sellRow+')',  sty2({sz:11,bold:true,fmt:'#,##0.00'}));
  sc(xirrRow,4,'',S_DATA);
  sf(xirrRow,5,'H3*H4',               S_XAMN);    // total Face Value
  sf(xirrRow,6,'H3*H4*H'+sellRow+'/100', S_XAMN); // Sell Principal ← yellow
  sf(xirrRow,7,'E'+sellRow+'*H3*H4/100', S_XAMN); // Accrued at sell ← yellow
  sf(xirrRow,8,'F'+xirrRow+'+G'+xirrRow, S_XAMN); // Settlement

  // Stamp duty + total
  sf(stpRow,8,'ROUND(H'+xirrRow+'*0.0001%,0)', sty2({sz:11,fmt:'#,##0.00'}));
  sc(stpRow,9,'Stamp Duty',             S_YEL);
  sf(totRow,8,'SUM(H'+xirrRow+':H'+stpRow+')', sty2({sz:11,fmt:'#,##0.00'}));
  sc(totRow,9,'Total settlement value', S_YEL);

  ws['!ref']  = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:totRow-1,c:8}});
  ws['!cols'] = [
    {wch:54.28},{wch:9.43},{wch:11.14},{wch:11.14},
    {wch:19.0},{wch:12.29},{wch:12.57},{wch:18.71},{wch:20.71}
  ];
  ws['!rows'] = Array.from({length:totRow},()=>({hpt:15.75}));

  XLSX.utils.book_append_sheet(wb, ws, 'Sold before maturity');

  const fname = (s.secName||'Bond').replace(/[^a-zA-Z0-9 %\.]/g,'').trim().substring(0,40)||'Bond';
  XLSX.writeFile(wb, fname+'_Realised_XIRR.xlsx');
}


// ─── CUSTOM IP DATE MAP ───────────────────────────────────────────────────────
const customIPDateMap = {}; // key = isoStr(originalDate), value = isoStr(newDate)

function openIPDatePopover(origIso, spanEl) {
  // Close any open popover first
  document.querySelectorAll('.ip-date-popover.open').forEach(p => p.classList.remove('open'));
  const pop = spanEl.parentElement.querySelector('.ip-date-popover');
  if (!pop) return;
  pop.classList.add('open');
  const inp = pop.querySelector('input[type=date]');
  inp.value = customIPDateMap[origIso] || origIso;
  // Close when clicking outside
  setTimeout(() => {
    const handler = (e) => {
      if (!pop.contains(e.target) && e.target !== spanEl) {
        pop.classList.remove('open');
        document.removeEventListener('click', handler, true);
      }
    };
    document.addEventListener('click', handler, true);
  }, 0);
}

function applyIPDateOverride(origIso, popoverEl) {
  const inp = popoverEl.querySelector('input[type=date]');
  const newVal = inp.value;
  if (!newVal) return;
  if (newVal === origIso) {
    delete customIPDateMap[origIso];
  } else {
    customIPDateMap[origIso] = newVal;
  }
  popoverEl.classList.remove('open');
  // Recalculate to apply the override
  calculate();
}

function resetIPDateOverride(origIso, popoverEl) {
  delete customIPDateMap[origIso];
  popoverEl.classList.remove('open');
  calculate();
}
// ─── EXCEL DOWNLOAD ───────────────────────────────────────────────────────────
function fmtDDMMYYYY(d) {
  const dt = d instanceof Date ? d : parseLocalDate(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function downloadExcel() {
  if (!window._lastCalcRows || !window._lastCalcMeta) {
    alert('Please calculate first before downloading.');
    return;
  }

  const { valueDate, consideration, isExDiv, accruedInt, secName, isStaggered } = window._lastCalcMeta;
  const rows = window._lastCalcRows;

  // ── Build the two-sheet workbook ──────────────────────────────────────────

  // ── Sheet 1: Simple cashflow (matches reference format) ──────────────────
  // Row 1: Bond name (bold)
  // Row 2: "Date" | "Amount Receivable" (bold, centered)
  // Row 3+: DD-MM-YYYY | cashflow amount (numeric, #,##0.00)
  // Investment outflow on row 3, then all inflows

  const bondTitle = secName || 'Bond';

  // ── Sheet 1: Always 3 columns — Date | Interest Amount | Principal Redemption
  // Matches reference image: coupon rows have blank C; redemption rows fill C.
  // Investment row: Date | -(Accrued Interest) | -(Principal paid)
  // For G-Sec / Tax-Free / ZCB / NIL slab: no TDS — drop the "Post-TDS Interest" column.
  const _showTDSCol = _currentBondHasTDS();
  const headerRow = _showTDSCol
    ? ['Date', 'Interest Amount', 'Principal Redemption', 'Post-TDS Interest (90%)']
    : ['Date', 'Interest Amount', 'Principal Redemption'];
  const titleRow = _showTDSCol ? [bondTitle, null, null, null] : [bondTitle, null, null];
  const investRow = _showTDSCol
    ? [fmtDDMMYYYY(valueDate),
       isExDiv ? Math.abs(accruedInt) : -Math.abs(accruedInt),
       -Math.abs(window._lastCalcMeta.principal),
       null]
    : [fmtDDMMYYYY(valueDate),
       isExDiv ? Math.abs(accruedInt) : -Math.abs(accruedInt),
       -Math.abs(window._lastCalcMeta.principal)];
  const simpleData = [titleRow, headerRow, investRow];

  rows.forEach(r => {
    if (r.buyerMisses && !r.isMat) return;          // skip missed coupons entirely
    const interest = r.buyerMisses ? null : (r.interest || null);
    const princCF  = r.principal > 0 ? r.principal : null;  // blank when no redemption
    if (!interest && !princCF) return;               // nothing to show
    if (_showTDSCol) {
      const postTDSInt = interest != null ? Math.round(interest * 0.9 * 100) / 100 : null;
      simpleData.push([fmtDDMMYYYY(r.date), interest, princCF, postTDSInt]);
    } else {
      simpleData.push([fmtDDMMYYYY(r.date), interest, princCF]);
    }
  });

  const wsSimple = XLSX.utils.aoa_to_sheet(simpleData);

  // Row 1: bond name — bold
  if (wsSimple['A1']) wsSimple['A1'].s = { font: { bold: true, name: 'Calibri', sz: 11 } };

  // Row 2: headers — bold, left-aligned (matching image)
  ['A2','B2','C2'].forEach(addr => {
    if (wsSimple[addr]) wsSimple[addr].s = { font: { bold: true, name: 'Calibri', sz: 11 } };
  });

  // Data rows: date col plain text, numeric cols B & C with Indian comma format
  const simpleRange = XLSX.utils.decode_range(wsSimple['!ref']);
  for (let R = 2; R <= simpleRange.e.r; R++) {
    const addrA = XLSX.utils.encode_cell({ r: R, c: 0 });
    if (wsSimple[addrA]) wsSimple[addrA].s = { font: { name: 'Calibri', sz: 11 } };
    [1, 2].forEach(C => {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (wsSimple[addr] && typeof wsSimple[addr].v === 'number') {
        wsSimple[addr].s = { font: { name: 'Calibri', sz: 11 } };
        wsSimple[addr].z = '#,##0.00';
      }
    });
  }

  // Column widths matching reference image
  wsSimple['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 26 }];

  // ── Sheet 2: Detailed cashflow schedule ──────────────────────────────────
  // Hide Post-TDS column for non-TDS bonds (G-Sec / Tax-Free / ZCB / NIL slab)
  const detailHeaders = _showTDSCol
    ? ['#', 'Date', 'Type', 'Days', 'Denom', 'O/S Principal (₹)', 'Interest (₹)', 'Principal CF (₹)', 'Cash Flow (₹)', 'Post-TDS CF (₹)', 'Record Date', 'Status']
    : ['#', 'Date', 'Type', 'Days', 'Denom', 'O/S Principal (₹)', 'Interest (₹)', 'Principal CF (₹)', 'Cash Flow (₹)', 'Record Date', 'Status'];
  const detailData = [detailHeaders];

  // Investment row
  // Principal CF = the principal component buyer pays (negative outflow)
  // O/S Principal = outstanding principal at value date
  const _invPrincipal = window._lastCalcMeta ? window._lastCalcMeta.principal : consideration;
  const _invRow = [
    0, fmtDDMMYYYY(valueDate),
    isExDiv ? 'Investment (Ex-Div)' : 'Investment', '—', '—',
    (window._lastCalcMeta.outstandingAtValueDate || null),
    isExDiv ? Math.abs(accruedInt) : -Math.abs(accruedInt),
    -Math.abs(_invPrincipal),
    -Math.abs(consideration)
  ];
  if (_showTDSCol) _invRow.push('—');
  _invRow.push('—', isExDiv ? 'EX-DIV — accrued credited to buyer' : 'CUM-DIV');
  detailData.push(_invRow);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  rows.forEach((r, i) => {
    const cfDate = new Date(r.date); cfDate.setHours(0, 0, 0, 0);
    const isPast = cfDate <= today;
    let status;
    if (r.buyerMisses) status = 'Missed (Ex-Div)';
    else if (r.isFirstLong) status = 'Long First Coupon';
    else if (r.isMat) status = isPast ? 'Maturity (Received)' : 'Maturity (Upcoming)';
    else if (r.isRedemptionDate) status = isPast ? 'Redemption (Paid)' : 'Redemption (Pending)';
    else status = isPast ? 'Received' : 'Yet to Receive';

    const baseRow = [
      i + 1,
      fmtDDMMYYYY(r.date),
      r.type,
      r.days,
      r.denom,
      r.outstandingBefore !== undefined ? r.outstandingBefore : '—',
      r.buyerMisses ? 0 : r.interest,
      r.principal > 0 ? r.principal : 0,
      r.buyerMisses && !r.isMat ? 0 : (r.buyerMisses ? r.principal : r.cashflow)
    ];
    if (_showTDSCol) {
      baseRow.push(r.buyerMisses && !r.isMat ? 0 : (r.buyerMisses ? r.principal : (r.principal + r.interest * 0.9)));
    }
    baseRow.push(
      r.rd ? fmtDDMMYYYY(r.rd) : '—',
      status
    );
    detailData.push(baseRow);
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);

  // Bold header row for detail sheet
  const detailRange = XLSX.utils.decode_range(wsDetail['!ref']);
  for (let C = detailRange.s.c; C <= detailRange.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (wsDetail[addr]) wsDetail[addr].s = {
      font: { bold: true, name: 'Calibri', sz: 11 },
      alignment: { horizontal: 'center' }
    };
  }
  // Number format for numeric columns in detail sheet (cols 6,7,8,9 = Interest, PrinCF, CF, O/S)
  for (let R = 1; R <= detailRange.e.r; R++) {
    [5, 6, 7, 8, 9].forEach(C => {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (wsDetail[addr] && typeof wsDetail[addr].v === 'number') {
        wsDetail[addr].z = '#,##0.00';
        if (!wsDetail[addr].s) wsDetail[addr].s = {};
        wsDetail[addr].s.numFmt = '#,##0.00';
      }
    });
  }

  wsDetail['!cols'] = [
    {wch:4},{wch:14},{wch:22},{wch:7},{wch:7},
    {wch:18},{wch:16},{wch:16},{wch:16},{wch:18},{wch:14},{wch:22}
  ];

  // ── Assemble workbook ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSimple, 'Cash Flow');
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detailed Schedule');

  // ── Sheet 3: Call Scenario (only when callable) ───────────────────────────
  const _m = window._lastCalcMeta;
  if (_m.isCallable && _m.callDate) {
    const callDateObj = _m.callDate instanceof Date ? _m.callDate : parseLocalDate(_m.callDate);

    // Build call-truncated rows (same logic as XIRR template)
    const callDetailData = [['#','Date','Type','Days','Denom','O/S Principal (₹)','Interest (₹)','Principal CF (₹)','Cash Flow (₹)','Status']];

    // Investment row
    callDetailData.push([
      0, fmtDDMMYYYY(_m.valueDate), 'Investment', '—', '—', '—',
      -Math.abs(_m.accruedInt), '—', -Math.abs(_m.consideration), 'Investment'
    ]);

    let remainOS = _m.outstandingAtValueDate;
    let prevRowDate = _m.valueDate;
    let callRowAdded = false;
    const allRows = window._lastCalcRows;

    for (let ri = 0; ri < allRows.length; ri++) {
      const row = allRows[ri];

      if (row.date < callDateObj) {
        // Normal coupon before call date
        callDetailData.push([
          ri + 1,
          fmtDDMMYYYY(row.date),
          row.type,
          row.days,
          row.denom,
          row.outstandingAfter !== undefined ? row.outstandingAfter : '—',
          row.buyerMisses ? 0 : row.interest,
          row.principal > 0 ? row.principal : 0,
          row.buyerMisses && !row.isMat ? 0 : (row.buyerMisses ? row.principal : row.cashflow),
          'Regular Coupon'
        ]);
        remainOS -= row.principal;
        prevRowDate = row.date;
        callRowAdded = false;

      } else if (!callRowAdded) {
        // Call date row: interest for partial/full period + all remaining principal
        const isExactMatch = (isoStr(row.date) === isoStr(callDateObj));
        let callInterest, callDays, callDenom;

        if (isExactMatch) {
          callInterest = row.interest;
          callDays     = row.days;
          callDenom    = row.denom;
        } else {
          // Partial period: prevRowDate → callDate
          const dcResult = getDayCount(prevRowDate, callDateObj, _m.dcConv || 'actactical');
          callDays     = dcResult.days;
          callDenom    = dcResult.denom;
          callInterest = remainOS * (_m.couponPct / 100) * callDays / callDenom;
        }

        const callPrincipal = isExactMatch ? row.principal + (remainOS - row.principal) : remainOS;
        const callCF = callInterest + (isExactMatch ? callPrincipal : remainOS);

        callDetailData.push([
          ri + 1,
          fmtDDMMYYYY(callDateObj),
          'CALL DATE',
          callDays,
          callDenom,
          0,
          callInterest,
          isExactMatch ? callPrincipal : remainOS,
          callCF,
          '★ Called — Full Principal Returned'
        ]);
        callRowAdded = true;
        break;
      }
    }

    // Summary row
    const callCFs    = callDetailData.slice(2);
    const totalInt   = callCFs.reduce((s,r) => s + (typeof r[6]==='number' && r[6]>0 ? r[6] : 0), 0);
    const totalPrinc = callCFs.reduce((s,r) => s + (typeof r[7]==='number' ? r[7] : 0), 0);
    const totalCF    = callCFs.reduce((s,r) => s + (typeof r[8]==='number' ? r[8] : 0), 0);
    callDetailData.push(['','','TOTAL','','','', totalInt, totalPrinc, totalCF,'']);

    const wsCall = XLSX.utils.aoa_to_sheet(callDetailData);

    // Style headers bold
    const callRange = XLSX.utils.decode_range(wsCall['!ref']);
    for (let C = 0; C <= callRange.e.c; C++) {
      const addr = XLSX.utils.encode_cell({r:0, c:C});
      if (wsCall[addr]) wsCall[addr].s = { font:{bold:true,name:'Calibri',sz:11}, alignment:{horizontal:'center'} };
    }

    // Number format for numeric cols (6,7,8 = Interest, Principal, CF)
    for (let R = 1; R <= callRange.e.r; R++) {
      [5,6,7,8].forEach(C => {
        const addr = XLSX.utils.encode_cell({r:R, c:C});
        if (wsCall[addr] && typeof wsCall[addr].v === 'number') {
          wsCall[addr].z = '#,##0.00';
          if (!wsCall[addr].s) wsCall[addr].s = {};
        }
      });
      // Bold the Call Date row
      const statusAddr = XLSX.utils.encode_cell({r:R, c:9});
      if (wsCall[statusAddr] && typeof wsCall[statusAddr].v === 'string' && wsCall[statusAddr].v.includes('Called')) {
        for (let C = 0; C <= callRange.e.c; C++) {
          const a = XLSX.utils.encode_cell({r:R, c:C});
          if (wsCall[a]) { if (!wsCall[a].s) wsCall[a].s = {}; wsCall[a].s.font = {bold:true,name:'Calibri',sz:11}; }
        }
      }
      // Bold the Total row
      const typeAddr = XLSX.utils.encode_cell({r:R, c:2});
      if (wsCall[typeAddr] && wsCall[typeAddr].v === 'TOTAL') {
        for (let C = 0; C <= callRange.e.c; C++) {
          const a = XLSX.utils.encode_cell({r:R, c:C});
          if (wsCall[a]) { if (!wsCall[a].s) wsCall[a].s = {}; wsCall[a].s.font = {bold:true,name:'Calibri',sz:11}; }
        }
      }
    }

    wsCall['!cols'] = [{wch:4},{wch:14},{wch:22},{wch:7},{wch:7},{wch:18},{wch:16},{wch:16},{wch:16},{wch:26}];
    XLSX.utils.book_append_sheet(wb, wsCall, 'To Call');
  }

  // ── Sheet: To Put (cash flow) ────────────────────────────────────────────
  if (_m.isPutable && _m.putDate) {
    const putDateObj2 = _m.putDate instanceof Date ? _m.putDate : parseLocalDate(_m.putDate);
    const putDetailData = [['#','Date','Type','Days','Denom','O/S Principal (₹)','Interest (₹)','Principal CF (₹)','Cash Flow (₹)','Status']];
    putDetailData.push([0, fmtDDMMYYYY(_m.valueDate), 'Investment', '—', '—', '—',
      -Math.abs(_m.accruedInt), '—', -Math.abs(_m.consideration), 'Investment']);

    let remainOSP = _m.outstandingAtValueDate;
    let prevRowDateP = _m.valueDate;
    let putRowAdded = false;
    for (let ri = 0; ri < allRows.length; ri++) {
      const row = allRows[ri];
      if (row.date < putDateObj2) {
        putDetailData.push([ri+1, fmtDDMMYYYY(row.date), row.type, row.days, row.denom,
          row.outstandingAfter !== undefined ? row.outstandingAfter : '—',
          row.buyerMisses ? 0 : row.interest,
          row.principal > 0 ? row.principal : 0,
          row.buyerMisses && !row.isMat ? 0 : (row.buyerMisses ? row.principal : row.cashflow),
          'Regular Coupon']);
        remainOSP -= row.principal;
        prevRowDateP = row.date;
        putRowAdded = false;
      } else if (!putRowAdded) {
        const isExact = isoStr(row.date) === isoStr(putDateObj2);
        let putInt, putDays, putDenom;
        if (isExact) {
          putInt = row.interest; putDays = row.days; putDenom = row.denom;
        } else {
          const dcR = getDayCount(prevRowDateP, putDateObj2, _m.dcConv || 'actactical');
          putDays = dcR.days; putDenom = dcR.denom;
          putInt = remainOSP * (_m.couponPct / 100) * putDays / putDenom;
        }
        const putPrinc = isExact ? row.principal + (remainOSP - row.principal) : remainOSP;
        putDetailData.push([ri+1, fmtDDMMYYYY(putDateObj2), 'PUT DATE', putDays, putDenom, 0,
          putInt, putPrinc, putInt + putPrinc, '🔒 Put Exercised — Full Principal Returned']);
        putRowAdded = true; break;
      }
    }
    const putCFs2 = putDetailData.slice(2);
    const totIP = putCFs2.reduce((s,r)=>s+(typeof r[6]==='number'&&r[6]>0?r[6]:0),0);
    const totPP = putCFs2.reduce((s,r)=>s+(typeof r[7]==='number'?r[7]:0),0);
    const totCP = putCFs2.reduce((s,r)=>s+(typeof r[8]==='number'?r[8]:0),0);
    putDetailData.push(['','','TOTAL','','','',totIP,totPP,totCP,'']);

    const wsPut = XLSX.utils.aoa_to_sheet(putDetailData);
    const putRange = XLSX.utils.decode_range(wsPut['!ref']);
    for (let C=0;C<=putRange.e.c;C++) {
      const addr=XLSX.utils.encode_cell({r:0,c:C});
      if(wsPut[addr]) wsPut[addr].s={font:{bold:true,name:'Calibri',sz:11},alignment:{horizontal:'center'}};
    }
    for (let R=1;R<=putRange.e.r;R++) {
      [5,6,7,8].forEach(C=>{
        const addr=XLSX.utils.encode_cell({r:R,c:C});
        if(wsPut[addr]&&typeof wsPut[addr].v==='number'){wsPut[addr].z='#,##0.00';if(!wsPut[addr].s)wsPut[addr].s={};}
      });
      const stAddr=XLSX.utils.encode_cell({r:R,c:9});
      if(wsPut[stAddr]&&typeof wsPut[stAddr].v==='string'&&(wsPut[stAddr].v.includes('Put')||wsPut[stAddr].v==='TOTAL')){
        for(let C=0;C<=putRange.e.c;C++){const a=XLSX.utils.encode_cell({r:R,c:C});if(wsPut[a]){if(!wsPut[a].s)wsPut[a].s={};wsPut[a].s.font={bold:true,name:'Calibri',sz:11};}}
      }
    }
    wsPut['!cols']=[{wch:4},{wch:14},{wch:22},{wch:7},{wch:7},{wch:18},{wch:16},{wch:16},{wch:16},{wch:28}];
    XLSX.utils.book_append_sheet(wb, wsPut, 'To Put');
  }

  const safeName = (secName || 'Bond').replace(/[^a-zA-Z0-9 %]/g, '').trim().substring(0, 30) || 'Bond';
  const cfOptSuffix = [_m.isCallable&&_m.callDate?'Callable':'', _m.isPutable&&_m.putDate?'Putable':''].filter(Boolean).join('_');
  XLSX.writeFile(wb, `${safeName}${cfOptSuffix?'_'+cfOptSuffix:''}_CashFlow.xlsx`);
}

// ─── XIRR TEMPLATE DOWNLOAD ───────────────────────────────────────────────────
function downloadXIRR() {
  if (!window._lastCalcRows || !window._lastCalcMeta) {
    alert('Please calculate first before downloading.');
    return;
  }

  const m    = window._lastCalcMeta;
  const rows = window._lastCalcRows;

  // Outstanding fraction for per-row interest formulas (future rows)
  // = outstandingAtValueDate / fvTotal (e.g. 0.775 = 77.5% for ex-div case)
  const _outFracRaw = (m.outstandingAtValueDate != null && m.fvTotal)
    ? m.outstandingAtValueDate / m.fvTotal : 1;
  const _outFrac    = Math.round(_outFracRaw * 10000) / 10000;
  const _outFracStr = _outFrac === 1 ? '' : '*' + _outFrac;

  // Outstanding fraction for Row 4 accrued interest (E4)
  // KEY: must use outstandingForAccrued (pre-ex-div-redemption base) NOT outstandingAtValueDate
  // E.g. ex-div with 2.5% in record: accrued on 80%, not 77.5%
  const _accrFracRaw = (m.outstandingForAccrued != null && m.fvTotal)
    ? m.outstandingForAccrued / m.fvTotal : _outFracRaw;
  const _accrFrac    = Math.round(_accrFracRaw * 10000) / 10000;
  const _accrFracStr = _accrFrac === 1 ? '' : '*' + _accrFrac;

  // E17 XIRR summary outstanding = os_at_vd - first_buyer_redemption
  // For ex-div staggered/custom: buyer's first IP is AFTER nextIPDate
  // E.g. 77.5% - 2.5% (first buyer redemption) = 75%
  // For non-ex-div: = outstandingAtValueDate (unchanged)
  let _outFracBuyer = _outFrac;
  if (m.isExDiv && m.nextIPDate && (m.isStaggered || m.isCustomRedem)) {
    // Find the first buyer IP (first IP strictly after nextIPDate)
    const _allRows = window._lastCalcRows || [];
    const _firstBuyerRow = _allRows.find(r => !r.buyerMisses && r.principal > 0 && r.date > m.nextIPDate);
    if (_firstBuyerRow) {
      const _firstBuyerRedemFrac = _firstBuyerRow.principal / m.fvTotal;
      _outFracBuyer = Math.round((_outFracRaw - _firstBuyerRedemFrac) * 10000) / 10000;
    }
  }

  // ── Excel date serial helper ───────────────────────────────────────────
  function exSer(d) {
    const dt   = (d instanceof Date) ? d : parseLocalDate(d);
    const base = new Date(Date.UTC(1899, 11, 30));
    return Math.round((Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) - base) / 86400000);
  }

  // ── Style factory (SheetJS style object) ──────────────────────────────
  // Warm "Premium Indian Finance" palette (v18): deep chestnut header + golden honey
  // accent + cream/peach fills. Layout/structure unchanged — only colors & borders.
  const CHESTNUT = '7C2D12';   // deep burnt sienna (primary header fill)
  const CREAM    = 'FEF3C7';   // warm cream (header text + soft callouts)
  const HONEY    = 'FCD34D';   // golden honey accent (the XIRR % itself)
  const PEACH    = 'FED7AA';   // soft warm fill for sub-headers / labels
  const IVORY    = 'FFFBEB';   // barely-there warm banding for alt rows
  const AMBORDER = 'FDE68A';   // light amber border tone
  const DARKTXT  = '78350F';   // deep cocoa-brown text

  // Backward-compat aliases — rest of function code below still references DARK/YEL/LGRAY/MGRAY
  const DARK = CHESTNUT;
  const YEL  = CREAM;
  const LGRAY = IVORY;
  const MGRAY = AMBORDER;
  const NAVY = CHESTNUT;
  const AMBER = CREAM;
  const AMBER_DARK = HONEY;

  function _bord() {
    return {
      top:    { style: 'thin', color: { rgb: MGRAY } },
      bottom: { style: 'thin', color: { rgb: MGRAY } },
      left:   { style: 'thin', color: { rgb: MGRAY } },
      right:  { style: 'thin', color: { rgb: MGRAY } }
    };
  }

  function sty(opts) {
    const s = { font: { name: opts.font || 'Calibri', sz: opts.sz || 12, bold: !!opts.bold } };
    if (opts.color)  s.font.color = { rgb: opts.color };
    if (opts.fill)   s.fill = { patternType: 'solid', fgColor: { rgb: opts.fill } };
    if (opts.fmt)    s.numFmt = opts.fmt;
    if (opts.halign) s.alignment = { horizontal: opts.halign, vertical: 'center' };
    else             s.alignment = { vertical: 'center' };
    if (opts.border) s.border = _bord();
    return s;
  }

  // Styles — refreshed
  // Row 1 header (bond name + meta) — navy with light amber accent on bond name cell
  const S_HDR   = sty({ bold:true, sz:12, color:CREAM, fill:CHESTNUT, fmt:'General' });   // Row1 A/E/H — bond name etc
  const S_HDR_E = sty({ bold:false,sz:12, color:CREAM, fill:CHESTNUT, fmt:'General' });   // Row1 B/C/D/F/G empty separators
  const S_R2_B  = sty({ sz:12, border:true });                                            // B2 coupon
  const S_R2_H  = sty({ sz:12, color:'475569', fmt:'General', halign:'right', border:true }); // H2 ISIN
  const S_R3_A  = sty({ bold:true, sz:12, fill:LGRAY, border:true });                     // A3 'Date'
  const S_R3_BD = sty({ bold:true, sz:12, color:CREAM, fill:CHESTNUT, fmt:'General', border:true });  // B3 price on dark
  const S_R3_CD = sty({ bold:true, sz:12, color:CREAM, fill:CHESTNUT, fmt:'0.00%', border:true });    // C3 XNPV rate on dark
  const S_R3_L  = sty({ bold:true, sz:12, fill:LGRAY, border:true });                     // D3-G3 labels
  const S_R3_H  = sty({ sz:12, color:'475569', border:true });                            // H3 fv per bond
  const S_DATA  = sty({ sz:12, border:true });                                            // General data
  const S_DATE  = sty({ sz:12, fmt:'dd-mm-yyyy', border:true });                          // Date cells
  const S_NUM   = sty({ sz:12, fmt:'0.00', border:true });                                // 0.00 number
  const S_AMT   = sty({ sz:12, fmt:'#,##0.00', border:true });                            // cash flow / rupee amounts
  const S_PCT   = sty({ sz:12, fmt:'0.00%', border:true });                               // percent
  // Banded variants (light gray fill) — applied to alternating data rows for scannability
  const S_DATA_B = sty({ sz:12, fill:LGRAY, border:true });
  const S_DATE_B = sty({ sz:12, fmt:'dd-mm-yyyy', fill:LGRAY, border:true });
  const S_NUM_B  = sty({ sz:12, fmt:'0.00', fill:LGRAY, border:true });
  const S_AMT_B  = sty({ sz:12, fmt:'#,##0.00', fill:LGRAY, border:true });
  const S_LBL32 = sty({ bold:true, sz:12, fill:LGRAY, border:true });                     // Row 32 labels (E-H)
  // Summary XIRR row — navy on white text, amber-dark accent for the % itself
  const S_XA    = sty({ bold:true, sz:12, color:CREAM, fill:CHESTNUT, border:true });       // A33 'XIRR'
  const S_XW    = sty({ sz:12, color:CREAM, fill:CHESTNUT, border:true });                  // White on dark (XIRR row)
  const S_XPct  = sty({ bold:true, sz:13, color:HONEY, fill:CHESTNUT, fmt:'0.00%', border:true }); // XIRR % — amber accent
  const S_XNum  = sty({ sz:12, color:CREAM, fill:CHESTNUT, fmt:'0.00', border:true });
  const S_XAmt  = sty({ sz:12, color:CREAM, fill:CHESTNUT, fmt:'#,##0.00', border:true });
  const S_XD    = sty({ sz:12, fill:NAVY, border:true });
  const S_SML   = sty({ sz:11 });
  const S_YEL   = sty({ sz:11, bold:true, color:DARKTXT, fill:PEACH, border:true });      // peach callout

  // ── Build worksheet ───────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const ws = {};

  function sc(row, col, val, style) {
    const addr = XLSX.utils.encode_cell({ r: row-1, c: col-1 });
    const t = (val instanceof Date || typeof val === 'number') ? 'n' : 's';
    ws[addr] = { v: val, t, s: style };
    if (style && style.numFmt) ws[addr].z = style.numFmt;
  }
  function sf(row, col, formula, style) {
    const addr = XLSX.utils.encode_cell({ r: row-1, c: col-1 });
    ws[addr] = { f: formula, t: 'n', s: style };
    if (style && style.numFmt) ws[addr].z = style.numFmt;
  }

  // ── Row layout (matches reference exactly) ────────────────────────────
  // Row 1: sec name, rating, bond type (with dark fill across A-H)
  // Row 2: B=coupon%, H=ISIN
  // Row 3: A=Date, B=price%(dark), C=xnpv_rate%(dark), D=Days, E=Interest, F=DOA/Last ip, G=Value Date, H=fv_per_bond
  // Row 4: A=valueDate (hardcoded), B=-(B3+E4), C=-E4, D=G4-F4, E=B2*D4/365, F=lastIP, G=A4, H=qty
  // Rows 5..N: IP cash flows
  // Row N+1: labels: E=Face Value, F=Principal, G=Interest, H=Settlement
  // Row N+2: XIRR: A=XIRR, B=XIRR(), C=XNPV(), E=OutstandingFV, F=H3*H4*B3/100, G=E*B2/100*D4/365, H=F+G
  // Row N+3: H=stamp, I=Stamp Duty(yellow)
  // Row N+4: H=total, I=Total settlement value(yellow)

  const firstDataRow = 5;               // IP rows start at row 5
  // lastDataRow/labelRow/xirrRow/stampRow/totalRow computed after filtering 0-interest rows below

  // ── ROW 1 ─────────────────────────────────────────────────────────────
  const cleanName = (m.secName || 'BOND').replace(/^\d+(\.\d+)?%\s*/i, '');
  const hdrTitle = (m.couponPct ? m.couponPct.toFixed(2) + '% ' : '') + cleanName;
  sc(1, 1, hdrTitle,            S_HDR);
  sc(1, 2, '',                  S_HDR_E);
  sc(1, 3, '',                  S_HDR_E);
  sc(1, 4, '',                  S_HDR_E);
  sc(1, 5, m.bondRating || '',  S_HDR);
  sc(1, 6, '',                  S_HDR_E);
  sc(1, 7, '',                  S_HDR_E);
  sc(1, 8, m.bondType || 'SENIOR SECURED', S_HDR);

  // ── ROW 2 ─────────────────────────────────────────────────────────────
  sc(2, 2, m.couponPct || 0,                S_R2_B);
  sc(2, 8, m.isin || '',                    S_R2_H);

  // ── ROW 3 ─────────────────────────────────────────────────────────────
  sc(3, 1, 'Date',              S_R3_A);
  sc(3, 2, m.pricePct || 100,   S_R3_BD);    // price % of face
  sc(3, 3, (m.xirrRate || 0),   S_R3_CD);    // XNPV rate = XIRR result
  sc(3, 4, 'Days',              S_R3_L);
  sc(3, 5, 'Interest',          S_R3_L);
  sc(3, 6, 'DOA/Last ip',       S_R3_L);
  sc(3, 7, 'Value Date',        S_R3_L);
  sc(3, 8, m.fvPerBond || 1e5,  S_R3_H);

  // ── ROW 4 (value date row) ─────────────────────────────────────────────
  sc(4, 1, exSer(m.valueDate),   S_DATE);   // A4 — hardcoded value date
  sf(4, 2, '-(B3+E4)',          S_NUM);    // B4 = -(price + accrued)
  sf(4, 3, '-E4',               S_NUM);    // C4 = -accrued
  sf(4, 4, 'G4-F4',             S_DATA);   // D4 = days from last IP to value date
  sf(4, 5, 'B2*D4/365' + _accrFracStr, S_NUM);  // E4 = accrued on PRE-ex-div outstanding (80%, not 77.5%)
  sc(4, 6, exSer(m.isExDiv ? m.nextIPDate : (m.effectiveLastIPDate || m.lastIPDate)), S_DATE);   // F4 = nextIPDate (ex-div) or last paid IP
  sf(4, 7, 'A4',                S_DATE);   // G4 = same as value date
  sc(4, 8, m.qty || 1,          S_DATA);   // H4 = qty

  // ── ROWS 5..lastDataRow: IP cash flow rows ────────────────────────────
  // Skip rows where interest=0 AND principal=0 (e.g. long-first-coupon zero row)
  // Exclude zero-rows AND ex-div missed rows (buyer doesn't receive these)
  const filteredRows = rows.filter(row => !(row.interest === 0 && row.principal === 0) && !row.buyerMisses);
  const lastDataRow  = firstDataRow - 1 + filteredRows.length;
  const labelRow     = lastDataRow + 1;
  const xirrRow      = lastDataRow + 2;
  const stampRow     = xirrRow + 1;
  const totalRow     = xirrRow + 2;

  filteredRows.forEach((row, i) => {
    const r    = firstDataRow + i;
    const prev = r - 1;
    const denom = row.denom || 365;

    // Outstanding fraction for staggered interest formula
    // outstandingBefore is the rupee amount; divide by fvTotal = fvPerBond * qty
    const fvTotal = (m.fvPerBond || 1e5) * (m.qty || 1);
    const fracRaw = row.outstandingBefore / fvTotal;
    // Round to clean fractions (1.0, 0.75, 0.5, 0.25, etc.)
    const frac = Math.round(fracRaw * 1000) / 1000;

    // E formula: interest on outstanding principal
    let eFormula;
    if (Math.abs(frac - 1.0) < 0.001) {
      eFormula = `B2*D${r}/${denom}`;
    } else {
      eFormula = `B2*D${r}/${denom}*${frac}`;
    }

    // B formula: interest only OR interest + principal
    const hasPrinc = row.principal > 0;
    const bFormula = hasPrinc ? `E${r}+H${r}` : `E${r}`;

    // H value: principal as % of 100 (per-100 basis)
    // row.principal is total ₹ for all bonds; divide by (fvPerBond * qty) to get fraction, × 100
    const hPct = hasPrinc
      ? Math.round(row.principal / ((m.fvPerBond || 1e5) * (m.qty || 1)) * 100 * 10000) / 10000
      : null;

    // F formula: chain G from previous row (row 5 chains F4)
    const fFormula = (r === firstDataRow) ? 'F4' : `G${prev}`;

    // Alt-row banding: every odd-indexed row gets the light gray fill
    const isBanded = ((r - firstDataRow) % 2) === 1;
    const sDate = isBanded ? S_DATE_B : S_DATE;
    const sNum  = isBanded ? S_NUM_B  : S_NUM;
    const sData = isBanded ? S_DATA_B : S_DATA;
    const sAmt  = isBanded ? S_AMT_B  : S_AMT;

    sc(r, 1, exSer(row.date),   sDate);
    sf(r, 2, bFormula,           sNum);
    sf(r, 3, `B${r}`,            sNum);
    sf(r, 4, `G${r}-F${r}`,      sData);
    sf(r, 5, eFormula,           sNum);
    sf(r, 6, fFormula,           sDate);
    sf(r, 7, `A${r}`,            sDate);
    if (hPct !== null) sc(r, 8, hPct, sData);
    sf(r, 9, `H3*H4*E${r}/100`, sAmt);  // per-bond rupee interest (H3*H4=orig FV; E{r} has outFrac baked in)
  });

  // ── LABEL ROW ─────────────────────────────────────────────────────────
  sc(labelRow, 5, 'Face Value',   S_LBL32);
  sc(labelRow, 6, 'Principal',    S_LBL32);
  sc(labelRow, 7, 'Interest',     S_LBL32);
  sc(labelRow, 8, 'Settlement',   S_LBL32);

  // ── XIRR ROW ─────────────────────────────────────────────────────────
  sc(xirrRow, 1, 'XIRR',                                              S_XA);
  // Write XIRR with BOTH the formula AND the JS-computed value as the cached result.
  // This guarantees Excel/LibreOffice display the deterministic value (matching the
  // calculator UI) instead of relying on the spreadsheet's own iterative XIRR solver.
  {
    const xirrCellAddr = XLSX.utils.encode_cell({ r: xirrRow-1, c: 1 });
    const cachedXirr = (typeof m.xirrRate === 'number' && isFinite(m.xirrRate)) ? m.xirrRate : null;
    ws[xirrCellAddr] = {
      f: `XIRR(B4:B${lastDataRow},A4:A${lastDataRow},0.1)`,
      v: cachedXirr,
      t: 'n',
      s: S_XPct
    };
    if (S_XPct && S_XPct.numFmt) ws[xirrCellAddr].z = S_XPct.numFmt;
  }
  sf(xirrRow, 3, `XNPV(C3,C4:C${lastDataRow},A4:A${lastDataRow})`,   S_XNum);
  sc(xirrRow, 4, '',                                                   S_XD);
  sf(xirrRow, 5, _outFrac===1 ? 'H3*H4' : `H3*H4*${_outFrac}`, S_XAmt);  // E(xirr): outstanding at VD × FV — correct base for interest accrual
  sf(xirrRow, 6, 'H3*H4*B3/100',                                      S_XAmt);  // Principal (orig FV × price%)
  sf(xirrRow, 7, 'E4*H3*H4/100',                                      S_XAmt);  // Interest — uses E4 (correct accrued base: 80% not 77.5%)
  sf(xirrRow, 8, `F${xirrRow}+G${xirrRow}`,                          S_XAmt);  // Settlement

  // ── STAMP DUTY ROW ────────────────────────────────────────────────────
  sf(stampRow, 8, `ROUND(H${xirrRow}*0.0001%,0)`,  sty({ sz:11, fmt:'#,##0.00' }));
  sc(stampRow, 9, 'Stamp Duty',                      S_YEL);

  // ── TOTAL SETTLEMENT ROW ──────────────────────────────────────────────
  sf(totalRow, 8, `SUM(H${xirrRow}:H${stampRow})`, sty({ sz:11, fmt:'#,##0.00' }));
  sc(totalRow, 9, 'Total settlement value',          S_YEL);

  // ── Sheet ref, col widths, row heights ────────────────────────────────
  ws['!ref'] = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:totalRow-1,c:8} });
  ws['!cols'] = [
    { wch: 54.28 }, // A
    { wch:  9.43 }, // B
    { wch: 11.14 }, // C (ref: no explicit width, use D ref width)
    { wch: 11.14 }, // D
    { wch: 19.0  }, // E
    { wch: 12.29 }, // F
    { wch: 12.57 }, // G
    { wch: 18.71 }, // H
    { wch: 20.71 }, // I
  ];
  ws['!rows'] = Array.from({ length: totalRow }, () => ({ hpt: 15.75 }));

  // ── Write — Rename Sheet1 to "To Maturity" ──────────────────────────────────
  XLSX.utils.book_append_sheet(wb, ws, 'To Maturity');

  // ── CALLABLE: second sheet "To Call" ─────────────────────────────────────────
  if (m.isCallable && m.callDate && m.ytcRate !== null && m.ytcRate !== undefined) {
    const wsC = {};
    const callDateObj = m.callDate instanceof Date ? m.callDate : parseLocalDate(m.callDate);

    // Rebuild call-scenario rows
    let callRows = [], remainC = m.outstandingAtValueDate || m.fvTotal;
    let prevDateC = m.valueDate;
    const allRows = window._lastCalcRows;
    for (let ri = 0; ri < allRows.length; ri++) {
      const row = allRows[ri];
      if (row.date < callDateObj) {
        // Skip ex-div missed row: advance date (for period calc) but don't add to callRows
        if (row.buyerMisses) { prevDateC = row.date; continue; }
        callRows.push({ date: row.date, interest: row.interest, principal: row.principal,
          cashflow: row.cashflow, outstandingBefore: row.outstandingBefore, denom: row.denom });
        remainC -= row.principal;
        prevDateC = row.date;
      } else {
        const { days: cdDays, denom: cdDenom } = getDayCount(prevDateC, callDateObj, m.dcConv || 'actactical');
        const callInt = remainC * (m.couponPct / 100) * cdDays / cdDenom;
        callRows.push({ date: callDateObj, interest: callInt, principal: remainC,
          cashflow: callInt + remainC, outstandingBefore: remainC, denom: cdDenom, isCall: true });
        break;
      }
    }
    if (callRows.length === 0) {
      // call date is after maturity — just clone maturity sheet
      callRows = [...allRows];
    }

    function scc(row, col, val, style) {
      const addr = XLSX.utils.encode_cell({ r: row-1, c: col-1 });
      const t = (val instanceof Date || typeof val === 'number') ? 'n' : 's';
      wsC[addr] = { v: val, t, s: style };
      if (style && style.numFmt) wsC[addr].z = style.numFmt;
    }
    function sfc(row, col, formula, style) {
      const addr = XLSX.utils.encode_cell({ r: row-1, c: col-1 });
      wsC[addr] = { f: formula, t: 'n', s: style };
      if (style && style.numFmt) wsC[addr].z = style.numFmt;
    }

    const cleanNameC = (m.secName || 'BOND').replace(/^\d+(\.\d+)?%\s*/i, '');
    const hdrTitleC  = (m.couponPct ? m.couponPct.toFixed(2) + '% ' : '') + cleanNameC + ' [YTC — Call ' + fmtDDMMYYYY(callDateObj) + ']';
    scc(1,1,hdrTitleC, S_HDR); scc(1,2,'',S_HDR_E); scc(1,3,'',S_HDR_E); scc(1,4,'',S_HDR_E);
    scc(1,5,m.bondRating||'', S_HDR); scc(1,6,'',S_HDR_E); scc(1,7,'',S_HDR_E);
    scc(1,8,'CALLABLE — Call Date: ' + fmtDDMMYYYY(callDateObj), S_HDR);
    scc(2,2,m.couponPct||0, S_R2_B);
    scc(2,8,m.isin||'', S_R2_H);
    scc(3,1,'Date', S_R3_A);
    scc(3,2,m.pricePct||100, S_R3_BD);
    scc(3,3,m.ytcRate||0, S_R3_CD);
    scc(3,4,'Days',S_R3_L); scc(3,5,'Interest',S_R3_L);
    scc(3,6,'DOA/Last ip',S_R3_L); scc(3,7,'Value Date',S_R3_L);
    scc(3,8,m.fvPerBond||1e5,S_R3_H);
    scc(4,1,exSer(m.valueDate),S_DATE);
    sfc(4,2,'-(B3+E4)',S_NUM); sfc(4,3,'-E4',S_NUM);
    sfc(4,4,'G4-F4',S_DATA); sfc(4,5,'B2*D4/365' + _accrFracStr, S_NUM);
    scc(4,6,exSer(m.isExDiv ? m.nextIPDate : (m.effectiveLastIPDate || m.lastIPDate)),S_DATE);
    sfc(4,7,'A4',S_DATE);
    scc(4,8,m.qty||1,S_DATA);

    const fdrC = 5;
    const ldrC = fdrC - 1 + callRows.length;
    const lblC = ldrC + 1;
    const xrrC = ldrC + 2;
    const stpC = xrrC + 1;
    const totC = xrrC + 2;
    const fvT2 = (m.fvPerBond||1e5) * (m.qty||1);

    callRows.forEach((row, i) => {
      const r = fdrC + i;
      const prev = r - 1;
      const denom = row.denom || 365;
      const frac = Math.round((row.outstandingBefore / fvT2) * 1000) / 1000;
      const eF = Math.abs(frac-1.0)<0.001 ? `B2*D${r}/${denom}` : `B2*D${r}/${denom}*${frac}`;
      const hP = row.principal>0 ? Math.round(row.principal/fvT2*100*10000)/10000 : null;
      const fF = r===fdrC ? 'F4' : `G${prev}`;
      scc(r,1,exSer(row.date),S_DATE);
      sfc(r,2,row.principal>0?`E${r}+H${r}`:`E${r}`,S_NUM);
      sfc(r,3,`B${r}`,S_NUM);
      sfc(r,4,`G${r}-F${r}`,S_DATA); sfc(r,5,eF,S_NUM);
      sfc(r,6,fF,S_DATE); sfc(r,7,`A${r}`,S_DATE);
      if (hP!==null) scc(r,8,hP,S_DATA);
      sfc(r,9,`H3*H4*E${r}/100`,S_AMT);
    });

    scc(lblC,5,'Face Value',S_LBL32); scc(lblC,6,'Principal',S_LBL32);
    scc(lblC,7,'Interest',S_LBL32); scc(lblC,8,'Settlement',S_LBL32);
    scc(xrrC,1,'XIRR (YTC)',S_XA);
    {
      const xirrCellAddr = XLSX.utils.encode_cell({ r: xrrC-1, c: 1 });
      const cachedYTC = (typeof m.ytcRate === 'number' && isFinite(m.ytcRate)) ? m.ytcRate : null;
      wsC[xirrCellAddr] = {
        f: `XIRR(B4:B${ldrC},A4:A${ldrC},0.1)`,
        v: cachedYTC,
        t: 'n',
        s: S_XPct
      };
      if (S_XPct && S_XPct.numFmt) wsC[xirrCellAddr].z = S_XPct.numFmt;
    }
    sfc(xrrC,3,`XNPV(C3,C4:C${ldrC},A4:A${ldrC})`,S_XNum);
    scc(xrrC,4,'',S_XD);
    sfc(xrrC,5,_outFrac===1 ? 'H3*H4' : `H3*H4*${_outFrac}`,S_XAmt);
    sfc(xrrC,6,'H3*H4*B3/100',S_XAmt);
    sfc(xrrC,7,'E4*H3*H4/100',S_XAmt);
    sfc(xrrC,8,`F${xrrC}+G${xrrC}`,S_XAmt);
    sfc(stpC,8,`ROUND(H${xrrC}*0.0001%,0)`,sty({sz:11,fmt:'#,##0.00'}));
    scc(stpC,9,'Stamp Duty',S_YEL);
    sfc(totC,8,`SUM(H${xrrC}:H${stpC})`,sty({sz:11,fmt:'#,##0.00'}));
    scc(totC,9,'Total settlement value',S_YEL);
    wsC['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:totC-1,c:8}});
    wsC['!cols'] = ws['!cols'];
    wsC['!rows'] = Array.from({length:totC},()=>({hpt:15.75}));
    XLSX.utils.book_append_sheet(wb, wsC, 'To Call');
  }

  // ── PUTABLE: "To Put" sheet ──────────────────────────────────────────────────
  if (m.isPutable && m.putDate && m.ytpRate !== null && m.ytpRate !== undefined) {
    const wsP = {};
    const putDateObj = m.putDate instanceof Date ? m.putDate : parseLocalDate(m.putDate);

    // Rebuild put-scenario rows
    let putRows = [], remainP = m.outstandingAtValueDate || m.fvTotal;
    let prevDateP = m.valueDate;
    const allRowsP = window._lastCalcRows;
    for (let ri = 0; ri < allRowsP.length; ri++) {
      const row = allRowsP[ri];
      if (row.date < putDateObj) {
        putRows.push({ date: row.date, interest: row.interest, principal: row.principal,
          cashflow: row.cashflow, outstandingBefore: row.outstandingBefore, denom: row.denom });
        remainP -= row.principal;
        prevDateP = row.date;
      } else {
        const { days: pdDays, denom: pdDenom } = getDayCount(prevDateP, putDateObj, m.dcConv || 'actactical');
        const putInt = remainP * (m.couponPct / 100) * pdDays / pdDenom;
        putRows.push({ date: putDateObj, interest: putInt, principal: remainP,
          cashflow: putInt + remainP, outstandingBefore: remainP, denom: pdDenom, isPut: true });
        break;
      }
    }
    if (putRows.length === 0) putRows = [...allRowsP];

    function scp(row, col, val, style) {
      const addr = XLSX.utils.encode_cell({ r: row-1, c: col-1 });
      const t = (val instanceof Date || typeof val === 'number') ? 'n' : 's';
      wsP[addr] = { v: val, t, s: style };
      if (style && style.numFmt) wsP[addr].z = style.numFmt;
    }
    function sfp(row, col, formula, style) {
      const addr = XLSX.utils.encode_cell({ r: row-1, c: col-1 });
      wsP[addr] = { f: formula, t: 'n', s: style };
      if (style && style.numFmt) wsP[addr].z = style.numFmt;
    }

    const cleanNameP = (m.secName || 'BOND').replace(/^\d+(\.\d+)?%\s*/i, '');
    const hdrTitleP  = (m.couponPct ? m.couponPct.toFixed(2) + '% ' : '') + cleanNameP + ' [YTP — Put ' + fmtDDMMYYYY(putDateObj) + ']';
    scp(1,1,hdrTitleP, S_HDR); scp(1,2,'',S_HDR_E); scp(1,3,'',S_HDR_E); scp(1,4,'',S_HDR_E);
    scp(1,5,m.bondRating||'', S_HDR); scp(1,6,'',S_HDR_E); scp(1,7,'',S_HDR_E);
    scp(1,8,'PUTABLE — Put Date: ' + fmtDDMMYYYY(putDateObj), S_HDR);
    scp(2,2,m.couponPct||0, S_R2_B);
    scp(2,8,m.isin||'', S_R2_H);
    scp(3,1,'Date', S_R3_A);
    scp(3,2,m.pricePct||100, S_R3_BD);
    scp(3,3,m.ytpRate||0, S_R3_CD);
    scp(3,4,'Days',S_R3_L); scp(3,5,'Interest',S_R3_L);
    scp(3,6,'DOA/Last ip',S_R3_L); scp(3,7,'Value Date',S_R3_L);
    scp(3,8,m.fvPerBond||1e5,S_R3_H);
    scp(4,1,exSer(m.valueDate),S_DATE);
    sfp(4,2,'-(B3+E4)',S_NUM); sfp(4,3,'-E4',S_NUM);
    sfp(4,4,'G4-F4',S_DATA); sfp(4,5,'B2*D4/365' + _accrFracStr, S_NUM);
    scp(4,6,exSer(m.isExDiv ? m.nextIPDate : (m.effectiveLastIPDate || m.lastIPDate)),S_DATE);
    sfp(4,7,'A4',S_DATE);
    scp(4,8,m.qty||1,S_DATA);

    const fdrP = 5;
    const ldrP = fdrP - 1 + putRows.length;
    const lblP = ldrP + 1;
    const xrrP = ldrP + 2;
    const stpP = xrrP + 1;
    const totP = xrrP + 2;
    const fvTP = (m.fvPerBond||1e5) * (m.qty||1);

    putRows.forEach((row, i) => {
      const r = fdrP + i;
      const prev = r - 1;
      const denom = row.denom || 365;
      const frac = Math.round((row.outstandingBefore / fvTP) * 1000) / 1000;
      const eF = Math.abs(frac-1.0)<0.001 ? `B2*D${r}/${denom}` : `B2*D${r}/${denom}*${frac}`;
      const hP = row.principal>0 ? Math.round(row.principal/fvTP*100*10000)/10000 : null;
      const fF = r===fdrP ? 'F4' : `G${prev}`;
      scp(r,1,exSer(row.date),S_DATE);
      sfp(r,2,row.principal>0?`E${r}+H${r}`:`E${r}`,S_NUM);
      sfp(r,3,`B${r}`,S_NUM);
      sfp(r,4,`G${r}-F${r}`,S_DATA); sfp(r,5,eF,S_NUM);
      sfp(r,6,fF,S_DATE); sfp(r,7,`A${r}`,S_DATE);
      if (hP!==null) scp(r,8,hP,S_DATA);
      sfp(r,9,`H3*H4*E${r}/100`,S_AMT);
    });

    scp(lblP,5,'Face Value',S_LBL32); scp(lblP,6,'Principal',S_LBL32);
    scp(lblP,7,'Interest',S_LBL32); scp(lblP,8,'Settlement',S_LBL32);
    scp(xrrP,1,'XIRR (YTP)',S_XA);
    {
      const xirrCellAddr = XLSX.utils.encode_cell({ r: xrrP-1, c: 1 });
      const cachedYTP = (typeof m.ytpRate === 'number' && isFinite(m.ytpRate)) ? m.ytpRate : null;
      wsP[xirrCellAddr] = {
        f: `XIRR(B4:B${ldrP},A4:A${ldrP},0.1)`,
        v: cachedYTP,
        t: 'n',
        s: S_XPct
      };
      if (S_XPct && S_XPct.numFmt) wsP[xirrCellAddr].z = S_XPct.numFmt;
    }
    sfp(xrrP,3,`XNPV(C3,C4:C${ldrP},A4:A${ldrP})`,S_XNum);
    scp(xrrP,4,'',S_XD);
    sfp(xrrP,5,_outFrac===1 ? 'H3*H4' : `H3*H4*${_outFrac}`,S_XAmt);
    sfp(xrrP,6,'H3*H4*B3/100',S_XAmt);
    sfp(xrrP,7,'E4*H3*H4/100',S_XAmt);
    sfp(xrrP,8,`F${xrrP}+G${xrrP}`,S_XAmt);
    sfp(stpP,8,`ROUND(H${xrrP}*0.0001%,0)`,sty({sz:11,fmt:'#,##0.00'}));
    scp(stpP,9,'Stamp Duty',S_YEL);
    sfp(totP,8,`SUM(H${xrrP}:H${stpP})`,sty({sz:11,fmt:'#,##0.00'}));
    scp(totP,9,'Total settlement value',S_YEL);
    wsP['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:totP-1,c:8}});
    wsP['!cols'] = ws['!cols'];
    wsP['!rows'] = Array.from({length:totP},()=>({hpt:15.75}));
    XLSX.utils.book_append_sheet(wb, wsP, 'To Put');
  }

  const fname = (m.secName || 'Bond').replace(/[^a-zA-Z0-9 %\.]/g,'').trim().substring(0,40) || 'Bond';
  const optSuffix = [m.isCallable&&m.callDate?'Callable':'', m.isPutable&&m.putDate?'Putable':''].filter(Boolean).join('_');
  XLSX.writeFile(wb, `${fname}${optSuffix?'_'+optSuffix:''}_XIRR.xlsx`);
}