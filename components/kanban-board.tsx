"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CoverLetterDialog } from "@/components/cover-letter-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import {
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_VAR,
  isAppStatus,
  type AppStatus,
} from "@/lib/kanban";
import {
  SearchIcon,
  LayoutGridIcon,
  Table2Icon,
  ListIcon,
  StickyNoteIcon,
  CalendarClockIcon,
  Loader2Icon,
  Trash2Icon,
  ExternalLinkIcon,
  GripVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  FileTextIcon,
} from "lucide-react";

type Source = "GLINTS" | "JOBSTREET";

interface JobInfo {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  source: Source;
  sourceUrl: string;
}

interface AppCard {
  id: string;
  status: AppStatus;
  notes: string | null;
  appliedAt: string | null;
  nextFollowUpAt: string | null;
  coverLetter: string | null;
  createdAt: string;
  job: JobInfo;
}

function SourceBadge({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        source === "GLINTS"
          ? "bg-accent/10 text-accent"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {source === "GLINTS" ? "Glints" : "Jobstreet"}
    </span>
  );
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const statusKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context, currentCoordinates },
) => {
  const direction =
    event.code === "ArrowRight" || event.code === "ArrowDown"
      ? 1
      : event.code === "ArrowLeft" || event.code === "ArrowUp"
        ? -1
        : 0;
  if (!direction) return currentCoordinates;

  const currentId = context.over?.id ?? context.active?.data.current?.status;
  const currentStatus = String(currentId ?? "");
  if (!isAppStatus(currentStatus)) return currentCoordinates;
  const nextStatus =
    STATUS_ORDER[STATUS_ORDER.indexOf(currentStatus) + direction];
  if (!nextStatus) return currentCoordinates;

  const target = context.droppableRects.get(nextStatus);
  const dragging = context.draggingNodeRect;
  if (!target || !dragging) return currentCoordinates;
  return {
    x: target.left + (target.width - dragging.width) / 2,
    y: target.top + Math.min(24, (target.height - dragging.height) / 2),
  };
};

