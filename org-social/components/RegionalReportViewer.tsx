"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Modal,
  Paper,
  Select,
  Table,
  Text,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type Item = {
  id: number;
  reportYmd: string;
  createdAt: string;
  updatedAt: string;
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatYMD(date: any) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthToDate(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export default function RegionalReportViewer({
  userId,
  userRole,
  viewerId,
  viewerRole,
}: {
  userId: number;
  userRole: string | null;
  viewerId: number;
  viewerRole: string | null;
}) {
  const canView =
    (viewerRole === "manager" && viewerId === userId) ||
    (viewerRole === "admin" && userRole === "manager");

  const [month, setMonth] = useState(currentMonth());
  const [calendarDate, setCalendarDate] = useState<Date>(
    monthToDate(currentMonth()),
  );

  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [report, setReport] = useState<any>(null);

  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [opened, setOpened] = useState(false);

  const reportDates = useMemo(() => {
    return new Set(items.map((i) => i.reportYmd));
  }, [items]);

  const monthOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const base = new Date();

    for (let i = 0; i < 24; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      out.push({ value: `${y}-${m}`, label: `${y}-${m}` });
    }

    return out;
  }, []);

  const loadMonth = async (m: string) => {
    setLoadingMonth(true);
    try {
      const res = await fetch(
        `/api/users/${userId}/regional-reports/month?month=${encodeURIComponent(m)}`,
        { credentials: "include", cache: "no-store" },
      );

      const out = await res.json().catch(() => ({}));
      setItems(out.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoadingMonth(false);
    }
  };

  const loadDay = async (ymd: string) => {
    setLoadingDay(true);
    try {
      const res = await fetch(
        `/api/users/${userId}/regional-reports/by-date?date=${encodeURIComponent(ymd)}`,
        { credentials: "include", cache: "no-store" },
      );

      const out = await res.json().catch(() => ({}));
      setReport(out.report || null);
    } catch (e) {
      console.error(e);
      setReport(null);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadMonth(month);
  }, [month, canView]);

  useEffect(() => {
    const onUpd = () => {
      loadMonth(month);
      if (selected) loadDay(selected);
    };

    window.addEventListener("regional-reports-updated", onUpd);

    return () => {
      window.removeEventListener("regional-reports-updated", onUpd);
    };
  }, [month, selected]);

  if (!canView) return null;

  const openDate = async (ymd: string) => {
    setSelected(ymd);
    setReport(null);
    setOpened(true);
    await loadDay(ymd);
  };

  return (
    <div className="space-y-4 mt-2">
      <Group justify="space-between" align="end">
        <Text fw={700}>Regional Reports</Text>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="sm" align="center">
          <Text fw={600}>Regional Report Calendar</Text>

          <Group gap="xs">
            <ActionIcon
              variant="light"
              onClick={() => {
                const next = shiftMonth(month, -1);
                setMonth(next);
                setCalendarDate(monthToDate(next));
              }}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </ActionIcon>

            <Select
              data={monthOptions}
              value={month}
              onChange={(v) => {
                if (!v) return;
                setMonth(v);
                setCalendarDate(monthToDate(v));
              }}
              w={130}
            />

            <ActionIcon
              variant="light"
              onClick={() => {
                const next = shiftMonth(month, 1);
                setMonth(next);
                setCalendarDate(monthToDate(next));
              }}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </ActionIcon>
          </Group>
        </Group>

        <DatePicker
          key={month}
          value={selected ? new Date(selected) : null}
          onChange={(date: any) => {
            if (!date) return;
            openDate(formatYMD(date));
          }}
          date={calendarDate}
          onDateChange={(date: string) => {
            const d = new Date(date);
            const nextMonth = `${d.getFullYear()}-${String(
              d.getMonth() + 1,
            ).padStart(2, "0")}`;

            setCalendarDate(d);

            if (nextMonth !== month) setMonth(nextMonth);
          }}
          renderDay={(date: any) => {
            const d = new Date(date);
            const ymd = formatYMD(d);
            const hasReport = reportDates.has(ymd);

            return (
              <div
                style={{
                  width: 32,
                  height: 32,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  backgroundColor: hasReport
                    ? "var(--color-secondary)"
                    : undefined,
                  color: hasReport ? "#fff" : undefined,
                  fontWeight: hasReport ? 700 : 400,
                }}
              >
                {d.getDate()}
              </div>
            );
          }}
        />

        <Group mt="sm" gap="xs">
          <Badge variant="light" color="blue">
            Blue day = Regional report exists
          </Badge>
        </Group>

        {loadingMonth && (
          <Text size="sm" c="dimmed" mt="sm">
            Loading month data...
          </Text>
        )}
      </Paper>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={selected || "Regional Report Details"}
        size="xl"
        centered
        styles={{
          body: {
            maxHeight: "75vh",
            overflowY: "auto",
          },
        }}
      >
        {loadingDay ? (
          <Text c="dimmed">Loading...</Text>
        ) : !report ? (
          <Text c="dimmed">No regional report for this date.</Text>
        ) : (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
              <Text fw={700}>Regional Report</Text>
              <Badge variant="light">{report.reportYmd}</Badge>
            </Group>

            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={700}>Region Name</Table.Td>
                  <Table.Td>{report.regionName || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Branches Visited Today</Table.Td>
                  <Table.Td>{report.branchesVisitedToday || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Key Observations</Table.Td>
                  <Table.Td>{report.keyObservations || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total Collection</Table.Td>
                  <Table.Td>{report.totalCollection ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Active Customers</Table.Td>
                  <Table.Td>{report.activeCustomers ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Expired Customers</Table.Td>
                  <Table.Td>{report.expiredCustomers ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total Customer Base</Table.Td>
                  <Table.Td>{report.totalCustomerBase ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total Tickets</Table.Td>
                  <Table.Td>{report.totalTickets ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Pending Tickets</Table.Td>
                  <Table.Td>{report.pendingTickets ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Tickets Closed Today</Table.Td>
                  <Table.Td>{report.ticketsClosedToday ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Reason for Pending Ticket</Table.Td>
                  <Table.Td>{report.reasonPendingTickets || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total New Connections</Table.Td>
                  <Table.Td>{report.totalNewConnections ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>New Connections Today</Table.Td>
                  <Table.Td>{report.newConnectionsToday ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Connection Pending Today</Table.Td>
                  <Table.Td>{report.connectionPendingToday ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewals Today</Table.Td>
                  <Table.Td>{report.renewalsToday ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewal Pending</Table.Td>
                  <Table.Td>{report.renewalPending ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Reason for Pending Connection</Table.Td>
                  <Table.Td>{report.reasonPendingConnection || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Collection Target</Table.Td>
                  <Table.Td>{report.collectionTarget ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Collection Achievement</Table.Td>
                  <Table.Td>{report.collectionAchievement ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>New Connection Target</Table.Td>
                  <Table.Td>{report.newConnectionTarget ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>New Connection Achievement %</Table.Td>
                  <Table.Td>
                    {report.newConnectionAchievementPct ?? 0}%
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewal Target</Table.Td>
                  <Table.Td>{report.renewalTarget ?? 0}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewal Achievement %</Table.Td>
                  <Table.Td>{report.renewalAchievementPct ?? 0}%</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Issue Details</Table.Td>
                  <Table.Td>{report.issueDetails || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Immediate Actions Taken</Table.Td>
                  <Table.Td>{report.immediateActionsTaken || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Next Day Plan</Table.Td>
                  <Table.Td>{report.nextDayPlan || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Support Required from HO</Table.Td>
                  <Table.Td>{report.supportRequiredFromHO || "-"}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Modal>
    </div>
  );
}
