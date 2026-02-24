import { UserDetailView } from "@/components/admin/user-detail-view";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <UserDetailView userId={userId} />;
}
