document.documentElement.classList.add("js");

// Footer year
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Top bar: hairline once the page scrolls, and mark the section in view
const topBar = document.querySelector(".top");
if (topBar) {
  const stuck = () => topBar.classList.toggle("is-stuck", window.scrollY > 8);
  window.addEventListener("scroll", stuck, { passive: true });
  stuck();
  const links = Array.from(topBar.querySelectorAll('.top-nav a[href^="#"]'));
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  if (byId.size && "IntersectionObserver" in window) {
    const seen = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.remove("is-current"));
          byId.get(e.target.id).classList.add("is-current");
        }),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    byId.forEach((_, id) => {
      const el = document.getElementById(id);
      if (el) seen.observe(el);
    });
  }
}

// Live clocks for New Orleans and Madrid
const clocks = document.querySelectorAll("time[data-tz]");
if (clocks.length) {
  const tick = () =>
    clocks.forEach((t) => {
      const now = new Date().toLocaleTimeString("en-US", { timeZone: t.dataset.tz, hour: "numeric", minute: "2-digit" });
      t.textContent = now;
    });
  tick();
  setInterval(tick, 20000);
}

// Tabs: one helper for the analysis steps, the study viewer, and the app preview.
// Panels stay in the layout and fade, so nothing jumps when you switch.
const setupTabs = (tablist, onSelect) => {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
  const select = (index, focus) => {
    tabs.forEach((t, i) => {
      const on = i === index;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[i].classList.toggle("is-on", on);
      panels[i].inert = !on;
    });
    if (focus) tabs[index].focus();
    if (onSelect) onSelect(index, tabs[index]);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i, false));
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      const to = { ArrowRight: i === last ? 0 : i + 1, ArrowDown: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(to, true);
    });
  });
  return select;
};

