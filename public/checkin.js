// checkin.js — Customer loyalty card viewer (no queue)

let phoneData = null;

const screens = {
  phone: document.getElementById("step-phone"),
  pin:   document.getElementById("step-pin"),
  card:  document.getElementById("step-card"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ── Step 1: Phone lookup ───────────────────────────────────
const phoneInput = document.getElementById("phoneInput");
const findBtn    = document.getElementById("findBtn");
const phoneMsg   = document.getElementById("phoneMsg");

findBtn.addEventListener("click", async () => {
  const phone = phoneInput.value.trim();
  if (!phone || phone.length < 10) {
    phoneMsg.textContent = "Enter a valid 10-digit mobile number.";
    phoneMsg.className = "msg error";
    return;
  }

  findBtn.disabled = true;
  findBtn.textContent = "Looking up…";
  phoneMsg.textContent = "";

  try {
    const res  = await fetch(`/api/lookup/${encodeURIComponent(phone)}`);
    const data = await res.json();

    if (!res.ok) {
      phoneMsg.textContent = data.error || "Not registered.";
      phoneMsg.className = "msg error";
      return;
    }

    phoneData = { ...data, phone };

    if (data.hasPin) {
      // Ask for PIN
      document.getElementById("pinInput").value = "";
      document.getElementById("pinMsg").textContent = "";
      showScreen("pin");
    } else {
      // No PIN set — show card directly
      renderCard();
      showScreen("card");
    }
  } catch {
    phoneMsg.textContent = "Cannot reach the server.";
    phoneMsg.className = "msg error";
  } finally {
    findBtn.disabled = false;
    findBtn.textContent = "Check my account →";
  }
});

phoneInput.addEventListener("keydown", e => { if (e.key === "Enter") findBtn.click(); });

// ── Step 2: PIN verify ────────────────────────────────────
const pinInput  = document.getElementById("pinInput");
const verifyBtn = document.getElementById("verifyBtn");
const pinMsg    = document.getElementById("pinMsg");

document.getElementById("backBtn").addEventListener("click", () => {
  showScreen("phone");
});

verifyBtn.addEventListener("click", async () => {
  const pin = pinInput.value.trim();
  if (!/^\d{4}$/.test(pin)) {
    pinMsg.textContent = "Enter your 4-digit PIN.";
    pinMsg.className = "msg error";
    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.textContent = "Verifying…";

  try {
    const res  = await fetch("/api/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneData.phone, pin }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      pinMsg.textContent = data.error || "Incorrect PIN.";
      pinMsg.className = "msg error";
      return;
    }

    renderCard();
    showScreen("card");
  } catch {
    pinMsg.textContent = "Cannot reach the server.";
    pinMsg.className = "msg error";
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify →";
  }
});

pinInput.addEventListener("keydown", e => { if (e.key === "Enter") verifyBtn.click(); });

// ── Step 3: Loyalty card ──────────────────────────────────
function renderCard() {
  document.getElementById("cardName").textContent    = phoneData.name;
  document.getElementById("cardPoints").textContent  = phoneData.points;
  document.getElementById("cardDiscount").textContent = phoneData.discountPct + "%";

  const tierEl = document.getElementById("cardTier");
  tierEl.textContent = phoneData.tier + " Member";
  tierEl.className = "lc-tier " + phoneData.tier;

  document.getElementById("cardStats").innerHTML =
    `📋 <strong>${phoneData.totalPrints}</strong> total prints &nbsp;·&nbsp; 
     🔁 <strong>${phoneData.totalVisits}</strong> visits`;
}

document.getElementById("checkAnotherBtn").addEventListener("click", () => {
  phoneInput.value = "";
  phoneMsg.textContent = "";
  phoneData = null;
  showScreen("phone");
});
