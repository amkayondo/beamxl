import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { getSettings } from "./storage";

export async function getTrpcClient(): Promise<any> {
  const settings = await getSettings();

  return createTRPCProxyClient<any>({
    links: [
      httpBatchLink({
        url: `${settings.apiBaseUrl}/api/trpc`,
        transformer: superjson,
        fetch(url: RequestInfo | URL, options?: RequestInit) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  }) as any;
}
