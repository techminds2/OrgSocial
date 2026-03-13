import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Avatar, Container, Paper, Text } from "@mantine/core";
import DailyReportViewer from "@/components/DailyReportViewer";
import {
  cleanToken,
  getUserFromCookies,
  fetchCorporateUserById,
  canViewDailyReports,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

function normalizeMediaUrl(u?: string | null) {
  if (!u) return "/temp.jpg";
  const s = String(u).trim();
  if (!s) return "/temp.jpg";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

export default async function UserProfilePage({ params }: PageProps) {
  const viewer = await getUserFromCookies();

  if (!viewer?.user_id) {
    redirect("/login");
  }

  const { id } = await params;
  const targetUserId = Number(id);

  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    redirect("/team-directory");
  }

  if (viewer.role !== "admin" && viewer.role !== "branch_manager") {
    redirect("/team-directory");
  }

  if (viewer.role === "branch_manager" && viewer.user_id !== targetUserId) {
    redirect("/team-directory");
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get("accessToken")?.value;

  if (!raw) {
    redirect("/login");
  }

  const token = cleanToken(raw);
  const targetUser = await fetchCorporateUserById(token, targetUserId);

  if (!targetUser) {
    redirect("/team-directory");
  }

  const targetRole = (targetUser?.role ?? null) as string | null;

  const allowed = canViewDailyReports({
    viewerRole: viewer.role,
    viewerId: viewer.user_id,
    targetUserId,
    targetUserRole: targetRole,
  });

  if (!allowed) {
    redirect("/team-directory");
  }

  const fullName =
    [targetUser.first_name, targetUser.last_name].filter(Boolean).join(" ").trim() ||
    targetUser.username ||
    "Unknown User";

  const username = targetUser.username ? `(${targetUser.username})` : "";
  const email = targetUser.email ?? null;
  const jobTitle = targetUser.job_title ?? null;
  const department = targetUser.department ?? null;
  const organizationUnit = targetUser.organization_unit ?? null;
  const staffSince = targetUser.staff_since ?? null;
  const profilePhoto = targetUser.profile_photo ?? targetUser.profileImage ?? null;

  return (
    <Container size="sm" className="py-10">
      <Paper shadow="md" className="p-6 rounded-md mb-6">
        <div className="flex flex-col items-center gap-2">
          <Avatar
            size={100}
            radius="xl"
            src={normalizeMediaUrl(profilePhoto)}
          />

          <Text className="text-lg font-semibold">
            {fullName} {username}
          </Text>

          {email && <Text className="text-sm text-gray-500">{email}</Text>}

          {targetRole && (
            <Text className="text-sm text-gray-500">Role: {targetRole}</Text>
          )}

          {jobTitle && (
            <Text className="text-sm text-gray-500">
              Job Title: {jobTitle}
            </Text>
          )}

          {department && (
            <Text className="text-sm text-gray-500">
              Department: {String(department)}
            </Text>
          )}

          {organizationUnit && (
            <Text className="text-sm text-gray-500">
              Organization Unit: {String(organizationUnit)}
            </Text>
          )}

          {staffSince && (
            <Text className="text-sm text-gray-500">
              Staff Since: {staffSince}
            </Text>
          )}
        </div>
      </Paper>

      <DailyReportViewer
        userId={targetUserId}
        userRole={targetRole}
        viewerId={viewer.user_id}
        viewerRole={viewer.role}
      />
    </Container>
  );
}