const express = require("express");
const fs      = require("fs");
const path    = require("path");
const os      = require("os");
const crypto  = require("crypto");
const QRCode  = require("qrcode");
const loyalty = require("./loyalty");

const app       = express();
const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "customers.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ──────────────────────────────────────────────────
function readData()       { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
function writeData(data)  { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function findCustomer(data, id)     { return data.customers.find(c => c.id === id); }
function findByPhone(data, phone)   { return data.customers.find(c => c.phone === phone); }

function getLocalIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return "localhost";
}

const LOCAL_IP = getLocalIp();
const BASE_URL = `http://${LOCAL_IP}:${PORT}`;

// ════════════════════════════════════════════════════════════
//  INFO & QR
// ════════════════════════════════════════════════════════════
app.get("/api/info", (req, res) => {
  res.json({
    baseUrl:      BASE_URL,
    registerUrl:  `${BASE_URL}/register.html`,
    checkinUrl:   `${BASE_URL}/checkin.html`,
    printTypes:   loyalty.PRINT_TYPES,
    welcomeBonus: loyalty.WELCOME_BONUS_POINTS,
    tiers:        loyalty.TIERS,
  });
});

app.get("/api/qrcode", async (req, res) => {
  try {
    const png = await QRCode.toBuffer(`${BASE_URL}/register.html`, { width: 400, margin: 2 });
    res.set("Content-Type", "image/png");
    res.send(png);
  } catch { res.status(500).json({ error: "QR generation failed." }); }
});

// ════════════════════════════════════════════════════════════
//  TODAY'S SUMMARY
// ════════════════════════════════════════════════════════════
app.get("/api/summary/today", (req, res) => {
  const data  = readData();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let totalPrints = 0, totalRevenue = 0;
  let colorPrints = 0, bwPrints = 0, xeroxPrints = 0;
  const served = new Set();

  data.customers.forEach(c => {
    c.orders.forEach(o => {
      if (o.date && o.date.startsWith(today)) {
        totalPrints  += o.totalPrints || 0;
        totalRevenue += o.netRupees   || 0;
        colorPrints  += o.color || 0;
        bwPrints     += o.bw    || 0;
        xeroxPrints  += o.xerox || 0;
        served.add(c.id);
      }
    });
  });

  res.json({ date: today, totalPrints, totalRevenue, customersServed: served.size, colorPrints, bwPrints, xeroxPrints });
});

// ════════════════════════════════════════════════════════════
//  CUSTOMER LOOKUP — used by check-in page
// ════════════════════════════════════════════════════════════
app.get("/api/lookup/:phone", (req, res) => {
  const data     = readData();
  const customer = findByPhone(data, req.params.phone);
  if (!customer) return res.status(404).json({ error: "Phone not registered. Please register first." });
  res.json({
    name:        customer.name,
    phone:       customer.phone,
    points:      customer.points,
    totalPrints: customer.totalPrints,
    totalVisits: customer.totalVisits,
    tier:        loyalty.tierForPoints(customer.points).label,
    discountPct: loyalty.discountForPoints(customer.points),
    hasPin:      !!customer.pin,
  });
});

// ════════════════════════════════════════════════════════════
//  PIN VERIFICATION
// ════════════════════════════════════════════════════════════
app.post("/api/verify-pin", (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || pin === undefined) {
    return res.status(400).json({ ok: false, error: "Phone and PIN are required." });
  }
  const data     = readData();
  const customer = findByPhone(data, phone);
  if (!customer) return res.status(404).json({ ok: false, error: "Customer not found." });

  if (!customer.pin) {
    // Old customer without PIN — skip verification, warn staff
    return res.json({ ok: true, noPinSet: true, message: "No PIN set for this customer. Ask them to set one at registration." });
  }
  if (String(pin) !== String(customer.pin)) {
    return res.status(401).json({ ok: false, error: "Incorrect PIN. Ask the customer to try again." });
  }
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
//  CUSTOMERS CRUD
// ════════════════════════════════════════════════════════════
app.get("/api/customers", (req, res) => {
  const data = readData();
  res.json(data.customers.map(c => ({
    ...c,
    tier:        loyalty.tierForPoints(c.points).label,
    discountPct: loyalty.discountForPoints(c.points),
  })));
});

app.post("/api/register", (req, res) => {
  const { name, phone, pin } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Name and phone are required." });
  if (!pin || !/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ error: "A 4-digit numeric PIN is required." });
  }
  const data = readData();
  if (findByPhone(data, phone)) return res.status(409).json({ error: "This phone number is already registered." });

  const customer = {
    id:          crypto.randomUUID(),
    name:        name.trim(),
    phone:       phone.trim(),
    pin:         String(pin),
    points:      loyalty.WELCOME_BONUS_POINTS,
    totalPrints: 0,
    totalVisits: 0,
    createdAt:   new Date().toISOString(),
    orders:      [],
  };
  data.customers.push(customer);
  writeData(data);
  res.json({ ok: true, customer });
});

app.put("/api/customers/:id", (req, res) => {
  const data     = readData();
  const customer = findCustomer(data, req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found." });

  const { name, phone, pin, points } = req.body;
  if (name   !== undefined) customer.name   = name;
  if (phone  !== undefined) customer.phone  = phone;
  if (points !== undefined) customer.points = Number(points);
  if (pin    !== undefined && /^\d{4}$/.test(String(pin))) customer.pin = String(pin);

  writeData(data);
  res.json({ ok: true, customer });
});

app.delete("/api/customers/:id", (req, res) => {
  const data   = readData();
  const before = data.customers.length;
  data.customers = data.customers.filter(c => c.id !== req.params.id);
  if (data.customers.length === before) return res.status(404).json({ error: "Customer not found." });
  writeData(data);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════
app.post("/api/orders", (req, res) => {
  const { phone, color = 0, bw = 0, xerox = 0, pin } = req.body;
  const colorN = Number(color), bwN = Number(bw), xeroxN = Number(xerox);
  const totalPrints = colorN + bwN + xeroxN;

  if (!phone)           return res.status(400).json({ error: "Phone number is required." });
  if (totalPrints <= 0) return res.status(400).json({ error: "Enter at least one print count." });

  const data     = readData();
  const customer = findByPhone(data, phone);
  if (!customer) return res.status(404).json({ error: "No customer with that phone. Ask them to register first." });

  // PIN verification (only if customer has a PIN set)
  if (customer.pin) {
    if (!pin) return res.status(401).json({ error: "PIN required. Ask the customer for their 4-digit PIN." });
    if (String(pin) !== String(customer.pin)) {
      return res.status(401).json({ error: "Incorrect PIN. Ask the customer to confirm their PIN." });
    }
  }

  const breakdown    = loyalty.priceOrder({ color: colorN, bw: bwN, xerox: xeroxN }, customer.points);
  const earnedPoints = loyalty.pointsForRupees(breakdown.grossRupees);

  customer.totalPrints += totalPrints;
  customer.totalVisits += 1;
  customer.points      += earnedPoints;
  customer.orders.push({
    date:        new Date().toISOString(),
    source:      "counter",
    ...breakdown,
    pointsEarned: earnedPoints,
  });

  writeData(data);
  res.json({ ok: true, breakdown, earnedPoints, customer });
});


// ════════════════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════════════════
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  Print Loyalty running!\n`);
  console.log(`  Dashboard: http://localhost:${PORT}`);
  console.log(`  Register:  ${BASE_URL}/register.html`);
  console.log(`  Check-in:  ${BASE_URL}/checkin.html\n`);
});