function DraggableCard({
  app,
  onOpen,
}: {
  app: AppCard;
  onOpen: (app: AppCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id, data: { status: app.status } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(app)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen(app);
          return;
        }
        listeners?.onKeyDown?.(event);
      }}
      aria-label={`${app.job.title}. Tekan Enter untuk membuka detail atau Spasi untuk memindahkan kartu.`}
      className={cn(
        "group border-border bg-card cursor-grab rounded-xl border p-3 transition-shadow duration-150 ease-out hover:shadow-sm active:cursor-grabbing motion-reduce:transition-none",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-foreground text-sm leading-snug font-medium">
          {app.job.title}
        </p>
        <GripVerticalIcon className="text-muted-foreground/40 group-hover:text-muted-foreground size-4 shrink-0 transition-colors" />
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {[app.job.company, app.job.location].filter(Boolean).join(" · ") || "—"}
        {app.job.salary ? ` · ${app.job.salary}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <SourceBadge source={app.job.source} />
        {app.nextFollowUpAt ? (
          <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" aria-label={`Follow-up ${formatDate(app.nextFollowUpAt)}`}>
            <CalendarClockIcon className="size-3" />
            <span aria-hidden="true">{formatDate(app.nextFollowUpAt)}</span>
          </span>
        ) : null}
        {app.notes ? (
          <span className="text-muted-foreground inline-flex items-center">
            <StickyNoteIcon className="size-3.5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Column({
  status,
  apps,
  onOpen,
}: {
  status: AppStatus;
  apps: AppCard[];
  onOpen: (app: AppCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = STATUS_VAR[status];
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="text-foreground text-sm font-semibold">
            {STATUS_LABELS[status]}
          </span>
        </div>
        <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "border-border bg-secondary/30 flex min-h-32 flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors",
          isOver && "border-accent/50 bg-accent/5",
        )}
      >
        {apps.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            Tidak ada
          </p>
        ) : (
          apps.map((app) => (
            <DraggableCard key={app.id} app={app} onOpen={onOpen} />
          ))
        )}
      </div>
    </div>
  );
}

type SortKey =
  | "status"
  | "title"
  | "company"
  | "location"
  | "source"
  | "appliedAt"
  | "nextFollowUpAt";

function compare(a: AppCard, b: AppCard, key: SortKey): number {
  switch (key) {
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "title":
      return a.job.title.localeCompare(b.job.title);
    case "company":
      return (a.job.company ?? "").localeCompare(b.job.company ?? "");
    case "location":
      return (a.job.location ?? "").localeCompare(b.job.location ?? "");
    case "source":
      return a.job.source.localeCompare(b.job.source);
    case "appliedAt":
    case "nextFollowUpAt": {
      const av = key === "appliedAt" ? a.appliedAt : a.nextFollowUpAt;
      const bv = key === "appliedAt" ? b.appliedAt : b.nextFollowUpAt;
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return new Date(av).getTime() - new Date(bv).getTime();
    }
    default:
      return 0;
  }
}

function TableView({
  apps,
  onOpen,
}: {
  apps: AppCard[];
  onOpen: (app: AppCard) => void;
}) {
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>(
    {
      key: "status",
      dir: "asc",
    },
  );

  const sorted = React.useMemo(() => {
    const list = [...apps];
    list.sort((a, b) => {
      const base = compare(a, b, sort.key);
      return sort.dir === "asc" ? base : -base;
    });
    return list;
  }, [apps, sort]);

  function toggle(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col)
      return (
        <ChevronsUpDownIcon className="text-muted-foreground/40 size-3.5" />
      );
    return sort.dir === "asc" ? (
      <ArrowUpIcon className="text-foreground size-3.5" />
    ) : (
      <ArrowDownIcon className="text-foreground size-3.5" />
    );
  }

  const head = (key: SortKey, label: string, className = "") => (
    <th
      className={cn(
        "text-muted-foreground px-3 py-2 text-left font-medium whitespace-nowrap",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => toggle(key)}
        className="hover:text-foreground inline-flex min-h-11 items-center gap-1"
      >
        {label}
        <SortIcon col={key} />
      </button>
    </th>
  );

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="border-border bg-secondary/40 border-b">
          <tr>
            {head("status", "Status")}
            {head("title", "Posisi")}
            {head("company", "Perusahaan")}
            {head("location", "Lokasi")}
            {head("source", "Sumber")}
            {head("appliedAt", "Melamar")}
            {head("nextFollowUpAt", "Follow-up")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((app) => (
            <tr
              key={app.id}
              onClick={() => onOpen(app)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(app);
                }
              }}
              aria-label={`Edit lamaran ${app.job.title}`}
              className="border-border hover:bg-muted/50 cursor-pointer border-b transition-colors last:border-0"
            >
              <td className="px-3 py-2.5">
                <StatusBadge status={app.status} />
              </td>
              <td className="text-foreground px-3 py-2.5 font-medium">
                {app.job.title}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {app.job.company ?? "—"}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {app.job.location ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                <SourceBadge source={app.job.source} />
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {formatDate(app.appliedAt) || "—"}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {formatDate(app.nextFollowUpAt) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListView({
  byStatus,
  onOpen,
}: {
  byStatus: Record<AppStatus, AppCard[]>;
  onOpen: (app: AppCard) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {STATUS_ORDER.map((status) => {
        const list = byStatus[status];
        if (list.length === 0) return null;
        return (
          <div key={status}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_VAR[status] }}
              />
              <span className="text-foreground text-sm font-semibold">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-muted-foreground text-xs">
                {list.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {list.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onOpen(app)}
                  className="border-border bg-card hover:bg-muted/40 flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {app.job.title}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {[app.job.company, app.job.location]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {app.job.salary ? ` · ${app.job.salary}` : ""}
                    </p>
                  </div>
                  <SourceBadge source={app.job.source} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KanbanBoard({
  initialApplications,
}: {
  initialApplications: AppCard[];
}) {
  const [apps, setApps] = React.useState<AppCard[]>(initialApplications);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"board" | "table" | "list">("board");
  const [editing, setEditing] = React.useState<AppCard | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = React.useState("");
  const [statusError, setStatusError] = React.useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: statusKeyboardCoordinates }),
  );

  const q = search.trim().toLowerCase();
  const visible = React.useMemo(
    () =>
      apps.filter(
        (a) =>
          !q ||
          (a.job.company ?? "").toLowerCase().includes(q) ||
          a.job.title.toLowerCase().includes(q),
      ),
    [apps, q],
  );

  const byStatus = React.useMemo(() => {
    const map: Record<AppStatus, AppCard[]> = {
      WISHLIST: [],
      APPLIED: [],
      SCREENING: [],
      INTERVIEW: [],
      OFFER: [],
      REJECTED: [],
    };
    for (const a of visible) map[a.status].push(a);
    return map;
  }, [visible]);

  function handleDragStart(event: DragEndEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!isAppStatus(overId)) return;
    const current = apps.find((a) => a.id === activeId);
    if (!current || current.status === overId) return;

    const previous = current.status;
    const clearing = overId === "WISHLIST";
    const settingNow =
      previous === "WISHLIST" && overId !== "WISHLIST" && !current.appliedAt;
    const newAppliedAt: string | null = clearing
      ? null
      : settingNow
        ? new Date().toISOString()
        : current.appliedAt;

    const body: Record<string, unknown> = { status: overId };
    if (clearing || settingNow) body.appliedAt = newAppliedAt;

    setApps((prev) =>
      prev.map((a) =>
        a.id === activeId
          ? { ...a, status: overId, appliedAt: newAppliedAt }
          : a,
      ),
    );
    setStatusError("");

    fetch(`/api/applications/${activeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error("patch failed");
        setStatusAnnouncement(
          `Status ${current.job.title} diperbarui menjadi ${STATUS_LABELS[overId]}.`,
        );
      })
      .catch(() => {
        setApps((prev) =>
          prev.map((a) =>
            a.id === activeId
              ? { ...a, status: previous, appliedAt: current.appliedAt }
              : a,
          ),
        );
        setStatusError(
          `Status ${current.job.title} gagal diperbarui. Perubahan dibatalkan.`,
        );
      });
  }

  const activeApp = activeId ? apps.find((a) => a.id === activeId) : null;

  const dragAccessibility = {
    screenReaderInstructions: {
      draggable:
        "Tekan Spasi untuk mengambil kartu. Gunakan tombol panah untuk memilih status, lalu tekan Spasi untuk meletakkan atau Escape untuk membatalkan.",
    },
    announcements: {
      onDragStart({ active }: { active: { id: string | number } }) {
        const app = apps.find((item) => item.id === String(active.id));
        return app ? `${app.job.title} diambil.` : "Kartu diambil.";
      },
      onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        const app = apps.find((item) => item.id === String(active.id));
        const status = over && String(over.id);
        return app && status && isAppStatus(status)
          ? `${app.job.title} berada di atas status ${STATUS_LABELS[status]}.`
          : undefined;
      },
      onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        const app = apps.find((item) => item.id === String(active.id));
        const status = over && String(over.id);
        return app && status && isAppStatus(status)
          ? `${app.job.title} dipindahkan ke ${STATUS_LABELS[status]}.`
          : "Pemindahan dibatalkan.";
      },
      onDragCancel() {
        return "Pemindahan dibatalkan.";
      },
    },
  };

  const viewButton = (
    key: "board" | "table" | "list",
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      onClick={() => setView(key)}
      aria-pressed={view === key}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-sm md:min-h-9",
        view === key
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="application-search" className="sr-only">
            Cari perusahaan atau posisi
          </label>
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="application-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari perusahaan / posisi"
            className="pl-9"
          />
        </div>
        <div className="border-border inline-flex items-center rounded-lg border p-0.5">
          {viewButton("board", "Board", <LayoutGridIcon className="size-4" />)}
          {viewButton("table", "Tabel", <Table2Icon className="size-4" />)}
          {viewButton("list", "List", <ListIcon className="size-4" />)}
        </div>
      </div>

      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusAnnouncement}
      </p>
      {statusError ? (
        <p className="text-destructive text-sm" role="alert">
          {statusError}
        </p>
      ) : null}

      {view === "board" ? (
        <DndContext
          id="kanban-board"
          sensors={sensors}
          accessibility={dragAccessibility}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                apps={byStatus[status]}
                onOpen={setEditing}
              />
            ))}
          </div>
          <DragOverlay>
            {activeApp ? (
              <div className="border-accent/40 bg-card rounded-xl border p-3 shadow-lg">
                <p className="text-foreground text-sm font-medium">
                  {activeApp.job.title}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[activeApp.job.company, activeApp.job.location]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : view === "table" ? (
        <TableView apps={visible} onOpen={setEditing} />
      ) : (
        <ListView byStatus={byStatus} onOpen={setEditing} />
      )}

      <EditSheet
        app={editing}
        onClose={() => setEditing(null)}
        onChange={setApps}
        onAnnounce={setStatusAnnouncement}
        onError={setStatusError}
      />
    </div>
  );
}

