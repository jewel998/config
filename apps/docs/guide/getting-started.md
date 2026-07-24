# Getting Started

## Installation

```bash
npm install @jewel998/config
```

## Basic Usage

```ts
import { createConfigClient } from "@jewel998/config";
import { browserStorage } from "@jewel998/config/storage";
import { createFirebaseRemoteConfigProvider } from "@jewel998/config/remote/firebase";

const client = createConfigClient({
  definitions: [
    {
      key: "feature.beta",
      defaultValue: false,
      sourceMode: "remote",
      scope: "project",
    },
  ],
  storage: browserStorage(),
  remoteProvider: createFirebaseRemoteConfigProvider(),
});

// Read a value
const isBeta = await client.getFlag("feature.beta");

// Read with scope context
const value = await client.getValue("feature.beta", {
  tenantId: "tenant-1",
  projectId: "project-1",
  environment: "production",
});

// Refresh remote values into cache
await client.refresh();
```

## Source Modes

Each config definition specifies a `sourceMode`:

- **`offline`** — Reads only from local cache. Remote values are ignored.
- **`remote`** — Prefers remote values, falls back to cache then default.
- **`hybrid`** — Prefers cache, falls back to remote then default.
