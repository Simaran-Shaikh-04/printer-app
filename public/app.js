// app.js — Staff dashboard (live preview, auto-lookup, 2-step confirm)

let customers        = [];
let info             = null;
let currentCustomer  = null;

// ── Init ───────────────────────────────────────────────────
async function loadInfo() {
  const res = await fetch("/api/info");
  info = await res.json();
  document.getElementById("baseUrlLabel").textContent = info.baseUrl;
  document.getElementById("qrLink").textContent       = info.registerUrl;
  renderTierInfo();
}

async function loadCustomers() {
  const res = await fetch("/api/customers");
  customers = await res.json();
  renderTable();
}

async function loadSummary() {
  try {
    const res  = await fetch("/api/summary/today");
    const data = await res.json();
    document.getElementById("s-prints").textContent    = data.totalPrints;
    document.getElementById("s-revenue").textContent   = "₹" + data.totalRevenue;
    document.getElementById("s-customers").textContent = data.customersServed;
    document.getElementById("s-color").textContent     = data.colorPrints;
    document.getElementById("s-bw").textContent        = data.bwPrints;
    document.getElementById("s-xerox").textContent     = data.xeroxPrints;
  } catch { /* silent */ }
}

// Refresh summary every 60 s
setInterval(loadSummary, 60000);

// ── Tier bar ───────────────────────────────────────────────
function renderTierInfo() {
  document.getElementById("tierInfo").innerHTML = info.tiers
    .map(t => `
      <div class="tier-chip ${t.label}">
        <span class="tier-name">${t.label}</span>
        <span class="tier-pts">${t.min}+ pts</span>
        <span class="tier-disc">${t.discountPct > 0 ? t.discountPct + "% off" : "No discount"}</span>
      </div>`)
    .join("");
}

// ═══════════════════════════════════════════════════════════
//  LIVE ORDER PANEL
// ═══════════════════════════════════════════════════════════
const orderPhone     = document.getElementById("orderPhone");
const lookupStatus   = document.getElementById("lookupStatus");
const customerCard   = document.getElementById("customerCard");
const countSection   = document.getElementById("countSection");
const colorInput     = document.getElementById("colorPrints");
const bwInput        = document.getElementById("bwPrints");
const xeroxInput     = document.getElementById("xeroxPrints");
const ticket         = document.getElementById("ticket");
const confirmSection = document.getElementById("confirmSection");
const staffPin       = document.getElementById("staffPin");
const pinHint        = document.getElementById("pinHint");
const confirmBtn     = document.getElementById("confirmBtn");
const orderMsg       = document.getElementById("orderMsg");

// ── Step 1: Auto-lookup when 10 digits typed ──────────────
orderPhone.addEventListener("input", () => {
  const raw   = orderPhone.value.replace(/\D/g, "");
  orderPhone.value = raw; // strip non-digits

  if (raw.length === 10) {
    doLookup(raw);
  } else {
    clearOrder(false);
    lookupStatus.textContent = raw.length > 0
      ? `${10 - raw.length} more digit${10 - raw.length !== 1 ? "s" : ""}…`
      : "";
    lookupStatus.className = "lookup-status";
  }
});

function doLookup(phone) {
  const c = customers.find(c => c.phone === phone);
  if (c) {
    currentCustomer = c;
    lookupStatus.textContent = "✓ Customer found";
    lookupStatus.className   = "lookup-status ls-found";
    renderCustomerCard(c);
  } else {
    clearOrder(false);
    lookupStatus.textContent = "✕ Not registered — ask them to scan the QR code";
    lookupStatus.className   = "lookup-status ls-notfound";
  }
}

function renderCustomerCard(c) {
  document.getElementById("occName").textContent  = c.name;
  document.getElementById("occPhone").textContent = c.phone;

  const tierEl = document.getElementById("occTier");
  tierEl.textContent = c.tier;
  tierEl.className   = "badge " + c.tier;

  document.getElementById("occPts").textContent  = c.points + " pts";
  document.getElementById("occDisc").textContent = c.discountPct > 0
    ? c.discountPct + "% discount"
    : "No discount yet";

  // PIN hint
  if (c.pin) {
    pinHint.textContent = "Ask the customer for their 4-digit PIN before confirming.";
    pinHint.className   = "pin-hint has-pin";
  } else {
    pinHint.textContent = "⚠ No PIN set for this customer — order will proceed without verification.";
    pinHint.className   = "pin-hint no-pin";
  }

  customerCard.style.display   = "flex";
  countSection.style.display   = "block";
  confirmSection.style.display = "block";

  // Focus first non-zero count input
  colorInput.focus();
  recalcTicket();
}

