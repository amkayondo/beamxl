declare module "wxt" {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}

declare module "wxt/utils/define-background" {
  export function defineBackground(
    setup: () => void | Promise<void>
  ): () => void | Promise<void>;
}

declare module "wxt/utils/define-content-script" {
  export function defineContentScript(
    config: Record<string, unknown>
  ): Record<string, unknown>;
}
