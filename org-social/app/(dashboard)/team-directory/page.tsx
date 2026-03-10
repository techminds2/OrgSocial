"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Avatar,
  Text,
  Grid,
  Loader,
  Modal,
  Badge,
  Group,
  Divider,
  Button,
  Table,
  ActionIcon,
  Container,
} from "@mantine/core";
import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  organization_unit: string | null;
  department: string | null;
  job_title: string | null;
  profile_photo: string | null;
  staff_since: string | null;
  supervisors: any[];
};

type Me = {
  id?: number;
  user_id?: number;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  user?: {
    id?: number;
    username?: string | null;
    email?: string | null;
    role?: string | null;
  };
} | null;

function normalizeMeRole(data: any): string | null {
  return data?.role ?? data?.user?.role ?? null;
}

function normalizeUsers(data: any): User[] {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function TeamDirectoryPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [me, setMe] = useState<Me>(null);

  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const res = await fetch("/api/team-directory", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Team directory failed: ${res.status}`);
        }

        const data = await res.json();
        const normalized = normalizeUsers(data);

        if (mounted) {
          setUsers(normalized);
        }
      } catch (error) {
        console.error("TEAM DIRECTORY FETCH ERROR:", error);
        if (mounted) {
          setUsers([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`/api/auth/me failed: ${res.status}`);
        }

        const data = await res.json();

        if (mounted) {
          setMe(data);
        }
      } catch (error) {
        console.error("ME FETCH ERROR:", error);
        if (mounted) {
          setMe(null);
        }
      }
    }

    loadUsers();
    loadMe();

    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = normalizeMeRole(me)?.toLowerCase() === "admin";

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA =
        `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.username;
      const nameB =
        `${b.first_name || ""} ${b.last_name || ""}`.trim() || b.username;

      return nameA.localeCompare(nameB, undefined, {
        sensitivity: "base",
      });
    });
  }, [users]);

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={600}>
          Team Directory
        </Text>

        <Group gap={4}>
          <ActionIcon
            variant={view === "grid" ? "filled" : "light"}
            size="lg"
            onClick={() => setView("grid")}
          >
            <Squares2X2Icon className="w-5 h-5" />
          </ActionIcon>

          <ActionIcon
            variant={view === "list" ? "filled" : "light"}
            size="lg"
            onClick={() => setView("list")}
          >
            <ListBulletIcon className="w-5 h-5" />
          </ActionIcon>
        </Group>
      </Group>

      {view === "grid" && (
        <Grid align="stretch">
          {sortedUsers.map((user) => (
            <Grid.Col key={user.id} span={4}>
              <Card
                withBorder
                shadow="sm"
                padding="lg"
                radius="md"
                h={180}
                className="cursor-pointer hover:shadow-md transition flex flex-col items-center justify-center"
                onClick={() => setSelectedUser(user)}
              >
                <Avatar
                  src={user.profile_photo}
                  size={72}
                  radius="xl"
                  mb="sm"
                />

                <Text fw={500} size="sm" ta="center">
                  {user.first_name || user.last_name
                    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                    : user.username}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      <Container>
        {view === "list" && (
          <Grid>
            <Grid.Col span={12}>
              <Table withTableBorder striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Department</Table.Th>
                    <Table.Th>Email</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {sortedUsers.map((user) => (
                    <Table.Tr
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar
                            src={user.profile_photo}
                            size={36}
                            radius="xl"
                          />
                          <div>
                            <Text size="sm" fw={500}>
                              {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                : user.username}
                            </Text>
                            <Text size="xs" c="dimmed">
                              @{user.username}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>

                      <Table.Td>{user.role || "—"}</Table.Td>
                      <Table.Td>{user.department || "—"}</Table.Td>
                      <Table.Td>{user.email || "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Grid.Col>
          </Grid>
        )}

        <Modal
          opened={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="Employee Details"
          size="md"
        >
          {selectedUser && (
            <>
              <Group mb="md">
                <Avatar
                  src={selectedUser.profile_photo}
                  size={80}
                  radius="xl"
                />
                <div>
                  <Text size="lg" fw={600}>
                    {selectedUser.first_name || "-"}{" "}
                    {selectedUser.last_name || ""}
                  </Text>
                  <Text size="sm" c="dimmed">
                    @{selectedUser.username}
                  </Text>
                </div>
              </Group>

              <Divider my="sm" />

              <Group mb="xs">
                <Text fw={500}>Job Title:</Text>
                <Badge variant="light">{selectedUser.job_title || "—"}</Badge>
              </Group>

              <Text size="sm">
                <strong>Email:</strong> {selectedUser.email || "—"}
              </Text>

              <Text size="sm">
                <strong>Department:</strong> {selectedUser.department || "—"}
              </Text>

              <Text size="sm">
                <strong>Organization Unit:</strong>{" "}
                {selectedUser.organization_unit || "—"}
              </Text>

              <Text size="sm">
                <strong>Staff Since:</strong> {selectedUser.staff_since || "—"}
              </Text>

              {isAdmin && (
                <>
                  <Divider my="md" />
                  <Button
                    fullWidth
                    className="!bg-[var(--color-primary)] !text-white hover:!opacity-90"
                    onClick={() => router.push(`/users/${selectedUser.id}`)}
                  >
                    Check Profile
                  </Button>
                </>
              )}
            </>
          )}
        </Modal>
      </Container>
    </div>
  );
}
