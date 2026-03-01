"use client";

import { useState } from "react";
import {
  Button,
  Group,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Paper,
} from "@mantine/core";
import { todayNepalYmd } from "@/lib/dailyReport";

type DynamicField = {
  label: string;
  value: string;
};

export default function RegionalReportComposer({
  userId,
  viewerId,
}: {
  userId: number;
  viewerId: number;
}) {
  const isOwner = viewerId === userId;

  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);

  const [regionName, setRegionName] = useState("");

  const [totalMeetings, setTotalMeetings] = useState<number | undefined>(
    undefined,
  );
  const [totalBranchesVisited, setTotalBranchesVisited] = useState<
    number | undefined
  >(undefined);
  const [marketingDaysPlanned, setMarketingDaysPlanned] = useState<
    number | undefined
  >(undefined);

  const [remarks, setRemarks] = useState("");

  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);

  const reportYmd = todayNepalYmd();

  if (!isOwner) return null;

  const addField = () =>
    setDynamicFields((p) => [...p, { label: "", value: "" }]);

  const updateField = (
    index: number,
    key: keyof DynamicField,
    value: string,
  ) => {
    setDynamicFields((prev) => {
      const copy = [...prev];
      copy[index][key] = value;
      return copy;
    });
  };

  const removeField = (index: number) => {
    setDynamicFields((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (saving) return;

    if (!regionName || !regionName.trim()) {
      alert("Region name is required");
      return;
    }

    setSaving(true);

    try {
      const dynamicData = dynamicFields.reduce(
        (acc, f) => {
          if (f.label && f.label.trim()) {
            acc[f.label.trim()] = f.value?.trim() || "";
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      const payload = {
        reportYmd: reportYmd || todayNepalYmd(),
        regionName: regionName.trim(),

        totalMeetings: typeof totalMeetings === "number" ? totalMeetings : null,

        totalBranchesVisited:
          typeof totalBranchesVisited === "number"
            ? totalBranchesVisited
            : null,

        marketingDaysPlanned:
          typeof marketingDaysPlanned === "number"
            ? marketingDaysPlanned
            : null,

        dynamicData,
        remarks: remarks?.trim() || null,
      };

      const res = await fetch("/api/regional-report/upsert-today", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("SAVE FAILED:", res.status, txt);
        throw new Error("Failed to save report");
      }

      window.dispatchEvent(new CustomEvent("regional-report-updated"));

      setOpened(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Group justify="flex-start" mt="md">
        <Button variant="light" onClick={() => setOpened(true)}>
          Regional Report (Today)
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Regional Daily Report"
        size="xl"
        centered
      >
        <Paper p="md" className="space-y-3">
          <TextInput
            label="Region Name"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            required
          />

          <NumberInput
            label="Total Meetings"
            value={totalMeetings}
            onChange={(v) =>
              setTotalMeetings(typeof v === "number" ? v : undefined)
            }
            allowNegative={false}
            min={0}
          />

          <NumberInput
            label="Total Branches Visited"
            value={totalBranchesVisited}
            onChange={(v) =>
              setTotalBranchesVisited(typeof v === "number" ? v : undefined)
            }
            allowNegative={false}
            min={0}
          />

          <NumberInput
            label="Marketing Days Planned"
            value={marketingDaysPlanned}
            onChange={(v) =>
              setMarketingDaysPlanned(typeof v === "number" ? v : undefined)
            }
            allowNegative={false}
            min={0}
          />

          {dynamicFields.map((field, index) => (
            <Group key={index} grow mt="xs">
              <TextInput
                placeholder="Field Label"
                value={field.label}
                onChange={(e) => updateField(index, "label", e.target.value)}
              />

              <TextInput
                placeholder="Field Value"
                value={field.value}
                onChange={(e) => updateField(index, "value", e.target.value)}
              />

              <Button color="red" onClick={() => removeField(index)}>
                Remove
              </Button>
            </Group>
          ))}

          <Group mt="sm">
            <Button variant="light" onClick={addField}>
              + Add Field
            </Button>
          </Group>

          <Textarea
            label="Remarks"
            minRows={5}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button onClick={save} loading={saving}>
              Save Report
            </Button>
          </Group>
        </Paper>
      </Modal>
    </>
  );
}
