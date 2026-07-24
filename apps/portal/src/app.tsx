import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";

import { DashboardPage } from "./pages/dashboard";
import { EnvironmentsPage } from "./pages/environments";
import { ProjectsPage } from "./pages/projects";
import { TenantsPage } from "./pages/tenants";

export const App = () => {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <nav
          style={{
            width: 220,
            padding: "1.5rem 1rem",
            borderRight: "1px solid #e2e2e2",
            fontFamily: "sans-serif",
          }}
        >
          <h2 style={{ fontSize: "1rem", marginBottom: "1.5rem" }}>
            Config Portal
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/">Dashboard</NavLink>
            </li>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/tenants">Tenants</NavLink>
            </li>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/projects">Projects</NavLink>
            </li>
            <li style={{ marginBottom: "0.75rem" }}>
              <NavLink to="/environments">Environments</NavLink>
            </li>
          </ul>
        </nav>
        <main style={{ flex: 1, padding: "2rem", fontFamily: "sans-serif" }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/environments" element={<EnvironmentsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};
