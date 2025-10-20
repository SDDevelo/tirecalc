// Простий облік складу шин у localStorage

const STORAGE_KEY = 'tire_inventory_v1';

/**
 * Data shape:
 * items: Array<{
 *   id: string,
 *   name: string,
 *   size: string,
 *   season: 'summer'|'winter'|'all',
 *   price: number,
 *   qty: number,
 *   createdAt: number,
 * }>
 */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.items || !Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch {
    return { items: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId() {
  return 'itm_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function seasonLabel(s) {
  return s === 'summer' ? 'Літо' : s === 'winter' ? 'Зима' : 'Всесезонні';
}

function formatMoney(n) {
  const amount = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(amount);
}

const els = {
  addForm: document.getElementById('addForm'),
  name: document.getElementById('name'),
  size: document.getElementById('size'),
  season: document.getElementById('season'),
  price: document.getElementById('price'),
  initialQty: document.getElementById('initialQty'),
  tbody: document.getElementById('inventoryTbody'),
  statsItems: document.getElementById('statsItems'),
  statsQty: document.getElementById('statsQty'),
  clearAllBtn: document.getElementById('clearAllBtn'),
};

let state = loadState();

function upsertItem({ name, size, season, price, qty }) {
  const normalizedName = name.trim();
  const normalizedSize = size.trim();
  const existing = state.items.find(
    (it) => it.name === normalizedName && it.size === normalizedSize && it.season === season
  );
  const numericPrice = isNaN(parseFloat(price)) ? 0 : Math.max(0, Math.floor(parseFloat(price)));
  const numericQty = isNaN(parseInt(qty, 10)) ? 0 : Math.max(0, parseInt(qty, 10));

  if (existing) {
    existing.qty += numericQty;
    if (numericPrice > 0) existing.price = numericPrice; // оновлюємо ціну, якщо задано
  } else {
    state.items.push({
      id: generateId(),
      name: normalizedName,
      size: normalizedSize,
      season,
      price: numericPrice,
      qty: numericQty,
      createdAt: Date.now(),
    });
  }
  saveState(state);
  render();
}

function adjustQty(id, delta) {
  const item = state.items.find((it) => it.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  saveState(state);
  render();
}

function deleteItem(id) {
  state.items = state.items.filter((it) => it.id !== id);
  saveState(state);
  render();
}

function render() {
  // sort: newest first
  const items = [...state.items].sort((a, b) => b.createdAt - a.createdAt);
  els.tbody.innerHTML = '';

  let totalQty = 0;

  for (const it of items) {
    totalQty += it.qty;
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.className = 'px-4 py-3 text-sm text-gray-900';
    tdName.textContent = it.name;

    const tdSize = document.createElement('td');
    tdSize.className = 'px-4 py-3 text-sm text-gray-700';
    tdSize.textContent = it.size || '—';

    const tdSeason = document.createElement('td');
    tdSeason.className = 'px-4 py-3 text-sm';
    tdSeason.textContent = seasonLabel(it.season);

    const tdPrice = document.createElement('td');
    tdPrice.className = 'px-4 py-3 text-sm text-right';
    tdPrice.textContent = it.price ? formatMoney(it.price) : '—';

    const tdQty = document.createElement('td');
    tdQty.className = 'px-4 py-3 text-sm text-right font-semibold';
    tdQty.textContent = it.qty;

    const tdOps = document.createElement('td');
    tdOps.className = 'px-4 py-2 text-right';

    const opsWrap = document.createElement('div');
    opsWrap.className = 'inline-flex items-center gap-2';

    const btnOut = document.createElement('button');
    btnOut.className = 'px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm';
    btnOut.textContent = 'Видати −1';
    btnOut.addEventListener('click', () => adjustQty(it.id, -1));

    const btnIn = document.createElement('button');
    btnIn.className = 'px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm';
    btnIn.textContent = 'Прийняти +1';
    btnIn.addEventListener('click', () => adjustQty(it.id, +1));

    const btnDel = document.createElement('button');
    btnDel.className = 'px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm';
    btnDel.textContent = 'Видалити';
    btnDel.addEventListener('click', () => {
      if (confirm('Видалити позицію?')) deleteItem(it.id);
    });

    opsWrap.append(btnOut, btnIn, btnDel);
    tdOps.appendChild(opsWrap);

    tr.append(tdName, tdSize, tdSeason, tdPrice, tdQty, tdOps);
    els.tbody.appendChild(tr);
  }

  els.statsItems.textContent = items.length;
  els.statsQty.textContent = totalQty;
}

// Form handlers
els.addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = els.name.value.trim();
  const size = els.size.value.trim();
  if (!name || !size) return;

  upsertItem({
    name,
    size,
    season: els.season.value,
    price: els.price.value,
    qty: els.initialQty.value,
  });

  els.addForm.reset();
});

els.clearAllBtn.addEventListener('click', () => {
  if (!state.items.length) return;
  if (confirm('Очистити всі дані складу?')) {
    state = { items: [] };
    saveState(state);
    render();
  }
});

// Initial render
render();
