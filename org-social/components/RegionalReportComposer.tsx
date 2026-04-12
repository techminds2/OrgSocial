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
  regionName: string;

  branchesVisitedToday: string;
  keyObservations: string;

  totalCollection: number;
  activeCustomers: number;
  expiredCustomers: number;
  totalCustomerBase: number;

  totalTickets: number;
  pendingTickets: number;
  ticketsClosedToday: number;
  reasonPendingTickets: string;

  totalNewConnections: number;
  newConnectionsToday: number;
  connectionPendingToday: number;
  renewalsToday: number;
  renewalPending: number;
  reasonPendingConnection: string;

  collectionTarget: number;
  collectionAchievement: number;
  newConnectionTarget: number;
  newConnectionAchievementPct: number;
  renewalTarget: number;
  renewalAchievementPct: number;

  issueDetails: string;

  immediateActionsTaken: string;
  nextDayPlan: string;
  supportRequiredFromHO: string;
};

function initState(reportYmd = ""): ReportState {
  return {
    reportYmd,
    regionName: "",

    branchesVisitedToday: "",
    keyObservations: "",

    totalCollection: 0,
    activeCustomers: 0,
    expiredCustomers: 0,
    totalCustomerBase: 0,

    totalTickets: 0,
    pendingTickets: 0,
    ticketsClosedToday: 0,
    reasonPendingTickets: "",

    totalNewConnections: 0,
    newConnectionsToday: 0,
    connectionPendingToday: 0,
    renewalsToday: 0,
    renewalPending: 0,
    reasonPendingConnection: "",

    collectionTarget: 0,
    collectionAchievement: 0,
    newConnectionTarget: 0,
    newConnectionAchievementPct: 0,
    renewalTarget: 0,
    renewalAchievementPct: 0,

    issueDetails: "",

    immediateActionsTaken: "",
    nextDayPlan: "",
    supportRequiredFromHO: "",
  };
}

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");
const cleanRegion = (s: string) => s.replace(/[^a-zA-Z0-9\s-]/g, "");

