export type ExtensionSettings = {
  apiBaseUrl: string;
  orgId: string;
  browser: "CHROME" | "EDGE" | "BRAVE" | "ARC" | "OPERA" | "OTHER";
  extensionVersion: string;
};

const STORAGE_KEY = "dueflow_extension_settings";

export const defaultSettings: ExtensionSettings = {
  apiBaseUrl: "http://localhost:3000",
  orgId: "",
  browser: "CHROME",
  extensionVersion: "0.1.0",
};

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return {
    ...defaultSettings,
    ...(data[STORAGE_KEY] ?? {}),
  };
}

export async function setSettings(next: Partial<ExtensionSettings>) {
  const current = await getSettings();
  await chrome.storage.sync.set({
    [STORAGE_KEY]: {
      ...current,
      ...next,
    },
  });
}
