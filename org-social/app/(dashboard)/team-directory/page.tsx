"use client";

import { useEffect, useState } from "react";
import { Table, Loader, Avatar, Text, ScrollArea, Badge } from "@mantine/core";

type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string | null;
  job_title: string | null;
  staff_since: string | null;
  profile_photo: string | null;
};

export default function TeamDirectoryPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team-directory", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Text size="xl" fw={600} mb="md">
        Team Directory
      </Text>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Joined</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {users.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Td>
                  <div className="flex items-center gap-3">
                    <Avatar src={u.profile_photo} radius="xl" />
                    <div>
                      <Text size="sm" fw={500}>
                        {u.first_name || "-"} {u.last_name || ""}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {u.job_title || "—"}
                      </Text>
                    </div>
                  </div>
                </Table.Td>

                <Table.Td>{u.username}</Table.Td>
                <Table.Td>{u.email || "—"}</Table.Td>

                <Table.Td>
                  <Badge variant="light">{u.role}</Badge>
                </Table.Td>

                <Table.Td>{u.department || "—"}</Table.Td>
                <Table.Td>{u.staff_since || "—"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </div>
  );
}
