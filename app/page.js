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
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

dayjs.extend(isBetween);

const cn = (...c) => c.filter(Boolean).join(' ');

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

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const refresh = async () => {
    setLoading(true);
    const t = localStorage.getItem('auth_user');
    if (!t) { setLoading(false); return; }
    const auth_user = JSON.parse(t);
    setUserdata(auth_user);

    try {
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
    } finally { setLoading(false); }
  };

  const handleSave = async (project) => {
    const val = { ...project, OwnerId: userdata.id };
    const res = project.id ? await editproject(project.id, val) : await addproject(val);
    if (!res?.error) {
      Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกข้อมูลเรียบร้อย!", confirmButtonColor: "#8b5cf6" });
      setOpenModal(false); setEditProject(null); refresh();
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "ยืนยันการลบ?", text: "การลบไม่สามารถกู้คืนได้", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "ลบโปรเจค"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteproject(id);
        if (!res?.error) { Swal.fire("ลบสำเร็จ!", "", "success"); refresh(); }
      }
    });
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const initials = (name = "") => name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const getProjectMembers = (project) =>
    (project.ProjectMembers || []).map(pm => ({
      id: pm.userdata?.id ?? pm.userId, name: pm.user?.name ?? "Unknown", email: pm.user?.email ?? "", image: pm.user?.image, color: pm.user?.color,
    }));

  const getCurrentStatus = (project) => {
    const today = dayjs();
    const start = dayjs(project.startDate), end = dayjs(project.endDate);
    const getStatusData = (label) => statusOptions.find((s) => s.label === label) || {};

    if (today.isBefore(start, "day")) return { label: "ยังไม่เริ่ม", text: "ยังไม่เริ่ม", color: "#94a3b8", textColor: "#475569" };
    
    const overdueTasks = (project.details || []).filter((task) => dayjs(task.end).isAfter(end, "day"));
    if (overdueTasks.length > 0) {
      const overdueDays = dayjs(overdueTasks.reduce((a, b) => dayjs(a.end).isAfter(dayjs(b.end)) ? a : b).end).diff(end, "day");
      return { label: "เกินกำหนด", text: `เกินกำหนด (+${overdueDays} วัน)`, color: "#f43f5e", textColor: "#9f1239" };
    }

    if (today.isAfter(end, "day")) return { label: "จบโปรเจคแล้ว", text: "จบโปรเจคแล้ว", color: "#10b981", textColor: "#064e3b" };

    const currentTasks = (project.details || []).filter((task) => today.isBetween(dayjs(task.start), dayjs(task.end), "day", "[]"));
    if (currentTasks.length > 0) return { label: "กำลังดำเนินการ", text: "กำลังดำเนินการ", color: "#6366f1", textColor: "#312e81", tasks: currentTasks.map(t => t.role) };

    return { label: "รอขั้นตอนถัดไป", text: "รอขั้นตอนถัดไป", color: "#f59e0b", textColor: "#78350f" };
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
        if (sortConfig.key === "startDate" || sortConfig.key === "endDate") { valA = dayjs(valA).valueOf(); valB = dayjs(valB).valueOf(); }
        return sortConfig.direction === "asc" ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      });
    }
    return filtered;
  }, [projects, search, statusFilter, memberFilter, sortConfig]);

  const formatDate = (date) => dayjs(date).format("DD/MM/YYYY");

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">จัดการและติดตามสถานะโครงการทั้งหมด</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button onClick={() => setOpenMemberManage(true)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition font-bold text-xs sm:text-sm">
              <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-500" /> จัดการทีม
            </button>
            <button onClick={() => { setEditProject(null); setOpenModal(true); }} className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition font-bold text-xs sm:text-sm">
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> สร้างโปรเจค
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" placeholder="ค้นหาชื่อโปรเจค..."
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition text-sm font-bold shadow-inner"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-inner min-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">สถานะทั้งหมด</option>
                {statusOptions.filter(s => s.showindropdown).map((s, i) => <option key={i} value={s.label}>{s.label}</option>)}
              </select>
              <select className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-2.5 sm:py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-inner min-w-[140px]" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                <option value="">สมาชิกทั้งหมด</option>
                {memberMap.filter(m => m.showindropdown).map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-5 cursor-pointer hover:text-indigo-600 transition" onClick={() => handleSort("name")}>Project Info</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-indigo-600 transition" onClick={() => handleSort("startDate")}>Timeline</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Team</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">Loading Projects...</td></tr>
                ) : filteredAndSortedProjects.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No projects found</td></tr>
                ) : (
                  filteredAndSortedProjects.map((p) => {
                    const status = getCurrentStatus(p);
                    const pMembers = getProjectMembers(p);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-bold uppercase line-clamp-1">{p.description || "No description"}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs font-black text-slate-700">{formatDate(p.startDate)} - {formatDate(p.endDate)}</div>
                          <div className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-tighter">
                            {dayjs(p.endDate).diff(dayjs(p.startDate), "day") + 1} DAYS DURATION
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: status.color + "15", color: status.textColor, borderColor: status.color + "30" }}>
                            <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: status.textColor }}></span>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex -space-x-2">
                            {pMembers.slice(0, 3).map((m, idx) => (
                              <div key={idx} className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100 flex items-center justify-center text-[10px] font-black text-white shadow-sm overflow-hidden" style={{ backgroundColor: m.color || "#6366f1" }} title={m.name}>
                                {m.image ? <div dangerouslySetInnerHTML={{ __html: m.image }} /> : initials(m.name)}
                              </div>
                            ))}
                            {pMembers.length > 3 && <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 ring-1 ring-slate-100">+{pMembers.length - 3}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                              <ActionButton onClick={() => router.push(`/project/${p.id}`)} icon={ClipboardDocumentListIcon} title="Tasks" />
                              <ActionButton onClick={() => router.push(`/project/${p.id}/board`)} icon={RectangleGroupIcon} title="Board" />
                              <ActionButton onClick={() => router.push(`/project/${p.id}/dashboard`)} icon={ChartBarIcon} title="Stats" />
                              <ActionButton onClick={() => router.push(`/project/${p.id}/gantt`)} icon={CalendarDaysIcon} title="Gantt" />
                            </div>
                            {(userdata?.id === p.ownerId || userdata?.id === p.OwnerId) && (
                              <div className="flex items-center gap-1.5 ml-1.5 border-l border-slate-200 pl-3">
                                <button onClick={() => { setEditProject(p); setOpenModal(true); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition"><PencilSquareIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><TrashIcon className="w-5 h-5" /></button>
                              </div>
                            )}
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

      {openModal && <AddProjectModal onClose={() => { setOpenModal(false); setEditProject(null); }} onSave={handleSave} editData={editProject} />}
      {openMemberManage && <AddMemberModal data={memberMap} onClose={() => setOpenMemberManage(false)} refresh={refresh} />}
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, title }) {
  return (
    <button onClick={onClick} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-slate-200" title={title}>
      <Icon className="w-5 h-5" />
    </button>
  );
}
