// Slider Mock Order App (Clean Build)

// ✅ Your Google Apps Script Web App URL:
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwOi0sN4M2FKAcHk-ROGSjMj6dzypGbCZZaR9NfoS7aFUhQgC4AyZvded4WpqHrYk4Eow/exec";

// Fixed quantity options (no custom quantities)
const QTY_OPTIONS = [0, 25, 50, 72, 100, 150, 200, 250];

// App state
let catalog = {};
let selectedState = null;
let selectedSchool = null;

// Cart: design_id -> item
const cart = new Map();

// Elements (must exist in index.html)
const elStates = document.getElementById("states");
const elSchools = document.getElementById("schools");
const elDesigns = document.getElementById("designs");
const elStateCrumb = document.getElementById("stateCrumb");
const elSchoolCrumb = document.getElementById("schoolCrumb");
const elStateSearch = document.getElementById("stateSearch");
const elSchoolSearch = document.getElementById("schoolSearch");
const elCartPill = document.getElementById("cartPill");
const elStatus = document.getElementById("status");

const elCartSummary = document.getElementById("cartSummary");
const elCartTotals = document.getElementById("cartTotals");
const elTotalWholesale = document.getElementById("totalWholesale");
const elTotalMsrp = document.getElementById("totalMsrp");

const elCompany = document.getElementById("company");
const elName = document.getElementById("name");
const elEmail = document.getElementById("email");
const elNotes = document.getElementById("notes");
const elClearBtn = document.getElementById("clearBtn");
const elSubmitBtn = document.getElementById("submitBtn");

const elGoToCartBtn = document.getElementById("goToCartBtn");
const elCartAnchor = document.getElementById("cartAnchor");

// ---------------- Utilities ----------------
function setStatus(msg) {
  if (!elStatus) return;
  elStatus.textContent = msg || "";
}

function sortedKeys(obj) {
  return Object.keys(obj || {}).sort((a, b) => a.localeCompare(b));
}

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function cartLines() {
  return Array.from(cart.values()).filter((i) => Number(i.qty) > 0);
}

function updateCartPill() {
  if (!elCartPill) return;
  const lines = cartLines();
  const totalQty = lines.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  elCartPill.textContent = `${lines.length} lines • ${totalQty} total qty`;
}

function makeQtySelect(currentQty, onChange) {
  const sel = document.createElement("select");
  sel.className = "input";

  QTY_OPTIONS.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = v === 0 ? "Qty: 0 (Remove)" : `Qty: ${v}`;
    if (Number(currentQty) === v) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener("change", () => onChange(Number(sel.value)));
  return sel;
}

// ---------------- Render: States ----------------
function renderStates(filter = "") {
  elStates.innerHTML = "";

  const keys = sortedKeys(catalog).filter((s) =>
    s.toLowerCase().includes(filter.toLowerCase())
  );

  if (!keys.length) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = "No matching states.";
    elStates.appendChild(div);
    return;
  }

  keys.forEach((state) => {
    const div = document.createElement("div");
    div.className = "item" + (state === selectedState ? " active" : "");
    div.textContent = state;
    div.onclick = () => selectState(state);
    elStates.appendChild(div);
  });
}

// ---------------- Render: Schools ----------------
function renderSchools(filter = "") {
  elSchools.innerHTML = "";

  if (!selectedState) {
    elSchools.classList.add("muted");
    elSchools.textContent = "Select a state";
    if (elSchoolSearch) elSchoolSearch.disabled = true;
    return;
  }

  elSchools.classList.remove("muted");
  if (elSchoolSearch) elSchoolSearch.disabled = false;

  const schoolsObj = catalog[selectedState] || {};
  const schools = sortedKeys(schoolsObj).filter((s) =>
    s.toLowerCase().includes(filter.toLowerCase())
  );

  if (!schools.length) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = "No matching schools.";
    elSchools.appendChild(div);
    return;
  }

  schools.forEach((school) => {
    const div = document.createElement("div");
    div.className = "item" + (school === selectedSchool ? " active" : "");
    div.textContent = school;
    div.onclick = () => selectSchool(school);
    elSchools.appendChild(div);
  });
}

// ---------------- Selection ----------------
function selectState(state) {
  selectedState = state;
  selectedSchool = null;

  if (elStateCrumb) elStateCrumb.textContent = `Selected state: ${state}`;
  if (elSchoolCrumb) elSchoolCrumb.textContent = "No school selected";

  renderStates(elStateSearch ? elStateSearch.value : "");
  renderSchools(elSchoolSearch ? elSchoolSearch.value : "");
  renderDesigns();
  setStatus("");
}

function selectSchool(school) {
  selectedSchool = school;

  if (elSchoolCrumb) elSchoolCrumb.textContent = `Selected school: ${school}`;

  renderSchools(elSchoolSearch ? elSchoolSearch.value : "");
  renderDesigns();
  setStatus("");
}

// ---------------- Cart helpers ----------------
function upsertCartItemFromDesign(design, qty) {
  if (qty === 0) {
    cart.delete(design.design_id);
    return;
  }

  cart.set(design.design_id, {
    state: selectedState || "",
    school: selectedSchool || "",
    design_id: design.design_id,
    design_name: design.design_name,
    wholesale: Number(design.wholesale || 0),
    msrp: Number(design.msrp || 0),
    qty: Number(qty || 0)
  });
}

function addToCart(design) {
  const existing = cart.get(design.design_id);
  const qty = existing?.qty ?? 25; // default add qty
  upsertCartItemFromDesign(design, qty);

  updateCartPill();
  renderCartSummary();
  renderDesigns();
  setStatus("Added to cart ✅");
}

