"use client";
import { useState, forwardRef, useImperativeHandle } from "react";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { roleOptions } from "@/lib/mockData";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const localizer = dayjsLocalizer(dayjs);

/** หา role color จาก roleMap (ถ้ามี) หรือ roleOptions (mock) */
function resolveRoleColor({ roleValue, roleMap, fallback = "#6b21a8" }) {
  // 1) ถ้ามี roleMap (จาก API จริง) ให้หาตาม id/name/label ก่อน
  if (Array.isArray(roleMap) && roleMap.length) {
    // เทียบด้วย id (เลข/สตริง)
    const byId =
      roleMap.find((r) => String(r.id) === String(roleValue)) ||
      roleMap.find((r) => String(r.value ?? r.id) === String(roleValue));
    if (byId?.color) return byId.color;

    // เทียบด้วย name/label
    const valLower = String(roleValue ?? "").trim().toLowerCase();
    const byName = roleMap.find((r) => {
      const name = String(r.name ?? r.label ?? "").trim().toLowerCase();
      return name && (name === valLower);
    });
    if (byName?.color) return byName.color;

    // ไม่มีสีใน roleMap แต่เจอ role → อนุญาตคืนสี default เดียวกันทั้งโปรเจกต์
    if (byId || byName) return fallback;
  }

  // 2) ถ้าไม่มี roleMap ให้ fallback ไปที่ mock roleOptions เดิม
  const fromMock =
    roleOptions.find(
      (r) =>
        String(r.id) === String(roleValue) ||
        String(r.value ?? r.id) === String(roleValue) ||
        String(r.label ?? r.name ?? "")
          .trim()
          .toLowerCase() === String(roleValue ?? "").trim().toLowerCase()
    ) || null;

  return fromMock?.color || fallback;
}

const BigCalendar = forwardRef(({ tasks, onEditTask, onAddTask, roleMap }, ref) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("month");

  useImperativeHandle(ref, () => ({
    navigate: (date, view = "month") => {
      setCurrentDate(date);
      setCurrentView(view);
    },
  }));

  // ✅ Map Tasks → Events (end ต้องบวก 1 วัน เพราะ react-big-calendar ไม่รวมวัน end)
  const events = (Array.isArray(tasks) ? tasks : []).map((t, idx) => ({
    id: t.id ?? idx,
    title: `${t.name ?? `Task #${t.id ?? idx}`} ${t?.days ? `(${t.days} วัน)` : ""}`.trim(),
    start: dayjs.tz(t.start, "Asia/Bangkok").toDate(),
    end: dayjs.tz(t.end, "Asia/Bangkok").add(1, "day").toDate(), // ✅ บวก 1 วัน
    allDay: true,
    role: t.role ?? "",               // อาจเป็นเลข (1,5) หรือสตริงชื่อบทบาท
    remark: t.description || "",
    originalTask: t,
  }));

  return (
    <div className="h-[80vh] custom-calendar">
      <style>{`
        /* ปรับหัวปฏิทิน */
        .rbc-toolbar {
          background: linear-gradient(to right, #f9a8d4, #c084fc);
          color: white;
          padding: 10px;
          border-radius: 12px 12px 0 0;
          font-weight: 600;
        }
        .rbc-toolbar button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 6px;
          margin: 0 3px;
          padding: 5px 10px;
          transition: all 0.2s ease-in-out;
        }
        .rbc-toolbar button:hover {
          background: rgba(255, 255, 255, 0.4);
        }
        /* กรอบปฏิทิน */
        .rbc-month-view, .rbc-time-view {
          background: white;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        /* ช่องวัน */
        .rbc-date-cell {
          font-weight: 500;
        }
        .rbc-off-range {
          color: #aaa;
        }
        /* Event */
        .rbc-event {
          font-size: 0.85rem;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        .rbc-event:hover {
          transform: scale(1.05);
        }
        /* Popup Event */
        .rbc-overlay {
          z-index: 50 !important;
        }
      `}</style>

      <Calendar
        localizer={localizer}
        events={events}
        date={currentDate}
        view={currentView}
        selectable
        popup
        onNavigate={(date) => setCurrentDate(date)}
        onView={(view) => setCurrentView(view)}
        style={{ height: "100%", borderRadius: "12px" }}
        eventPropGetter={(event) => {
          const color = resolveRoleColor({ roleValue: event.role, roleMap });
          return {
            style: {
              // ใช้ไล่เฉดสีเดียวกันสองสต็อป เพื่อคงลุค gradient เดิม
              background: `linear-gradient(135deg, ${color} 0%, ${color} 100%)`,
              color: "white",
              borderRadius: "10px",
              padding: "4px 6px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "pre-line",
            },
          };
        }}
        onSelectEvent={(event) => {
          onEditTask?.(event.originalTask);
        }}
        onSelectSlot={(slotInfo) => {
          onAddTask?.({
            start: dayjs(slotInfo.start).format("YYYY-MM-DD"),
            end: dayjs(slotInfo.end).subtract(1, "day").format("YYYY-MM-DD"), // ✅ ให้ตรงกับ task จริง
          });
        }}
      />
    </div>
  );
});

export default BigCalendar;
