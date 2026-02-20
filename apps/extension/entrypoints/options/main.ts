import { getSettings, setSettings } from "../../src/lib/storage";

const apiBaseUrl = document.querySelector<HTMLInputElement>("#apiBaseUrl");
const orgId = document.querySelector<HTMLInputElement>("#orgId");
const browser = document.querySelector<HTMLSelectElement>("#browser");
const save = document.querySelector<HTMLButtonElement>("#save");
const status = document.querySelector<HTMLDivElement>("#status");

if (!apiBaseUrl || !orgId || !browser || !save || !status) {
  throw new Error("Options page failed to initialize");
}

void (async () => {
  const settings = await getSettings();
  apiBaseUrl.value = settings.apiBaseUrl;
  orgId.value = settings.orgId;
  browser.value = settings.browser;
})();

save.addEventListener("click", async () => {
  await setSettings({
    apiBaseUrl: apiBaseUrl.value.trim(),
    orgId: orgId.value.trim(),
    browser: browser.value as any,
  });

  status.textContent = "Settings saved.";
  setTimeout(() => {
    status.textContent = "";
  }, 1_500);
});