export default function RegionalReportComposer({
  userId,
  viewerId,
  viewerRole,
}: {
  userId: number;
  viewerId: number;
  viewerRole: string | null;
}) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const canAccess = viewerRole === "manager" && viewerId === userId;

  const [opened, setOpened] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [saving, setSaving] = useState(false);

  const [state, setState] = useState<ReportState>(initState(""));
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const regionRef = useRef<HTMLInputElement | null>(null);

  const setIntFromString = (k: keyof ReportState, raw: string) => {
    const cleaned = onlyDigits(raw);
    const n = cleaned === "" ? 0 : Math.max(0, parseInt(cleaned, 10));
    setState((p) => ({ ...p, [k]: n }) as ReportState);
  };

  const setTxt = (k: keyof ReportState, v: string) =>
    setState((p) => ({ ...p, [k]: v }));

  const prefill = async () => {
    setLoadingPrefill(true);
    try {
      const res = await fetch(`/api/users/${userId}/regional-reports/today`, {
        credentials: "include",
        cache: "no-store",
      });

      const out = await res.json().catch(() => ({}));
      const ymd = String(out?.reportYmd || "") || todayNepalYmd();

      if (out?.report) {
        const r = out.report;
        setState({
          reportYmd: ymd,
          regionName: r.regionName || "",

          branchesVisitedToday: r.branchesVisitedToday || "",
          keyObservations: r.keyObservations || "",

          totalCollection: r.totalCollection ?? 0,
          activeCustomers: r.activeCustomers ?? 0,
          expiredCustomers: r.expiredCustomers ?? 0,
          totalCustomerBase: r.totalCustomerBase ?? 0,

          totalTickets: r.totalTickets ?? 0,
          pendingTickets: r.pendingTickets ?? 0,
          ticketsClosedToday: r.ticketsClosedToday ?? 0,
          reasonPendingTickets: r.reasonPendingTickets ?? "",

          totalNewConnections: r.totalNewConnections ?? 0,
          newConnectionsToday: r.newConnectionsToday ?? 0,
          connectionPendingToday: r.connectionPendingToday ?? 0,
          renewalsToday: r.renewalsToday ?? 0,
          renewalPending: r.renewalPending ?? 0,
          reasonPendingConnection: r.reasonPendingConnection ?? "",

          collectionTarget: r.collectionTarget ?? 0,
          collectionAchievement: r.collectionAchievement ?? 0,
          newConnectionTarget: r.newConnectionTarget ?? 0,
          newConnectionAchievementPct: Math.round(
            Number(r.newConnectionAchievementPct ?? 0),
          ),
          renewalTarget: r.renewalTarget ?? 0,
          renewalAchievementPct: Math.round(
            Number(r.renewalAchievementPct ?? 0),
          ),

          issueDetails: r.issueDetails ?? "",

          immediateActionsTaken: r.immediateActionsTaken ?? "",
          nextDayPlan: r.nextDayPlan ?? "",
          supportRequiredFromHO: r.supportRequiredFromHO ?? "",
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
    prefill().finally(() => setTimeout(() => regionRef.current?.focus(), 80));
  }, [opened]);

  const canSave =
    canAccess && state.reportYmd && state.regionName.trim().length > 0;

  const save = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/regional-report/upsert-today", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("REGIONAL REPORT SAVE FAILED:", res.status, txt);
        return;
      }

      const out = await res.json().catch(() => ({}));
      setLastUpdatedAt(out?.report?.updatedAt ?? null);
      setOpened(false);
      window.dispatchEvent(new CustomEvent("regional-report-updated"));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) return null;

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
          Regional Report (Today)
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Regional Report (Today)"
        size="xl"
        centered
        withinPortal
        zIndex={10000}
        overlayProps={{
          color:
            colorScheme === "dark"
              ? theme.colors.dark[9]
              : theme.colors.gray[2],
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
                label="Region Name"
                value={state.regionName}
                onChange={(e) =>
                  setTxt("regionName", cleanRegion(e.currentTarget.value))
                }
                ref={regionRef as any}
                required
              />
              <TextInput
                label="Report Date (Nepal)"
                value={state.reportYmd}
                disabled
              />
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
                  <Table.Td fw={700}>Branches Visited Today</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.branchesVisitedToday}
                      onChange={(e) =>
                        setTxt("branchesVisitedToday", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Key Observations</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.keyObservations}
                      onChange={(e) =>
                        setTxt("keyObservations", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total Collection</Table.Td>
                  <Table.Td>{numInput("totalCollection")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Active Customers</Table.Td>
                  <Table.Td>{numInput("activeCustomers")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Expired Customers</Table.Td>
                  <Table.Td>{numInput("expiredCustomers")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total Customer Base</Table.Td>
                  <Table.Td>{numInput("totalCustomerBase")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total Tickets</Table.Td>
                  <Table.Td>{numInput("totalTickets")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Pending Tickets</Table.Td>
                  <Table.Td>{numInput("pendingTickets")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Tickets Closed Today</Table.Td>
                  <Table.Td>{numInput("ticketsClosedToday")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Reason for Pending Ticket</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.reasonPendingTickets}
                      onChange={(e) =>
                        setTxt("reasonPendingTickets", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Total New Connections</Table.Td>
                  <Table.Td>{numInput("totalNewConnections")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>New Connections Today</Table.Td>
                  <Table.Td>{numInput("newConnectionsToday")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Connection Pending Today</Table.Td>
                  <Table.Td>{numInput("connectionPendingToday")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewals Today</Table.Td>
                  <Table.Td>{numInput("renewalsToday")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewal Pending</Table.Td>
                  <Table.Td>{numInput("renewalPending")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Reason for Pending Connection</Table.Td>
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
                  <Table.Td fw={700}>Collection Target</Table.Td>
                  <Table.Td>{numInput("collectionTarget")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Collection Achievement</Table.Td>
                  <Table.Td>{numInput("collectionAchievement")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>New Connection Target</Table.Td>
                  <Table.Td>{numInput("newConnectionTarget")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>New Connection Achievement %</Table.Td>
                  <Table.Td>{numInput("newConnectionAchievementPct")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewal Target</Table.Td>
                  <Table.Td>{numInput("renewalTarget")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Renewal Achievement %</Table.Td>
                  <Table.Td>{numInput("renewalAchievementPct")}</Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Issue Details</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.issueDetails}
                      onChange={(e) =>
                        setTxt("issueDetails", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Immediate Actions Taken</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.immediateActionsTaken}
                      onChange={(e) =>
                        setTxt("immediateActionsTaken", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Next Day Plan</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.nextDayPlan}
                      onChange={(e) =>
                        setTxt("nextDayPlan", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={700}>Support Required from HO</Table.Td>
                  <Table.Td>
                    <Textarea
                      value={state.supportRequiredFromHO}
                      onChange={(e) =>
                        setTxt("supportRequiredFromHO", e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">
                Note: This is region-wise data for all branches in the region.
              </Text>

              <Button onClick={save} loading={saving} disabled={!canSave}>
                Save Report
              </Button>
            </Group>
          </div>
        )}
      </Modal>
    </>
  );
}
