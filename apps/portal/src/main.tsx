import { I18nProvider } from "@lingui/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "./lib/auth";
import { i18n, loadCatalog, getStoredLocale } from "./lib/i18n";
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

async function main() {
  await loadCatalog(getStoredLocale());

  const root = document.getElementById("root");

  if (root) {
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
}

main();
