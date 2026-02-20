import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { mobileConfig } from "@/config";
import { authClient } from "@/lib/auth-client";

export const trpcClient: any = createTRPCProxyClient<any>({
  links: [
    httpBatchLink({
      url: `${mobileConfig.apiBaseUrl}/api/trpc`,
      transformer: superjson,
      async headers() {
        const cookie = await Promise.resolve((authClient as any).getCookie?.());
        return cookie ? { cookie: String(cookie) } : {};
      },
      fetch(url: RequestInfo | URL, options?: RequestInit) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});
