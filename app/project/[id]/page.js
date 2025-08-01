"use client";
import { useParams, useRouter } from "next/navigation";
import BigCalendar from "@/components/BigCalendar";
import AddTaskModal from "@/components/AddTaskModal";
import { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import { projectsData, memberOptions, roleOptions } from "@/lib/mockData";

export default function ProjectDetail() {
    const { id } = useParams();
    const project = projectsData.find((p) => p.id === id);
    const router = useRouter();
    const [tasks, setTasks] = useState(project?.details || []);
    const [openTaskModal, setOpenTaskModal] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
    const [filteredTasks, setFilteredTasks] = useState(project?.details || []); // ✅ ให้เริ่มต้นด้วย task ทั้งหมด
    const [preFillDates, setPreFillDates] = useState(null);
    const calendarRef = useRef(null);
    const projectEnd = dayjs(project.endDate);

    if (!project) return <div className="text-center mt-20 text-red-500 text-xl">❌ ไม่พบโปรเจค</div>;

    // ✅ Sync task ทั้งหมดทุกครั้งที่ tasks เปลี่ยน
    useEffect(() => {
        setFilteredTasks(tasks);
        if (calendarRef.current && tasks.length > 0) {
            const firstStart = dayjs(
                tasks.reduce((earliest, t) =>
                    dayjs(t.start).isBefore(earliest) ? t.start : earliest,
                    tasks[0].start
                )
            );
            calendarRef.current.navigate(firstStart.toDate(), "month"); // ✅ auto navigate
        }
    }, [tasks]);

    const getMemberDetail = (name) => memberOptions.find((m) => m.label === name);

    const handleSaveTask = (task) => {
        if (editTask !== null) {
            setTasks((prev) => prev.map((t, idx) => (idx === editTask ? task : t)));
            setEditTask(null);
        } else {
            setTasks((prev) => [...prev, task]);
        }
        setPreFillDates(null);
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
            cancelButtonText: "ยกเลิก"
        }).then((result) => {
            if (result.isConfirmed) {
                setTasks((prev) => prev.filter((_, idx) => idx !== index));
                Swal.fire("ลบสำเร็จ!", "ตำแหน่งถูกลบเรียบร้อยแล้ว", "success");
            }
        });
    };

    // ✅ งานที่เกินกำหนด
    const overdueTasks = tasks.filter((task) => dayjs(task.end).isAfter(projectEnd, "day"));
    const maxOverdueTask = overdueTasks.length > 0
        ? overdueTasks.reduce((max, curr) =>
            dayjs(curr.end).isAfter(dayjs(max.end)) ? curr : max
        )
        : null;
    const overdueDays = maxOverdueTask ? dayjs(maxOverdueTask.end).diff(projectEnd, "day") : 0;

    const formatDate = (date) => dayjs(date).format("DD/MM/YYYY");

    return (
        <div className="flex min-h-screen bg-gradient-to-r from-blue-50 to-purple-100 p-6 gap-6">
            {/* 📋 Project Info Panel */}
            <div className="w-1/3 bg-white rounded-xl shadow-xl p-6 flex flex-col">
                <h2
                    onClick={() => router.push("/")}
                    className="text-2xl font-bold text-purple-600 mb-4 cursor-pointer flex items-center gap-2 hover:scale-105 hover:text-purple-800 transition"
                >
                    🔙 <span>{project.name}</span>
                </h2>

                <p className="mb-2"><span className="font-semibold">ทีม:</span> {project.team}</p>
                <p className="mb-2">
                    <span className="font-semibold">ระยะเวลา:</span> {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </p>
                <p className="mb-4"><span className="font-semibold">รวม:</span> {project.totalDays} วัน</p>

                {/* 🔴 งานเกินกำหนด */}
                {maxOverdueTask && (
                    <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700">
                        ⚠ เกินกำหนด <strong>{overdueDays} วัน</strong>
                        (Task: <strong>{maxOverdueTask.role}</strong> สิ้นสุด {formatDate(maxOverdueTask.end)})
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
                                    tasks.reduce((earliest, t) =>
                                        dayjs(t.start).isBefore(earliest) ? t.start : earliest,
                                        tasks[0].start
                                    )
                                );
                                calendarRef.current.navigate(firstStart.toDate(), "month");
                            }
                        }}
                        className="text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                        แสดงทั้งหมด
                    </button>
                </h3>

                {/* 🔽 รายการ Tasks */}
                <ul className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
                    {tasks.map((t, i) => {
                        const roleData = roleOptions.find((r) => r.label === t.role);
                        const today = dayjs();
                        const start = dayjs(t.start);
                        const end = dayjs(t.end);

                        let bgColor = "bg-purple-50 border-purple-100";
                        if (end.isAfter(projectEnd, "day")) {
                            bgColor = "bg-red-100 border-red-300";
                        } else if (today.isAfter(end, "day")) {
                            bgColor = "bg-green-100 border-green-300";
                        }

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
                                    <span className="font-bold" style={{ color: roleData?.color || "#6b21a8" }}>
                                        {t.role}
                                    </span>
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

                                <p className="text-sm text-gray-600 mb-1">{formatDate(t.start)} ➝ {formatDate(t.end)}</p>

                                {/* 👥 แสดงสมาชิกแบบ Avatar */}
                                {t.member && t.member.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {t.member.map((m, idx) => {
                                            const memberDetail = getMemberDetail(m);
                                            if (!memberDetail) return null;
                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        backgroundColor: memberDetail.color || "black",
                                                        color: memberDetail.textcolor || "white",
                                                    }}
                                                    className="flex flex-col items-center justify-center text-xs p-2 rounded-full shadow-md cursor-pointer hover:scale-105 transition w-12 h-12 text-center"
                                                >
                                                    {memberDetail.image && (
                                                        <span
                                                            className="w-3 h-3 mb-1"
                                                            dangerouslySetInnerHTML={{ __html: memberDetail.image }}
                                                        />
                                                    )}
                                                    <span className="truncate">{memberDetail.label}</span>
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
                    className="mt-4 w-full py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl shadow hover:scale-105 transition">
                    + เพิ่มตำแหน่ง
                </button>
            </div>

            {/* 📅 ปฏิทิน */}
            <div className="flex-1 bg-white rounded-xl shadow-xl p-4">
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