function clearOrder(resetPhone = true) {
  currentCustomer = null;
  if (resetPhone) {
    orderPhone.value = "";
    lookupStatus.textContent = "";
    lookupStatus.className   = "lookup-status";
  }
  customerCard.style.display   = "none";
  countSection.style.display   = "none";
  ticket.style.display         = "none";
  confirmSection.style.display = "none";
  colorInput.value  = "0";
  bwInput.value     = "0";
  xeroxInput.value  = "0";
  staffPin.value    = "";
  orderMsg.textContent = "";
}

// ── Step 2: Live ticket as counts change ──────────────────
function recalcTicket() {
  if (!currentCustomer || !info) return;

  const color = Number(colorInput.value) || 0;
  const bw    = Number(bwInput.value)    || 0;
  const xerox = Number(xeroxInput.value) || 0;

  if (color + bw + xerox === 0) {
    ticket.style.display = "none";
    return;
  }

  const pt     = info.printTypes;
  const gross  = color * pt.color.price + bw * pt.bw.price + xerox * pt.xerox.price;
  const tier   = info.tiers.find(t => currentCustomer.points >= t.min);
  const disc   = Math.round((gross * tier.discountPct) / 100);
  const net    = gross - disc;
  const earned = gross; // 1 pt per rupee

  const rows = [];
  if (color > 0) rows.push(`<div class="row"><span>🎨 ${color} × ₹${pt.color.price}</span><span>₹${color * pt.color.price}</span></div>`);
  if (bw    > 0) rows.push(`<div class="row"><span>🖤 ${bw} × ₹${pt.bw.price}</span><span>₹${bw * pt.bw.price}</span></div>`);
  if (xerox > 0) rows.push(`<div class="row"><span>📄 ${xerox} × ₹${pt.xerox.price}</span><span>₹${xerox * pt.xerox.price}</span></div>`);

  ticket.innerHTML = `
    ${rows.join("")}
    <div class="row"><span>Subtotal</span><span>₹${gross}</span></div>
    ${disc > 0 ? `<div class="row"><span class="tier-tag">${tier.label} (−${tier.discountPct}%)</span><span class="disc-amt">−₹${disc}</span></div>` : ""}
    <div class="row total"><span>Charge customer</span><span>₹${net}</span></div>
    <div class="row points-row"><span>Points earned</span><span>+${earned} pts → ${currentCustomer.points + earned} total</span></div>
  `;
  ticket.style.display = "block";
}

[colorInput, bwInput, xeroxInput].forEach(inp =>
  inp.addEventListener("input", recalcTicket)
);

// Enter on PIN → confirm
staffPin.addEventListener("keydown", e => {
  if (e.key === "Enter") confirmBtn.click();
});

// ── Step 3: One-button Confirm (PIN + save) ───────────────
confirmBtn.addEventListener("click", async () => {
  if (!currentCustomer) return;

  const phone = currentCustomer.phone;
  const color = Number(colorInput.value) || 0;
  const bw    = Number(bwInput.value)    || 0;
  const xerox = Number(xeroxInput.value) || 0;
  const pin   = staffPin.value.trim();

  orderMsg.textContent = "";

  if (color + bw + xerox === 0) {
    orderMsg.textContent = "Enter at least one print count.";
    orderMsg.className   = "msg error";
    return;
  }
  if (currentCustomer.pin && !/^\d{4}$/.test(pin)) {
    orderMsg.textContent = "Enter the customer's 4-digit PIN to proceed.";
    orderMsg.className   = "msg error";
    staffPin.focus();
    return;
  }

  confirmBtn.disabled    = true;
  confirmBtn.textContent = "Saving…";

  try {
    const res  = await fetch("/api/orders", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone, color, bw, xerox, pin }),
    });
    const data = await res.json();

    if (!res.ok) {
      orderMsg.textContent = data.error || "Could not save order.";
      orderMsg.className   = "msg error";
      if (res.status === 401) staffPin.focus();
      return;
    }

    // Success flash — auto-reset after 2 s
    orderMsg.textContent = `✅ ${data.customer.name} — ₹${data.breakdown.netRupees} charged · +${data.earnedPoints} pts`;
    orderMsg.className   = "msg ok";

    setTimeout(() => {
      clearOrder(true);
      loadCustomers();
      loadSummary();
    }, 2000);

  } catch {
    orderMsg.textContent = "Could not reach the server.";
    orderMsg.className   = "msg error";
  } finally {
    confirmBtn.disabled    = false;
    confirmBtn.textContent = "✓ Confirm & Save Order";
  }
});

