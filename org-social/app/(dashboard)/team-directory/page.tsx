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
} from "@mantine/core";

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

export default function TeamDirectoryPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/team-directory", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.data || []);
        setLoading(false);
      });
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.trim() || a.username;
      const nameB = `${b.first_name} ${b.last_name}`.trim() || b.username;

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
      <Text size="xl" fw={600} mb="lg">
        Team Directory
      </Text>

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
              <Avatar src={user.profile_photo} size={72} radius="xl" mb="sm" />

              <Text fw={500} size="sm" ta="center">
                {user.first_name || user.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : user.username}
              </Text>

              <Text size="xs" c="dimmed" ta="center">
                {user.role || "No role"}
              </Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* DETAILS MODAL */}
      <Modal
        opened={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Employee Details"
        size="md"
      >
        {selectedUser && (
          <>
            <Group mb="md">
              <Avatar src={selectedUser.profile_photo} size={80} radius="xl" />
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
              <Badge variant="light">{selectedUser.job_title}</Badge>
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
          </>
        )}
      </Modal>
    </div>
  );
}
