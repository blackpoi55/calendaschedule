"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "gantt-task-react/dist/index.css";
import { Gantt, ViewMode } from "gantt-task-react";

dayjs.extend(isoWeek);

export default function GanttTaskReact() {
  const [viewMode, setViewMode] = useState(ViewMode.Week);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const API_URL =
    "https://taxtrail.telecorpthailand.com/api/v1/projectTaskAssignment/grouped/getTaskAssignments";

  // ใช้ฟังก์ชันช่วย parse วันที่แบบปลอดภัย
  const toDate = (v, fallback) => {
    try {
      if (!v && fallback) return new Date(fallback);
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v === "number") return new Date(v);
      const d = dayjs(v);
      return d.isValid() ? d.toDate() : fallback ? new Date(fallback) : null;
    } catch {
      return fallback ? new Date(fallback) : null;
    }
  };

  // แปลง payload -> tasks ของ gantt-task-react พร้อมเติม start/end ถ้าขาด
  const normalizeAssignmentsToTasks = useCallback((payload) => {
    const list = Array.isArray(payload) ? payload : [];
    const out = [];

    for (const group of list) {
      const projectId = String(
        group?.projectId ?? group?.project_id ?? group?.id ?? group?.projectCode ?? group?.project ?? Math.random()
      );
      const projectName =
        group?.projectName ?? group?.project_name ?? group?.name ?? group?.title ?? `Project ${projectId}`;

      const items = Array.isArray(group?.items ?? group?.tasks ?? group?.children)
        ? (group?.items ?? group?.tasks ?? group?.children)
        : [];

      // คำนวณช่วงรวมของโปรเจกต์
      const itemStarts = items
        .map((t) => toDate(t?.startDate ?? t?.start ?? t?.start_time ?? t?.begin ?? t?.plannedStart))
        .filter(Boolean);
      const itemEnds = items
        .map((t) => toDate(t?.endDate ?? t?.end ?? t?.end_time ?? t?.finish ?? t?.plannedEnd))
        .filter(Boolean);

      const projectStart = itemStarts.length
        ? itemStarts.reduce((min, d) => (d < min ? d : min), itemStarts[0])
        : dayjs().startOf("week").toDate();
      const projectEnd = itemEnds.length
        ? itemEnds.reduce((max, d) => (d > max ? d : max), itemEnds[0])
        : dayjs(projectStart).add(2, "week").toDate();

      out.push({
        id: `project-${projectId}`,
        type: "project",
        name: projectName,
        start: projectStart,
        end: projectEnd,
        progress: 0,
        isDisabled: true,
      });

      for (const t of items) {
        const id = String(t?.id ?? t?.taskId ?? t?.assignmentId ?? t?.code ?? Math.random());
        const name = t?.name ?? t?.taskName ?? t?.title ?? t?.role ?? "Task (ไม่มีชื่อ)";
        const start = toDate(
          t?.startDate ?? t?.start ?? t?.start_time ?? t?.begin ?? t?.plannedStart,
          projectStart
        ) ?? projectStart;
        const end = toDate(
          t?.endDate ?? t?.end ?? t?.end_time ?? t?.finish ?? t?.plannedEnd,
          dayjs(start).add(1, "day").toDate()
        ) ?? dayjs(start).add(1, "day").toDate();

        const progressRaw = Number(t?.progress ?? t?.percent ?? t?.completed ?? 0);
        const progress = Number.isFinite(progressRaw)
          ? Math.max(0, Math.min(100, progressRaw))
          : 0;

        const role = t?.role ?? t?.position ?? "";
        const assignees = Array.isArray(t?.assignees ?? t?.members ?? t?.member ?? t?.people)
          ? (t?.assignees ?? t?.members ?? t?.member ?? t?.people)
          : [];
        const labelTail = assignees.length
          ? ` • 👥 ${assignees.join(", ")}`
          : role
          ? ` • ${role}`
          : "";

        out.push({
          id,
          type: "task",
          name: `${name}${labelTail}`,
          start,
          end,
          progress,
          project: `project-${projectId}`,
          isDisabled: false,
        });
      }
    }

    // Fallback mock ถ้าไม่มีอะไรเลย
    if (out.length === 0) {
      const today = dayjs();
      out.push(
        {
          id: "project-mock",
          type: "project",
          name: "ตัวอย่างโปรเจกต์ (Mock)",
          start: today.startOf("week").toDate(),
          end: today.add(3, "week").endOf("week").toDate(),
          progress: 0,
          isDisabled: true,
        },
        {
          id: "mock-1",
          type: "task",
          name: "วิเคราะห์ความต้องการ • SA",
          start: today.startOf("week").toDate(),
          end: today.add(5, "day").toDate(),
          progress: 60,
          project: "project-mock",
        },
        {
          id: "mock-2",
          type: "task",
          name: "พัฒนา Frontend • 👥 A, B",
          start: today.add(3, "day").toDate(),
          end: today.add(2, "week").toDate(),
          progress: 30,
          project: "project-mock",
        }
      );
    }

    return out;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const normalized = normalizeAssignmentsToTasks(json?.data ?? json?.records ?? json);
      setTasks(normalized);
    } catch (e) {
      console.error("Fetch error:", e);
      setFetchError("โหลดข้อมูลไม่สำเร็จ (อาจติด CORS/เครือข่าย) – แสดงข้อมูลตัวอย่างแทน");
      setTasks(normalizeAssignmentsToTasks([]));
    } finally {
      setLoading(false);
    }
  }, [normalizeAssignmentsToTasks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ปรับให้ select คืนค่าเป็น enum ที่ถูกต้อง
  const handleViewChange = (val) => {
    const map = {
      Day: ViewMode.Day,
      Week: ViewMode.Week,
      Month: ViewMode.Month,
    };
    setViewMode(map[val] ?? ViewMode.Week);
  };

  // Tooltip ปลอดภัยต่อ undefined
  const SafeTooltip = ({ task }) => {
    if (!task) return null;
    const start = task.start ? dayjs(task.start).format("DD MMM YYYY") : "-";
    const end = task.end ? dayjs(task.end).format("DD MMM YYYY") : "-";
    return (
      <div className="p-2 text-sm">
        <div className="font-semibold">{task.name ?? "Task"}</div>
        <div>📅 {start} – {end}</div>
        {typeof task.progress === "number" && (
          <div>✅ Progress: {Math.round(task.progress)}%</div>
        )}
      </div>
    );
  };

  const onExpanderClick = (task) => {
    if (task?.type === "project") setExpanded((prev) => !prev);
  };

  const onDoubleClick = (task) => {
    if (!task) return;
    const start = task.start ? dayjs(task.start).format("DD/MM/YYYY") : "-";
    const end = task.end ? dayjs(task.end).format("DD/MM/YYYY") : "-";
    alert(`รายละเอียดงาน:\n${task.name}\n${start} - ${end}`);
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold text-purple-700">📊 Gantt Chart (gantt-task-react)</h2>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-gray-600">มุมมอง:</label>
          <select
            className="border rounded px-2 py-1"
            value={
              viewMode === ViewMode.Day ? "Day" :
              viewMode === ViewMode.Month ? "Month" : "Week"
            }
            onChange={(e) => handleViewChange(e.target.value)}
          >
            <option value="Day">Day</option>
            <option value="Week">Week</option>
            <option value="Month">Month</option>
          </select>

          <button
            onClick={fetchData}
            className="border rounded px-3 py-1 bg-white hover:bg-gray-50"
            title="โหลดข้อมูลใหม่"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-3 rounded bg-yellow-50 border text-yellow-700">
          ⏳ กำลังโหลดข้อมูลจากเซิร์ฟเวอร์...
        </div>
      )}

      {fetchError && (
        <div className="p-3 mt-2 rounded bg-red-50 border text-red-700">{fetchError}</div>
      )}

      {/* กันเคส tasks ว่าง หรือมี task ที่ไม่มีวันที่ */}
      {tasks.length > 0 ? (
        <div className="rounded-xl overflow-hidden border bg-white">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            listCellWidth="240"
            columnWidth={
              viewMode === ViewMode.Month ? 300 :
              viewMode === ViewMode.Week ? 200 : 65
            }
            todayColor="#ff4d4f"
            TooltipContent={SafeTooltip}
            onExpanderClick={onExpanderClick}
            onDoubleClick={onDoubleClick}
            ganttHeight={540}
            barCornerRadius={6}
            barFill={60}
            showToday={true}
            key={expanded ? "expand" : "collapse"}
          />
        </div>
      ) : (
        !loading && (
          <div className="p-3 rounded bg-gray-50 border text-gray-600">
            ไม่มีข้อมูลงานที่จะแสดง
          </div>
        )
      )}

      <div className="text-xs text-gray-500 mt-3">แหล่งข้อมูล: {API_URL}</div>
    </div>
  );
}
