document.documentElement.classList.add("js");

// Footer year
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Codebook: choose a code to see where it appears in the conversation
const coder = document.querySelector(".coder");
if (coder) {
  const buttons = coder.querySelectorAll(".code");
  const choose = (code) => {
    coder.dataset.active = code;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.code === code)));
  };
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      const already = b.getAttribute("aria-pressed") === "true";
      choose(already ? "all" : b.dataset.code);
    })
  );
  // Highlights in the conversation are clickable too
  coder.querySelectorAll("mark").forEach((m) => {
    m.style.cursor = "pointer";
    m.addEventListener("click", () => choose(coder.dataset.active === m.dataset.code ? "all" : m.dataset.code));
  });
}

// Study proposals: tabs with arrow-key support
const tablist = document.querySelector(".brief-tabs");
if (tablist) {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) {
        e.preventDefault();
        select(tabs[(i + step + tabs.length) % tabs.length], true);
      } else if (e.key === "Home") {
        e.preventDefault();
        select(tabs[0], true);
      } else if (e.key === "End") {
        e.preventDefault();
        select(tabs[tabs.length - 1], true);
      }
    });
  });
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
