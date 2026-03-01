"use client";

import { useEffect, useState } from "react";
import { Paper, Text, Table, Loader } from "@mantine/core";

export default function RegionalReportViewer({
  userId,
  viewerId,
  viewerRole,
}: {
  userId: number;
  viewerId: number;
  viewerRole: string | null;
}) {
  const canView = viewerRole === "admin" || viewerId === userId;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canView) return;

    const loadToday = async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/users/${userId}/regional-reports/by-date?date=`,
          {
            credentials: "include",
            cache: "no-store",
          }
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

    loadToday();

    const onUpd = () => loadToday();
    window.addEventListener("regional-report-updated", onUpd);

    return () =>
      window.removeEventListener("regional-report-updated", onUpd);
  }, [userId, canView]);

  if (!canView) return null;

  if (loading) return <Loader size="sm" />;

  if (!report)
    return <Text c="dimmed">No regional report for today.</Text>;

  return (
    <Paper withBorder p="md" mt="md">
      <Text fw={600}>
        Regional Report • {report.reportYmd}
      </Text>

      <Table withTableBorder withColumnBorders mt="sm">
        <Table.Tbody>
          <Table.Tr>
            <Table.Td fw={600}>Region</Table.Td>
            <Table.Td>{report.regionName}</Table.Td>
          </Table.Tr>

          <Table.Tr>
            <Table.Td fw={600}>Meetings</Table.Td>
            <Table.Td>{report.totalMeetings ?? "-"}</Table.Td>
          </Table.Tr>

          <Table.Tr>
            <Table.Td fw={600}>Branches Visited</Table.Td>
            <Table.Td>{report.totalBranchesVisited ?? "-"}</Table.Td>
          </Table.Tr>

          <Table.Tr>
            <Table.Td fw={600}>Marketing Days Planned</Table.Td>
            <Table.Td>{report.marketingDaysPlanned ?? "-"}</Table.Td>
          </Table.Tr>

          {report.dynamicData &&
            Object.entries(report.dynamicData).map(([k, v]) => (
              <Table.Tr key={k}>
                <Table.Td fw={600}>{k}</Table.Td>
                <Table.Td>{String(v)}</Table.Td>
              </Table.Tr>
            ))}

          <Table.Tr>
            <Table.Td fw={600}>Remarks</Table.Td>
            <Table.Td>{report.remarks || "-"}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Paper>
  );
}