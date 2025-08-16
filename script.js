const DEFAULTS = {
  base: { R13:800, R14:1150, R15:1350, R16:1750, R17:2150, R18:2600, R19:3100, R20:3650, R21:4200, R22:4800 },
  minPrice: 500,
  treadScale: "8:20,7:10,6:0,5:-10,4:-25,3:-40", // мм → %
  ageScale: "0-2:15,3-4:5,5-6:0,7-8:-10,9-10:-20,>10:-35", // роки → %
  treadMaxPct: 20,
};

const els = {
  radius: document.getElementById('radius'),
  tread: document.getElementById('tread'),
  year: document.getElementById('year'),
  rounding: document.getElementById('rounding'),
  qty: document.getElementById('qty'),
  qtyLbl: document.getElementById('qtyLbl'),
  priceEach: document.getElementById('priceEach'),
  priceTotal: document.getElementById('priceTotal'),
  breakdown: document.getElementById('breakdown'),
  curYear: document.getElementById('curYear'),
  minPricePill: document.getElementById('minPricePill'),
  btnCalc: document.getElementById('btnCalc'),
  btnCopyLink: document.getElementById('btnCopyLink'),
  // cfg
  bR13: document.getElementById('bR13'), bR14: document.getElementById('bR14'), bR15: document.getElementById('bR15'), bR16: document.getElementById('bR16'), bR17: document.getElementById('bR17'), bR18: document.getElementById('bR18'), bR19: document.getElementById('bR19'), bR20: document.getElementById('bR20'), bR21: document.getElementById('bR21'), bR22: document.getElementById('bR22'),
  minPrice: document.getElementById('minPrice'),
  treadMaxPct: document.getElementById('treadMaxPct'),
  treadScale: document.getElementById('treadScale'),
  ageScale: document.getElementById('ageScale'),
  btnApply: document.getElementById('btnApply'),
  btnReset: document.getElementById('btnReset'),
  yearFooter: document.getElementById('yearFooter'),
};

const yyyy = new Date().getFullYear();
els.curYear.textContent = yyyy;
els.yearFooter.textContent = yyyy;

// Load config from localStorage if exists
let CONFIG = loadConfig();
renderConfigToInputs(CONFIG);
updateMinPill();

function loadConfig(){
  const raw = localStorage.getItem('used_tire_calc_cfg');
  if(raw){
    try { return JSON.parse(raw); } catch {}
  }
  return {
    base: DEFAULTS.base,
    minPrice: DEFAULTS.minPrice,
    treadScale: DEFAULTS.treadScale,
    ageScale: DEFAULTS.ageScale,
    treadMaxPct: DEFAULTS.treadMaxPct,
  };
}

function saveConfig(){
  localStorage.setItem('used_tire_calc_cfg', JSON.stringify(CONFIG));
}

function renderConfigToInputs(cfg){
  Object.keys(cfg.base).forEach(k=>{
    const el = document.getElementById('b'+k);
    if(el) el.value = cfg.base[k];
  });
  els.minPrice.value = cfg.minPrice;
  els.treadScale.value = cfg.treadScale;
  els.ageScale.value = cfg.ageScale;
  els.treadMaxPct.value = cfg.treadMaxPct;
}

function collectConfigFromInputs(){
  const base = {};
  ['R13','R14','R15','R16','R17','R18','R19','R20','R21','R22'].forEach(k=>{
    const el = document.getElementById('b'+k);
    base[k] = clampNum(parseFloat(el.value)||0, 0, 999999);
  });
  CONFIG = {
    base,
    minPrice: clampNum(parseFloat(els.minPrice.value)||0, 0, 999999),
    treadScale: els.treadScale.value.trim(),
    ageScale: els.ageScale.value.trim(),
    treadMaxPct: clampNum(parseFloat(els.treadMaxPct.value)||0, -100, 200),
  };
  saveConfig();
  updateMinPill();
}

function updateMinPill(){
  els.minPricePill.textContent = `${fmtMoney(CONFIG.minPrice)}`;
}

els.btnApply.addEventListener('click', ()=>{ collectConfigFromInputs(); calc(); });
els.btnReset.addEventListener('click', ()=>{ 
  CONFIG = JSON.parse(JSON.stringify(DEFAULTS));
  renderConfigToInputs(CONFIG); saveConfig(); updateMinPill(); calc();
});

// Core logic
function parseTreadScale(str){
  // "8:20,7:10,6:0,5:-10,4:-25,3:-40" → sorted by mm desc
  const items = str.split(',').map(s=>s.trim()).filter(Boolean).map(p=>{
    const [mm, pct] = p.split(':').map(x=>x.trim());
    return { mm: parseFloat(mm), pct: parseFloat(pct) };
  }).filter(x=>!isNaN(x.mm) && !isNaN(x.pct)).sort((a,b)=>b.mm-a.mm);
  return items;
}

