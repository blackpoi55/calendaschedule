import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { getmemberbyteam } from "@/action/api";
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

const cn = (...c) => c.filter(Boolean).join(' ');

export default function AddProjectModal({ onClose, onSave, editData }) {
  const today = dayjs();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: today.format("YYYY-MM-DD"),
    endDate: today.add(7, "day").format("YYYY-MM-DD"),
    totalDays: 8,
    memberId: "",
  });

  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const t = localStorage.getItem("auth_user");
        const auth_user = t ? JSON.parse(t) : null;
        if (!auth_user?.id) throw new Error("ไม่พบ team id");

        const res = await getmemberbyteam(auth_user.id);
        const items = Array.isArray(res) ? res : res?.data?.members ?? [];

        const normalized = (items ?? []).map((it) => {
          const userObj = it.user || {};
          return {
            id: String(userObj.id ?? it.userId ?? it.id ?? it.memberId ?? it.uid ?? ""),
            name: userObj.name ?? it.name ?? "Unknown",
            email: userObj.email ?? it.email ?? "",
            image: it.image ?? it.avatar ?? it.photoURL ?? "",
            color: it.color ?? "#6366f1",
            textcolor: it.textcolor ?? "#ffffff",
            raw: it,
          };
        });

        setMembers(normalized);

        if (editData?.ProjectMembers?.length) {
          const preset = new Set(editData.ProjectMembers.map((pm) => String(pm.userId ?? pm.user?.id ?? "")).filter(Boolean));
          setSelectedIds(preset);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [editData]);

  useEffect(() => {
    if (editData) {
      const start = dayjs(editData.startDate);
      const end = dayjs(editData.endDate);
      setFormData({
        name: editData.name || "",
        description: editData.description || "",
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
        totalDays: end.diff(start, "day") + 1,
        memberId: editData.memberId || "",
      });
    }
  }, [editData]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  }, [members, search]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      let updated = { ...prev, [field]: value };
      const start = dayjs(updated.startDate);
      const end = dayjs(updated.endDate);

      if (field === "startDate" || field === "endDate") {
        if (end.isBefore(start)) {
          updated.endDate = start.format("YYYY-MM-DD");
        }
        updated.totalDays = dayjs(updated.endDate).diff(dayjs(updated.startDate), "day") + 1;
      }

      if (field === "totalDays") {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n > 0) {
          updated.endDate = start.add(n - 1, "day").format("YYYY-MM-DD");
          updated.totalDays = n;
        }
      }
      return updated;
    });
  };

  const toggleSelect = (id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = () => {
    const { name, startDate, endDate, totalDays } = formData;
    if (!name || !startDate || !endDate) {
      Swal.fire("กรอกข้อมูลไม่ครบ", "กรุณาระบุชื่อโปรเจกต์และวันที่ให้ครบถ้วน", "warning");
      return;
    }

    const selectedMembers = members.filter((m) => selectedIds.has(m.id)).map((m) => ({
      name: m.name,
      email: m.email,
      image: m.image,
      color: m.color,
      textcolor: m.textcolor,
      roleInTeam: m.raw?.roleInTeam || "member",
      userId: m.raw?.userId || m.raw?.id || null,
    }));

    const project = {
      ...formData,
      id: editData ? editData.id : "",
      ownerId: editData ? editData.ownerId : (JSON.parse(localStorage.getItem("auth_user") || "{}").id),
      details: editData ? editData.details ?? [] : [],
      members: selectedMembers,
    };
    onSave(project);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalIn">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
              {editData ? <CalendarDaysIcon className="w-6 h-6 text-white" /> : <CalendarDaysIcon className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {editData ? "Edit Project Details" : "Create New Project"}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Project Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition text-slate-300 hover:text-rose-500 shadow-sm border border-transparent hover:border-slate-100">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <DocumentTextIcon className="w-3.5 h-3.5" /> Project Name
              </label>
              <input
                type="text" placeholder="Enter project title..."
                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                value={formData.name} onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
              <textarea
                placeholder="What is this project about?"
                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner resize-none h-24"
                value={formData.description} onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  value={formData.startDate} onChange={(e) => handleChange("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  value={formData.endDate} onChange={(e) => handleChange("endDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Days</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  value={formData.totalDays} onChange={(e) => handleChange("totalDays", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Project Members</h3>
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-lg">{selectedIds.size} SELECTED</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedIds(new Set(members.map(m => m.id)))} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition">Select All</button>
                <span className="text-slate-200">|</span>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition">Clear</button>
              </div>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" placeholder="Search members..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 shadow-inner"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
              {filteredMembers.map((m) => {
                const checked = selectedIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleSelect(m.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all",
                      checked ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200" : "bg-white border-slate-100 hover:border-indigo-100"
                    )}
                  >
                    <div className="relative">
                      {m.image ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm" dangerouslySetInnerHTML={{ __html: m.image }} />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md" style={{ backgroundColor: m.color }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {checked && (
                        <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                          <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-xs font-bold truncate", checked ? "text-indigo-900" : "text-slate-700")}>{m.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition">Cancel</button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95"
          >
            {editData ? "Update Project" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
