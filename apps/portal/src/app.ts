export const renderPortal = () => {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    return;
  }

  app.innerHTML = `
    <main style="font-family: sans-serif; max-width: 900px; margin: 2rem auto; line-height: 1.6;">
      <h1>Config Portal</h1>
      <p>Manage tenant, project, and environment scoped configuration.</p>
      <section>
        <h2>Planned workspace</h2>
        <ul>
          <li>Tenant management</li>
          <li>Project configuration</li>
          <li>Versioned publish flow</li>
          <li>Offline-ready cache sync</li>
        </ul>
      </section>
    </main>
  `;
};