function parseAgeScale(str){
  // "0-2:15,3-4:5,5-6:0,7-8:-10,9-10:-20,>10:-35"
  const items = str.split(',').map(s=>s.trim()).filter(Boolean).map(p=>{
    const [rng, pct] = p.split(':').map(x=>x.trim());
    if(rng.startsWith('>')) return { type:'gt', a: parseInt(rng.slice(1),10), pct: parseFloat(pct) };
    if(rng.includes('-')){
      const [a,b] = rng.split('-').map(x=>parseInt(x,10));
      return { type:'range', a, b, pct: parseFloat(pct) };
    }
    const a = parseInt(rng,10); return { type:'eq', a, pct: parseFloat(pct) };
  }).filter(x=>!isNaN(x.pct));
  return items;
}

function treadPct(mm){
  const scale = parseTreadScale(CONFIG.treadScale);
  for(const it of scale){ if(mm >= it.mm) return it.pct; }
  // якщо нижче мінімального порогу — екстраполяція −10%/мм
  if(scale.length){
    const last = scale[scale.length-1];
    const diff = (mm - last.mm);
    return last.pct + diff * (-10);
  }
  return 0;
}

function agePct(age){
  const scale = parseAgeScale(CONFIG.ageScale);
  for(const it of scale){
    if(it.type==='gt' && age > it.a) return it.pct;
    if(it.type==='range' && age>=it.a && age<=it.b) return it.pct;
    if(it.type==='eq' && age===it.a) return it.pct;
  }
  return 0;
}

function roundTo(n, step){
  const s = Math.max(1, step|0);
  return Math.round(n / s) * s;
}

function clampNum(n, a, b){ return Math.min(Math.max(n, a), b); }

function fmtMoney(n){
  return new Intl.NumberFormat('uk-UA', { style:'currency', currency:'UAH', maximumFractionDigits:0 }).format(Math.round(n));
}

function calc(){
  const radius = els.radius.value;
  const tread = clampNum(parseFloat(els.tread.value)||0, 0, 12);
  const year = parseInt(els.year.value,10) || yyyy;
  const rounding = parseInt(els.rounding.value,10) || 50;
  const qty = parseInt(els.qty.value,10) || 4;
  els.qtyLbl.textContent = qty;

  if(tread < 3){
    els.priceEach.textContent = 'не продаємо';
    els.priceTotal.textContent = '—';
    els.breakdown.innerHTML = `<tr><td colspan="2" style="color: var(--danger); font-weight:700;">Протектор &lt; 3 мм — шина під списання</td></tr>`;
    return;
  }
  const base = CONFIG.base[radius] ?? 0;
  const age = Math.max(0, yyyy - year);
  const pT = treadPct(tread);
  const pA = agePct(age);
  const afterTread = base * (1 + pT/100);
  const afterAge = afterTread * (1 + pA/100);
  const rounded = roundTo(afterAge, rounding);
  const finalEach = Math.max(rounded, CONFIG.minPrice);
  const total = finalEach * qty;

  els.priceEach.textContent = fmtMoney(finalEach);
  els.priceTotal.textContent = fmtMoney(total);

  els.breakdown.innerHTML = `
    <tr><td>Базова (за ${radius})</td><td>${fmtMoney(base)}</td></tr>
    <tr><td>Коеф. протектора (${tread.toFixed(1)} мм)</td><td>${pT > 0 ? '+' : ''}${pT}% → ${fmtMoney(afterTread)}</td></tr>
    <tr><td>Коеф. віку (вік ${age} р.)</td><td>${pA > 0 ? '+' : ''}${pA}% → ${fmtMoney(afterAge)}</td></tr>
    <tr><td>Округлення (крок ${rounding})</td><td>${fmtMoney(rounded)}</td></tr>
    <tr><td>Мін. ціна перевірка</td><td>${fmtMoney(CONFIG.minPrice)}</td></tr>
  `;
}

// URL params import/export
function applyFromURL(){
  const p = new URLSearchParams(location.search);
  if(p.has('R')) els.radius.value = p.get('R');
  if(p.has('T')) els.tread.value = p.get('T');
  if(p.has('Y')) els.year.value = p.get('Y');
  if(p.has('Q')) els.qty.value = p.get('Q');
  if(p.has('S')) els.rounding.value = p.get('S');
}

function makeURL(){
  const p = new URLSearchParams();
  p.set('R', els.radius.value);
  p.set('T', els.tread.value);
  p.set('Y', els.year.value);
  p.set('Q', els.qty.value);
  p.set('S', els.rounding.value);
  return location.origin + location.pathname + '?' + p.toString();
}

els.btnCopyLink.addEventListener('click', async ()=>{
  const url = makeURL();
  try {
    await navigator.clipboard.writeText(url);
    els.btnCopyLink.textContent = 'Скопійовано ✅';
    setTimeout(()=>els.btnCopyLink.textContent='🔗 Копія з параметрами',1500);
  } catch(e){
    alert(url);
  }
});

document.getElementById('btnCalc').addEventListener('click', calc);
['change','input'].forEach(ev=>{
  els.radius.addEventListener(ev, calc);
  els.tread.addEventListener(ev, calc);
  els.year.addEventListener(ev, calc);
  els.rounding.addEventListener(ev, calc);
  els.qty.addEventListener(ev, calc);
});

applyFromURL();
calc();

