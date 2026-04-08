'use client';

import { useEffect, useState } from "react";
import { statusOptions, sortOptions, priorityOptions, projectOptions, devOptions, modulesOptions, typeOptions } from "../../../../config";
import { useParams, useRouter } from 'next/navigation'
import Swal from "sweetalert2";
import { getproJectsById } from "@/action/api";
import { 
  ChevronLeftIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline';

/* ============================== Helpers ============================== */
const cn = (...c) => c.filter(Boolean).join(' ');

function Page() {
  const router = useRouter();
  const { id } = useParams();
  const [selectedDev, setSelectedDev] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const devList = selectedDev ? selectedDev.split(",") : [];
  const [searchTerm, setSearchTerm] = useState("");
  const [prioritFilter, setprioritFilter] = useState("");
  const [devFilter, setdevFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("resolved");
  const [sortBy, setSortBy] = useState("createdat-desc");
  const [selectedCase, setSelectedCase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [devmode, setdevmode] = useState(true);
  const [modulesFilter, setmodulesFilter] = useState("");
  const [typeFilter, settypeFilter] = useState("");
  const [bucode, setBucode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const godmode = searchParams.get("godmode");
      if (godmode === "admin") {
        localStorage.setItem("edomdog", "cvf,bo");
        router.push("/casereport");
      }
    }
  }, [router]);

  useEffect(() => {
    const checkmode = localStorage.getItem("edomdog");
    setdevmode(checkmode === "cvf,bo");
    setStatusFilter(checkmode === "cvf,bo" ? "pending" : "resolved");
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const resproJectsById = await getproJectsById(id);
      if (resproJectsById?.data?.[0]) {
        const bucode2 = resproJectsById.data[0].name || '';
        setBucode(bucode2);
        const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/getbyCode/" + bucode2);
        const result = await response.json();
        setCases(Array.isArray(result.data) ? result.data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (data, newStatus) => {
    const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/" + data.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (response.ok) {
      refresh();
      setIsModalOpen(false);
    } else {
      Swal.fire({ icon: "error", title: "อัปเดตไม่สำเร็จ", timer: 2000, showConfirmButton: false });
    }
  };

  const updateRemarkClick = async () => {
    const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/" + selectedCase?.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        s_remarks: selectedCase?.s_remarks, c_remarks: selectedCase?.c_remarks,
        person: selectedDev, type: selectedCase?.type || "Issue", modules: selectedCase?.modules || "Inventory",
        completion_date: selectedCase?.completion_date
      }),
    });
    if (response.ok) {
      Swal.fire({ icon: "success", title: "บันทึกเรียบร้อย", timer: 2000, showConfirmButton: false });
      refresh();
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "resolved": return "bg-emerald-100 text-emerald-700";
      case "devdone":
      case "testdone": return "bg-sky-100 text-sky-700";
      case "pending": return "bg-amber-100 text-amber-700";
      case "rejected": return "bg-rose-100 text-rose-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getPriorityStyle = (priority) => {
    if (priority?.includes("1")) return "bg-rose-100 text-rose-700";
    if (priority?.includes("2")) return "bg-orange-100 text-orange-700";
    if (priority?.includes("3")) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const filteredCases = cases?.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      (c.id?.toLowerCase().includes(s) || c.title?.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s) || c.reporter?.toLowerCase().includes(s)) &&
      (statusFilter === "" || c.status === statusFilter) &&
      (prioritFilter === "" || c.priority === prioritFilter) &&
      (modulesFilter === "" || c.modules === modulesFilter) &&
      (typeFilter === "" || c.type === typeFilter) &&
      (devFilter === "" || (c.person ? c.person.split(",").includes(devFilter) : false))
    );
  }).sort((a, b) => sortBy === "createdat-asc" ? new Date(a.createdat) - new Date(b.createdat) : new Date(b.createdat) - new Date(a.createdat));

  const countByStatus = (s) => cases?.filter((c) => c.status === s).length;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-xl transition border border-slate-200 shadow-sm">
              <ChevronLeftIcon className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Tracking • {bucode}</h1>
              <p className="text-sm text-slate-500">รายงานและติดตามปัญหาภายในโปรเจกต์</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={cn("px-4 py-2 rounded-xl text-xs font-bold border", devmode ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
              MODE: {devmode ? "DEVELOPER" : "USER"}
            </span>
            <button className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium text-sm shadow-sm">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2 text-indigo-500" /> Export Excel
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatBox label="Total" value={cases?.length} color="bg-slate-100 text-slate-600" />
          <StatBox label="Pending" value={countByStatus("pending")} color="bg-amber-50 text-amber-600" />
          <StatBox label="Dev Done" value={countByStatus("devdone")} color="bg-sky-50 text-sky-600" />
          <StatBox label="Test Done" value={countByStatus("testdone")} color="bg-sky-50 text-sky-600" />
          <StatBox label="Resolved" value={countByStatus("resolved")} color="bg-emerald-50 text-emerald-600" />
          <StatBox label="Rejected" value={countByStatus("rejected")} color="bg-rose-50 text-rose-600" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="ค้นหา ID, ชื่อเคส, ผู้รายงาน..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 flex-1 lg:flex-[2]">
              <FilterSelect value={prioritFilter} onChange={setprioritFilter} options={priorityOptions} label="ความรุนแรง" />
              <FilterSelect value={modulesFilter} onChange={setmodulesFilter} options={modulesOptions} label="โมดูล" />
              <FilterSelect value={typeFilter} onChange={settypeFilter} options={typeOptions} label="ประเภท" />
              <FilterSelect value={devFilter} onChange={setdevFilter} options={devOptions} label="ผู้ดูแล" placeholder="เลือกผู้ดูแล" />
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} label="สถานะ" />
              <FilterSelect value={sortBy} onChange={setSortBy} options={sortOptions} label="เรียงตาม" />
            </div>
          </div>
        </div>

        {/* Issue Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-center">ID</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Reporter</th>
                  <th className="px-6 py-4">Module/Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 animate-pulse">กำลังดึงข้อมูล...</td></tr>
                ) : filteredCases?.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">ไม่พบรายการที่ค้นหา</td></tr>
                ) : (
                  filteredCases.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group text-sm">
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => { navigator.clipboard.writeText(item.id); Swal.fire({ icon: "success", title: "คัดลอก ID แล้ว", timer: 1000, showConfirmButton: false }); }}
                          className="p-1.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getPriorityStyle(item.priority))}>
                          {item.priority?.split(" ")[1] || item.priority || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 line-clamp-1">{item.title || "-"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.createdat).toLocaleString("th-TH")}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">{item.reporter || "-"}</td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-bold text-slate-700">{item.modules || "-"}</p>
                        <p className="text-[10px] text-slate-400">{item.type || "-"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getStatusStyle(item.status))}>
                          {item.status || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => { setSelectedDev(item.person || ""); setSelectedCase(item); setIsModalOpen(true); }}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 overflow-y-auto">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Side: Media & Basic Info */}
                <div className="flex-1 space-y-6">
                  <div className="relative group">
                    <img 
                      src={selectedCase.screenshotpath} 
                      className="w-full h-64 object-cover rounded-3xl border border-slate-200 shadow-md cursor-zoom-in group-hover:scale-[1.01] transition-transform" 
                      onClick={() => setIsImagePreviewOpen(true)}
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-slate-900 shadow-sm uppercase">Screenshot</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reporter</p>
                      <p className="text-sm font-bold text-slate-800">{selectedCase.reporter}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Module</p>
                      <p className="text-sm font-bold text-slate-800">{selectedCase.modules}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Description</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedCase.description || "No description provided"}
                    </div>
                  </div>
                </div>

                {/* Right Side: Status & Remarks */}
                <div className="flex-1 space-y-6">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedCase.title}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">✕</button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", getPriorityStyle(selectedCase.priority))}>
                      Priority: {selectedCase.priority}
                    </span>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", getStatusStyle(selectedCase.status))}>
                      Status: {selectedCase.status}
                    </span>
                  </div>

                  {devmode && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {["pending", "devdone", "testdone", "resolved", "rejected"].map(s => (
                          <button 
                            key={s} onClick={() => handleStatusUpdate(selectedCase, s)}
                            className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm border", s === selectedCase.status ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-100 scale-105" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300")}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">System Remarks</label>
                      <textarea 
                        disabled={!devmode} value={selectedCase.s_remarks || ""} 
                        onChange={e => setSelectedCase({...selectedCase, s_remarks: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 h-24"
                        placeholder="Internal notes for developers..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Remarks</label>
                      <textarea 
                        disabled={devmode} value={selectedCase.c_remarks || ""} 
                        onChange={e => setSelectedCase({...selectedCase, c_remarks: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 h-24"
                        placeholder="External notes for customers..."
                      />
                    </div>
                    <button onClick={updateRemarkClick} className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-100 hover:bg-emerald-700 transition active:scale-[0.98]">
                      Save All Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom */}
      {isImagePreviewOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-4" onClick={() => setIsImagePreviewOpen(false)}>
          <img src={selectedCase.screenshotpath} className="max-h-full max-w-full rounded-3xl shadow-2xl border border-slate-700 shadow-black/50" />
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className={cn("p-4 rounded-2xl flex flex-col items-center justify-center border shadow-sm", color)}>
      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{label}</p>
      <p className="text-xl font-black mt-1">{value || 0}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label, placeholder = "ทั้งหมด" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <select 
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export default Page;
