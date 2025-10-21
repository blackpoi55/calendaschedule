"use client";
import { useState, forwardRef, useImperativeHandle } from "react";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {roleOptions } from "@/lib/mockData";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const localizer = dayjsLocalizer(dayjs);

const getRoleColor = (roleName) => {
  const role = roleOptions.find((r) => r.label === roleName);
  return role ? role.color : "#6b21a8"; // Default ม่วง
};

const BigCalendar = forwardRef(({ tasks, onEditTask, onAddTask }, ref) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("month");

  useImperativeHandle(ref, () => ({
    navigate: (date, view = "month") => {
      setCurrentDate(date);
      setCurrentView(view);
    },
  }));

  // ✅ Map Tasks → Events (end ต้องบวก 1 วัน เพราะ react-big-calendar ไม่รวมวัน end)
  console.log("tasks:", tasks);
  const events = tasks.map((t, idx) => ({
    id: idx,
    title: `${t.name} (${t.days} วัน)`,
    start: dayjs.tz(t.start, "Asia/Bangkok").toDate(),
    end: dayjs.tz(t.end, "Asia/Bangkok").add(1, "day").toDate(), // ✅ บวก 1 วัน
    allDay: true, 
    role: t.name || "",
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
        eventPropGetter={(event) => ({
          style: {
            background: `linear-gradient(135deg, ${getRoleColor(event.role)})`,
            color: "white",
            borderRadius: "10px",
            padding: "4px 6px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "pre-line",
          },
        })}
        onSelectEvent={(event) => {
          if (onEditTask) onEditTask(event.originalTask);
        }}
        onSelectSlot={(slotInfo) => {
          if (onAddTask) {
            onAddTask({
              start: dayjs(slotInfo.start).format("YYYY-MM-DD"),
              end: dayjs(slotInfo.end).subtract(1, "day").format("YYYY-MM-DD"), // ✅ แก้ให้ตรงกับ task จริง
            });
          }
        }}
      />
    </div>
  );
});

export default BigCalendar;
