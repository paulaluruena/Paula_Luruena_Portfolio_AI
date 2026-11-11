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

// Coded conversation
const coder = document.querySelector(".coder");
if (coder) {
  const segs = Array.from(coder.querySelectorAll(".seg"));
  const codeButtons = coder.querySelectorAll(".code");
  const modeButtons = coder.querySelectorAll(".mode button");
  const pens = Array.from(coder.querySelectorAll(".pen"));
  const result = coder.querySelector(".result");
  const names = {
    disclosure: "Self-disclosure",
    checking: "Checking the answer",
    person: "Treating it as a person",
    handover: "Handing over the decision",
    repair: "Repair",
    "": "No code",
  };
  let pen = "disclosure";

  const choose = (code) => {
    coder.dataset.active = code;
    codeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.code === code)));
  };
  codeButtons.forEach((b) =>
    b.addEventListener("click", () => choose(b.getAttribute("aria-pressed") === "true" ? "all" : b.dataset.code))
  );

  const clearVerdicts = () => {
    segs.forEach((s) => {
      s.removeAttribute("data-verdict");
      s.classList.remove("agree", "differ");
    });
    result.hidden = true;
  };

  const setMode = (mode) => {
    coder.dataset.mode = mode;
    modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    segs.forEach((s) => {
      const active = mode === "yours";
      if (active) {
        s.setAttribute("role", "button");
        s.tabIndex = 0;
      } else {
        s.removeAttribute("role");
        s.removeAttribute("tabindex");
      }
    });
    if (mode === "mine") choose("all");
  };
  modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

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

  const paint = (seg) => {
    if (coder.dataset.mode === "mine") {
      if (seg.dataset.code) choose(coder.dataset.active === seg.dataset.code ? "all" : seg.dataset.code);
      return;
    }
    clearVerdicts();
    if (!pen || seg.dataset.guess === pen) seg.removeAttribute("data-guess");
    else seg.dataset.guess = pen;
  };
  segs.forEach((s) => {
    s.addEventListener("click", () => paint(s));
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        paint(s);
      }
    });
  });

  coder.querySelector("[data-compare]").addEventListener("click", () => {
    let agreed = 0;
    segs.forEach((s) => {
      const mine = s.dataset.code;
      const yours = s.dataset.guess || "";
      const same = mine === yours;
      if (same) agreed += 1;
      s.classList.toggle("agree", same);
      s.classList.toggle("differ", !same);
      if (same && mine) s.dataset.verdict = "We agree";
      else if (!same) s.dataset.verdict = `Mine: ${names[mine]}`;
      else s.removeAttribute("data-verdict");
    });
    const total = segs.length;
    result.querySelector(".result-score").textContent = `We agreed on ${agreed} of ${total} sentences.`;
    result.querySelector(".result-text").textContent =
      agreed === total
        ? "Full agreement. Two coders matching like this is what makes coded data worth trusting."
        : "Where we differ is the useful part. When two coders disagree, the fix is usually a sharper definition, and the codebook gets better.";
    result.hidden = false;
  });

  coder.querySelector("[data-reset]").addEventListener("click", () => {
    segs.forEach((s) => s.removeAttribute("data-guess"));
    clearVerdicts();
  });
}

// Study proposals: three studies, four parts each, all in one viewer.
// Switching study keeps the part you were reading.
const viewer = document.querySelector(".briefs");
if (viewer) {
  const setup = (tablist, onSelect) => {
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
      if (onSelect) onSelect(index);
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
  let part = 0;
  const partSelectors = Array.from(viewer.querySelectorAll(".steps")).map((list) => setup(list, (i) => (part = i)));
  const selectStudy = setup(viewer.querySelector(".brief-tabs"), (i) => {
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