function EditForm({
  app,
  onClose,
  onChange,
  onAnnounce,
  onError,
}: {
  app: AppCard;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<AppCard[]>>;
  onAnnounce: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = React.useState<AppStatus>(app.status);
  const [notes, setNotes] = React.useState(app.notes ?? "");
  const [appliedAt, setAppliedAt] = React.useState(() =>
    toDateInput(app.appliedAt),
  );
  const [nextFollowUpAt, setNextFollowUpAt] = React.useState(() =>
    toDateInput(app.nextFollowUpAt),
  );
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleSave() {
    setSaving(true);
    setFormError("");
    onError("");
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes.trim(),
          appliedAt: appliedAt || null,
          nextFollowUpAt: nextFollowUpAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Lamaran gagal disimpan.");
        return;
      }
      onChange((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? {
                ...a,
                status: data.application.status,
                notes: data.application.notes,
                appliedAt: data.application.appliedAt,
                nextFollowUpAt: data.application.nextFollowUpAt,
              }
            : a,
        ),
      );
      if (status !== app.status) {
        onAnnounce(
          `Status ${app.job.title} diperbarui menjadi ${STATUS_LABELS[status]}.`,
        );
      } else {
        onAnnounce(`Perubahan ${app.job.title} berhasil disimpan.`);
      }
      onClose();
    } catch {
      setFormError("Terjadi kesalahan saat menyimpan lamaran.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onChange((prev) => prev.filter((a) => a.id !== app.id));
        onClose();
      } else {
        setFormError("Lamaran gagal dihapus.");
      }
    } catch {
      setFormError("Terjadi kesalahan saat menghapus lamaran.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="line-clamp-2">{app.job.title}</SheetTitle>
        <p className="text-muted-foreground text-sm">
          {[app.job.company, app.job.location].filter(Boolean).join(" · ") ||
            "—"}
        </p>
        <a
          href={app.job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent inline-flex min-h-11 items-center gap-1 text-xs hover:underline"
        >
          Buka lowongan <ExternalLinkIcon className="size-3" />
        </a>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <fieldset className="space-y-2">
          <legend className="text-foreground text-sm font-medium">
            Status
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => {
              const color = STATUS_VAR[s];
              const activeBtn = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={activeBtn}
                  onClick={() => {
                    setStatus(s);
                    if (s === "WISHLIST") setAppliedAt("");
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors md:min-h-9",
                    activeBtn
                      ? "text-foreground border-transparent"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  style={
                    activeBtn
                      ? {
                          color,
                          backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <span className="text-foreground text-sm font-medium">
            Surat Lamaran
          </span>
          <CoverLetterDialog
            applicationId={app.id}
            initialCoverLetter={app.coverLetter}
            jobTitle={app.job.title}
            company={app.job.company ?? undefined}
            trigger={
              <Button variant="outline" size="sm">
                <FileTextIcon className="size-4" />
                Buat Cover Letter
              </Button>
            }
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-foreground text-sm font-medium">
            Tanggal Melamar
          </span>
          <Input
            type="date"
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-foreground text-sm font-medium">
            Follow-up Berikutnya
          </span>
          <Input
            type="date"
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
          />
        </label>

        {formError ? (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-foreground text-sm font-medium">Catatan</span>
          <Textarea
            className="min-h-28"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan proses atau interviewer..."
          />
        </label>
      </div>

      <SheetFooter>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting || saving}
        >
          {deleting ? (
            <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
          Hapus
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
          ) : null}
          Simpan
        </Button>
      </SheetFooter>
    </>
  );
}

function EditSheet({
  app,
  onClose,
  onChange,
  onAnnounce,
  onError,
}: {
  app: AppCard | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<AppCard[]>>;
  onAnnounce: (message: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <Sheet open={!!app} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="gap-0">
        {app ? (
          <EditForm
            key={app.id}
            app={app}
            onClose={onClose}
            onChange={onChange}
            onAnnounce={onAnnounce}
            onError={onError}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
