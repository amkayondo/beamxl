import { defineContentScript } from "wxt/utils/define-content-script";
import { buildCaptureDraft } from "../src/lib/capture-parser";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "DUEFLOW_CAPTURE_PAGE") {
        return;
      }

      sendResponse(
        buildCaptureDraft({
          title: document.title,
          location: window.location.href,
          selectedText: window.getSelection()?.toString() ?? "",
          bodyText: document.body?.innerText?.slice(0, 10_000) ?? "",
        }),
      );
      return true;
    });
  },
});