// Split It: a working preview of the app with one of its sample receipts
const phone = document.getElementById("splitit");
if (phone) {
  const money = (cents) => "$" + (cents / 100).toFixed(2);
  const people = [
    { id: "me", name: "Me", color: "#059669" },
    { id: "f2", name: "Friend 2", color: "#2563eb" },
    { id: "f3", name: "Friend 3", color: "#7c3aed" },
  ];
  const all = people.map((p) => p.id);
  const items = [
    { name: "Crispy Calamari", cents: 1450, who: [...all] },
    { name: "Wood-Fired Margherita Pizza", cents: 1800, who: ["me"] },
    { name: "Truffle Mushroom Rigatoni", cents: 2250, who: ["f2"] },
    { name: "House Chianti Glass × 2", cents: 2400, who: ["f2", "f3"] },
    { name: "Classic Tiramisu", cents: 900, who: [...all] },
    { name: "San Pellegrino Sparkling", cents: 550, who: ["f3"] },
  ];
  const printedSubtotal = 9350;
  const tax = 842;
  let tipRate = 18;
  let misread = false;
  const price = (item, i) => (misread && i === 0 ? 4150 : item.cents);
  const itemsSum = () => items.reduce((sum, item, i) => sum + price(item, i), 0);

  // Shares are worked out in whole cents, and leftover cents are handed out one at a time,
  // so the people's totals always add up to the bill.
  const proportional = (total, weights) => {
    const weightSum = weights.reduce((a, b) => a + b, 0);
    if (!weightSum) return weights.map(() => 0);
    const exact = weights.map((w) => (total * w) / weightSum);
    const shares = exact.map(Math.floor);
    let left = total - shares.reduce((a, b) => a + b, 0);
    exact.map((x, i) => [x - shares[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { shares[i] += 1; left -= 1; } });
    return shares;
  };
  const breakdown = () => {
    const own = people.map(() => 0);
    let unassigned = 0;
    items.forEach((item, i) => {
      const ids = item.who;
      if (!ids.length) { unassigned += 1; return; }
      const base = Math.floor(price(item, i) / ids.length);
      let extra = price(item, i) - base * ids.length;
      ids.forEach((id) => { own[people.findIndex((p) => p.id === id)] += base + (extra-- > 0 ? 1 : 0); });
    });
    const tip = Math.round((itemsSum() * tipRate) / 100);
    const taxes = proportional(tax, own);
    const tips = proportional(tip, own);
    return { own, taxes, tips, tip, unassigned, total: itemsSum() + tax + tip };
  };

  const review = document.getElementById("sp-review");
  const split = document.getElementById("sp-split");
  const summary = document.getElementById("sp-summary");
  let goTo = () => {};

  const render = () => {
    const sum = itemsSum();
    const off = sum !== printedSubtotal;
    review.innerHTML =
      (off
        ? `<div class="sp-warn"><b>Double-check the items. Some prices may be off.</b><span>Sum of items is ${money(sum)} (printed subtotal: ${money(printedSubtotal)})</span><button type="button" class="sp-btn is-amber" data-act="fix">Correct the Calamari line</button></div>`
        : `<div class="sp-ok"><span class="sp-badge">Confidence: high</span><span><b>Items add up to the printed subtotal.</b> ${money(printedSubtotal)}</span></div>`) +
      `<div class="sp-card">${items.map((item, i) => `<div class="sp-row${misread && i === 0 ? " is-off" : ""}"><span>${item.name}</span><span class="sp-num">${money(price(item, i))}</span></div>`).join("")}<div class="sp-row"><span class="sp-muted">Tax</span><span class="sp-num sp-muted">${money(tax)}</span></div></div>` +
      (off ? "" : `<button type="button" class="sp-btn is-soft" data-act="misread">See what happens when the model misreads a price</button>`) +
      `<button type="button" class="sp-btn" data-act="next" style="margin-top:.6rem">Looks right. Split it</button>`;

    split.innerHTML =
      `<div class="sp-card">${items.map((item, i) => {
        const n = item.who.length;
        return `<div class="sp-item"><div class="sp-item-top"><span>${item.name}</span><span class="sp-num">${money(price(item, i))}</span></div><div class="sp-muted">${n > 1 ? `${money(Math.floor(price(item, i) / n))} each (${n} ways)` : n === 1 ? "1 person" : "Not assigned yet"}</div><div class="sp-who">${people.map((p) => `<button type="button" class="sp-chip" style="--pc:${p.color}" aria-pressed="${item.who.includes(p.id)}" data-item="${i}" data-person="${p.id}">${p.name}</button>`).join("")}<button type="button" class="sp-chip is-all" data-item="${i}" data-person="all">Everyone</button></div></div>`;
      }).join("")}</div>` +
      `<div class="sp-card sp-tip"><span>Tip</span>${[15, 18, 20].map((r) => `<button type="button" class="sp-chip" style="--pc:#1c1917" aria-pressed="${r === tipRate}" data-tip="${r}">${r}%</button>`).join("")}</div>` +
      `<button type="button" class="sp-btn" data-act="summary" style="margin-top:.6rem">See each person’s share</button>`;

    const b = breakdown();
    summary.innerHTML =
      `<div class="sp-total"><small>Bill total with tax and ${tipRate}% tip</small><strong>${money(b.total)}</strong></div>` +
      (b.unassigned ? `<div class="sp-warn" style="margin-top:.6rem"><b>${b.unassigned} ${b.unassigned === 1 ? "item is" : "items are"} not assigned yet.</b><span>Go back to Split and tap who had ${b.unassigned === 1 ? "it" : "them"}.</span></div>` : "") +
      people.map((p, i) => `<div class="sp-card sp-person" style="--pc:${p.color}"><span class="sp-avatar">${p.name === "Me" ? "Me" : "F" + p.name.slice(-1)}</span><span><b>${p.name}</b><span class="sp-muted" style="display:block">Items ${money(b.own[i])} · tax ${money(b.taxes[i])} · tip ${money(b.tips[i])}</span></span><strong>${money(b.own[i] + b.taxes[i] + b.tips[i])}</strong></div>`).join("") +
      `<p class="sp-muted" style="margin-top:.7rem;text-align:center">Tax and tip follow what each person ordered. The three shares add up to the bill exactly.</p>`;
  };

  phone.addEventListener("click", (e) => {
    const el = e.target.closest("button");
    if (!el) return;
    if (el.dataset.act === "misread") misread = true;
    else if (el.dataset.act === "fix") misread = false;
    else if (el.dataset.act === "next") return goTo(1);
    else if (el.dataset.act === "summary") return goTo(2);
    else if (el.dataset.tip) tipRate = Number(el.dataset.tip);
    else if (el.dataset.item) {
      const item = items[Number(el.dataset.item)];
      if (el.dataset.person === "all") item.who = item.who.length === all.length ? [] : [...all];
      else item.who = item.who.includes(el.dataset.person) ? item.who.filter((id) => id !== el.dataset.person) : [...item.who, el.dataset.person];
    } else return;
    const top = el.closest(".sp-screen").scrollTop;
    render();
    phone.querySelector(".sp-screen.is-on").scrollTop = top;
  });

  render();
  const select = setupTabs(phone.querySelector(".sp-tabs"));
  goTo = (i) => select(i, false);
  select(0, false);
}

// How I read a conversation: read, code, interpret, so what, your turn
const reader = document.querySelector(".reader");
if (reader) {
  const segs = Array.from(reader.querySelectorAll(".seg"));
  const codeButtons = reader.querySelectorAll(".code");
  const findingButtons = reader.querySelectorAll("[data-finding]:not(.reader)");
  const pens = Array.from(reader.querySelectorAll(".pen"));
  const result = reader.querySelector(".rd-result");
  const count = reader.querySelector(".rd-count");
  const stepNames = ["read", "code", "interpret", "sowhat", "yours"];
  const names = { disclosure: "Self-disclosure", checking: "Checking the answer", person: "Treating it as a person", handover: "Handing over the decision", repair: "Repair", "": "No code" };
  let pen = "disclosure";

  const chooseCode = (code) => {
    reader.dataset.active = code;
    codeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.code === code)));
  };
  codeButtons.forEach((b) => b.addEventListener("click", () => chooseCode(b.getAttribute("aria-pressed") === "true" ? "all" : b.dataset.code)));

  const chooseFinding = (n) => {
    reader.dataset.finding = n;
    findingButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.finding === n)));
  };
  findingButtons.forEach((b) => b.addEventListener("click", () => chooseFinding(b.dataset.finding)));

  const selectStep = setupTabs(reader.querySelector(".rd-steps"), (i) => {
    const step = stepNames[i];
    reader.dataset.step = step;
    segs.forEach((s) => {
      if (step === "yours") { s.setAttribute("role", "button"); s.tabIndex = 0; }
      else { s.removeAttribute("role"); s.removeAttribute("tabindex"); }
    });
  });
  reader.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => {
    selectStep(stepNames.indexOf(b.dataset.goto), false);
    if (window.matchMedia("(max-width: 63.99rem)").matches) reader.scrollIntoView({ block: "start" });
  }));

  const setPen = (button) => {
    pen = button.dataset.pen;
    pens.forEach((p) => p.setAttribute("aria-checked", String(p === button)));
  };
  pens.forEach((p, i) => {
    p.addEventListener("click", () => setPen(p));
    p.addEventListener("keydown", (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = pens[(i + step + pens.length) % pens.length];
      setPen(next);
      next.focus();
    });
  });

  const clearVerdicts = () => {
    segs.forEach((s) => { s.removeAttribute("data-verdict"); s.classList.remove("agree", "differ"); });
    result.hidden = true;
  };
  const updateCount = () => {
    const n = segs.filter((s) => s.dataset.guess).length;
    count.textContent = `${n} of ${segs.length} sentences highlighted`;
  };
  const act = (seg) => {
    const step = reader.dataset.step;
    if (step === "code") {
      if (seg.dataset.code) chooseCode(reader.dataset.active === seg.dataset.code ? "all" : seg.dataset.code);
      return;
    }
    if (step !== "yours") return;
    clearVerdicts();
    if (!pen || seg.dataset.guess === pen) seg.removeAttribute("data-guess");
    else seg.dataset.guess = pen;
    updateCount();
  };
  segs.forEach((s) => {
    s.addEventListener("click", () => act(s));
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(s); }
    });
  });

  reader.querySelector("[data-compare]").addEventListener("click", () => {
    let agreed = 0;
    const list = reader.querySelector(".rd-why");
    list.innerHTML = "";
    segs.forEach((s, i) => {
      const mine = s.dataset.code;
      const yours = s.dataset.guess || "";
      const same = mine === yours;
      if (same) agreed += 1;
      s.classList.toggle("agree", same);
      s.classList.toggle("differ", !same);
      if (!same) s.dataset.verdict = `Mine: ${names[mine]}`;
      else if (mine) s.dataset.verdict = "We agree";
      else s.removeAttribute("data-verdict");
      const li = document.createElement("li");
      li.className = same ? "agree" : "differ";
      const label = document.createElement("b");
      label.textContent = `Sentence ${i + 1}${same ? "" : ", we differ"}`;
      const why = document.createElement("span");
      why.textContent = (same ? "" : `You: ${names[yours]}. `) + s.dataset.why;
      li.append(label, why);
      if (same) list.append(li);
      else list.insertBefore(li, list.querySelector("li.agree"));
    });
    reader.querySelector(".rd-score").textContent = `We agreed on ${agreed} of ${segs.length} sentences.`;
    result.hidden = false;
  });
  reader.querySelector("[data-reset]").addEventListener("click", () => {
    segs.forEach((s) => s.removeAttribute("data-guess"));
    clearVerdicts();
    updateCount();
  });

  chooseCode("all");
  chooseFinding("1");
  selectStep(0, false);
}

// Study proposals: three studies, four parts each, all in one viewer.
// Switching study keeps the part you were reading.
const viewer = document.querySelector(".briefs");
if (viewer) {
  let part = 0;
  const partSelectors = Array.from(viewer.querySelectorAll(".steps")).map((list) => setupTabs(list, (i) => (part = i)));
  const selectStudy = setupTabs(viewer.querySelector(".brief-tabs"), (i) => {
    const keep = part;
    partSelectors[i](keep, false);
  });
  partSelectors.forEach((select) => select(0, false));
  selectStudy(0, false);
}

// Copy email
document.querySelectorAll("[data-copy]").forEach((button) => {
  const label = button.textContent;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Email copied";
    } catch {
      button.textContent = button.dataset.copy;
    }
    setTimeout(() => (button.textContent = label), 2200);
  });
});

// Reading progress on the story page
const bar = document.querySelector(".read-progress span");
if (bar) {
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}