// ═══════════════════════════════════════════════════════════
//  CUSTOMER LEDGER
// ═══════════════════════════════════════════════════════════
const tableWrap = document.getElementById("tableWrap");
const searchBox = document.getElementById("searchBox");

function renderTable() {
  const q    = searchBox.value.trim().toLowerCase();
  const rows = customers.filter(
    c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)
  );

  if (rows.length === 0) {
    tableWrap.innerHTML = `<div class="empty-state">No customers yet. Share the QR code to get started.</div>`;
    return;
  }

  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Phone</th><th>Points</th>
          <th>Tier</th><th>Discount</th><th>Visits</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(c => `
          <tr data-id="${c.id}">
            <td><input type="text"   value="${escapeAttr(c.name)}"  data-field="name" /></td>
            <td><input type="text"   value="${escapeAttr(c.phone)}" data-field="phone" /></td>
            <td class="num-cell"><input type="number" value="${c.points}" data-field="points" /></td>
            <td><span class="badge ${c.tier}">${c.tier}</span></td>
            <td><span class="badge ${c.tier}">${c.discountPct}% off</span></td>
            <td class="stat-cell">${c.totalVisits}v · ${c.totalPrints}p</td>
            <td class="actions">
              <button class="secondary hist-btn" title="Order history">📋 History</button>
              <button class="secondary save-btn">Save</button>
              <button class="danger del-btn">Delete</button>
            </td>
          </tr>`).join("")}
      </tbody>
    </table>`;

  tableWrap.querySelectorAll(".save-btn").forEach(b =>
    b.addEventListener("click", e => saveRow(e.target.closest("tr")))
  );
  tableWrap.querySelectorAll(".del-btn").forEach(b =>
    b.addEventListener("click", e => deleteRow(e.target.closest("tr")))
  );
  tableWrap.querySelectorAll(".hist-btn").forEach(b =>
    b.addEventListener("click", e => showHistory(e.target.closest("tr").dataset.id))
  );
}

function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

async function saveRow(tr) {
  const id      = tr.dataset.id;
  const payload = {};
  tr.querySelectorAll("input[data-field]").forEach(i => { payload[i.dataset.field] = i.value; });
  const res = await fetch(`/api/customers/${id}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (res.ok) loadCustomers();
}

async function deleteRow(tr) {
  const name = tr.querySelector('input[data-field="name"]').value;
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  const res  = await fetch(`/api/customers/${tr.dataset.id}`, { method: "DELETE" });
  if (res.ok) loadCustomers();
}

searchBox.addEventListener("input", renderTable);

// ═══════════════════════════════════════════════════════════
//  ORDER HISTORY MODAL
// ═══════════════════════════════════════════════════════════
function showHistory(id) {
  const c = customers.find(c => c.id === id);
  if (!c) return;

  document.getElementById("modalTitle").textContent = c.name + " — History";
  document.getElementById("modalSub").textContent   = c.phone + " · " + c.points + " pts · " + c.tier;

  const body   = document.getElementById("modalBody");
  const orders = [...(c.orders || [])].reverse();

  if (orders.length === 0) {
    body.innerHTML = `<div class="empty-state">No orders yet.</div>`;
  } else {
    body.innerHTML = orders.map(o => {
      const dt     = new Date(o.date);
      const dStr   = dt.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
      const tStr   = dt.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
      const types  = [];
      if (o.color > 0) types.push(`🎨 ${o.color} color`);
      if (o.bw    > 0) types.push(`🖤 ${o.bw} B&W`);
      if (o.xerox > 0) types.push(`📄 ${o.xerox} xerox`);
      return `
        <div class="hist-item">
          <div class="hist-date">${dStr} · ${tStr}</div>
          <div class="hist-types">${types.join(" · ") || "—"}</div>
          <div class="hist-amounts">
            <span>₹${o.grossRupees}${o.discountPct > 0 ? ` − ${o.discountPct}%` : ""} = <strong>₹${o.netRupees}</strong></span>
            <span class="hist-pts">+${o.pointsEarned} pts</span>
          </div>
        </div>`;
    }).join("");
  }
  document.getElementById("historyModal").style.display = "flex";
}

function closeHistory(e) {
  if (e.target === document.getElementById("historyModal")) {
    document.getElementById("historyModal").style.display = "none";
  }
}

// ── Startup ───────────────────────────────────────────────
(async function init() {
  await loadInfo();
  await Promise.all([loadCustomers(), loadSummary()]);
})();
