// ═══════════════════════════════════════════════════════════════
// @jewel998/config — Landing Page Scripts
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ─── Count-up Animation ───────────────────────────────────

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateValue(el, target, suffix, decimals, duration, startOffset) {
    setTimeout(() => {
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        const current = eased * target;

        if (decimals > 0) {
          el.textContent = current.toFixed(decimals) + suffix;
        } else {
          el.textContent = Math.round(current) + suffix;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
    }, startOffset);
  }

  // Observe stats section and trigger count-up
  const stats = document.querySelectorAll(".stat-value");
  let statsAnimated = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (statsAnimated) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          statsAnimated = true;
          stats.forEach((el, i) => {
            const target = parseFloat(el.dataset.target);
            const suffix = el.dataset.suffix || "";
            const decimals = parseInt(el.dataset.decimals, 10) || 0;
            const duration = 1500 + i * 80;
            const offset = 480 + i * 90;

            // Special case: $0/mo doesn't need counting
            if (target === 0 && suffix === "/mo") {
              setTimeout(() => {
                el.textContent = "$0/mo";
              }, offset);
            } else if (el.textContent.startsWith("$")) {
              animateValue(el, target, suffix, decimals, duration, offset);
              // Prefix with $ after
              const origUpdate = el.textContent;
              setTimeout(() => {
                const iv = setInterval(() => {
                  if (!el.textContent.startsWith("$")) {
                    el.textContent = "$" + el.textContent;
                  }
                }, 16);
                setTimeout(() => clearInterval(iv), duration + 100);
              }, offset);
            } else {
              animateValue(el, target, suffix, decimals, duration, offset);
            }
          });
          observer.disconnect();
        }
      }
    },
    { threshold: 0.25 },
  );

  const statsSection = document.querySelector(".stats");
  if (statsSection) observer.observe(statsSection);

  // ─── Mobile Menu ──────────────────────────────────────────

  const burger = document.querySelector(".burger");
  const overlay = document.querySelector(".mobile-overlay");
  const menu = document.querySelector(".mobile-menu");

  function openMenu() {
    burger.setAttribute("aria-expanded", "true");
    overlay.hidden = false;
    menu.hidden = false;
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    burger.setAttribute("aria-expanded", "false");
    overlay.hidden = true;
    menu.hidden = true;
    document.body.classList.remove("menu-open");
  }

  if (burger) {
    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      isOpen ? closeMenu() : openMenu();
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeMenu);
  }

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Close on link click
  document.querySelectorAll(".mobile-link, .mobile-sign-in").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Close on resize above mobile breakpoint
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) closeMenu();
  });
})();
