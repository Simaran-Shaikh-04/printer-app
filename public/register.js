// register.js — New customer registration with PIN

const nameInput    = document.getElementById("name");
const phoneInput   = document.getElementById("phone");
const pinInput     = document.getElementById("pin");
const pinConfirm   = document.getElementById("pinConfirm");
const submitBtn    = document.getElementById("submitBtn");
const msg          = document.getElementById("msg");
const stepForm     = document.getElementById("step-form");
const stepSuccess  = document.getElementById("step-success");
const pointsShown  = document.getElementById("pointsShown");

function setMsg(text, isError) {
  msg.textContent = text;
  msg.className   = "msg " + (isError ? "error" : "ok");
}

submitBtn.addEventListener("click", async () => {
  const name  = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const pin   = pinInput.value.trim();
  const pinC  = pinConfirm.value.trim();

  msg.textContent = "";

  if (!name || !phone) { setMsg("Please fill in your name and phone number.", true); return; }
  if (phone.length < 10) { setMsg("Enter a valid 10-digit phone number.", true); return; }
  if (!/^\d{4}$/.test(pin)) { setMsg("PIN must be exactly 4 digits.", true); return; }
  if (pin !== pinC) { setMsg("PINs do not match. Please re-enter.", true); return; }

  submitBtn.disabled    = true;
  submitBtn.textContent = "Registering…";

  try {
    const res  = await fetch("/api/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, phone, pin }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMsg(data.error || "Something went wrong.", true);
      submitBtn.disabled    = false;
      submitBtn.textContent = "Register →";
      return;
    }

    pointsShown.textContent = "+" + data.customer.points;
    stepForm.classList.remove("active");
    stepSuccess.classList.add("active");
  } catch {
    setMsg("Could not reach the server. Check your connection.", true);
    submitBtn.disabled    = false;
    submitBtn.textContent = "Register →";
  }
});

[nameInput, phoneInput, pinInput, pinConfirm].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") submitBtn.click(); });
});
