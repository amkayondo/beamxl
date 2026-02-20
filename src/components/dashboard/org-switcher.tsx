"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";
import { ACTIVE_ORG_COOKIE, LEGACY_ACTIVE_ORG_COOKIE } from "@/lib/org-cookie";

type OrgItem = {
  orgId: string;
  slug: string;
  name: string;
};

export function OrgSwitcher(props: { orgs: OrgItem[]; currentSlug: string }) {
  const router = useRouter();

  const setOrgCookies = useCallback((slug: string) => {
    const cookieBase = `Path=/; Max-Age=31536000; SameSite=Lax`;
    document.cookie = `${ACTIVE_ORG_COOKIE}=${slug}; ${cookieBase}`;
    document.cookie = `${LEGACY_ACTIVE_ORG_COOKIE}=${slug}; ${cookieBase}`;
  }, []);

  const currentValue = useMemo(() => {
    return props.orgs.find((org) => org.slug === props.currentSlug)?.slug ?? props.currentSlug;
  }, [props.currentSlug, props.orgs]);

  useEffect(() => {
    setOrgCookies(props.currentSlug);
  }, [props.currentSlug, setOrgCookies]);

  return (
    <Select
      value={currentValue}
      onChange={(e) => {
        const slug = e.target.value;
        setOrgCookies(slug);
        router.push(`/${slug}/overview`);
      }}
      className="w-56"
    >
      {props.orgs.map((org) => (
        <option key={org.orgId} value={org.slug}>
          {org.name}
        </option>
      ))}
    </Select>
  );
}
