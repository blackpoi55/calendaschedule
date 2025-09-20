"use client";
import React from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

export default function GanttChart({ tasks, project }) {
  if (!project || !tasks) return <div className="p-4">❌ ไม่มีข้อมูลโปรเจค</div>;

  const today = dayjs();
  const projectEnd = dayjs(project.endDate);
  const minDate = dayjs(project.startDate);
  const maxDate = dayjs(
    tasks.length > 0
      ? Math.max(...tasks.map((t) => new Date(t.end)))
      : project.endDate
  );

  const getWeekOfMonth = (date) => {
    const startOfMonth = date.startOf("month");
    return Math.ceil((date.date() + startOfMonth.day()) / 7);
  };

  const weeks = [];
  let current = minDate.startOf("week");
  while (current.isBefore(maxDate) || current.isSame(maxDate, "week")) {
    weeks.push({
      label: `สัปดาห์ ${getWeekOfMonth(current)} (${current.format("MMM YYYY")})`,
      start: current.clone(),
      end: current.clone().endOf("week"),
      isCurrent: today.isBetween(current.clone().startOf("week"), current.clone().endOf("week"), "day", "[]"),
    });
    current = current.add(1, "week");
  }

  const getBarStyle = (start, end) => {
    const totalWeeks = weeks.length;
    const startIndex = weeks.findIndex((w) =>
      dayjs(start).isBetween(w.start, w.end, "day", "[]")
    );
    const endIndex = weeks.findIndex((w) =>
      dayjs(end).isBetween(w.start, w.end, "day", "[]")
    );
    return {
      left: `${(startIndex / totalWeeks) * 100}%`,
      width: `${((endIndex - startIndex + 1) / totalWeeks) * 100}%`,
    };
  };

  const roleColors = {
    SA: "bg-purple-500",
    Frontend: "bg-blue-500",
    Backend: "bg-green-500",
    Tester: "bg-red-500",
    "UX/UI": "bg-yellow-500",
  };

  const todayIndex = weeks.findIndex((w) =>
    today.isBetween(w.start, w.end, "day", "[]")
  );
  const todayLinePosition = todayIndex >= 0 ? (todayIndex / weeks.length) * 100 : null;

  return (
    <div className="p-4 relative">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">📊 Gantt Chart (สัปดาห์)</h2>
      <div className="border rounded-xl shadow-lg bg-white relative">
        {/* Header */}
        <div className="grid grid-cols-12 border-b bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
          <div className="col-span-3 p-3 font-semibold border-r text-gray-700 bg-gray-50">🗂 Task / Role</div>
          <div className="col-span-9 flex relative">
            {weeks.map((w, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center p-3 border-l text-xs ${w.isCurrent ? "bg-blue-50" : ""}`}
              >
                <span className={`${w.isCurrent ? "font-bold text-blue-700" : "text-gray-600"}`}>
                  {w.label}
                </span>
              </div>
            ))}
            {todayLinePosition !== null && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `${todayLinePosition}%` }} />
            )}
          </div>
        </div>

        {/* Tasks */}
        {tasks.map((task, idx) => {
          const isOverdue = dayjs(task.end).isAfter(projectEnd, "day");
          const overdueDays = isOverdue ? dayjs(task.end).diff(projectEnd, "day") : 0;

          return (
            <div key={idx} className="flex border-b hover:bg-purple-50 transition">
              {/* Left Panel */}
              <div className="w-1/4 p-3 border-r bg-gray-50">
                <div className="font-semibold text-gray-800 flex items-center gap-1">
                  {task.role}
                  {isOverdue && <span className="text-red-500 text-lg">⚠</span>}
                </div>
                {task.member.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    👥 {task.member.join(", ")}
                  </div>
                )}
              </div>

              {/* Gantt Area */}
              <div className="relative flex-1 h-14 border-l bg-white">
                {/* เส้นแบ่งสัปดาห์ */}
                {weeks.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: `${(i / weeks.length) * 100}%` }} />
                ))}

                {/* Task Bar */}
                <div
                  className={`absolute text-white text-xs font-semibold rounded-lg shadow-md px-3 py-1 flex items-center justify-center ${
                    isOverdue ? "bg-red-600 animate-pulse" : roleColors[task.role] || "bg-gray-400"
                  }`}
                  style={{ ...getBarStyle(task.start, task.end), top: "8px" }}
                >
                  {task.role}
                  {isOverdue && <span className="ml-1 text-[10px]">🚨 เกิน {overdueDays} วัน</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
