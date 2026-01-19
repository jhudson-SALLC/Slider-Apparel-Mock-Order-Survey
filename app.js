// Slider Mock Order App (S1–S3 pricing + fixed qty dropdowns)

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwOi0sN4M2FKAcHk-ROGSjMj6dzypGbCZZaR9NfoS7aFUhQgC4AyZvded4WpqHrYk4Eow/exec";

// Allowed quantities only
const QTY_OPTIONS = [0, 25, 50, 72, 100, 150, 200, 250];

// Wholesale pricing (PPU) by style + qty
const WHOLESALE = {
  S1: { 25: 18.5, 50: 15.75, 72: 14.75, 100: 13.75, 150: 12.75, 200: 11.75, 250: 11.5 },
  S2: { 25: 25.0, 50: 18.0, 72: 16.75, 100: 15.75, 150: 14.75, 200: 13.75, 250: 13.5 },
  S3: { 25: 20.0, 50: 17.0, 72: 16.0, 100: 15.0, 150: 14.0, 200: 13.25, 250: 13.0 }
};

function getWholesalePPU(design, qty) {
  const style = String(design.style || "").toUpperCase().trim();
  const table = WHOLESALE[style];
  if (table && table[qty] != null) return Number(table[qty]);

  // If style is missing, show 0 so we notice and fix catalog.json
  return 0;
}

let catalog = {};
let selectedState = null;
let selectedSchool = null;

// Cart: design_id -> { state, school, design_id, design_name, style, qty, wholesale_ppu, msrp }
const cart = new Map();

// Elements
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

function setStatus(msg) {
  elStatus.textContent = msg || "";
}

function sortedKeys(obj) {
  return Object.keys(obj || {}).sort((a, b) => a.localeCompare(b));
}

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function cartLines() {
  return Array.from(cart.values()).filter((i) => Number(i.qty) > 0);
}

