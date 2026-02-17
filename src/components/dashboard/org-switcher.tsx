"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";

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

  return (
    <Select
      value={currentValue}
      onChange={(e) => {
        const slug = e.target.value;
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
