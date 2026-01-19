// 1) Paste your Google Apps Script Web App URL here later:
const SCRIPT_URL = "SCRIPT_URL_HERE";

// State
let catalog = {};
let selectedState = null;
let selectedSchool = null;

// Cart Map: design_id -> item object
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

const elCompany = document.getElementById("company");
const elName = document.getElementById("name");
const elEmail = document.getElementById("email");
const elNotes = document.getElementById("notes");
const elClearBtn = document.getElementById("clearBtn");
const elSubmitBtn = document.getElementById("submitBtn");

function setStatus(msg) {
  elStatus.textContent = msg || "";
}

function sortedKeys(obj) {
  return Object.keys(obj).sort((a, b) => a.localeCompare(b));
}

function updateCartPill() {
  let totalQty = 0;
  for (const v of cart.values()) totalQty += Number(v.qty || 0);
  elCartPill.textContent = `${totalQty} total qty`;
}

function renderStates(filter = "") {
  elStates.innerHTML = "";
  const keys = sortedKeys(catalog).filter(s => s.toLowerCase().includes(filter.toLowerCase()));

  if (keys.length === 0) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = "No matching states.";
    elStates.appendChild(div);
    return;
  }

  keys.forEach(state => {
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
  const schools = sortedKeys(schoolsObj).filter(s => s.toLowerCase().includes(filter.toLowerCase()));

  if (schools.length === 0) {
    const div = document.createElement("div");
    div.className = "muted";
    div.textContent = "No matching schools.";
    elSchools.appendChild(div);
    return;
  }

  schools.forEach(school => {
    const div = document.createElement("div");
    div.className = "item" + (school === selectedSchool ? " active" : "");
    div.textContent = school;
    div.onclick = () => selectSchool(school);
    elSchools.appendChild(div);
  });
}

function renderDesigns() {
  elDesigns.innerHTML = "";
function renderCartSummary() {
  if (!elCartSummary) return;

  const items = Array.from(cart.values()).filter(i => Number(i.qty) > 0);

  if (!items.length) {
    elCartSummary.classList.add("muted");
    elCartSummary.textContent = "No items yet. Add quantities from any school.";
    return;
  }

  elCartSummary.classList.remove("muted");
  elCartSummary.innerHTML = "";

  // Sort by state, school, then design name
  items.sort((a, b) =>
    (a.state || "").localeCompare(b.state || "") ||
    (a.school || "").localeCompare(b.school || "") ||
    (a.design_name || "").localeCompare(b.design_name || "")
  );

  items.forEach((it) => {
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

    const qty = document.createElement("input");
    qty.className = "input";
    qty.type = "number";
    qty.min = "0";
    qty.step = "1";
    qty.value = it.qty;

    qty.oninput = () => {
      const newQty = Math.max(0, Math.floor(Number(qty.value || 0)));
      if (newQty === 0) cart.delete(it.design_id);
      else cart.set(it.design_id, { ...it, qty: newQty });

      updateCartPill();
      renderCartSummary();
      renderDesigns(); // keeps current school page in sync
    };

    const remove = document.createElement("button");
    remove.className = "small-btn";
    remove.textContent = "Remove";
    remove.onclick = () => {
      cart.delete(it.design_id);
      updateCartPill();
      renderCartSummary();
      renderDesigns();
    };

    right.appendChild(qty);
    right.appendChild(remove);

    row.appendChild(left);
    row.appendChild(right);

    elCartSummary.appendChild(row);
  });
}

  if (!selectedState || !selectedSchool) {
    elDesigns.classList.add("muted");
    elDesigns.textContent = "Select a school";
    return;
  }

  const designs = (catalog[selectedState]?.[selectedSchool]) || [];
  if (!designs.length) {
    elDesigns.classList.add("muted");
    elDesigns.textContent = "No designs found for this school.";
    return;
  }

  elDesigns.classList.remove("muted");

  designs.forEach(d => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h4");
    title.textContent = d.design_name;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = `Wholesale: $${d.wholesale}  |  Suggested MSRP: $${d.msrp}`;

    const qtyWrap = document.createElement("div");
    qtyWrap.className = "qty";

    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = "Qty";

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = cart.get(d.design_id)?.qty ?? 0;

    input.oninput = () => {
      const qty = Math.max(0, Math.floor(Number(input.value || 0)));

      if (qty === 0) {
        cart.delete(d.design_id);
      } else {
        cart.set(d.design_id, {
          state: selectedState,
          school: selectedSchool,
          design_id: d.design_id,
          design_name: d.design_name,
          wholesale: d.wholesale,
          msrp: d.msrp,
          qty
        });
      }

      updateCartPill();
    };

    qtyWrap.appendChild(label);
    qtyWrap.appendChild(input);

    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(qtyWrap);

    elDesigns.appendChild(card);
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

async function submitMockOrder() {
  setStatus("");

  const items = Array.from(cart.values()).filter(i => Number(i.qty) > 0);
  if (!items.length) {
    setStatus("Add at least one quantity before submitting.");
    return;
  }

  if (SCRIPT_URL === "SCRIPT_URL_HERE") {
    setStatus("Your submit endpoint isn’t connected yet. Add your Google Apps Script URL in app.js.");
    return;
  }

  const payload = {
    meta: {
      company: elCompany.value.trim(),
      name: elName.value.trim(),
      email: elEmail.value.trim(),
      notes: elNotes.value.trim(),
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
      setStatus("Submission failed. Double-check your Apps Script deployment settings.");
      elSubmitBtn.disabled = false;
      return;
    }

    // Clear cart quantities
    cart.clear();
    updateCartPill();
    renderDesigns();

    setStatus(`Submitted ✅ (${data.rows || items.length} line items saved)`);
    elSubmitBtn.disabled = false;

  } catch (err) {
    setStatus("Submission failed. This is usually a permissions/CORS issue—tell me what it says and I’ll fix it.");
    elSubmitBtn.disabled = false;
  }
}

function clearAll() {
  cart.clear();
  updateCartPill();
  renderDesigns();
  setStatus("Cleared.");
}

// Search handlers
elStateSearch.addEventListener("input", () => renderStates(elStateSearch.value));
elSchoolSearch.addEventListener("input", () => renderSchools(elSchoolSearch.value));

elClearBtn.addEventListener("click", clearAll);
elSubmitBtn.addEventListener("click", submitMockOrder);

// Load catalog.json
(async function init() {
  try {
    const res = await fetch("catalog.json", { cache: "no-store" });
    catalog = await res.json();
    renderStates("");
    updateCartPill();
    setStatus("");
  } catch (err) {
    setStatus("Could not load catalog.json. Make sure the file exists in the repo root.");
  }
})();