function updateCartPill() {
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

function renderStates(filter = "") {
  elStates.innerHTML = "";
  const keys = sortedKeys(catalog).filter((s) => s.toLowerCase().includes(filter.toLowerCase()));

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

function renderSchools(filter = "") {
  elSchools.innerHTML = "";

  if (!selectedState) {
    elSchools.classList.add("muted");
    elSchools.textContent = "Select a state";
    elSchoolSearch.disabled = true;
    return;
  }

  elSchools.classList.remove("muted");
  elSchoolSearch.disabled = false;

  const schoolsObj = catalog[selectedState] || {};
  const schools = sortedKeys(schoolsObj).filter((s) => s.toLowerCase().includes(filter.toLowerCase()));

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

function selectState(state) {
  selectedState = state;
  selectedSchool = null;

  elStateCrumb.textContent = `Selected state: ${state}`;
  elSchoolCrumb.textContent = "No school selected";

  renderStates(elStateSearch.value);
  renderSchools(elSchoolSearch.value);
  renderDesigns();
  setStatus("");
}

function selectSchool(school) {
  selectedSchool = school;
  elSchoolCrumb.textContent = `Selected school: ${school}`;
  renderSchools(elSchoolSearch.value);
  renderDesigns();
  setStatus("");
}

function upsertCartFromDesign(design, qty) {
  if (qty === 0) {
    cart.delete(design.design_id);
    return;
  }

  const wholesale_ppu = getWholesalePPU(design, qty);
  const msrp = Number(design.msrp || 0);

  cart.set(design.design_id, {
    state: selectedState || "",
    school: selectedSchool || "",
    design_id: design.design_id,
    design_name: design.design_name,
    style: String(design.style || "").toUpperCase(),
    qty,
    wholesale_ppu,
    msrp
  });
}

function addToCart(design) {
  const existing = cart.get(design.design_id);
  const qty = existing?.qty ?? 25;
  upsertCartFromDesign(design, qty);

  updateCartPill();
  renderCartSummary();
  renderDesigns();
  setStatus("Added to cart ✅");
}

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

    const style = String(d.style || "").toUpperCase();
    const currentQty = cart.get(d.design_id)?.qty ?? 0;
    const ppu = currentQty ? getWholesalePPU(d, currentQty) : getWholesalePPU(d, 50);
    const msrp = Number(d.msrp || 0);

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = `Style: ${style || "—"}  |  Wholesale: ${money(ppu)} PPU  |  Suggested MSRP: ${money(msrp)}`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = cart.has(d.design_id) ? "In Cart" : "Add to Cart";
    btn.onclick = () => addToCart(d);

    const qtySel = makeQtySelect(currentQty, (newQty) => {
      // If they adjust qty before clicking "Add to Cart", we still treat it as a cart action
      upsertCartFromDesign(d, newQty);
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

function renderCartSummary() {
  const lines = cartLines();

  if (!lines.length) {
    elCartSummary.classList.add("muted");
    elCartSummary.textContent = "No items yet. Click “Add to Cart” on any design.";
    elCartTotals.style.display = "none";
    return;
  }

  elCartSummary.classList.remove("muted");
  elCartSummary.innerHTML = "";

  lines.sort(
    (a, b) =>
      (a.state || "").localeCompare(b.state || "") ||
      (a.school || "").localeCompare(b.school || "") ||
      (a.design_name || "").localeCompare(b.design_name || "")
  );

  const wholesaleTotal = lines.reduce((sum, i) => sum + Number(i.qty) * Number(i.wholesale_ppu), 0);
  const msrpTotal = lines.reduce((sum, i) => sum + Number(i.qty) * Number(i.msrp), 0);

  elCartTotals.style.display = "flex";
  elTotalWholesale.textContent = money(wholesaleTotal);
  elTotalMsrp.textContent = money(msrpTotal);

  lines.forEach((it) => {
    const row = document.createElement("div");
    row.className = "item cart-row";

    const left = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = it.design_name;

    const meta = document.createElement("div");
    meta.className = "cart-meta";
    meta.textContent = `${it.state} • ${it.school} • ${it.style}  |  Wholesale: ${money(it.wholesale_ppu)} PPU  |  MSRP: ${money(it.msrp)}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "cart-actions";

    const qtySel = makeQtySelect(it.qty, (newQty) => {
      if (newQty === 0) cart.delete(it.design_id);
      else {
        // recompute wholesale based on new qty
        const wholesale_ppu = getWholesalePPU({ style: it.style }, newQty);
        cart.set(it.design_id, { ...it, qty: newQty, wholesale_ppu });
      }
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

async function submitMockOrder() {
  setStatus("");

  const items = cartLines();
  if (!items.length) {
    setStatus("Add at least one item to the cart before submitting.");
    return;
  }

  const payload = {
    meta: {
      company: (elCompany.value || "").trim(),
      name: (elName.value || "").trim(),
      email: (elEmail.value || "").trim(),
      notes: (elNotes.value || "").trim(),
      state: selectedState || ""
    },
    items: items.map((it) => ({
      state: it.state,
      school: it.school,
      design_id: it.design_id,
      design_name: it.design_name,
      style: it.style,
      wholesale: it.wholesale_ppu,
      msrp: it.msrp,
      qty: it.qty
    }))
  };

  try {
    elSubmitBtn.disabled = true;
    setStatus("Submitting...");

    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }

    if (!res.ok || !data.ok) {
      setStatus(`Submission failed: ${data.error || "Unknown error"} (HTTP ${res.status})`);
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

function clearCart() {
  cart.clear();
  updateCartPill();
  renderCartSummary();
  renderDesigns();
  setStatus("Cleared cart.");
}

// Events
elStateSearch.addEventListener("input", () => renderStates(elStateSearch.value));
elSchoolSearch.addEventListener("input", () => renderSchools(elSchoolSearch.value));
elClearBtn.addEventListener("click", clearCart);
elSubmitBtn.addEventListener("click", submitMockOrder);

if (elGoToCartBtn && elCartAnchor) {
  elGoToCartBtn.addEventListener("click", () => {
    elCartAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// Init
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
