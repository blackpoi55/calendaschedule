"use client";
import { useParams, useRouter } from "next/navigation";
import BigCalendar from "@/components/BigCalendar";
import AddTaskModal from "@/components/AddTaskModal";
import { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import GanttChart from "@/components/GanttChart";
import {
  addtask,
  deletetask,
  edittask,
  getproJects,
  getrole,
  getmember,
} from "@/action/api";

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [openTaskModal, setOpenTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [preFillDates, setPreFillDates] = useState(null);
  const calendarRef = useRef(null);
  const [projectEnd, setProjectEnd] = useState(null);
  const [modeChoose, setModeChoose] = useState("Calenda");
  const [project, setProject] = useState(null);

  const [roleMap, setRoleMap] = useState([]);
  const [memberMap, setMemberMap] = useState([]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- helpers ----
  const safeStr = (v) => (v ?? "").toString();
  const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");

  const normalizeTasks = (arr = []) =>
    arr.map((t, idx) => {
      const start = t.start || t.startDate || "";
      const end = t.end || t.endDate || "";
      const startD = start ? dayjs(start) : null;
      const endD = end ? dayjs(end) : null;
      const computedDays =
        startD && endD ? endD.diff(startD, "day") + 1 : Number(t.days) || 0;

      const name = safeStr(t.name).trim();
      const role = safeStr(t.role).trim();

      return {
        ...t,
        // ใช้ name เป็นหลัก ถ้าไม่มีค่อย fallback เป็น role
        title: name || role || `Task #${idx + 1}`,
        name, // เก็บ name ชัดเจน
        role, // role อาจว่างได้
        start,
        end,
        days: Number(t.days) || computedDays || 0,
        member: Array.isArray(t.member) ? t.member : [],
      };
    });

  const norm = (v) => safeStr(v).trim().toLowerCase();
  const findByAnyKey = (arr, value) => {
    const target = norm(value);
    return arr.find((x) =>
      ["id", "value", "label", "name", "key", "code"]
        .map((k) => x?.[k])
        .some((v) => norm(v) === target)
    );
  };
  const getRoleData = (roleValue) => findByAnyKey(roleMap, roleValue) || null;

  const getMemberDetail = (m) => {
    const val =
      typeof m === "string"
        ? m
        : m?.id ?? m?.value ?? m?.label ?? m?.name ?? "";
    return findByAnyKey(memberMap, val) || null;
  };
  // -----------------

  const refresh = async () => {
    // Projects
    const data = await getproJects();
    if (data?.data?.length) {
      const found = data.data.find((p) => String(p.id) === String(id));
      if (found) {
        setProject(found);
        const ntasks = normalizeTasks(found.details || []);
        setTasks(ntasks);
        setFilteredTasks(ntasks);
        setProjectEnd(found?.endDate ? dayjs(found.endDate) : null);
      } else {
        setProject(null);
        setTasks([]);
        setFilteredTasks([]);
        setProjectEnd(null);
      }
    } else {
      setProject(null);
      setTasks([]);
      setFilteredTasks([]);
      setProjectEnd(null);
    }

    // role & member maps
    const roleRes = await getrole().catch(() => ({}));
    setRoleMap(roleRes?.data || []);

    const memRes = await getmember().catch(() => ({}));
    setMemberMap(memRes?.data || []);
  };

  // sync & auto navigate calendar
  useEffect(() => {
    setFilteredTasks(tasks);
    if (calendarRef.current && tasks?.length > 0) {
      const firstStart = dayjs(
        tasks.reduce(
          (earliest, t) => (dayjs(t.start).isBefore(earliest) ? t.start : earliest),
          tasks[0].start
        )
      );
      calendarRef.current.navigate(firstStart.toDate(), "month");
    }
  }, [tasks]);

// อยู่ใน ProjectDetail component (มี state: project, editTask, ฯลฯ)
const handleSaveTask = async (task) => {
  try {
    // ต้องมี project_id จากโปรเจคปัจจุบัน
    const projId =
      task?.project_id ??
      (project?.id !== undefined ? Number(project.id) : undefined);

    if (projId === undefined || Number.isNaN(projId)) {
      throw new Error("ไม่พบ project_id ของโปรเจค");
    }

    // normalize วันที่ + days (inclusive)
    const start = dayjs(task.start);
    const end = dayjs(task.end);
    if (!start.isValid() || !end.isValid()) {
      throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
    }
    if (end.isBefore(start, "day")) {
      throw new Error("วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
    }

    const payload = {
      // ฟิลด์ตามสัญญากับ backend:
      id: task.id,                                   // มีเฉพาะตอนแก้ไข
      project_id: projId,                            // ✅ แนบ project_id
      name: task.name ?? "",                         // รองรับสคีมใหม่
      role: task.role ?? "",                         // optional
      description: task.description ?? "",           // optional
      remark: task.remark ?? "",                     // optional
      member: Array.isArray(task.member) ? task.member : [], // array ของ label/ID ตามที่ backend รับ
      start: start.format("YYYY-MM-DD"),
      end: end.format("YYYY-MM-DD"),
      days: end.diff(start, "day") + 1,              // inclusive
    };

    let res;
    if (task.id) {
      // แก้ไข
      res = await edittask(task.id, payload);
    } else {
      // สร้างใหม่
      res = await addtask(payload);
    }

    if (res && !res.error) {
      await Swal.fire(
        "สำเร็จ",
        task.id ? "แก้ไข Task เรียบร้อย!" : "เพิ่ม Task ใหม่เรียบร้อย!",
        "success"
      );
      setOpenTaskModal(false);
      setEditTask(null);
      await refresh();
    } else {
      throw new Error(res?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("ผิดพลาด", err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
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

      if (!deleting?.id) {
        // เคสรูปแบบ API ตัวอย่างที่ details ยังไม่มี id ต่อรายการ
        Swal.fire(
          "ลบไม่สำเร็จ",
          "ไม่พบรหัสงาน (id) ในรายการนี้ — โปรดให้ API ส่ง id ของ task ภายใต้ details เพื่อรองรับการลบ/แก้ไขรายงานย่อย",
          "error"
        );
        return;
      }

      const res = await deletetask(deleting.id);
      if (!res?.error) {
        Swal.fire("ลบสำเร็จ!", "งานถูกลบเรียบร้อยแล้ว", "success");
        refresh();
      } else {
        Swal.fire("ล้มเหลว", res?.error || "ไม่สามารถลบได้", "error");
      }
    });
  };

  if (!project) {
    return (
      <div className="text-center mt-20 text-red-500 text-xl">
        ❌ ไม่พบโปรเจค
      </div>
    );
  }

  const overdueTasks = tasks.filter(
    (task) => projectEnd && dayjs(task.end).isAfter(projectEnd, "day")
  );
  const maxOverdueTask =
    overdueTasks.length > 0
      ? overdueTasks.reduce((latest, task) =>
          dayjs(task.end).isAfter(dayjs(latest.end)) ? task : latest
        )
      : null;
  const overdueDays =
    maxOverdueTask && projectEnd
      ? dayjs(maxOverdueTask.end).diff(projectEnd, "day")
      : 0;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#fce4ec] to-[#ede7f6] p-6 gap-6">
      {/* 📋 Project Info Panel */}
      <div className="w-1/3 bg-white rounded-xl shadow-xl p-6 flex flex-col">
        <div className="flex items-center w-full">
          <div className="flex w-1/2 justify-start items-center">
            <h2
              onClick={() => router.push("/")}
              className="text-2xl font-bold text-purple-600 mb-4 cursor-pointer flex items-center gap-2 hover:scale-105 hover:text-purple-800 transition"
            >
              🔙 <span>{project.name}</span>
            </h2>
          </div>
          <div className="flex w-1/2 justify-end items-center">
            <button
              onClick={() => setModeChoose("Calenda")}
              className={`rounded-l-lg p-2 ${
                modeChoose === "Calenda"
                  ? " bg-gradient-to-r from-purple-300 to-pink-400 text-white "
                  : " bg-gray-500 text-white "
              }`}
            >
              Calenda
            </button>
            <button
              onClick={() => setModeChoose("GanttChart")}
              className={`rounded-r-lg p-2 ${
                modeChoose === "GanttChart"
                  ? " bg-gradient-to-r from-purple-300 to-pink-400 text-white "
                  : " bg-gray-500 text-white "
              }`}
            >
              GanttChart
            </button>
          </div>
        </div>

        <p className="mb-2">
          <span className="font-semibold">ระยะเวลา:</span>{" "}
          {fmtDate(project.startDate)} - {fmtDate(project.endDate)}
        </p>
        <p className="mb-4">
          <span className="font-semibold">รวม:</span> {project.totalDays} วัน
        </p>

        {/* 🔴 งานเกินกำหนด */}
        {maxOverdueTask && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700">
            ⚠ เกินกำหนด <strong>{overdueDays} วัน</strong>{" "}
            (Task:{" "}
            <strong>
              {maxOverdueTask.name || maxOverdueTask.role || "ไม่ระบุ"}
            </strong>{" "}
            สิ้นสุด {fmtDate(maxOverdueTask.end)})
          </div>
        )}

        <h3 className="text-lg font-semibold text-purple-500 mb-2 flex justify-between items-center">
          รายละเอียดงาน:
          <button
            onClick={() => {
              setSelectedTaskIndex(null);
              setFilteredTasks(tasks);
              if (calendarRef.current && tasks.length > 0) {
                const firstStart = dayjs(
                  tasks.reduce(
                    (earliest, t) =>
                      dayjs(t.start).isBefore(earliest) ? t.start : earliest,
                    tasks[0].start
                  )
                );
                calendarRef.current.navigate(firstStart.toDate(), "month");
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
            if (projectEnd && end.isAfter(projectEnd, "day"))
              bgColor = "bg-red-100 border-red-300";
            else if (today.isAfter(end, "day"))
              bgColor = "bg-green-100 border-green-300";

            return (
              <li
                key={i}
                className={`p-4 rounded-lg shadow-sm border cursor-pointer transition hover:scale-[1.01] ${bgColor}`}
                onClick={() => {
                  setSelectedTaskIndex(i);
                  setFilteredTasks([t]);
                  if (calendarRef.current) {
                    calendarRef.current.navigate(start.toDate(), "month");
                  }
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div
                      className="font-bold"
                      style={{ color: roleData?.color || "#6b21a8" }}
                      title={t.title}
                    >
                      {/* แสดง name เป็นหลัก; ถ้ามี role แสดงเป็นแท็กเล็กๆ ต่อท้าย */}
                      {t.name || t.role || t.title}
                    </div>
                    {t.role && (
                      <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                        {t.role}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                      {t.days} วัน
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
                  {fmtDate(t.start)} ➝ {fmtDate(t.end)}
                </p>

                {/* 👥 สมาชิก (ใช้ memberMap จาก API) */}
                {Array.isArray(t.member) && t.member.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {t.member.map((m, idx) => {
                      const md = getMemberDetail(m);
                      if (!md) return null;
                      return (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: md.color || "black",
                            color: md.textcolor || "white",
                          }}
                          className="flex flex-col items-center justify-center text-xs p-2 rounded-full shadow-md cursor-pointer hover:scale-105 transition w-12 h-12 text-center"
                          title={md.label || md.name}
                        >
                          {md.image && (
                            <span
                              className="w-3 h-3 mb-1"
                              dangerouslySetInnerHTML={{ __html: md.image }}
                            />
                          )}
                          <span className="truncate">
                            {md.label || md.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 📝 หมายเหตุ */}
                {t.remark && t.remark.trim() !== "" && (
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
          + เพิ่มตำแหน่ง
        </button>
      </div>

      {/* 📅 ปฏิทิน / Gantt */}
      <div className="flex-1 bg-white rounded-xl shadow-xl p-4">
        {modeChoose === "Calenda" ? (
          <BigCalendar
            ref={calendarRef}
            // ส่ง task ที่ normalize แล้ว (มี title เสมอ)
            tasks={filteredTasks}
            onEditTask={(task) => {
              setEditTask(tasks.findIndex((t) => t === task));
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

      {openTaskModal && (
        <AddTaskModal
          onClose={() => {
            setOpenTaskModal(false);
            setEditTask(null);
            setPreFillDates(null);
          }}
          onSave={handleSaveTask}
          editData={editTask !== null ? tasks[editTask] : null}
          preFillDates={preFillDates}
        />
      )}
    </div>
  );
}
