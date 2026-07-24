import { createConfigClient } from "./index";
import { createFirebaseRemoteConfigProvider } from "./remote/firebase-adapter";
import { browserStorage } from "./cache/storage";

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
