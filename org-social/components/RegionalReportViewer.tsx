"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type Item = {
  id: number;
  reportYmd: string;
  createdAt: string;
  updatedAt: string;
};

type CalendarNote = {
  id: number;
  userId: number;
  createdById: number;
  noteDate: string;
  title: string;
  description?: string | null;
  type: "PERSONAL" | "MEETING" | "ADMIN_REMINDER";
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    username: string;
    email?: string | null;
  } | null;
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

function CalendarNoteCard({
  note,
  canManageNotes,
  onEdit,
  onDelete,
}: {
  note: CalendarNote;
  canManageNotes: boolean;
  onEdit?: (note: CalendarNote) => void;
  onDelete?: (id: number) => void;
}) {
  const isMeeting = note.type === "MEETING";
  const isAdminReminder = note.type === "ADMIN_REMINDER";
  const isAdminAdded = note.createdById !== note.userId;

  const borderLeft = isMeeting
    ? "4px solid #1971c2"
    : isAdminReminder
      ? "4px solid #f08c00"
      : "4px solid #adb5bd";

  const background = isMeeting
    ? "#eef7ff"
    : isAdminReminder
      ? "#fff4e6"
      : "#f8f9fa";

  return (
    <Paper withBorder p="sm" radius="md" style={{ borderLeft, background }}>
      <Group justify="space-between" align="start" wrap="nowrap">
        <div style={{ flex: 1 }}>
          <Text fw={600}>{note.title}</Text>

          {note.description ? (
            <Text size="sm" c="dimmed" mt={4}>
              {note.description}
            </Text>
          ) : null}

          <Group gap="xs" mt={8}>
            {isMeeting ? (
              <Badge color="blue" variant="light">
                Meeting Reminder
              </Badge>
            ) : null}

            {isAdminReminder ? (
              <Badge color="orange" variant="light">
                Admin Reminder
              </Badge>
            ) : null}

            {!isMeeting && !isAdminReminder ? (
              <Badge color="gray" variant="light">
                Personal Note
              </Badge>
            ) : null}
          </Group>

          {isAdminAdded ? (
            <Text size="xs" c="dimmed" mt={6}>
              Added by: {note.createdBy?.username || "Admin"}
            </Text>
          ) : null}
        </div>

        {canManageNotes ? (
          <Group gap="xs">
            <Button size="xs" variant="light" onClick={() => onEdit?.(note)}>
              Edit
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              onClick={() => onDelete?.(note.id)}
            >
              Delete
            </Button>
          </Group>
        ) : null}
      </Group>
    </Paper>
  );
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

  const canManageNotes =
    (viewerRole === "manager" && viewerId === userId) ||
    (viewerRole === "admin" && userRole === "manager");

  const isAdminViewer = viewerRole === "admin";

  const [month, setMonth] = useState(currentMonth());
  const [calendarDate, setCalendarDate] = useState<Date>(
    monthToDate(currentMonth()),
  );

  const [items, setItems] = useState<Item[]>([]);
  const [notesMonth, setNotesMonth] = useState<CalendarNote[]>([]);

  const [selected, setSelected] = useState<string>("");
  const [report, setReport] = useState<any>(null);
  const [notesForDay, setNotesForDay] = useState<CalendarNote[]>([]);

  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [opened, setOpened] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [noteType, setNoteType] = useState<
    "PERSONAL" | "MEETING" | "ADMIN_REMINDER"
  >(isAdminViewer ? "MEETING" : "PERSONAL");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const reportDates = useMemo(() => {
    return new Set(items.map((i) => i.reportYmd));
  }, [items]);

  const noteCountsByDate = useMemo(() => {
    const out: Record<string, number> = {};
    for (const n of notesMonth) {
      out[n.noteDate] = (out[n.noteDate] || 0) + 1;
    }
    return out;
  }, [notesMonth]);

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

  const notesOfMonthSorted = useMemo(() => {
    return [...notesMonth].sort((a, b) => {
      if (a.noteDate !== b.noteDate) {
        return a.noteDate.localeCompare(b.noteDate);
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [notesMonth]);

  const loadMonth = async (m: string) => {
    setLoadingMonth(true);
    try {
      const [reportRes, noteRes] = await Promise.all([
        fetch(
          `/api/users/${userId}/regional-reports/month?month=${encodeURIComponent(m)}`,
          { credentials: "include", cache: "no-store" },
        ),
        fetch(
          `/api/calendar-notes/month?month=${encodeURIComponent(m)}&userId=${userId}`,
          { credentials: "include", cache: "no-store" },
        ),
      ]);

      const reportOut = await reportRes.json().catch(() => ({}));
      const noteOut = await noteRes.json().catch(() => ({}));

      setItems(reportOut.items || []);
      setNotesMonth(noteOut.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
      setNotesMonth([]);
    } finally {
      setLoadingMonth(false);
    }
  };

  const loadDay = async (ymd: string) => {
    setLoadingDay(true);
    try {
      const [reportRes, noteRes] = await Promise.all([
        fetch(
          `/api/users/${userId}/regional-reports/by-date?date=${encodeURIComponent(ymd)}`,
          { credentials: "include", cache: "no-store" },
        ),
        fetch(
          `/api/calendar-notes/by-date?date=${encodeURIComponent(ymd)}&userId=${userId}`,
          { credentials: "include", cache: "no-store" },
        ),
      ]);

      const reportOut = await reportRes.json().catch(() => ({}));
      const noteOut = await noteRes.json().catch(() => ({}));

      setReport(reportOut.report || null);
      setNotesForDay(noteOut.notes || []);
    } catch (e) {
      console.error(e);
      setReport(null);
      setNotesForDay([]);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadMonth(month);
  }, [month, canView]);

  useEffect(() => {
    const onRegionalReportUpdated = () => {
      loadMonth(month);
      if (selected) loadDay(selected);
    };

    const onCalendarNoteUpdated = () => {
      loadMonth(month);
      if (selected) loadDay(selected);
    };

    const onRegionalTargetUpdated = () => {
      if (selected) loadDay(selected);
    };

    window.addEventListener("regional-report-updated", onRegionalReportUpdated);
    window.addEventListener("calendar-note-updated", onCalendarNoteUpdated);
    window.addEventListener("regional-target-updated", onRegionalTargetUpdated);

    return () => {
      window.removeEventListener(
        "regional-report-updated",
        onRegionalReportUpdated,
      );
      window.removeEventListener(
        "calendar-note-updated",
        onCalendarNoteUpdated,
      );
      window.removeEventListener(
        "regional-target-updated",
        onRegionalTargetUpdated,
      );
    };
  }, [month, selected]);

  if (!canView) return null;

  const openDate = async (ymd: string) => {
    setSelected(ymd);
    setReport(null);
    setNotesForDay([]);
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteDescription("");
    setNoteType(isAdminViewer ? "MEETING" : "PERSONAL");
    setOpened(true);
    await loadDay(ymd);
  };

  const startEditNote = (note: CalendarNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteDescription(note.description || "");
    setNoteType(
      isAdminViewer
        ? note.type === "PERSONAL"
          ? "MEETING"
          : note.type
        : "PERSONAL",
    );
  };

  const resetNoteForm = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteDescription("");
    setNoteType(isAdminViewer ? "MEETING" : "PERSONAL");
  };

  const saveNote = async () => {
    if (!canManageNotes || !selected || !noteTitle.trim() || savingNote) return;

    const finalNoteType = isAdminViewer ? noteType : "PERSONAL";

    setSavingNote(true);
    try {
      if (editingNoteId) {
        const res = await fetch(`/api/calendar-notes/${editingNoteId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteDate: selected,
            title: noteTitle.trim(),
            description: noteDescription.trim(),
            type: finalNoteType,
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Note update failed:", res.status, txt);
          return;
        }
      } else {
        const res = await fetch(`/api/calendar-notes`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            noteDate: selected,
            title: noteTitle.trim(),
            description: noteDescription.trim(),
            type: finalNoteType,
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Note create failed:", res.status, txt);
          return;
        }
      }

      resetNoteForm();
      await Promise.all([loadMonth(month), loadDay(selected)]);
      window.dispatchEvent(new CustomEvent("calendar-note-updated"));
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (id: number) => {
    if (!canManageNotes) return;

    try {
      const res = await fetch(`/api/calendar-notes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Note delete failed:", res.status, txt);
        return;
      }

      if (editingNoteId === id) resetNoteForm();

      await Promise.all([loadMonth(month), loadDay(selected)]);
      window.dispatchEvent(new CustomEvent("calendar-note-updated"));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <Group justify="space-between" align="end">
        <Text fw={700}>Regional Reports & Scheduled Notes</Text>
      </Group>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm" align="center">
            <Text fw={600}>Regional Report & Notes Calendar</Text>

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
              const noteCount = noteCountsByDate[ymd] || 0;
              const hasNote = noteCount > 0;

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
                      : hasNote
                        ? "rgba(90, 140, 189, 0.18)"
                        : undefined,
                    color: hasReport ? "#fff" : undefined,
                    fontWeight: hasReport || hasNote ? 700 : 400,
                  }}
                >
                  {d.getDate()}

                  {hasNote && (
                    <span
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -1,
                        fontSize: 13,
                        fontWeight: 800,
                        lineHeight: 1,
                        color: hasReport ? "#fff" : "var(--color-secondary)",
                      }}
                    >
                      +
                    </span>
                  )}
                </div>
              );
            }}
          />

          <Group mt="sm" gap="xs">
            <Badge variant="light" color="blue">
              Blue day = Regional report exists
            </Badge>
            <Badge variant="light" color="grape">
              + = One or more notes
            </Badge>
          </Group>

          {loadingMonth && (
            <Text size="sm" c="dimmed" mt="sm">
              Loading month data...
            </Text>
          )}
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Events / Notes of {month}</Text>
            <Badge variant="light">{notesOfMonthSorted.length}</Badge>
          </Group>

          <Stack gap="sm">
            {notesOfMonthSorted.length === 0 ? (
              <Text size="sm" c="dimmed">
                No scheduled notes in this month.
              </Text>
            ) : (
              notesOfMonthSorted.map((note) => (
                <div
                  key={note.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openDate(note.noteDate)}
                >
                  <CalendarNoteCard note={note} canManageNotes={false} />
                  <Text size="xs" c="dimmed" mt={4} ml={4}>
                    {note.noteDate}
                  </Text>
                </div>
              ))
            )}
          </Stack>
        </Paper>
      </div>

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          resetNoteForm();
        }}
        title={selected || "Regional Day Details"}
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
        ) : (
          <div className="space-y-4">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Text fw={700}>Regional Report</Text>
                {report ? (
                  <Badge color="blue" variant="light">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="light" color="gray">
                    No report
                  </Badge>
                )}
              </Group>

              {report ? (
                <>
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
                          {Math.round(Number(report.newConnectionAchievementPct ?? 0))}%
                        </Table.Td>
                      </Table.Tr>

                      <Table.Tr>
                        <Table.Td fw={700}>Renewal Target</Table.Td>
                        <Table.Td>{report.renewalTarget ?? 0}</Table.Td>
                      </Table.Tr>

                      <Table.Tr>
                        <Table.Td fw={700}>Renewal Achievement %</Table.Td>
                        <Table.Td>
                          {Math.round(Number(report.renewalAchievementPct ?? 0))}%
                        </Table.Td>
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
                        <Table.Td fw={700}>Support Required From HO</Table.Td>
                        <Table.Td>{report.supportRequiredFromHO || "-"}</Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>

                  <Text size="xs" c="dimmed" mt="sm">
                    Target values shown here are the monthly admin targets snapped into the daily report at save time.
                  </Text>
                </>
              ) : (
                <Text c="dimmed">No regional report for this date.</Text>
              )}
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Text fw={700}>Scheduled Notes / Reminders</Text>
                <Badge variant="light">{notesForDay.length}</Badge>
              </Group>

              {notesForDay.length === 0 ? (
                <Text c="dimmed" mb="md">
                  No notes for this date.
                </Text>
              ) : (
                <Stack gap="sm" mb="md">
                  {notesForDay.map((note) => (
                    <CalendarNoteCard
                      key={note.id}
                      note={note}
                      canManageNotes={canManageNotes}
                      onEdit={startEditNote}
                      onDelete={deleteNote}
                    />
                  ))}
                </Stack>
              )}

              {canManageNotes ? (
                <>
                  <Divider my="sm" />
                  <Text fw={600} mb="sm">
                    {editingNoteId ? "Edit note" : "Add note"}
                  </Text>

                  <Stack gap="sm">
                    <TextInput
                      label="Title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.currentTarget.value)}
                      placeholder="Enter title"
                    />

                    <Textarea
                      label="Description"
                      value={noteDescription}
                      onChange={(e) =>
                        setNoteDescription(e.currentTarget.value)
                      }
                      autosize
                      minRows={3}
                      placeholder="Optional description"
                    />

                    {isAdminViewer ? (
                      <Select
                        label="Type"
                        data={[
                          { value: "MEETING", label: "Meeting Reminder" },
                          {
                            value: "ADMIN_REMINDER",
                            label: "Admin Reminder",
                          },
                        ]}
                        value={noteType === "PERSONAL" ? "MEETING" : noteType}
                        onChange={(v) =>
                          setNoteType(
                            (v as "MEETING" | "ADMIN_REMINDER") || "MEETING",
                          )
                        }
                      />
                    ) : null}

                    <Group justify="flex-end">
                      {editingNoteId ? (
                        <Button variant="light" onClick={resetNoteForm}>
                          Cancel
                        </Button>
                      ) : null}

                      <Button onClick={saveNote} loading={savingNote}>
                        {editingNoteId ? "Update Note" : "Save Note"}
                      </Button>
                    </Group>
                  </Stack>
                </>
              ) : null}
            </Paper>
          </div>
        )}
      </Modal>
    </div>
  );
}