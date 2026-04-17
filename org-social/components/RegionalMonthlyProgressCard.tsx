"use client";

import { useEffect, useMemo, useState } from "react";
import { Paper, Progress, Stack, Text, Badge, Group } from "@mantine/core";

type Props = {
  userId: number;
  viewerRole: string | null;
  compact?: boolean;
};

type ProgressResponse = {
  month: string;
  target: {
    collectionTarget: number;
    newConnectionTarget: number;
    renewalTarget: number;
  };
  achieved: {
    collection: number;
    newConnections: number;
    renewals: number;
  };
  remaining: {
    collection: number;
    newConnections: number;
    renewals: number;
  };
  percent: {
    collection: number;
    newConnections: number;
    renewals: number;
  };
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export default function RegionalMonthlyProgressCard({
  userId,
  viewerRole,
  compact = false,
}: Props) {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const month = useMemo(() => currentMonth(), []);

  const canShow = viewerRole === "manager" || viewerRole === "admin";
  if (!canShow) return null;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/regional-progress?userId=${userId}&month=${month}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const out = await res.json().catch(() => ({}));
      if (res.ok) setData(out);
      else setData(null);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId, month]);

  useEffect(() => {
    const reload = () => load();
    window.addEventListener("regional-report-updated", reload);
    window.addEventListener("regional-target-updated", reload);
    return () => {
      window.removeEventListener("regional-report-updated", reload);
      window.removeEventListener("regional-target-updated", reload);
    };
  }, [userId, month]);

  if (!data) {
    return (
      <Paper withBorder radius="md" p={compact ? "sm" : "md"}>
        <Text size="sm" c="dimmed">
          {loading ? "Loading progress..." : "No progress data yet for this month."}
        </Text>
      </Paper>
    );
  }

  const Row = ({
    label,
    achieved,
    target,
    remaining,
    percent,
  }: {
    label: string;
    achieved: number;
    target: number;
    remaining: number;
    percent: number;
  }) => (
    <div>
      <Group justify="space-between" mb={6}>
        <Text size={compact ? "xs" : "sm"} fw={600}>
          {label}
        </Text>
        <Badge variant="light">
          {achieved} / {target}
        </Badge>
      </Group>
      <Progress value={Math.min(100, Number(percent || 0))} radius="xl" />
      <Text size="xs" c="dimmed" mt={4}>
        Remaining: {remaining} • {Math.round(percent || 0)}%
      </Text>
    </div>
  );

  return (
    <Paper withBorder radius="md" p={compact ? "sm" : "md"}>
      <Stack gap={compact ? "xs" : "sm"}>
        <Text fw={700} size={compact ? "sm" : "md"}>
          Regional Monthly Progress ({data.month})
        </Text>

        <Row
          label="Collection"
          achieved={data.achieved.collection}
          target={data.target.collectionTarget}
          remaining={data.remaining.collection}
          percent={data.percent.collection}
        />

        <Row
          label="New Connections"
          achieved={data.achieved.newConnections}
          target={data.target.newConnectionTarget}
          remaining={data.remaining.newConnections}
          percent={data.percent.newConnections}
        />

        <Row
          label="Renewals"
          achieved={data.achieved.renewals}
          target={data.target.renewalTarget}
          remaining={data.remaining.renewals}
          percent={data.percent.renewals}
        />
      </Stack>
    </Paper>
  );
}