// src/components/DailyReportComposer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Group,
  Modal,
  Table,
  Text,
  TextInput,
  Textarea,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { todayNepalYmd } from "@/lib/dailyReport";

type ReportState = {
  reportYmd: string;
  branchName: string;

  newConnectionRequest: number;
  pendingConnection: number;
  completedConnection: number;
  reasonPendingConnection: string;

  internetTkt: number;
  pendingTkt: number;
  completedTkt: number;
  reasonPendingTkt: string;

  expireCustomerDay: number;
  renewDay: number;
  activeCustomer: number;
  totalExpireCustomer: number;
  outgoingCalls: number;
};

function initState(reportYmd = ""): ReportState {
  return {
    reportYmd,
    branchName: "",

    newConnectionRequest: 0,
    pendingConnection: 0,
    completedConnection: 0,
    reasonPendingConnection: "",

    internetTkt: 0,
    pendingTkt: 0,
    completedTkt: 0,
    reasonPendingTkt: "",

    expireCustomerDay: 0,
    renewDay: 0,
    activeCustomer: 0,
    totalExpireCustomer: 0,
    outgoingCalls: 0,
  };
}

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

const cleanBranch = (s: string) => s.replace(/[^a-zA-Z0-9\s-]/g, "");

export default function DailyReportComposer({
  userId,
  viewerId,
}: {
  userId: number;
  viewerId: number;
}) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const isOwner = viewerId === userId;

  const [opened, setOpened] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [saving, setSaving] = useState(false);

  const [state, setState] = useState<ReportState>(initState(""));
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const branchRef = useRef<HTMLInputElement | null>(null);

  const setIntFromString = (k: keyof ReportState, raw: string) => {
    const cleaned = onlyDigits(raw);
    const n = cleaned === "" ? 0 : Math.max(0, parseInt(cleaned, 10));
    setState((p) => ({ ...p, [k]: n } as any));
  };

  const setTxt = (k: keyof ReportState, v: string) =>
    setState((p) => ({ ...p, [k]: v }));

  const prefill = async () => {
    setLoadingPrefill(true);
    try {
      const res = await fetch(`/api/users/${userId}/daily-reports/today`, {
        credentials: "include",
        cache: "no-store",
      });

      const out = await res.json().catch(() => ({}));
      const ymd = String(out?.reportYmd || "") || todayNepalYmd();

      if (out?.report) {
        const r = out.report;
        setState({
          reportYmd: ymd,
          branchName: r.branchName || "",
          newConnectionRequest: r.newConnectionRequest ?? 0,
          pendingConnection: r.pendingConnection ?? 0,
          completedConnection: r.completedConnection ?? 0,
          reasonPendingConnection: r.reasonPendingConnection ?? "",
          internetTkt: r.internetTkt ?? 0,
          pendingTkt: r.pendingTkt ?? 0,
          completedTkt: r.completedTkt ?? 0,
          reasonPendingTkt: r.reasonPendingTkt ?? "",
          expireCustomerDay: r.expireCustomerDay ?? 0,
          renewDay: r.renewDay ?? 0,
          activeCustomer: r.activeCustomer ?? 0,
          totalExpireCustomer: r.totalExpireCustomer ?? 0,
          outgoingCalls: r.outgoingCalls ?? 0,
        });
        setLastUpdatedAt(r.updatedAt || r.createdAt || null);
      } else {
        setState(initState(ymd));
        setLastUpdatedAt(null);
      }
    } catch (e) {
      console.error(e);
      setState((p) => ({ ...p, reportYmd: p.reportYmd || todayNepalYmd() }));
    } finally {
      setLoadingPrefill(false);
    }
  };

  useEffect(() => {
    if (!opened) return;
    prefill().finally(() => setTimeout(() => branchRef.current?.focus(), 80));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const canSave = isOwner && state.reportYmd && state.branchName.trim().length > 0;

  const save = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/daily-reports/upsert-today", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportYmd: state.reportYmd,
          branchName: state.branchName,

          newConnectionRequest: state.newConnectionRequest,
          pendingConnection: state.pendingConnection,
          completedConnection: state.completedConnection,
          reasonPendingConnection: state.reasonPendingConnection,

          internetTkt: state.internetTkt,
          pendingTkt: state.pendingTkt,
          completedTkt: state.completedTkt,
          reasonPendingTkt: state.reasonPendingTkt,

          expireCustomerDay: state.expireCustomerDay,
          renewDay: state.renewDay,
          activeCustomer: state.activeCustomer,
          totalExpireCustomer: state.totalExpireCustomer,
          outgoingCalls: state.outgoingCalls,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("DAILY REPORT SAVE FAILED:", res.status, txt);
        return;
      }

      const out = await res.json().catch(() => ({}));
      setLastUpdatedAt(out?.report?.updatedAt ?? null);
      setOpened(false);
      window.dispatchEvent(new CustomEvent("daily-report-updated"));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) return null;

  const numInput = (k: keyof ReportState) => (
    <TextInput
      value={String(state[k] as any)}
      onChange={(e) => setIntFromString(k, e.currentTarget.value)}
      inputMode="numeric"
      pattern="[0-9]*"
    />
  );

  return (
    <>
      <Group justify="flex-start" mt="md">
        <Button
          variant="light"
          styles={{
            root: {
              backgroundColor: "rgba(90, 140, 189, 0.15)",
              color: "var(--color-secondary)",
              border: "1px solid var(--color-secondary)",
            },
          }}
          onClick={() => {
            setState((p) => ({
              ...p,
              reportYmd: p.reportYmd || todayNepalYmd(),
            }));
            setOpened(true);
          }}
        >
          Daily Report (Today)
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Daily Report (Today)"
        size="xl"
        centered
        withinPortal
        zIndex={10000}
        overlayProps={{
          color: colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.gray[2],
          opacity: 0.75,
          blur: 3,
        }}
      >
        {loadingPrefill ? (
          <Text c="dimmed">Loading...</Text>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextInput
                label="Branch Name"
                value={state.branchName}
                onChange={(e) =>
                  setTxt("branchName", cleanBranch(e.currentTarget.value))
                }
                ref={branchRef as any}
                required
              />
              <TextInput label="Report Date (Nepal)" value={state.reportYmd} disabled />
            </div>

            {lastUpdatedAt && (
              <Text size="sm" c="dimmed">
                Last modified: {new Date(lastUpdatedAt).toLocaleString()}
              </Text>
            )}

            <Table withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: "55%" }}>Metric</Table.Th>
                  <Table.Th>Value</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={600}>New Connection Request</Table.Td>
                  <Table.Td>{numInput("newConnectionRequest")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Pending</Table.Td>
                  <Table.Td>{numInput("pendingConnection")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Completed</Table.Td>
                  <Table.Td>{numInput("completedConnection")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Reason for Pending</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.reasonPendingConnection}
                      onChange={(e) =>
                        setTxt("reasonPendingConnection", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Internet Tkt</Table.Td>
                  <Table.Td>{numInput("internetTkt")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Pending Tkt</Table.Td>
                  <Table.Td>{numInput("pendingTkt")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Completed Tkt</Table.Td>
                  <Table.Td>{numInput("completedTkt")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Reason for Pending (Tkt)</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.reasonPendingTkt}
                      onChange={(e) =>
                        setTxt("reasonPendingTkt", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Total Expire Customer of the day</Table.Td>
                  <Table.Td>{numInput("expireCustomerDay")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Total Renew of the day</Table.Td>
                  <Table.Td>{numInput("renewDay")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Total Active Customer</Table.Td>
                  <Table.Td>{numInput("activeCustomer")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Total Expire Customer</Table.Td>
                  <Table.Td>{numInput("totalExpireCustomer")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>Total Out going Calls (Follow UP)</Table.Td>
                  <Table.Td>{numInput("outgoingCalls")}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setOpened(false)}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={!canSave}
                loading={saving}
                styles={{
                  root: {
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "var(--color-secondary)" },
                    "&:disabled": {
                      backgroundColor: "rgba(90, 140, 189, 0.5)",
                      color: "white",
                    },
                  },
                }}
              >
                Save
              </Button>
            </Group>
          </div>
        )}
      </Modal>
    </>
  );
}