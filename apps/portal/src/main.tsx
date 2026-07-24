import { I18nProvider } from "@lingui/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "./lib/auth";
import { i18n, getStoredLocale, loadCatalog } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({
  routeTree,
  basepath: "/config/portal",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");

if (root) {
  // Load catalog in background — render immediately with fallback
  loadCatalog(getStoredLocale()).catch(() => {
    // If catalog fails to load, activate with empty messages (shows source strings)
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  createRoot(root).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </StrictMode>,
  );
}
