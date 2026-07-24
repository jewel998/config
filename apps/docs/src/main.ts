const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <main style="font-family: sans-serif; max-width: 900px; margin: 2rem auto; line-height: 1.6;">
      <h1>@jewel998/config</h1>
      <p>A lightweight, adapter-based configuration package for offline-first and remote-first apps.</p>
      <h2>Install</h2>
      <pre><code>npm install @jewel998/config</code></pre>
      <h2>Usage</h2>
      <pre><code>import { createConfigClient } from '@jewel998/config';

const client = createConfigClient({
  definitions: [{
    key: 'feature.beta',
    defaultValue: false,
    sourceMode: 'remote',
    scope: 'project'
  }],
  storage: browserStorage(),
  remoteProvider: createFirebaseRemoteConfigProvider()
});</code></pre>
    </main>
  `;
}
