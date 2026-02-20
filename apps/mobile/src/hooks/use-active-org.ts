import { useCallback, useEffect, useState } from "react";

import { trpcClient } from "@/lib/trpc";

type ActiveOrgState = {
  orgId: string | null;
  orgName: string | null;
  loading: boolean;
  error: string | null;
};

export function useActiveOrg(enabled: boolean) {
  const [state, setState] = useState<ActiveOrgState>({
    orgId: null,
    orgName: null,
    loading: enabled,
    error: null,
  });

  const load = useCallback(async () => {
    if (!enabled) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let orgs = await trpcClient.org.listMine.query();
      if (orgs.length === 0) {
        await trpcClient.org.ensureDefaultOrg.mutate();
        orgs = await trpcClient.org.listMine.query();
      }

      const active = orgs[0] ?? null;
      setState({
        orgId: active?.orgId ?? null,
        orgName: active?.name ?? null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        orgId: null,
        orgName: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to resolve organization",
      });
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