// ---------------- Render: Designs ----------------
function renderDesigns() {
  elDesigns.innerHTML = "";

  if (!selectedState || !selectedSchool) {
    elDesigns.classList.add("muted");
    elDesigns.textContent = "Select a school";
    return;
  }

  const designs = catalog[selectedState]?.[selectedSchool] || [];
  if (!designs.length) {
    elDesigns.classList.add("muted");
    elDesigns.textContent = "No designs found for this school.";
    return;
  }

  elDesigns.classList.remove("muted");

  designs.forEach((d) => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h4");
    title.textContent = d.design_name;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = `Wholesale: $${d.wholesale}  |  Suggested MSRP: $${d.msrp}`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = cart.has(d.design_id) ? "In Cart" : "Add to Cart";
    btn.onclick = () => addToCart(d);

    const currentQty = cart.get(d.design_id)?.qty ?? 0;
    const qtySel = makeQtySelect(currentQty, (newQty) => {
      upsertCartItemFromDesign(d, newQty);
      updateCartPill();
      renderCartSummary();
      renderDesigns();
    });

    actions.appendChild(btn);
    actions.appendChild(qtySel);

    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(actions);

    elDesigns.appendChild(card);
  });
}

// ---------------- Render: Cart Summary ----------------
function renderCartSummary() {
  if (!elCartSummary) return;

  const lines = cartLines();

  if (!lines.length) {
    elCartSummary.classList.add("muted");
    elCartSummary.textContent = "No items yet. Click “Add to Cart” on any design.";
    if (elCartTotals) elCartTotals.style.display = "none";
    return;
  }

  elCartSummary.classList.remove("muted");
  elCartSummary.innerHTML = "";

  // sort
  lines.sort(
    (a, b) =>
      (a.state || "").localeCompare(b.state || "") ||
      (a.school || "").localeCompare(b.school || "") ||
      (a.design_name || "").localeCompare(b.design_name || "")
  );

  // totals
  const wholesaleTotal = lines.reduce(
    (sum, i) => sum + Number(i.qty || 0) * Number(i.wholesale || 0),
    0
  );
  const msrpTotal = lines.reduce(
    (sum, i) => sum + Number(i.qty || 0) * Number(i.msrp || 0),
    0
  );

  if (elCartTotals && elTotalWholesale && elTotalMsrp) {
    elCartTotals.style.display = "flex";
    elTotalWholesale.textContent = money(wholesaleTotal);
    elTotalMsrp.textContent = money(msrpTotal);
  }

  lines.forEach((it) => {
    const row = document.createElement("div");
    row.className = "item cart-row";

    const left = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = it.design_name;

    const meta = document.createElement("div");
    meta.className = "cart-meta";
    meta.textContent = `${it.state} • ${it.school}  |  Wholesale: $${it.wholesale}  |  MSRP: $${it.msrp}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "cart-actions";

    const qtySel = makeQtySelect(it.qty, (newQty) => {
      if (newQty === 0) cart.delete(it.design_id);
      else cart.set(it.design_id, { ...it, qty: newQty });

      updateCartPill();
      renderCartSummary();
      renderDesigns();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "small-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      cart.delete(it.design_id);
      updateCartPill();
      renderCartSummary();
      renderDesigns();
    };

    right.appendChild(qtySel);
    right.appendChild(removeBtn);

    row.appendChild(left);
    row.appendChild(right);

    elCartSummary.appendChild(row);
  });
}

// ---------------- Submit ----------------
async function submitMockOrder() {
  setStatus("");

  const items = cartLines();
  if (!items.length) {
    setStatus("Add at least one item to the cart before submitting.");
    return;
  }

  if (!SCRIPT_URL || SCRIPT_URL.includes("SCRIPT_URL_HERE")) {
    setStatus("Submit endpoint not connected. Please set SCRIPT_URL in app.js.");
    return;
  }

  const payload = {
    meta: {
      company: (elCompany?.value || "").trim(),
      name: (elName?.value || "").trim(),
      email: (elEmail?.value || "").trim(),
      notes: (elNotes?.value || "").trim(),
      state: selectedState || ""
    },
    items
  };

  try {
    elSubmitBtn.disabled = true;
    setStatus("Submitting...");

    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      setStatus("Submission failed. Check Apps Script permissions/deployment.");
      elSubmitBtn.disabled = false;
      return;
    }

    cart.clear();
    updateCartPill();
    renderCartSummary();
    renderDesigns();

    setStatus(`Submitted ✅ (${data.rows || items.length} line items saved)`);
    elSubmitBtn.disabled = false;
  } catch (err) {
    setStatus(`Submission failed: ${String(err)}`);
    elSubmitBtn.disabled = false;
  }
}

// ---------------- Clear ----------------
function clearCart() {
  cart.clear();
  updateCartPill();
  renderCartSummary();
  renderDesigns();
  setStatus("Cleared cart.");
}

// ---------------- Events ----------------
if (elStateSearch) elStateSearch.addEventListener("input", () => renderStates(elStateSearch.value));
if (elSchoolSearch) elSchoolSearch.addEventListener("input", () => renderSchools(elSchoolSearch.value));
if (elClearBtn) elClearBtn.addEventListener("click", clearCart);
if (elSubmitBtn) elSubmitBtn.addEventListener("click", submitMockOrder);

if (elGoToCartBtn && elCartAnchor) {
  elGoToCartBtn.addEventListener("click", () => {
    elCartAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ---------------- Init ----------------
(async function init() {
  try {
    setStatus("Loading catalog...");
    const res = await fetch("catalog.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`catalog.json HTTP ${res.status}`);
    catalog = await res.json();

    renderStates("");
    updateCartPill();
    renderCartSummary();

    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Could not load catalog.json. Make sure it exists in the repo root and is valid JSON.");
  }
})();
