"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import AddProjectModal from "@/components/AddProjectModal";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { memberOptions, statusOptions } from "@/lib/mockData";
import Swal from "sweetalert2";
import {
  addproject,
  deleteproject,
  editproject,
  getproJects,
  getrole,
  addrole,
  editrole,
  deleterole,
  getmember,
} from "@/action/api";
import AddRoleModal from "@/components/AddRoleModal";
import AddMemberModal from "@/components/AddMemberModal";

dayjs.extend(isBetween);

export default function Home() {
  const [projects, setProjects] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Manage Modals
  const [openRoleManage, setOpenRoleManage] = useState(false);
  const [openMemberManage, setOpenMemberManage] = useState(false);

  const [roleMap, setroleMap] = useState([]);
  const [memberMap, setmemberMap] = useState([]);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    const data = await getproJects();
    if (data?.data && data?.data.length > 0) setProjects(data.data);
    else setProjects([]);

    const role = await getrole();
    setroleMap(role?.data || []);
    const member = await getmember();
    setmemberMap(member?.data  || []);
  };

  const handleSave = async (project) => {
    let res;
    const val = {
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      totalDays: project.totalDays,
    };
    if (project.id) res = await editproject(project.id, val);
    else res = await addproject(val);

    if (!res?.error) {
      Swal.fire("สำเร็จ", editProject ? "แก้ไขโปรเจคเรียบร้อย!" : "เพิ่มโปรเจคใหม่เรียบร้อย!", "success");
      setOpenModal(false);
      setEditProject(null);
      refresh();
    } else {
      Swal.fire("ผิดพลาด", res?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newDirection = prev.key === key && prev.direction === "asc" ? "desc" : "asc";
      return { key, direction: newDirection };
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "คุณต้องการลบโปรเจคนี้หรือไม่?",
      text: "การลบนี้ไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteproject(id);
        if (!res?.error) {
          Swal.fire("ลบสำเร็จ!", "โปรเจคถูกลบเรียบร้อยแล้ว", "success");
          refresh();
        } else {
          Swal.fire("ผิดพลาด", res?.error || "ไม่สามารถลบได้", "error");
        }
      }
    });
  };

  const getCurrentStatus = (project) => {
    const today = dayjs();
    const start = dayjs(project.startDate);
    const end = dayjs(project.endDate);
    const getStatusData = (label) => statusOptions.find((s) => s.label === label) || {};

    if (today.isBefore(start, "day")) {
      const status = getStatusData("ยังไม่เริ่ม");
      return { label: status.label, text: status.label, color: status.color, textColor: status.textcolor, tasks: [] };
    }

    const overdueTasks = (project.details || []).filter((task) => dayjs(task.end).isAfter(end, "day"));
    if (overdueTasks.length > 0) {
      const maxOverdueTask = overdueTasks.reduce((maxTask, current) =>
        dayjs(current.end).isAfter(dayjs(maxTask.end)) ? current : maxTask
      );
      const overdueDays = dayjs(maxOverdueTask.end).diff(end, "day");
      const status = getStatusData("เกินกำหนด");
      return { label: status.label, text: `${status.label} (เกิน ${overdueDays} วัน)`, color: status.color, textColor: status.textcolor, tasks: [] };
    }

    if (today.isAfter(end, "day")) {
      const status = getStatusData("จบโปรเจคแล้ว");
      return { label: status.label, text: status.label, color: status.color, textColor: status.textcolor, tasks: [] };
    }

    const currentTasks = (project.details || []).filter((task) =>
      today.isBetween(dayjs(task.start), dayjs(task.end), "day", "[]")
    );
    if (currentTasks.length > 0) {
      const status = getStatusData("กำลังดำเนินการ");
      return {
        label: status.label,
        text: status.label,
        color: status.color,
        textColor: status.textcolor,
        tasks: currentTasks.map((t) => `${t.role}${t.member.length > 0 ? ` (${t.member.join(", ")})` : ""}`),
      };
    }

    const status = getStatusData("รอขั้นตอนถัดไป") || getStatusData("กำลังดำเนินการ");
    return { label: status.label, text: status.label, color: status.color, textColor: status.textcolor, tasks: [] };
  };

  const isOverdue = (project) => {
    const end = dayjs(project.endDate);
    return dayjs().isAfter(end, "day") && project.details?.some((task) => dayjs(task.end).isAfter(end, "day"));
  };

  const getAllMembers = (project) => {
    const allMembers = (project.details || []).flatMap((task) => task.member || []);
    const uniqueMembers = [...new Set(allMembers)];
    return uniqueMembers
      .map((member) => memberMap.find((m) => m.label === member))
      .filter(Boolean);
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = (projects || []).filter((p) => {
      const projectStatus = getCurrentStatus(p).label;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "กำลังดำเนินการ"
          ? projectStatus.includes("กำลังดำเนินการ") || projectStatus === "รอขั้นตอนถัดไป"
          : projectStatus === statusFilter);
      const matchesMember = !memberFilter || (p.details || []).some((task) => (task.member || []).includes(memberFilter));
      const matchesOverdue = !overdueFilter || isOverdue(p);
      return matchesSearch && matchesStatus && matchesMember && matchesOverdue;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (sortConfig.key === "totalDays") {
          return sortConfig.direction === "asc" ? a.totalDays - b.totalDays : b.totalDays - a.totalDays;
        } else if (sortConfig.key === "startDate" || sortConfig.key === "endDate") {
          const dateA = dayjs(a[sortConfig.key]);
          const dateB = dayjs(b[sortConfig.key]);
          return sortConfig.direction === "asc" ? dateA.valueOf() - dateB.valueOf() : dateB.valueOf() - dateA.valueOf();
        } else {
          const valA = (a[sortConfig.key] || "").toLowerCase();
          const valB = (b[sortConfig.key] || "").toLowerCase();
          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }
      });
    }

    return filtered;
  }, [projects, search, statusFilter, memberFilter, overdueFilter, sortConfig, memberMap]);

  const formatDate = (date) => dayjs(date).format("DD/MM/YYYY");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#fce4ec] to-[#ede7f6] p-8">
      <div className="max-w-9xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        {/* SEARCH & FILTER */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">ค้นหาโปรเจค</label>
            <input
              type="text"
              placeholder="🔍 ชื่อโปรเจค"
              className="p-2 border rounded-lg focus:ring focus:ring-purple-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">สถานะ</label>
            <select
              className="p-2 border rounded-lg w-48 focus:ring focus:ring-purple-300"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {(statusOptions || [])
                .filter((s) => s.showindropdown)
                .map((status, idx) => (
                  <option key={idx} value={status.label} style={{ backgroundColor: status.color, color: status.textcolor || "#fff" }}>
                    {status.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">สมาชิก</label>
            <select
              className="p-2 border rounded-lg w-48 focus:ring focus:ring-purple-300"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {(memberMap || [])
                .filter((m) => m.showindropdown)
                .map((member, idx) => (
                  <option key={idx} value={member.name}>
                    {member.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Manage & Add */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setOpenRoleManage(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md flex items-center gap-2 transition"
              title="จัดการตำแหน่ง (Role)"
            >
              Role Manage
            </button>
            <button
              onClick={() => setOpenMemberManage(true)}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md flex items-center gap-2 transition"
              title="จัดการสมาชิก (Member)"
            >
              Member Manage
            </button>
            <button
              onClick={() => {
                setEditProject(null);
                setOpenModal(true);
              }}
              className="px-6 py-2 bg-gradient-to-r from-purple-300 to-pink-400 text-white rounded-xl shadow-md hover:scale-105 transition flex items-center gap-2"
            >
              เพิ่มโปรเจค
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-y-auto max-h-[70vh] rounded-lg border">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-purple-100 text-purple-800">
              <tr>
                <th className="p-3">ชื่อโปรเจค</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("startDate")}>
                  วันที่เริ่ม {sortConfig.key === "startDate" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("endDate")}>
                  วันที่สิ้นสุด {sortConfig.key === "endDate" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("totalDays")}>
                  จำนวนวัน {sortConfig.key === "totalDays" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="p-3 text-start">สถานะปัจจุบัน</th>
                <th className="p-3">สมาชิกในโปรเจค</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProjects.map((p) => {
                const status = getCurrentStatus(p);
                const members = getAllMembers(p) || [];

                return (
                  <tr key={p.id} className="odd:bg-white even:bg-purple-50 hover:bg-purple-100">
                    <td className="p-3 font-semibold">{p.name}</td>
                    <td className="p-3 text-center">{formatDate(p.startDate)}</td>
                    <td className="p-3 text-center">{formatDate(p.endDate)}</td>
                    <td className="p-3 text-center">{p.totalDays} วัน</td>
                    <td className="p-3 text-start">
                      <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: status.color, color: status.textColor }}>
                        {status.text}
                      </span>
                      {status.tasks.length > 0 && (
                        <ul className="mt-1 text-xs list-disc pl-4 space-y-1">
                          {status.tasks.map((task, idx) => {
                            const [rolePart, memberPart] = task.split(" (");
                            const roleData = roleMap.find((r) => r.name === rolePart.trim()); // ใช้ name จาก API
                            return (
                              <li key={idx}>
                                <span style={{ color: roleData?.color || "#555", fontWeight: 600 }}>{rolePart.trim()}</span>
                                {memberPart && <span className="text-gray-700"> ({memberPart}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-3">
                        {members.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setMemberFilter(item.label)}
                            style={{ backgroundColor: item.color || "black", color: item.textcolor || "white" }}
                            className="flex flex-col items-center justify-center text-xs p-2 rounded-full shadow-md cursor-pointer hover:scale-105 transition w-12 h-12 text-center"
                          >
                            {item.image && <span className="w-3 h-3 mb-1" dangerouslySetInnerHTML={{ __html: item.image }} />}
                            <span className="truncate">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center flex justify-center gap-3">
                      <button onClick={() => router.push(`/project/${p.id}`)} className=" w-14 text-white relative group p-1 bg-purple-500 rounded-full hover:bg-purple-600 transition">
                        {/* <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded">ดูรายละเอียด</span> */}
                        ดู
                      </button>
                      <button
                        onClick={() => {
                          setEditProject(p);
                          setOpenModal(true);
                        }}
                        className=" w-14 text-white relative group p-1 bg-yellow-400 rounded-full hover:bg-yellow-500 transition"
                      >
                        {/* <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded">แก้ไข</span> */}
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(p.id)} className=" w-14 text-white relative group p-1 bg-red-500 rounded-full hover:bg-red-600 transition">
                        {/* <span className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded">ลบ</span> */}
                        ลบ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openModal && (
        <AddProjectModal
          onClose={() => {
            setOpenModal(false);
            setEditProject(null);
          }}
          onSave={handleSave}
          editData={editProject}
        />
      )}

      {openRoleManage && (
        <AddRoleModal
          data={roleMap}
          onClose={() => setOpenRoleManage(false)}
          refresh={refresh}
        />
      )}

      {openMemberManage && (
        <AddMemberModal
          data={memberMap}
          onClose={() => setOpenMemberManage(false)}
          refresh={refresh}
        />
      )}
    </div>
  );
} 