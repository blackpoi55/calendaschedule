"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import AddProjectModal from "@/components/AddProjectModal";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { statusOptions } from "@/lib/mockData";
import Swal from "sweetalert2";
import {
  addproject,
  deleteproject,
  editproject,
  getproJects,
  getrole,
  getmemberbyteam,
  createTeam,
} from "@/action/api";
import AddRoleModal from "@/components/AddRoleModal";
import AddMemberModal from "@/components/AddMemberModal";
import {
  ClipboardDocumentListIcon,
  RectangleGroupIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  PlusIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

dayjs.extend(isBetween);

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "startDate", direction: "desc" });
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [openRoleManage, setOpenRoleManage] = useState(false);
  const [openMemberManage, setOpenMemberManage] = useState(false);
  const [userdata, setUserdata] = useState({});
  const [roleMap, setRoleMap] = useState([]);
  const [memberMap, setMemberMap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const refresh = async () => {
    setLoading(true);
    const t = localStorage.getItem('auth_user');
    if (!t) {
      setLoading(false);
      return;
    }
    const auth_user = JSON.parse(t);
    setUserdata(auth_user);

    try {
      // ใช้ auth_user.id ดึงข้อมูลโปรเจกต์
      const data = await getproJects(auth_user.id);
      setProjects(data?.data || []);

      const role = await getrole();
      setRoleMap(role?.data || []);

      let members = await getmemberbyteam(auth_user.id);
      if (!members?.data?.members) {
        await createTeam({ name: auth_user.email + "-team", ownerId: auth_user.id });
        members = await getmemberbyteam(auth_user.id);
      }
      setMemberMap(members?.data?.members || []);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (project) => {
    const val = {
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      totalDays: project.totalDays,
      members: project.members,
      description: project.description || "",
      OwnerId: userdata.id,
    };

    const res = project.id ? await editproject(project.id, val) : await addproject(val);

    if (!res?.error) {
      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: project.id ? "แก้ไขโปรเจคเรียบร้อย!" : "เพิ่มโปรเจคใหม่เรียบร้อย!",
        confirmButtonColor: "#8b5cf6",
      });
      setOpenModal(false);
      setEditProject(null);
      refresh();
    } else {
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: res.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      });
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบโปรเจคนี้ใช่หรือไม่? การลบไม่สามารถกู้คืนได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบโปรเจค",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteproject(id);
        if (!res?.error) {
          Swal.fire("ลบสำเร็จ!", "โปรเจคถูกลบเรียบร้อยแล้ว", "success");
          refresh();
        }
      }
    });
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const initials = (name = "") =>
    name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const getProjectMembers = (project) =>
    (project.ProjectMembers || []).map(pm => ({
      id: pm.userdata?.id ?? pm.userId,
      name: pm.user?.name ?? "Unknown",
      email: pm.user?.email ?? "",
      role: pm.roleInProject ?? "",
      image: pm.user?.image,
      color: pm.user?.color,
    }));

  const getCurrentStatus = (project) => {
    const today = dayjs();
    const start = dayjs(project.startDate);
    const end = dayjs(project.endDate);
    const getStatusData = (label) => statusOptions.find((s) => s.label === label) || {};

    if (today.isBefore(start, "day")) {
      const status = getStatusData("ยังไม่เริ่ม");
      return { label: status.label, text: status.label, color: status.color, textColor: status.textcolor };
    }

    const overdueTasks = (project.details || []).filter((task) => dayjs(task.end).isAfter(end, "day"));
    if (overdueTasks.length > 0) {
      const maxOverdueTask = overdueTasks.reduce((max, curr) => dayjs(curr.end).isAfter(dayjs(max.end)) ? curr : max);
      const overdueDays = dayjs(maxOverdueTask.end).diff(end, "day");
      const status = getStatusData("เกินกำหนด");
      return { label: status.label, text: `${status.label} (+${overdueDays} วัน)`, color: status.color, textColor: status.textcolor };
    }

    if (today.isAfter(end, "day")) {
      const status = getStatusData("จบโปรเจคแล้ว");
      return { label: status.label, text: status.label, color: status.color, textColor: status.textcolor };
    }

    const currentTasks = (project.details || []).filter((task) => today.isBetween(dayjs(task.start), dayjs(task.end), "day", "[]"));
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
    return { label: status.label, text: status.label, color: status.color, textColor: status.textcolor };
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = (projects || []).filter((p) => {
      const projectStatus = getCurrentStatus(p).label;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || (statusFilter === "กำลังดำเนินการ" ? projectStatus.includes("กำลังดำเนินการ") || projectStatus === "รอขั้นตอนถัดไป" : projectStatus === statusFilter);
      const matchesMember = !memberFilter || (p.ProjectMembers || []).some((pm) => (pm.user?.name || "").toLowerCase() === memberFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesMember;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key], valB = b[sortConfig.key];
        if (sortConfig.key === "startDate" || sortConfig.key === "endDate") {
          valA = dayjs(valA).valueOf(); valB = dayjs(valB).valueOf();
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase(); valB = valB.toLowerCase();
        }
        return sortConfig.direction === "asc" ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      });
    }
    return filtered;
  }, [projects, search, statusFilter, memberFilter, sortConfig]);

  const formatDate = (date) => dayjs(date).format("DD/MM/YYYY");

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Dashboard</h1>
            <p className="text-slate-500 mt-1">จัดการและติดตามสถานะโครงการของคุณทั้งหมดที่นี่</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setOpenMemberManage(true)}
              className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition font-medium text-sm"
            >
              <UserGroupIcon className="w-5 h-5 mr-2 text-indigo-500" />
              จัดการทีม
            </button>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition font-medium text-sm"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                ติดตั้งแอป
              </button>
            )}
            <button
              onClick={() => { setEditProject(null); setOpenModal(true); }}
              className="inline-flex items-center px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition font-semibold text-sm"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              สร้างโปรเจคใหม่
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโปรเจค..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-slate-400" />
                <select
                  className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">สถานะทั้งหมด</option>
                  {statusOptions.filter(s => s.showindropdown).map((s, i) => (
                    <option key={i} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>
              <select
                className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
              >
                <option value="">สมาชิกทั้งหมด</option>
                {memberMap.filter(m => m.showindropdown).map((m, i) => (
                  <option key={i} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition" onClick={() => handleSort("name")}>Project Info</th>
                  <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition" onClick={() => handleSort("startDate")}>Timeline</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredAndSortedProjects.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">ไม่พบโปรเจคที่ค้นหา</td></tr>
                ) : (
                  filteredAndSortedProjects.map((p) => {
                    const status = getCurrentStatus(p);
                    const pMembers = getProjectMembers(p);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.description || "ไม่มีรายละเอียด"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-700">{formatDate(p.startDate)} - {formatDate(p.endDate)}</div>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                            {dayjs(p.endDate).diff(dayjs(p.startDate), "day") + 1} DAYS REMAINING
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                              style={{ backgroundColor: status.color + "15", color: status.textColor, borderColor: status.color + "30" }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: status.textColor }}></span>
                              {status.text}
                            </span>
                            {status.tasks?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {status.tasks.slice(0, 2).map((t, idx) => (
                                  <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
                                    {t}
                                  </span>
                                ))}
                                {status.tasks.length > 2 && <span className="text-[10px] text-slate-400">+{status.tasks.length - 2}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex -space-x-2">
                            {pMembers.length > 0 ? (
                              pMembers.slice(0, 4).map((m) => (
                                <div 
                                  key={m.id} 
                                  className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100 flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden"
                                  style={{ backgroundColor: m.color || "#6366f1" }}
                                  title={m.name}
                                >
                                  {m.image ? <div dangerouslySetInnerHTML={{ __html: m.image }} /> : initials(m.name)}
                                </div>
                              ))
                            ) : <span className="text-xs text-slate-300">No members</span>}
                            {pMembers.length > 4 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 ring-1 ring-slate-100">
                                +{pMembers.length - 4}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Group */}
                            <div className="flex items-center bg-slate-100 rounded-lg p-1 shadow-inner">
                              <ActionButton onClick={() => router.push(`/project/${p.id}`)} icon={ClipboardDocumentListIcon} title="Tasks" />
                              <ActionButton onClick={() => router.push(`/project/${p.id}/board`)} icon={RectangleGroupIcon} title="Board" />
                              <ActionButton onClick={() => router.push(`/project/${p.id}/dashboard`)} icon={ChartBarIcon} title="Stats" />
                              <ActionButton onClick={() => router.push(`/project/${p.id}/gantt`)} icon={CalendarDaysIcon} title="Gantt" />
                            </div>
                            
                            {/* Manage Group */}
                            {(userdata?.id === p.ownerId || userdata?.id === p.OwnerId) && (
                              <div className="flex items-center gap-1.5 ml-1.5 border-l border-slate-200 pl-3">
                                <button
                                  onClick={() => { setEditProject(p); setOpenModal(true); }}
                                  className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                                >
                                  <PencilSquareIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                            <button 
                              onClick={() => router.push(`/project/${p.id}`)}
                              className="ml-2 p-1.5 text-slate-300 group-hover:text-indigo-500 transition"
                            >
                              <ChevronRightIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {openModal && <AddProjectModal onClose={() => { setOpenModal(false); setEditProject(null); }} onSave={handleSave} editData={editProject} />}
      {openRoleManage && <AddRoleModal data={roleMap} onClose={() => setOpenRoleManage(false)} refresh={refresh} />}
      {openMemberManage && <AddMemberModal data={memberMap} onClose={() => setOpenMemberManage(false)} refresh={refresh} />}
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, title }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition shadow-sm border border-transparent hover:border-slate-200"
      title={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
