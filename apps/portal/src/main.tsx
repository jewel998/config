import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { TooltipProvider } from "@/components/ui/tooltip";

import { i18n } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { routeTree } from "./routeTree.gen";
import { useAuthStore } from "./stores/auth-store";
import "./index.css";
import "@jewel998/tour/src/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        console.error("[mutation error]", error);
      },
    },
  },
});

const router = createRouter({
  routeTree,
  basepath: "/config/portal",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Initialize auth listener — persists for app lifetime (SPA never unmounts)
useAuthStore.getState()._initialize();

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <ThemeProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
