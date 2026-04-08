"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import { 
  ChevronLeftIcon, 
  CalendarIcon, 
  ListBulletIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  InformationCircleIcon,
  UserGroupIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

// คอมโพเนนต์ภายในโปรเจกต์เดิม
import BigCalendar from "@/components/BigCalendar";
import AddTaskModal from "@/components/AddTaskModal";
import GanttChart from "@/components/GanttChart";

import {
  deletetask,
  edittask,
  getrole,
  getproJectsById,
  getTaskByProjectId,
  createTask,
} from "@/action/api";

/* ============================== helpers ============================== */
const cn = (...c) => c.filter(Boolean).join(" ");
const safeLower = (v) => (v === 0 ? "0" : (v ?? "")).toString().trim().toLowerCase();
const formatDate = (d) => d && dayjs(d).isValid() ? dayjs(d).format("DD/MM/YYYY") : "-";

function toArray(maybeArr) {
  if (Array.isArray(maybeArr)) return maybeArr;
  if (maybeArr && Array.isArray(maybeArr.data)) return maybeArr.data;
  return [];
}

function findByAnyKey(arr, value) {
  const target = safeLower(value);
  return arr.find((x) => ["id", "value", "label", "name", "key", "code"].map((k) => x?.[k]).some((v) => safeLower(v) === target));
}

function decorateRoles(rawRolesLike) {
  const rawRoles = toArray(rawRolesLike);
  const palette = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
  return rawRoles.map((r, idx) => ({
    id: r.id,
    name: r.name ?? r.label ?? `Role${r.id}`,
    label: r.name ?? r.label ?? `Role${r.id}`,
    value: r.id,
    color: r.color || palette[idx % palette.length],
  }));
}

function buildMemberMapFromProject(project) {
  const members = project?.ProjectMembers || [];
  return members.map((pm) => {
    const u = pm?.user;
    if (!u) return null;
    return { id: u.id, value: u.id, name: u.name || `User ${u.id}`, label: u.name || `User ${u.id}`, color: "#64748b", textcolor: "#ffffff" };
  }).filter(Boolean);
}

