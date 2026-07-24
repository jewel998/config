import { I18nProvider } from "@lingui/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { i18n } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { routeTree } from "./routeTree.gen";
import { useAuthStore } from "./stores/auth-store";
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

// Initialize auth listener (runs once)
useAuthStore.getState()._initialize();

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </I18nProvider>
    </StrictMode>,
  );
}
