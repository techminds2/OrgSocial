"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

type Props = {
  userId: number;
  viewerRole: string | null;
};

type TargetState = {
  month: string;
  collectionTarget: number;
  newConnectionTarget: number;
  renewalTarget: number;
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

export default function RegionalMonthlyTargetForm({
  userId,
  viewerRole,
}: Props) {
  const isAdmin = viewerRole === "admin";

  const [state, setState] = useState<TargetState>({
    month: currentMonth(),
    collectionTarget: 0,
    newConnectionTarget: 0,
    renewalTarget: 0,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

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

  const setIntFromString = (
    key: keyof Omit<TargetState, "month">,
    raw: string,
  ) => {
    const cleaned = onlyDigits(raw);
    const value = cleaned === "" ? 0 : Math.max(0, parseInt(cleaned, 10));
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const load = async (month: string) => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/regional-monthly-targets?userId=${userId}&month=${encodeURIComponent(month)}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to load regional monthly targets:", out);
        setLastUpdatedAt(null);
        setState((prev) => ({
          ...prev,
          month,
          collectionTarget: 0,
          newConnectionTarget: 0,
          renewalTarget: 0,
        }));
        return;
      }

      const item = out?.item;
      setState({
        month,
        collectionTarget: item?.collectionTarget ?? 0,
        newConnectionTarget: item?.newConnectionTarget ?? 0,
        renewalTarget: item?.renewalTarget ?? 0,
      });
      setLastUpdatedAt(item?.updatedAt ?? item?.createdAt ?? null);
    } catch (error) {
      console.error(error);
      setLastUpdatedAt(null);
      setState((prev) => ({
        ...prev,
        month,
        collectionTarget: 0,
        newConnectionTarget: 0,
        renewalTarget: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(state.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.month, isAdmin]);

  const save = async () => {
    if (!isAdmin || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/regional-monthly-targets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          month: state.month,
          collectionTarget: state.collectionTarget,
          newConnectionTarget: state.newConnectionTarget,
          renewalTarget: state.renewalTarget,
        }),
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to save regional monthly targets:", out);
        return;
      }

      setLastUpdatedAt(out?.item?.updatedAt ?? null);
      window.dispatchEvent(new CustomEvent("regional-target-updated"));
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Paper withBorder radius="md" p="md" mt="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={700}>Regional Monthly Targets</Text>
          <Select
            w={140}
            data={monthOptions}
            value={state.month}
            onChange={(v) => {
              if (!v) return;
              setState((prev) => ({ ...prev, month: v }));
            }}
          />
        </Group>

        {lastUpdatedAt ? (
          <Text size="sm" c="dimmed">
            Last modified: {new Date(lastUpdatedAt).toLocaleString()}
          </Text>
        ) : null}

        <TextInput
          label="Collection Target"
          value={String(state.collectionTarget)}
          onChange={(e) =>
            setIntFromString("collectionTarget", e.currentTarget.value)
          }
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={loading}
        />

        <TextInput
          label="New Connection Target"
          value={String(state.newConnectionTarget)}
          onChange={(e) =>
            setIntFromString("newConnectionTarget", e.currentTarget.value)
          }
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={loading}
        />

        <TextInput
          label="Renewal Target"
          value={String(state.renewalTarget)}
          onChange={(e) =>
            setIntFromString("renewalTarget", e.currentTarget.value)
          }
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={loading}
        />

        <Group justify="flex-end">
          <Button onClick={save} loading={saving}>
            Save Targets
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
