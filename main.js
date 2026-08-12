// ═══════════════════════════════════════════════════════════════
// @jewel998/config — Landing Page Scripts
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ─── Character-by-character heading animation ─────────────

  const heading = document.querySelector("[data-animate='chars']");
  if (heading) {
    const html = heading.innerHTML;
    const lines = html.split("<br>");
    heading.innerHTML = "";

    let globalIndex = 0;
    const charDelay = 30;
    const initialDelay = 200;

    lines.forEach((line, lineIndex) => {
      const lineEl = document.createElement("span");
      lineEl.style.display = "block";

      const chars = line.replace(/&nbsp;/g, "\u00A0").split("");
      chars.forEach((char) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.transitionDelay = `${initialDelay + globalIndex * charDelay}ms`;
        lineEl.appendChild(span);
        globalIndex++;
      });

      heading.appendChild(lineEl);

      // Add line break between lines (except last)
      if (lineIndex < lines.length - 1) {
        globalIndex += 2; // Small gap between lines
      }
    });

    // Trigger animation
    requestAnimationFrame(() => {
      setTimeout(() => {
        heading.querySelectorAll(".char").forEach((ch) => {
          ch.classList.add("visible");
        });
      }, 50);
    });
  }

  // ─── Fade-in elements with delay ──────────────────────────

  document.querySelectorAll(".fade-in[data-delay]").forEach((el) => {
    const delay = parseInt(el.dataset.delay, 10) || 0;
    setTimeout(() => {
      el.classList.add("visible");
    }, delay);
  });

  // ─── Scroll reveal (IntersectionObserver) ─────────────────

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  document.querySelectorAll(".scroll-reveal").forEach((el) => {
    revealObserver.observe(el);
  });

  // ─── Mobile Menu ──────────────────────────────────────────

  const burger = document.querySelector(".nav-burger");
  const overlay = document.querySelector(".mobile-overlay");
  const sheet = document.querySelector(".mobile-sheet");

  function openMenu() {
    burger.setAttribute("aria-expanded", "true");
    overlay.hidden = false;
    sheet.hidden = false;
  }

  function closeMenu() {
    burger.setAttribute("aria-expanded", "false");
    overlay.hidden = true;
    sheet.hidden = true;
  }

  if (burger) {
    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      isOpen ? closeMenu() : openMenu();
    });
  }

  if (overlay) overlay.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  document.querySelectorAll(".mobile-sheet a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeMenu();
  });
})();
