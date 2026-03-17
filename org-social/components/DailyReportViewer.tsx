"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Group,
  Paper,
  Select,
  Table,
  Text,
  Modal,
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

export default function DailyReportViewer({
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
    (viewerRole === "branch_manager" && viewerId === userId) ||
    (viewerRole === "admin" && userRole === "branch_manager");

  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const res = await fetch(
        `/api/users/${userId}/daily-reports/month?month=${encodeURIComponent(m)}`,
        { credentials: "include", cache: "no-store" },
      );
      const out = await res.json();
      setItems(out.items || []);
      setSelected("");
      setReport(null);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadByDate = async (ymd: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/users/${userId}/daily-reports/by-date?date=${encodeURIComponent(ymd)}`,
        { credentials: "include", cache: "no-store" },
      );
      const out = await res.json();
      setReport(out.report || null);
    } catch (e) {
      console.error(e);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadMonth(month);
  }, [month, canView]);

  useEffect(() => {
    const onUpd = () => loadMonth(month);
    window.addEventListener("daily-report-updated", onUpd);
    return () => window.removeEventListener("daily-report-updated", onUpd);
  }, [month]);

  if (!canView) return null;

  return (
    <div className="space-y-4 mt-2">
      {/* Header */}
      <Group justify="space-between" align="end">
        <Text fw={700}>Daily Reports</Text>
      </Group>

      {/* Calendar */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="xs">
          Report Calendar
        </Text>

        <DatePicker
          value={selected ? new Date(selected) : null}
          onChange={(date) => {
            if (!date) return;

            const ymd = formatYMD(date);
            setSelected(ymd);

            if (reportDates.has(ymd)) {
              loadByDate(ymd);
              setOpened(true); // ✅ open modal only if report exists
            }
          }}
          renderDay={(date) => {
            const d = new Date(date);

            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");

            const ymd = `${y}-${m}-${day}`;
            const hasReport = reportDates.has(ymd);

            return (
              <div
                style={{
                  width: 32,
                  height: 32,
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
      </Paper>

      {/* ✅ Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={report?.reportYmd || "Daily Report"}
        size="lg"
        centered
        styles={{
          body: {
            maxHeight: "70vh",
            overflowY: "auto",
          },
        }}
      >
        {report ? (
          <>
            <Text mb="sm">
              <b>Branch:</b> {report.branchName}
            </Text>

            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={600}>New Connection Request</Table.Td>
                  <Table.Td>{report.newConnectionRequest}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending</Table.Td>
                  <Table.Td>{report.pendingConnection}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Completed</Table.Td>
                  <Table.Td>{report.completedConnection}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason for Pending</Table.Td>
                  <Table.Td>{report.reasonPendingConnection || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Internet Tkt</Table.Td>
                  <Table.Td>{report.internetTkt}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Pending Tkt</Table.Td>
                  <Table.Td>{report.pendingTkt}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Completed Tkt</Table.Td>
                  <Table.Td>{report.completedTkt}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Reason for Pending (Tkt)</Table.Td>
                  <Table.Td>{report.reasonPendingTkt || "-"}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Total Expire Customer of the day</Table.Td>
                  <Table.Td>{report.expireCustomerDay}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Renew of the day</Table.Td>
                  <Table.Td>{report.renewDay}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Active Customer</Table.Td>
                  <Table.Td>{report.activeCustomer}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Expire Customer</Table.Td>
                  <Table.Td>{report.totalExpireCustomer}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Total Outgoing Calls</Table.Td>
                  <Table.Td>{report.outgoingCalls}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td fw={600}>Trunk Issues</Table.Td>
                  <Table.Td>{report.trunkIssueRemarks || "-"}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </>
        ) : (
          <Text c="dimmed">Loading...</Text>
        )}
      </Modal>
    </div>
  );
}
