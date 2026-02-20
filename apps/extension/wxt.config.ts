import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  manifestVersion: 3,
  manifest: {
    name: "DueFlow Capture",
    description: "Capture invoices from Gmail and webpages, then trigger DueFlow collection actions.",
    version: "0.1.0",
    permissions: ["storage", "activeTab", "scripting", "alarms"],
    host_permissions: ["http://localhost:3000/*", "https://*.dueflow.ai/*"],
    action: {
      default_title: "DueFlow",
    },
    options_page: "options.html",
  },
});
