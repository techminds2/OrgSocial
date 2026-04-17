"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Group,
  Modal,
  Paper,
  Text,
  TextInput,
} from "@mantine/core";

type Props = {
  userId: number;
  viewerRole: string | null;
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

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

export default function RegionalMonthlyTargetModal({
  userId,
  viewerRole,
}: Props) {
  const isAdmin = viewerRole === "admin";

  const [opened, setOpened] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [collectionTarget, setCollectionTarget] = useState(0);
  const [newConnectionTarget, setNewConnectionTarget] = useState(0);
  const [renewalTarget, setRenewalTarget] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const months = useMemo(() => {
    const out: string[] = [];
    const base = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return out;
  }, []);

  const setInt = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    raw: string,
  ) => {
    const cleaned = onlyDigits(raw);
    setter(cleaned ? Math.max(0, parseInt(cleaned, 10)) : 0);
  };

  const load = async (selectedMonth: string) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/regional-monthly-targets?userId=${userId}&month=${encodeURIComponent(selectedMonth)}`,
        { credentials: "include", cache: "no-store" },
      );
      const out = await res.json().catch(() => ({}));

      const item = out?.item;
      setCollectionTarget(item?.collectionTarget ?? 0);
      setNewConnectionTarget(item?.newConnectionTarget ?? 0);
      setRenewalTarget(item?.renewalTarget ?? 0);
      setCanEdit(Boolean(out?.canEdit ?? false));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!opened) return;
    load(month);
  }, [opened, month]);

  const save = async () => {
    if (!isAdmin || !canEdit || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/regional-monthly-targets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          month,
          collectionTarget,
          newConnectionTarget,
          renewalTarget,
        }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(out);
        return;
      }

      window.dispatchEvent(new CustomEvent("regional-target-updated"));
      setOpened(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Group justify="flex-end" mb="md">
        <Button variant="light" onClick={() => setOpened(true)}>
          Monthly Regional Targets
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Regional Monthly Targets"
        centered
        size="lg"
      >
        <Paper p="sm" radius="md" withBorder>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Month</label>
              <select
                className="border rounded px-3 py-2 w-full text-sm"
                value={month}
                onChange={(e) => setMonth(e.currentTarget.value)}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {!canEdit && (
              <Text size="sm" c="red">
                Only the current month can be edited. Previous months are locked, and future months become editable only after that month begins.
              </Text>
            )}

            <TextInput
              label="Collection Target"
              value={String(collectionTarget)}
              onChange={(e) => setInt(setCollectionTarget, e.currentTarget.value)}
              inputMode="numeric"
              disabled={loading || !canEdit}
            />

            <TextInput
              label="New Connection Target"
              value={String(newConnectionTarget)}
              onChange={(e) =>
                setInt(setNewConnectionTarget, e.currentTarget.value)
              }
              inputMode="numeric"
              disabled={loading || !canEdit}
            />

            <TextInput
              label="Renewal Target"
              value={String(renewalTarget)}
              onChange={(e) => setInt(setRenewalTarget, e.currentTarget.value)}
              inputMode="numeric"
              disabled={loading || !canEdit}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setOpened(false)}>
                Close
              </Button>
              <Button onClick={save} loading={saving} disabled={!canEdit}>
                Save
              </Button>
            </Group>
          </div>
        </Paper>
      </Modal>
    </>
  );
}