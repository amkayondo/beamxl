"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";
import { ACTIVE_ORG_COOKIE } from "@/lib/org-cookie";

type OrgItem = {
  orgId: string;
  slug: string;
  name: string;
};

export function OrgSwitcher(props: { orgs: OrgItem[]; currentSlug: string }) {
  const router = useRouter();

  const currentValue = useMemo(() => {
    return props.orgs.find((org) => org.slug === props.currentSlug)?.slug ?? props.currentSlug;
  }, [props.currentSlug, props.orgs]);

  useEffect(() => {
    document.cookie = `${ACTIVE_ORG_COOKIE}=${props.currentSlug}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [props.currentSlug]);

  return (
    <Select
      value={currentValue}
      onChange={(e) => {
        const slug = e.target.value;
        document.cookie = `${ACTIVE_ORG_COOKIE}=${slug}; Path=/; Max-Age=31536000; SameSite=Lax`;
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
