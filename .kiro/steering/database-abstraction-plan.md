---
inclusion: manual
---

# Database Abstraction Plan

A phased plan for making the Config Portal provider-agnostic, enabling future migration from Firebase/Firestore to any backend (Supabase, AWS DynamoDB, Planetscale, custom REST API, etc.).

## Current State

```
Components → Hooks → Firebase SDK (direct imports)
                     └── firebase/firestore (doc, collection, getDocs, etc.)
                     └── firebase/auth (onAuthStateChanged, signInWithPopup)
```

Every hook file imports directly from `firebase/firestore`. Auth is coupled in `stores/auth-store.ts`. The swap surface is ~14 files.

## Target State

```
Components → Hooks → Adapter Interface → Provider Implementation
                                          ├── firebase-provider.ts
                                          ├── supabase-provider.ts
                                          └── rest-api-provider.ts
```

## Phase 1: Consolidate Firebase Imports (Low effort, no behavior change)

**Goal**: Single entry point for all Firestore operations.

Create `lib/db.ts` that re-exports everything hooks need:

```typescript
// lib/db.ts
export { db } from "./firebase";
export {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
export type { DocumentSnapshot, QueryConstraint } from "firebase/firestore";
```

Then update all hooks to import from `@/lib/db` instead of `firebase/firestore`.

**Files to change**: All `use-*.ts` hooks + `lib/audit.ts`
**Risk**: Zero — purely mechanical import path change
**When**: Anytime — good first step even if migration never happens

## Phase 2: Define the Adapter Interface (Medium effort)

**Goal**: Typed contract that any backend must implement.

```typescript
// lib/db/types.ts

export interface QueryOptions {
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
  cursor?: unknown;
  where?: Array<{
    field: string;
    op: "==" | "!=" | ">" | "<" | "array-contains";
    value: unknown;
  }>;
}

export interface QueryResult<T> {
  data: T[];
  lastCursor?: unknown; // opaque cursor for pagination
}

export interface DbAdapter {
  // Document operations
  get<T>(path: string): Promise<T | null>;
  list<T>(
    collectionPath: string,
    options?: QueryOptions,
  ): Promise<QueryResult<T>>;
  create(
    collectionPath: string,
    data: Record<string, unknown>,
  ): Promise<string>;
  set(
    docPath: string,
    data: Record<string, unknown>,
    merge?: boolean,
  ): Promise<void>;
  update(docPath: string, data: Record<string, unknown>): Promise<void>;
  delete(docPath: string): Promise<void>;
}

export interface AuthAdapter {
  onAuthChange(callback: (user: AuthUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
```

**Key decisions**:

- Paths are strings like `projects/{id}/environments/{id}/configs/{key}` — maps naturally to Firestore subcollections, REST URLs, or SQL foreign keys
- `cursor` is opaque `unknown` — each provider manages its own pagination format
- No realtime subscriptions in the interface (use polling via TanStack Query's refetchInterval instead)

## Phase 3: Implement Firebase Adapter (Medium effort)

**Goal**: Wrap current Firestore logic behind the interface.

```typescript
// lib/db/firebase-adapter.ts
import { db } from "@/lib/firebase";
import {} from /* all Firestore imports */ "firebase/firestore";
import type { DbAdapter, QueryOptions, QueryResult } from "./types";

export const firebaseDb: DbAdapter = {
  async get<T>(path: string) {
    const ref = doc(db, ...parsePath(path));
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
  },
  async list<T>(collectionPath: string, options?: QueryOptions) {
    // Build Firestore query from generic options
  },
  async create(collectionPath: string, data) {
    const ref = await addDoc(
      collection(db, ...parsePath(collectionPath)),
      data,
    );
    return ref.id;
  },
  // ... etc
};
```

## Phase 4: Refactor Hooks to Use Adapter (High effort, highest value)

**Goal**: Hooks call adapter methods instead of raw Firestore SDK.

```typescript
// Before
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

await updateDoc(doc(db, "projects", projectId, "segments", segmentId), data);

// After
import { db } from "@/lib/db";

await db.update(`projects/${projectId}/segments/${segmentId}`, data);
```

Each hook becomes ~30% shorter and provider-agnostic.

## Phase 5: Add a Second Provider (validation)

Only do this when you actually need it. Pick one:

| Provider | Best for                                               | Complexity                        |
| -------- | ------------------------------------------------------ | --------------------------------- |
| Supabase | If you want Postgres + real-time + auth in one package | Medium                            |
| REST API | If you're building your own backend (Node/Go/Python)   | Low (adapter is just fetch calls) |
| DynamoDB | If you're on AWS and need scale                        | High (modeling is very different) |

## What NOT to Abstract

- **TanStack Query caching** — keep it. It works with any async data source.
- **Zustand stores** — keep them. They're client-side state, not DB-coupled.
- **Audit entry format** — keep the `AuditEntry` type. Only the _write destination_ changes.
- **Firestore Security Rules** — these disappear with the provider. You'd need server-side auth middleware instead.

## Migration Checklist (when you pull the trigger)

- [ ] Phase 1: Consolidate imports into `lib/db.ts`
- [ ] Phase 2: Define `DbAdapter` + `AuthAdapter` interfaces
- [ ] Phase 3: Implement `firebase-adapter.ts` behind the interface
- [ ] Phase 4: Refactor all hooks to use `db.get()`, `db.list()`, `db.update()`, etc.
- [ ] Phase 5: Write tests for the adapter interface (provider-agnostic test suite)
- [ ] Phase 6: Implement the new provider adapter
- [ ] Phase 7: Switch provider via env var, test in staging
- [ ] Phase 8: Update auth-store to use `AuthAdapter`
- [ ] Phase 9: Migrate data from Firestore to new provider
- [ ] Phase 10: Remove Firebase SDK dependency

## Estimated Timeline

| Phase    | Effort     | Can do independently        |
| -------- | ---------- | --------------------------- |
| Phase 1  | 2 hours    | ✅ Yes — do now if you want |
| Phase 2  | 4 hours    | ✅ Yes                      |
| Phase 3  | 6 hours    | After Phase 2               |
| Phase 4  | 8 hours    | After Phase 3               |
| Phase 5+ | 8-16 hours | Only when needed            |

Total for full abstraction: ~3-4 days
Total for "ready to switch later": Phase 1-2 = 6 hours

## Decision Record

**Why not do it now:**

- Firebase is working fine for current scale
- No concrete need to switch providers yet
- Abstraction adds indirection without immediate ROI
- The current hook architecture already contains the blast radius

**When to trigger this plan:**

- Firebase costs become prohibitive (>$100/mo for this use case)
- You need SQL joins or complex queries Firestore can't do efficiently
- You're moving to a platform (Vercel, AWS) where native DB integration is significantly cheaper
- You need to self-host for compliance/data residency requirements
