"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type Report = {
  id: number;
  authorId: number;
  reportYmd: string;
  branchName: string;
  createdAt: string;
  updatedAt: string;
  newConnectionRequest: number;
  pendingConnection: number;
  completedConnection: number;
  reasonPendingConnection: string | null;
  internetTkt: number;
  pendingTkt: number;
  completedTkt: number;
  reasonPendingTkt: string | null;
  expireCustomerDay: number;
  renewDay: number;
  activeCustomer: number;
  totalExpireCustomer: number;
  outgoingCalls: number;
  trunkIssueRemarks: string | null;
};

type Row = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: string | null;
  organizationUnit: number | null;
  department: number | null;
  submittedToday: boolean;
  report: Report | null;
};

export default function TodayDailyReportsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/daily-reports/today-status", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }

        const data = await res.json();

        if (mounted) {
          setItems(data.items || []);
          setDate(data.date || "");
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!q) return true;

      return (
        item.name.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        String(item.organizationUnit ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [items, search]);

  const submittedCount = filteredItems.filter((x) => x.submittedToday).length;
  const pendingCount = filteredItems.length - submittedCount;

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Group justify="space-between" align="end">
        <div>
          <Text size="xl" fw={700}>
            Today's Daily Reports
          </Text>
          <Text size="sm" c="dimmed">
            Date: {date || "-"}
          </Text>
        </div>

        <Group gap="sm">
          <Badge color="green" variant="light">
            Submitted: {submittedCount}
          </Badge>
          <Badge color="red" variant="light">
            Pending: {pendingCount}
          </Badge>
        </Group>
      </Group>

      <Paper withBorder p="md" radius="md">
        <TextInput
          label="Search"
          placeholder=""
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<MagnifyingGlassIcon className="w-4 h-4" />}
        />
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Table withTableBorder striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Organization Unit</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {filteredItems.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="md">
                    No branch managers found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.id}</Table.Td>
                  <Table.Td>
                    <Link
                      href={`/users/${item.id}`}
                      className="inline-block text-inherit no-underline hover:text-black hover:underline cursor-pointer"
                    >
                      {item.name}
                    </Link>
                  </Table.Td>
                  <Table.Td>{item.username}</Table.Td>
                  <Table.Td>{item.organizationUnit ?? "—"}</Table.Td>
                  <Table.Td>
                    {item.submittedToday ? (
                      <Badge color="green" variant="light">
                        Submitted
                      </Badge>
                    ) : (
                      <Badge color="red" variant="light">
                        Not Submitted
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      disabled={!item.report}
                      onClick={() => setSelected(item)}
                    >
                      View Report
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        title="Daily Report Details"
        size="lg"
      >
        {selected?.report ? (
          <div className="space-y-3">
            <Text fw={700}>
              {selected.name} (@{selected.username})
            </Text>

            {/* <Text size="sm" c="dimmed">
              ID: {selected.id} • Organization Unit: {selected.organizationUnit ?? "—"}
            </Text>

            <Text size="sm" c="dimmed">
              {selected.report.reportYmd} • Last modified:{" "}
              {new Date(selected.report.updatedAt).toLocaleString()}
            </Text>

            <Text>
              <b>Branch:</b> {selected.report.branchName}
            </Text> */}

            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={600}>New Connection Request</Table.Td>
                  <Table.Td>{selected.report.newConnectionRequest}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending Connection</Table.Td>
                  <Table.Td>{selected.report.pendingConnection}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Completed Connection</Table.Td>
                  <Table.Td>{selected.report.completedConnection}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason Pending Connection</Table.Td>
                  <Table.Td>
                    {selected.report.reasonPendingConnection || "-"}
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Internet Ticket</Table.Td>
                  <Table.Td>{selected.report.internetTkt}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending Ticket</Table.Td>
                  <Table.Td>{selected.report.pendingTkt}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Completed Ticket</Table.Td>
                  <Table.Td>{selected.report.completedTkt}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason Pending Ticket</Table.Td>
                  <Table.Td>{selected.report.reasonPendingTkt || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Expire Customer Day</Table.Td>
                  <Table.Td>{selected.report.expireCustomerDay}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Renew Day</Table.Td>
                  <Table.Td>{selected.report.renewDay}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Active Customer</Table.Td>
                  <Table.Td>{selected.report.activeCustomer}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Expire Customer</Table.Td>
                  <Table.Td>{selected.report.totalExpireCustomer}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Outgoing Calls</Table.Td>
                  <Table.Td>{selected.report.outgoingCalls}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Trunk Issues</Table.Td>
                  <Table.Td>
                    {selected.report.trunkIssueRemarks || "-"}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </div>
        ) : (
          <Text c="dimmed">No report available.</Text>
        )}
      </Modal>
    </div>
  );
}
