"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import dayjs from "dayjs";

// คอมโพเนนต์ภายในโปรเจกต์เดิม
import BigCalendar from "@/components/BigCalendar";
import AddTaskModal from "@/components/AddTaskModal";
import GanttChart from "@/components/GanttChart";

import {
  addtask,            // คงไว้เพื่อ compat ถ้ามีใช้ที่อื่น
  deletetask,
  edittask,
  getproJects,
  getrole,            // ← API อาจคืน array หรือ {data: [...]}
  getmember,
  getmemberbyteam,
  getproJectsById,    // ← คืน { data: [ { ...project, ProjectMembers:[{ user:{id,name} }]} ] }
  getTaskByProjectId, // ← คืน { data: Task[] } ; Task.members = [{id,name}]
  createTask,
} from "@/action/api";

/* ============================== helpers ============================== */
const cn = (...c) => c.filter(Boolean).join(" ");
const safeLower = (v) => (v === 0 ? "0" : (v ?? "")).toString().trim().toLowerCase();
const formatDate = (d) =>
  d && dayjs(d).isValid() ? dayjs(d).format("DD/MM/YYYY") : "-";

/** บังคับให้ค่าที่รับมาเป็นอาร์เรย์ (รองรับหลายฟอร์แมต: [], {data:[]}, {items:[]}, null) */
function toArray(maybeArr) {
  if (Array.isArray(maybeArr)) return maybeArr;
  if (maybeArr && Array.isArray(maybeArr.data)) return maybeArr.data;
  if (maybeArr && typeof maybeArr === "object") {
    const firstArrayKey = Object.keys(maybeArr).find((k) => Array.isArray(maybeArr[k]));
    if (firstArrayKey) return maybeArr[firstArrayKey];
  }
  return [];
}

/** หาใน array โดยเทียบหลายคีย์ */
function findByAnyKey(arr, value) {
  const target = safeLower(value);
  return arr.find((x) =>
    ["id", "value", "label", "name", "key", "code"]
      .map((k) => x?.[k])
      .some((v) => safeLower(v) === target)
  );
}

/** map roles ที่ไม่มีสี → เติมสี default (รองรับทุกฟอร์แมตตอบกลับของ getrole) */
function decorateRoles(rawRolesLike) {
  const rawRoles = toArray(rawRolesLike); // ✅ ป้องกัน .map is not a function
  const palette = ["#8b5cf6", "#f43f5e", "#059669", "#0ea5e9", "#f59e0b", "#ef4444", "#14b8a6"];
  return rawRoles.map((r, idx) => ({
    id: r.id,
    name: r.name ?? r.label ?? `Role${r.id}`,
    label: r.name ?? r.label ?? `Role${r.id}`,
    value: r.id,
    color: r.color || palette[idx % palette.length],
  }));
}

/** สร้าง memberMap จาก ProjectMembers (มี nested user) */
function buildMemberMapFromProject(project) {
  const members = project?.ProjectMembers || [];
  return members
    .map((pm) => {
      const u = pm?.user;
      if (!u) return null;
      return {
        id: u.id,            // string (ตาม API)
        value: u.id,
        name: u.name || `User ${u.id}`,
        label: u.name || `User ${u.id}`,
        color: "#4b5563",    // default เทา
        textcolor: "#ffffff",
        image: null,
      };
    })
    .filter(Boolean);
}

/** สร้าง fallback member จาก task.members (กรณี ProjectMembers ไม่มีหรือยังไม่ซิงค์) */
function buildMemberFallbackFromTasks(tasks) {
  const buf = new Map();
  (tasks || []).forEach((t) => {
    (t.members || []).forEach((m) => {
      const id = (typeof m === "object" ? m.id : m) ?? "";
      const name = (typeof m === "object" ? m.name : m) ?? "";
      if (!buf.has(id)) {
        buf.set(id, {
          id,
          value: id,
          name: name || `User ${id}`,
          label: name || `User ${id}`,
          color: "#64748b",
          textcolor: "#ffffff",
          image: null,
        });
      }
    });
  });
  return Array.from(buf.values());
}