function buildMemberFallbackFromTasks(tasks) {
  const buf = new Map();
  (tasks || []).forEach((t) => {
    (t.members || []).forEach((m) => {
      const id = (typeof m === "object" ? m.id : m) ?? "";
      const name = (typeof m === "object" ? m.name : m) ?? "";
      if (!buf.has(id)) buf.set(id, { id, value: id, name: name || `User ${id}`, label: name || `User ${id}`, color: "#64748b", textcolor: "#ffffff" });
    });
  });
  return Array.from(buf.values());
}

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [roleMap, setRoleMap] = useState([]);
  const [memberMap, setMemberMap] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filteredTasks, setFilteredTasks] = useState([]);
  const [openTaskModal, setOpenTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [preFillDates, setPreFillDates] = useState(null);
  const [modeChoose, setModeChoose] = useState("Calendar");
  const calendarRef = useRef(null);

  const projectEnd = useMemo(() => project?.endDate ? dayjs(project.endDate) : null, [project]);

  const refreshData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [taskRes, projRes, rawRolesResp] = await Promise.all([
        getTaskByProjectId(id),
        getproJectsById(id),
        getrole().catch(() => [])
      ]);

      const tlist = toArray(taskRes?.data ?? taskRes);
      setTasks(tlist);
      setFilteredTasks(tlist);
      setRoleMap(decorateRoles(rawRolesResp));

      const proj = toArray(projRes?.data ?? projRes)?.[0] || null;
      setProject(proj);

      let mm = buildMemberMapFromProject(proj);
      if (!mm?.length) mm = buildMemberFallbackFromTasks(tlist);
      setMemberMap(mm);
    } catch (e) {
      console.error(e);
      Swal.fire("ผิดพลาด", "โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, [id]);

  const getRoleData = (roleVal) => roleMap.find((r) => String(r.id) === String(roleVal)) || findByAnyKey(roleMap, roleVal) || null;

  const getMemberDetail = (m) => {
    const idVal = typeof m === "object" ? (m.id ?? m) : m;
    const nameVal = typeof m === "object" ? (m.name ?? String(m)) : String(m);
    return memberMap.find((x) => String(x.id) === String(idVal)) || findByAnyKey(memberMap, idVal) || { id: idVal, value: idVal, label: nameVal, name: nameVal, color: "#94a3b8", textcolor: "#ffffff" };
  };

  const { maxOverdueTask, overdueDays } = useMemo(() => {
    if (!projectEnd || !tasks?.length) return { maxOverdueTask: null, overdueDays: 0 };
    const lateTasks = tasks.filter((t) => dayjs(t.end).isAfter(projectEnd, "day"));
    if (!lateTasks.length) return { maxOverdueTask: null, overdueDays: 0 };
    const latest = lateTasks.reduce((a, b) => dayjs(a.end).isAfter(dayjs(b.end)) ? a : b);
    return { maxOverdueTask: latest, overdueDays: dayjs(latest.end).diff(projectEnd, "day") };
  }, [tasks, projectEnd]);

  const handleSaveTask = async (task) => {
    try {
      const { id: taskId, ...taskData } = task || {};
      const res = taskId ? await edittask(task) : await createTask(taskData);
      if (!res?.error) {
        Swal.fire("สำเร็จ", taskId ? "แก้ไขงานเรียบร้อย!" : "เพิ่มงานใหม่เรียบร้อย!", "success");
        refreshData();
        setOpenTaskModal(false);
      } else {
        Swal.fire("ผิดพลาด", res?.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (e) {
      Swal.fire("ผิดพลาด", "บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleDeleteTask = (index) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบงานนี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "ลบงาน",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deletetask(tasks[index]?.id);
        if (!res?.error) {
          Swal.fire("ลบสำเร็จ!", "งานถูกลบเรียบร้อยแล้ว", "success");
          refreshData();
        }
      }
    });
  };

  const totalProjectDays = useMemo(() => {
    const s = dayjs(project?.startDate);
    const e = dayjs(project?.endDate);
    return s.isValid() && e.isValid() ? Math.max(e.diff(s, "day") + 1, 0) : null;
  }, [project]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar: Project Info */}
        <aside className="w-full lg:w-[380px] space-y-6 shrink-0">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => router.push("/")} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 border border-slate-100 shadow-sm">
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{project?.name || "Loading..."}</h1>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between text-slate-500 bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Timeline</span>
                </div>
                <span className="font-bold text-slate-700">{formatDate(project?.startDate)} - {formatDate(project?.endDate)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>Duration</span>
                </div>
                <span className="font-bold text-slate-700">{(totalProjectDays ?? project?.totalDays ?? "-")} Days</span>
              </div>
              
              {maxOverdueTask && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold">Overdue: {overdueDays} Days</span>
                    <p className="opacity-80 mt-1">Task: {maxOverdueTask?.name || maxOverdueTask?.role}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Task List</h3>
                <button 
                  onClick={() => setFilteredTasks(tasks)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
                >
                  Show All
                </button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                {tasks.map((t, i) => {
                  const roleData = getRoleData(t.role);
                  const isLate = projectEnd && dayjs(t.end).isAfter(projectEnd, "day");
                  
                  return (
                    <div 
                      key={t.id || i}
                      onClick={() => setFilteredTasks([t])}
                      className={cn(
                        "group p-4 rounded-2xl border transition-all cursor-pointer",
                        isLate ? "bg-rose-50 border-rose-100 hover:border-rose-300" : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors" style={{ color: !isLate ? roleData?.color : undefined }}>
                          {t.name || t.role}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditTask(i); setOpenTaskModal(true); }} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(i); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-2">{t.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{formatDate(t.start)} - {formatDate(t.end)}</span>
                        <div className="flex -space-x-1.5">
                          {t.members?.slice(0, 3).map((m, idx) => {
                            const md = getMemberDetail(m);
                            return (
                              <div key={idx} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm" style={{ backgroundColor: md.color || "#6366f1" }} title={md.name}>
                                {md.name.charAt(0).toUpperCase()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => { setEditTask(null); setOpenTaskModal(true); }}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition font-bold text-sm flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" /> New Task
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content: Calendar/Gantt */}
        <main className="flex-1 space-y-6 overflow-hidden">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-2 inline-flex">
            <button
              onClick={() => setModeChoose("Calendar")}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2",
                modeChoose === "Calendar" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <CalendarIcon className="w-5 h-5" /> Calendar
            </button>
            <button
              onClick={() => setModeChoose("GanttChart")}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2",
                modeChoose === "GanttChart" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <ListBulletIcon className="w-5 h-5" /> Gantt Chart
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 overflow-hidden min-h-[700px]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-sm font-bold uppercase tracking-widest">Loading View...</span>
              </div>
            ) : modeChoose === "Calendar" ? (
              <BigCalendar
                ref={calendarRef}
                tasks={filteredTasks}
                roleMap={roleMap}
                onEditTask={(task) => {
                  const idx = tasks.findIndex((t) => t === task || String(t.id) === String(task?.id));
                  setEditTask(idx >= 0 ? idx : null);
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
        </main>
      </div>

      {openTaskModal && (
        <AddTaskModal
          id={id}
          onClose={() => { setOpenTaskModal(false); setEditTask(null); setPreFillDates(null); }}
          onSave={handleSaveTask}
          editData={editTask !== null ? tasks[editTask] : null}
          preFillDates={preFillDates}
        />
      )}
    </div>
  );
}
