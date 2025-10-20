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
  getrole,     // ✅ ใช้ API จริง
  getmember,
  getmemberbyteam,
  getproJectsById,
  getTaskByProjectId,
  createTask,   // ✅ ใช้ API จริง
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
  const [projectEnd, setprojectEnd] = useState(null);
  const [modeChoose, setmodeChoose] = useState("Calenda");
  const [project, setproject] = useState(null);

  // ✅ ใช้ข้อมูลจาก API
  const [roleMap, setroleMap] = useState([]);       // ex: [{ id|value|label|name, color }]
  const [memberMap, setmemberMap] = useState([]);   // ex: [{ id|value|label|name, color, textcolor, image }]

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    // projects
    const data = await getTaskByProjectId(id);
    console.log("Project Tasks Data:", data.data);
    if (data?.data?.length) {
      //const found = data.data.find((p) => String(p.id) === String(id));
      console.log("Project Tasks Data2:", data?.data[0].members);
      setproject(data?.data || null);
      setTasks(data?.data || []);
      setFilteredTasks(data?.data || []);
      setprojectEnd(dayjs(data?.data[0].end));
    } else {
      setproject(null);
      setTasks([]);
      setFilteredTasks([]);
      setprojectEnd(null);
    }

    // role & member maps
    const roleRes = await getrole().catch(() => ({}));
    setroleMap(roleRes?.data || []);

    const memRes = await getproJectsById(id).catch(() => ({}));
    setmemberMap(memRes?.data.ProjectMembers || []);
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

  // ---------- helpers: map lookups ----------
  const norm = (v) => (v ?? "").toString().trim().toLowerCase();

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
    // รองรับทั้งกรณี m เป็น string หรือเป็น object { id|value|label|name }
    const val =
      typeof m === "string"
        ? m
        : m?.id ?? m?.value ?? m?.label ?? m?.name ?? "";

    return findByAnyKey(memberMap, val) || null;
  };
  // -----------------------------------------

  const handleSaveTask = async (task) => {
    let res;
    const { id: taskId, ...taskData } = task;
    if (taskId) res = await edittask(taskId, taskData);
    else res = await createTask(taskData);

    if (!res?.error) {
      Swal.fire("สำเร็จ", editTask ? "แก้ไข Task เรียบร้อย!" : "เพิ่ม Task ใหม่เรียบร้อย!", "success");
      setOpenTaskModal(false);
      setEditTask(null);
      refresh();
    } else {
      Swal.fire("ผิดพลาด", res?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  const handleDeleteTask = (index) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบตำแหน่งนี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      const deleting = tasks[index];
      const res = await deletetask(deleting?.id); // ✅ ส่ง id ของ task จริง
      if (!res?.error) {
        Swal.fire("ลบสำเร็จ!", "ตำแหน่งถูกลบเรียบร้อยแล้ว", "success");
        refresh();
      } else {
        Swal.fire("ล้มเหลว", res?.error || "ไม่สามารถลบได้", "error");
      }
    });
  };

  // if (!project) {
  //   return <div className="text-center mt-20 text-red-500 text-xl">❌ ไม่พบโปรเจค</div>;
  // }

  const overdueTasks = tasks.filter((task) => projectEnd && dayjs(task.end).isAfter(projectEnd, "day"));
  const maxOverdueTask =
    overdueTasks.length > 0
      ? overdueTasks.reduce((latest, task) => (dayjs(task.end).isAfter(dayjs(latest.end)) ? task : latest))
      : null;
  const overdueDays = maxOverdueTask && projectEnd ? dayjs(maxOverdueTask.end).diff(projectEnd, "day") : 0;

  const formatDate = (date) => dayjs(date).format("DD/MM/YYYY");

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
              🔙 <span>{project?.name}</span>
            </h2>
          </div>
          <div className="flex w-1/2 justify-end items-center">
            <button
              onClick={() => setmodeChoose("Calenda")}
              className={`rounded-l-lg p-2 ${modeChoose === "Calenda"
                ? " bg-gradient-to-r from-purple-300 to-pink-400 text-white "
                : " bg-gray-500 text-white "
                }`}
            >
              Calenda
            </button>
            <button
              onClick={() => setmodeChoose("GanttChart")}
              className={`rounded-r-lg p-2 ${modeChoose === "GanttChart"
                ? " bg-gradient-to-r from-purple-300 to-pink-400 text-white "
                : " bg-gray-500 text-white "
                }`}
            >
              GanttChart
            </button>
          </div>
        </div>

        <p className="mb-2">
          <span className="font-semibold">ระยะเวลา:</span> {formatDate(project?.startDate)} - {formatDate(project?.endDate)}
        </p>
        <p className="mb-4">
          <span className="font-semibold">รวม:</span> {project?.totalDays} วัน
        </p>

        {/* 🔴 งานเกินกำหนด */}
        {maxOverdueTask && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700">
            ⚠ เกินกำหนด <strong>{overdueDays} วัน</strong> (Task: <strong>{maxOverdueTask.role}</strong> สิ้นสุด{" "}
            {formatDate(maxOverdueTask.end)})
          </div>
        )}

        <h3 className="text-lg font-semibold text-purple-500 mb-2 flex justify-between items-center">
          รายละเอียดตำแหน่ง:
          <button
            onClick={() => {
              setSelectedTaskIndex(null);
              setFilteredTasks(tasks);
              if (calendarRef.current && tasks.length > 0) {
                const firstStart = dayjs(
                  tasks.reduce(
                    (earliest, t) => (dayjs(t.start).isBefore(earliest) ? t.start : earliest),
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
            if (projectEnd && end.isAfter(projectEnd, "day")) bgColor = "bg-red-100 border-red-300";
            else if (today.isAfter(end, "day")) bgColor = "bg-green-100 border-green-300";

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
                  <span
                    className="font-bold"
                    style={{ color: roleData?.color || "#6b21a8" }}
                    title={roleData?.label || roleData?.name || t.role}
                  >
                    {t.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{t.days} วัน</span>
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
                          <span className="truncate">{md.label || md.name}</span>
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
          + Task ใหม่
        </button>
      </div>

      {/* 📅 ปฏิทิน / Gantt */}
      <div className="flex-1 bg-white rounded-xl shadow-xl p-4">
        {modeChoose === "Calenda" ? (
          <BigCalendar
            ref={calendarRef}
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
          id={id}
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