/* ============================== Component ============================== */

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();

  // ข้อมูลหลัก
  const [project, setProject] = useState(null);       // จาก getproJectsById().data[0]
  const [tasks, setTasks] = useState([]);             // จาก getTaskByProjectId().data
  const [roleMap, setRoleMap] = useState([]);         // จาก getrole() (array หรือ {data:[]})
  const [memberMap, setMemberMap] = useState([]);     // จาก ProjectMembers หรือ fallback tasks

  // UI state
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [openTaskModal, setOpenTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);     // เก็บเป็น index (ตามโค้ดเดิม)
  const [preFillDates, setPreFillDates] = useState(null);
  const [modeChoose, setModeChoose] = useState("Calendar");
  const calendarRef = useRef(null);

  // วันสิ้นสุดโปรเจกต์ (ใช้เทียบ overdue)
  const projectEnd = useMemo(() => {
    const end = project?.endDate;
    return end ? dayjs(end) : null;
  }, [project]);

  // โหลดข้อมูลเมื่อ id เปลี่ยน
  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        // 1) โหลด tasks
        const taskRes = await getTaskByProjectId(id); // { message, data: Task[] }
        const tlist = toArray(taskRes?.data ?? taskRes);
        if (!alive) return;
        setTasks(tlist);
        setFilteredTasks(tlist);

        // 2) โหลด roles (array หรือ {data:[]})
        let rawRolesResp;
        try {
          rawRolesResp = await getrole();
        } catch (_e) {
          rawRolesResp = [];
        }
        if (!alive) return;
        setRoleMap(decorateRoles(rawRolesResp));

        // 3) โหลด project + memberMap หลักจาก ProjectMembers
        const projRes = await getproJectsById(id); // { message, data: [ projectObj ] }
        const projArr = toArray(projRes?.data ?? projRes);
        const proj = projArr?.[0] || null;
        if (!alive) return;
        setProject(proj);

        let mm = buildMemberMapFromProject(proj);
        if (!mm?.length) {
          // ไม่มี ProjectMembers → ตกลง fallback จาก task.members
          mm = buildMemberFallbackFromTasks(tlist);
        }
        setMemberMap(mm);
      } catch (e) {
        if (!alive) return;
        console.error("refresh error:", e);
        Swal.fire("ผิดพลาด", "โหลดข้อมูลไม่สำเร็จ", "error");
        setTasks([]);
        setFilteredTasks([]);
        setProject(null);
        setRoleMap([]);
        setMemberMap([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // เมื่อ tasks เปลี่ยน → พา Calendar ไปเดือนแรกที่มีงาน
  useEffect(() => {
    if (!calendarRef.current || !tasks?.length) return;
    const firstStart = dayjs(
      tasks.reduce(
        (earliest, t) => (dayjs(t.start).isBefore(earliest) ? t.start : earliest),
        tasks[0].start
      )
    );
    if (firstStart.isValid()) {
      calendarRef.current.navigate(firstStart.toDate(), "month");
    }
  }, [tasks]);

  // helpers: หา role/member
  const getRoleData = (roleVal) => {
    // role ใน task เป็นเลข (เช่น 1,5)
    const hit =
      roleMap.find((r) => String(r.id) === String(roleVal)) ||
      findByAnyKey(roleMap, roleVal);
    return hit || null;
  };

  const getMemberDetail = (m) => {
    // m จาก task.members = {id,name}
    const idVal = typeof m === "object" ? (m.id ?? m) : m;
    const nameVal = typeof m === "object" ? (m.name ?? String(m)) : String(m);
    return (
      memberMap.find((x) => String(x.id) === String(idVal)) ||
      findByAnyKey(memberMap, idVal) ||
      memberMap.find((x) => safeLower(x.name) === safeLower(nameVal)) ||
      {
        id: idVal,
        value: idVal,
        label: nameVal,
        name: nameVal,
        color: "#64748b",
        textcolor: "#ffffff",
        image: null,
      }
    );
  };

  // คำนวณ overdue เทียบกับวันจบโปรเจกต์
  const { maxOverdueTask, overdueDays } = useMemo(() => {
    if (!projectEnd || !Array.isArray(tasks) || tasks.length === 0)
      return { maxOverdueTask: null, overdueDays: 0 };
    const lateTasks = tasks.filter((t) => dayjs(t.end).isAfter(projectEnd, "day"));
    if (!lateTasks.length) return { maxOverdueTask: null, overdueDays: 0 };
    const latest = lateTasks.reduce((a, b) =>
      dayjs(a.end).isAfter(dayjs(b.end)) ? a : b
    );
    return {
      maxOverdueTask: latest,
      overdueDays: dayjs(latest.end).diff(projectEnd, "day"),
    };
  }, [tasks, projectEnd]);

  /* ============================== CRUD handlers ============================== */

  const handleSaveTask = async (task) => {
    // Modal ควรส่งรูปแบบ API ใหม่: { name, description, role(number), start, end, days, status, remark, members:[{id,name}] }
    try {
      const { id: taskId, ...taskData } = task || {};
      let res;
      if (taskId) res = await edittask(task);
      else res = await createTask(taskData);

      if (!res?.error) {
        await Swal.fire(
          "สำเร็จ",
          taskId ? "แก้ไข Task เรียบร้อย!" : "เพิ่ม Task ใหม่เรียบร้อย!",
          "success"
        );
        // reload เฉพาะ tasks + fallback members
        const taskRes = await getTaskByProjectId(id);
        const tlist = toArray(taskRes?.data ?? taskRes);
        setTasks(tlist);
        setFilteredTasks(tlist);
        if (!memberMap?.length) {
          setMemberMap(buildMemberFallbackFromTasks(tlist));
        }
        setOpenTaskModal(false);
        setEditTask(null);
        setPreFillDates(null);
      } else {
        Swal.fire("ผิดพลาด", res?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
      }
    } catch (e) {
      console.error(e);
      Swal.fire("ผิดพลาด", "บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleDeleteTask = (index) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบงานนี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      const deleting = tasks[index];
      try {
        const res = await deletetask(deleting?.id);
        if (!res?.error) {
          await Swal.fire("ลบสำเร็จ!", "งานถูกลบเรียบร้อยแล้ว", "success");
          // รีโหลด tasks
          const taskRes = await getTaskByProjectId(id);
          const tlist = toArray(taskRes?.data ?? taskRes);
          setTasks(tlist);
          setFilteredTasks(tlist);
          if (!memberMap?.length) {
            setMemberMap(buildMemberFallbackFromTasks(tlist));
          }
        } else {
          Swal.fire("ล้มเหลว", res?.error || "ไม่สามารถลบได้", "error");
        }
      } catch (e) {
        console.error(e);
        Swal.fire("ล้มเหลว", "ไม่สามารถลบได้", "error");
      }
    });
  };
  const totalProjectDays = useMemo(() => {
    const s = project?.startDate ? dayjs(project.startDate).startOf("day") : null;
    const e = project?.endDate ? dayjs(project.endDate).startOf("day") : null;
    if (!s || !e || !s.isValid() || !e.isValid()) return null;

    // นับแบบ inclusive: ถ้าช่วงเดียวกัน (วันเดียว) จะได้ 1
    const days = e.diff(s, "day") + 1;

    // กันค่าติดลบกรณี end ก่อน start (ข้อมูลเพี้ยน)
    return Math.max(days, 0);
  }, [project?.startDate, project?.endDate]);

  /* ============================== Render ============================== */

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#fce4ec] to-[#ede7f6] p-6 gap-6">
      {/* 📋 Project Info Panel */}
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow-xl p-6 flex flex-col">
        <div className="flex items-center w-full">
          <div className="flex w-1/2 justify-start items-center">
            <h2
              onClick={() => router.push("/")}
              className="text-2xl font-bold text-purple-600 mb-4 cursor-pointer flex items-center gap-2 hover:scale-105 hover:text-purple-800 transition"
            >
              🔙 <span>{project?.name ?? "-"}</span>
            </h2>
          </div>
          <div className="flex w-1/2 justify-end items-center">
            <button
              onClick={() => setModeChoose("Calendar")}
              className={cn(
                "rounded-l-lg p-2",
                modeChoose === "Calendar"
                  ? "bg-gradient-to-r from-purple-300 to-pink-400 text-white"
                  : "bg-gray-500 text-white"
              )}
            >
              Calendar
            </button>
            <button
              onClick={() => setModeChoose("GanttChart")}
              className={cn(
                "rounded-r-lg p-2",
                modeChoose === "GanttChart"
                  ? "bg-gradient-to-r from-purple-300 to-pink-400 text-white"
                  : "bg-gray-500 text-white"
              )}
            >
              GanttChart
            </button>
          </div>
        </div>

        <p className="mb-2">
          <span className="font-semibold">ระยะเวลา:</span>{" "}
          {formatDate(project?.startDate)} - {formatDate(project?.endDate)}
        </p>
        <p className="mb-4">
          <span className="font-semibold">รวม:</span>{" "}
          {(totalProjectDays ?? project?.totalDays ?? "-")} วัน
        </p>
        {/* 🔴 งานเกินกำหนด (เทียบวันจบโปรเจกต์) */}
        {maxOverdueTask && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700">
            ⚠ เกินกำหนด <strong>{overdueDays} วัน</strong> (Task:{" "}
            <strong>{maxOverdueTask?.name || maxOverdueTask?.role}</strong>{" "}
            สิ้นสุด {formatDate(maxOverdueTask?.end)})
          </div>
        )}

        <h3 className="text-lg font-semibold text-purple-500 mb-2 flex justify-between items-center">
          รายการงาน:
          <button
            onClick={() => {
              setFilteredTasks(tasks);
              if (calendarRef.current && tasks.length > 0) {
                const firstStart = dayjs(
                  tasks.reduce(
                    (earliest, t) =>
                      dayjs(t.start).isBefore(earliest) ? t.start : earliest,
                    tasks[0].start
                  )
                );
                if (firstStart.isValid()) {
                  calendarRef.current.navigate(firstStart.toDate(), "month");
                }
              }
            }}
            className="text-sm px-3 py-1 bg-gradient-to-r from-purple-300 to-pink-400 text-white rounded-lg hover:bg-blue-600 transition"
          >
            แสดงทั้งหมด
          </button>
        </h3>

        {/* 🔽 รายการ Tasks */}
        <ul className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
          {tasks.map((t, i) => {
            const roleData = getRoleData(t.role);
            const today = dayjs();
            const start = dayjs(t.start);
            const end = dayjs(t.end);

            let bgColor = "bg-purple-50 border-purple-100";
            if (projectEnd && end.isAfter(projectEnd, "day")) bgColor = "bg-red-100 border-red-300";
            else if (today.isAfter(end, "day")) bgColor = "bg-green-100 border-green-300";

            return (
              <li
                key={t.id ?? i}
                className={cn("p-4 rounded-lg shadow-sm border cursor-pointer transition hover:scale-[1.01]", bgColor)}
                onClick={() => {
                  setFilteredTasks([t]);
                  if (calendarRef.current && start.isValid()) {
                    calendarRef.current.navigate(start.toDate(), "month");
                  }
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="font-bold"
                    style={{ color: roleData?.color || "#6b21a8" }}
                    title={roleData?.label || roleData?.name || t.role}
                  >
                    {t.name ?? `Task #${t.id}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                      {t.days ?? "-"} วัน
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTask(i);
                        setPreFillDates(null);
                        setOpenTaskModal(true);
                      }}
                      className="text-xs bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded"
                    >
                      ✏ แก้ไข
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(i);
                      }}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                    >
                      🗑 ลบ
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-1">
                  {formatDate(t.start)} ➝ {formatDate(t.end)}
                </p>

                {/* 👥 สมาชิก (API ใหม่: t.members = [{id,name}]) */}
                {Array.isArray(t.members) && t.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {t.members.map((m,i) => {
                      const md = getMemberDetail(m);
                      const key = typeof m === "object" ? (m.id ?? m.name) : m;
                      return (
                        <div
                          key={i}
                          title={md.label || md.name}
                          style={{
                            backgroundColor: md.color || "#64748b",
                            color: md.textcolor || "#ffffff",
                          }}
                          className="flex items-center justify-center text-[11px] px-2 rounded-full shadow-md h-7 max-w-[140px] text-center truncate"
                        >
                          <span className="truncate">{md.label || md.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 📝 หมายเหตุ */}
                {t.remark && String(t.remark).trim() !== "" && (
                  <p className="text-xs text-red-700 italic bg-red-50 border border-red-200 rounded p-2 mt-2">
                    📝 หมายเหตุ: {t.remark}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => {
            setEditTask(null);
            setPreFillDates(null);
            setOpenTaskModal(true);
          }}
          className="mt-4 w-full py-2 bg-gradient-to-r from-purple-300 to-pink-400 text-white rounded-xl shadow hover:scale-105 transition"
        >
          + Task ใหม่
        </button>
      </div>

      {/* 📅 ปฏิทิน / Gantt */}
      <div className="flex-1 bg-white rounded-xl shadow-xl p-4">
        {modeChoose === "Calendar" ? (
          <BigCalendar
            ref={calendarRef}
            tasks={filteredTasks}
            roleMap={roleMap}
            onEditTask={(task) => {
              const idx = tasks.findIndex((t) => t === task || String(t.id) === String(task?.id));
              setEditTask(idx >= 0 ? idx : null);
              setPreFillDates(null);
              setOpenTaskModal(true);
            }}
            onAddTask={({ start, end }) => {
              setEditTask(null);
              setPreFillDates({ start, end });
              setOpenTaskModal(true);
            }}
          />
        ) : (
          <GanttChart tasks={filteredTasks} project={project} />
        )}
      </div>

      {/* 🧩 Modal เพิ่ม/แก้ */}
      {openTaskModal && (
        <AddTaskModal
          id={id}
          onClose={() => {
            setOpenTaskModal(false);
            setEditTask(null);
            setPreFillDates(null);
          }}
          onSave={handleSaveTask}
          editData={editTask !== null ? tasks[editTask] : null}
          preFillDates={preFillDates}
        // หมายเหตุ: ให้แน่ใจว่า AddTaskModal ส่ง payload ตามสัญญาใหม่: members เป็น [{id,name}]
        />
      )}
    </div>
  );
}
