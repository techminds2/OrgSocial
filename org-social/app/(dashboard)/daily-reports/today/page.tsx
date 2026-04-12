"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  SegmentedControl,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type BranchReport = {
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

type RegionalReport = {
  id: number;
  authorId: number;
  reportYmd: string;
  regionName: string;
  createdAt: string;
  updatedAt: string;
  branchesVisitedToday: string | null;
  keyObservations: string | null;
  totalCollection: number;
  activeCustomers: number;
  expiredCustomers: number;
  totalCustomerBase: number;
  totalTickets: number;
  pendingTickets: number;
  ticketsClosedToday: number;
  reasonPendingTickets: string | null;
  totalNewConnections: number;
  newConnectionsToday: number;
  connectionPendingToday: number;
  renewalsToday: number;
  renewalPending: number;
  reasonPendingConnection: string | null;
  collectionTarget: number;
  collectionAchievement: number;
  newConnectionTarget: number;
  newConnectionAchievementPct: number;
  renewalTarget: number;
  renewalAchievementPct: number;
  issueDetails: string | null;
  immediateActionsTaken: string | null;
  nextDayPlan: string | null;
  supportRequiredFromHO: string | null;
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
  report: BranchReport | RegionalReport | null;
};

type ReportType = "branch" | "regional";

export default function TodayDailyReportsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState<ReportType>("branch");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/daily-reports/today-status?type=${reportType}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }

        const data = await res.json();

        if (mounted) {
          setItems(data.items || []);
          setDate(data.date || "");
          setSelected(null);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setItems([]);
          setSelected(null);
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
  }, [reportType]);

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
          .includes(q) ||
        String(item.role ?? "")
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

  const isRegional = reportType === "regional";

  return (
    <div className="p-6 space-y-4">
      <Group justify="space-between" align="end">
        <div>
          <Text size="xl" fw={700}>
            Today&apos;s Reports
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
        <Group justify="space-between" align="end" wrap="wrap" gap="md">
          <SegmentedControl
            value={reportType}
            onChange={(v) => setReportType(v as ReportType)}
            data={[
              { label: "Branch Managers", value: "branch" },
              { label: "Regional Managers", value: "regional" },
            ]}
          />

          <div style={{ minWidth: 280, maxWidth: 420, width: "100%" }}>
            <TextInput
              label="Search"
              placeholder="Search by name, username, id, org unit, role"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<MagnifyingGlassIcon className="w-4 h-4" />}
            />
          </div>
        </Group>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Table withTableBorder striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {filteredItems.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">
                    {isRegional
                      ? "No regional managers found"
                      : "No branch managers found"}
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
        title={isRegional ? "Regional Report Details" : "Daily Report Details"}
        size="lg"
      >
        {!selected?.report ? (
          <Text c="dimmed">No report available.</Text>
        ) : isRegional ? (
          <div className="space-y-3">
            <Text fw={700}>
              {selected.name} (@{selected.username})
            </Text>

            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={600}>Region Name</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).regionName || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Branches Visited Today</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).branchesVisitedToday ||
                      "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Key Observations</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).keyObservations || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Collection</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).totalCollection ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Active Customers</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).activeCustomers ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Expired Customers</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).expiredCustomers ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Customer Base</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).totalCustomerBase ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Tickets</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).totalTickets ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending Tickets</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).pendingTickets ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Tickets Closed Today</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).ticketsClosedToday ??
                      0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason Pending Tickets</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).reasonPendingTickets ||
                      "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total New Connections</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).totalNewConnections ??
                      0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>New Connections Today</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).newConnectionsToday ??
                      0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Connection Pending Today</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .connectionPendingToday ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Renewals Today</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).renewalsToday ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Renewal Pending</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).renewalPending ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason Pending Connection</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .reasonPendingConnection || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Collection Target</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).collectionTarget ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Collection Achievement</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .collectionAchievement ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>New Connection Target</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).newConnectionTarget ??
                      0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>New Connection Achievement %</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .newConnectionAchievementPct ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Renewal Target</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).renewalTarget ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Renewal Achievement %</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .renewalAchievementPct ?? 0}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Issue Details</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).issueDetails || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Immediate Actions Taken</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .immediateActionsTaken || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Next Day Plan</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport).nextDayPlan || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Support Required From HO</Table.Td>
                  <Table.Td>
                    {(selected.report as RegionalReport)
                      .supportRequiredFromHO || "-"}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </div>
        ) : (
          <div className="space-y-3">
            <Text fw={700}>
              {selected.name} (@{selected.username})
            </Text>

            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={600}>New Connection Request</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).newConnectionRequest}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending Connection</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).pendingConnection}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Completed Connection</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).completedConnection}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason Pending Connection</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport)
                      .reasonPendingConnection || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Internet Ticket</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).internetTkt}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending Ticket</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).pendingTkt}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Completed Ticket</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).completedTkt}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason Pending Ticket</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).reasonPendingTkt || "-"}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Expire Customer Day</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).expireCustomerDay}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Renew Day</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).renewDay}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Active Customer</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).activeCustomer}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Expire Customer</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).totalExpireCustomer}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Outgoing Calls</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).outgoingCalls}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Trunk Issues</Table.Td>
                  <Table.Td>
                    {(selected.report as BranchReport).trunkIssueRemarks || "-"}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Modal>
    </div>
  );
}
