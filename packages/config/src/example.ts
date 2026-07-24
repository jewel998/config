import { browserStorage } from "./cache/storage";
import { createConfigClient } from "./client";
import { createFirebaseRemoteConfigProvider } from "./remote/firebase-adapter";

export const createExampleClient = () =>
  createConfigClient({
    definitions: [
      {
        key: "feature.beta",
        defaultValue: false,
        sourceMode: "remote",
        scope: "project",
      },
    ],
    storage: browserStorage(),
    remoteProvider: createFirebaseRemoteConfigProvider({
      fetcher: async (key: string) => {
        if (key === "feature.beta") {
          return true;
        }
        return undefined;
      },
    }),
  });
