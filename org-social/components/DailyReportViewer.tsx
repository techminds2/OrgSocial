"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Group, Paper, Text, Select, Table } from "@mantine/core";

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
  // ✅ Permissions:
  // - branch_manager => only self
  // - admin => only if target user is branch_manager
  const canView =
    (viewerRole === "branch_manager" && viewerId === userId) ||
    (viewerRole === "admin" && userRole === "branch_manager");

  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const monthOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const base = new Date();
    for (let i = 0; i < 12; i++) {
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
        { credentials: "include", cache: "no-store" }
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
        { credentials: "include", cache: "no-store" }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, canView]);

  useEffect(() => {
    const onUpd = () => loadMonth(month);
    window.addEventListener("daily-report-updated", onUpd);
    return () => window.removeEventListener("daily-report-updated", onUpd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  if (!canView) return null;

  return (
    <div className="space-y-3 mt-4">
      <Group justify="space-between">
        <Text fw={700}>Daily Reports (Private)</Text>
        <Select data={monthOptions} value={month} onChange={(v) => v && setMonth(v)} w={140} />
      </Group>

      {loading && <Text c="dimmed">Loading...</Text>}

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="xs">
          Days with reports
        </Text>
        <div className="flex gap-2 flex-wrap">
          {items.length === 0 ? (
            <Text c="dimmed">No reports in this month.</Text>
          ) : (
            items.map((it) => (
              <Button
                key={it.id}
                size="xs"
                variant={selected === it.reportYmd ? "filled" : "light"}
                onClick={() => {
                  setSelected(it.reportYmd);
                  loadByDate(it.reportYmd);
                }}
              >
                {it.reportYmd}
              </Button>
            ))
          )}
        </div>
      </Paper>

      {report && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="xs">
            {report.reportYmd} • Last modified: {new Date(report.updatedAt).toLocaleString()}
          </Text>

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
                <Table.Td fw={600}>Total Out going Calls (Follow UP)</Table.Td>
                <Table.Td>{report.outgoingCalls}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Trunk Issues</Table.Td>
                <Table.Td>{report.trunkIssueRemarks || "-"}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </div>
  );
}