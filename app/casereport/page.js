'use client';

import { useEffect, useState } from "react";
import { bucode, statusOptions, sortOptions, priorityOptions, projectOptions, devOptions, modulesOptions, typeOptions } from "../../config";
import { useRouter } from 'next/navigation'
import Swal from "sweetalert2";
import { 
  ChevronLeftIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  UserGroupIcon,
  ChartBarIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

/* ============================== Helpers ============================== */
const cn = (...c) => c.filter(Boolean).join(' ');

function Page() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("godmode") === "admin") {
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
      const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/getbyCode/" + bucode);
      const result = await response.json();
      setCases(Array.isArray(result.data) ? result.data : []);
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
    if (response.ok) { refresh(); setIsModalOpen(false); }
    else { Swal.fire({ icon: "error", title: "อัปเดตไม่สำเร็จ", timer: 2000, showConfirmButton: false }); }
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
      Swal.fire({ icon: "success", title: "บันทึกเรียบร้อย", timer: 1500, showConfirmButton: false });
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

  const checkProjectname = () => projectOptions.find((x) => x.value == bucode)?.label || bucode;

  const toggleDev = (value) => {
    const newList = devList.includes(value) ? devList.filter((v) => v !== value) : [...devList, value];
    setSelectedDev(newList.join(","));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const value = e.dataTransfer.getData("text/plain");
    if (value && !devList.includes(value)) setSelectedDev([...devList, value].join(","));
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
              <ChartBarIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Report Case Dashboard
                <span className="text-xs font-bold bg-pink-100 text-pink-600 px-3 py-1 rounded-full">{checkProjectname()}</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">จัดการและติดตามสถานะงานแจ้งซ่อม/บั๊ก</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border flex items-center gap-2", devmode ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
              <div className={cn("w-2 h-2 rounded-full", devmode ? "bg-indigo-500" : "bg-emerald-500")} />
              Mode: {devmode ? "DEVELOPER" : "USER"}
            </div>
            <button className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition font-bold text-sm">
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Export Excel
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatBox label="All Cases" value={cases?.length} icon={ClipboardIcon} color="bg-slate-100 text-slate-600" />
          <StatBox label="Pending" value={cases.filter(c => c.status === "pending").length} icon={ClockIcon} color="bg-amber-100 text-amber-600" />
          <StatBox label="Dev Done" value={cases.filter(c => c.status === "devdone").length} icon={ComputerDesktopIcon} color="bg-sky-100 text-sky-600" />
          <StatBox label="Test Done" value={cases.filter(c => c.status === "testdone").length} icon={CheckCircleIcon} color="bg-sky-100 text-sky-600" />
          <StatBox label="Resolved" value={cases.filter(c => c.status === "resolved").length} icon={CheckCircleIcon} color="bg-emerald-100 text-emerald-600" />
          <StatBox label="Rejected" value={cases.filter(c => c.status === "rejected").length} icon={XCircleIcon} color="bg-rose-100 text-rose-600" />
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="ค้นหา ID, ชื่อเคส, รายละเอียด หรือผู้แจ้ง..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 flex-1 lg:flex-[2.5]">
              <FilterSelect value={prioritFilter} onChange={setprioritFilter} options={priorityOptions} label="Priority" />
              <FilterSelect value={modulesFilter} onChange={setmodulesFilter} options={modulesOptions} label="Module" />
              <FilterSelect value={typeFilter} onChange={settypeFilter} options={typeOptions} label="Type" />
              <FilterSelect value={devFilter} onChange={setdevFilter} options={devOptions} label="Developer" placeholder="Dev" />
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} label="Status" />
              <FilterSelect value={sortBy} onChange={setSortBy} options={sortOptions} label="Sort By" />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-center">ID</th>
                  <th className="px-6 py-5">Priority</th>
                  <th className="px-6 py-5">Case Info</th>
                  <th className="px-6 py-5">Module / Type</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Assignee</th>
                  <th className="px-6 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 animate-pulse">กำลังประมวลผลข้อมูล...</td></tr>
                ) : filteredCases?.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">ไม่พบเคสที่ค้นหา</td></tr>
                ) : (
                  filteredCases.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => { navigator.clipboard.writeText(item.id); Swal.fire({ icon: "success", title: "คัดลอก ID แล้ว", timer: 1000, showConfirmButton: false }); }}
                          className="p-2 bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-200"
                        >
                          <ClipboardIcon className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider", getPriorityStyle(item.priority))}>
                          {item.priority?.split(" ")[1] || item.priority || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{item.title || "-"}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold uppercase">
                          <span>{item.reporter || "-"}</span>
                          <span>•</span>
                          <span>{new Date(item.createdat).toLocaleString("th-TH")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{item.modules || "-"}</p>
                        <p className="text-[10px] text-slate-400 italic">{item.type || "-"}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider", getStatusStyle(item.status))}>
                          {item.status || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex -space-x-2">
                          {(item.person ? item.person.split(",") : []).map((val, idx) => {
                            const dev = devOptions.find(d => d.value === val);
                            if (!dev) return null;
                            return (
                              <div key={idx} className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100 flex items-center justify-center text-[10px] font-black text-white shadow-sm overflow-hidden" style={{ backgroundColor: dev.color || "#6366f1" }} title={dev.label}>
                                {dev.image ? <div dangerouslySetInnerHTML={{ __html: dev.image }} className="w-4 h-4" /> : dev.label.charAt(0)}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => { setSelectedDev(item?.person || ""); setSelectedCase(item); setIsModalOpen(true); }}
                          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-100 transition active:scale-95"
                        >
                          View Details
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

      {/* Case Detail Modal */}
      {isModalOpen && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-modalIn">
            <div className="p-8 overflow-y-auto">
              <div className="flex flex-col lg:flex-row gap-10">
                
                {/* Image & Context */}
                <div className="flex-1 space-y-6">
                  <div className="relative group overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl">
                    <img 
                      src={selectedCase.screenshotpath} 
                      className="w-full h-80 object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500" 
                      onClick={() => setIsImagePreviewOpen(true)}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                      <p className="text-white text-xs font-bold uppercase tracking-widest">Reported by {selectedCase.reporter}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ContextBox label="URL / Context" value={selectedCase.url} isLink />
                    <ContextBox label="Completion Date" value={selectedCase.completion_date ? new Date(selectedCase.completion_date).toLocaleDateString("th-TH") : "-"} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Description</label>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap shadow-inner">
                      {selectedCase.description || "No description provided"}
                    </div>
                  </div>
                </div>

                {/* Controls & Remarks */}
                <div className="flex-1 space-y-6">
                  <div className="flex justify-between items-start">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedCase.title}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-300 hover:text-rose-500">✕</button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={cn("px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest", getPriorityStyle(selectedCase.priority))}>Priority: {selectedCase.priority}</span>
                    <span className={cn("px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest", getStatusStyle(selectedCase.status))}>Status: {selectedCase.status}</span>
                  </div>

                  {devmode && (
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Workflow</p>
                      <div className="flex flex-wrap gap-2">
                        {["pending", "devdone", "testdone", "resolved", "rejected"].map(s => (
                          <button 
                            key={s} onClick={() => handleStatusUpdate(selectedCase, s)}
                            className={cn("px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm border", s === selectedCase.status ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-100 scale-105" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300")}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      {/* Developer Drag & Drop */}
                      <div className="space-y-4 mt-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Developers</p>
                        <div 
                          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                          className="flex flex-wrap gap-3 border-2 border-dashed border-slate-200 p-5 rounded-3xl bg-slate-50/50 min-h-[80px] transition-colors hover:border-indigo-300"
                        >
                          {devList.length === 0 && <span className="text-xs text-slate-300 font-bold italic w-full text-center py-4">Drag Developers here to assign...</span>}
                          {devList.map((val, idx) => {
                            const d = devOptions.find(x => x.value === val);
                            if (!d) return null;
                            return (
                              <div key={val} className="flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-full shadow-lg text-white text-[10px] font-black uppercase group" style={{ backgroundColor: d.color || "#6366f1" }}>
                                {d.label}
                                <button onClick={() => toggleDev(val)} className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition">✕</button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {devOptions.filter(d => !devList.includes(d.value)).map(d => (
                            <div key={d.value} draggable onDragStart={e => e.dataTransfer.setData("text/plain", d.value)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-500 cursor-grab hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all">
                              {d.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    <RemarkArea label="System Remarks (Internal)" value={selectedCase.s_remarks} disabled={!devmode} onChange={v => setSelectedCase({...selectedCase, s_remarks: v})} />
                    <RemarkArea label="Customer Remarks (External)" value={selectedCase.c_remarks} disabled={devmode} onChange={v => setSelectedCase({...selectedCase, c_remarks: v})} />
                    <button onClick={updateRemarkClick} className="w-full py-4 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95">
                      Save All Updates
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview */}
      {isImagePreviewOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-6" onClick={() => setIsImagePreviewOpen(false)}>
          <img src={selectedCase.screenshotpath} className="max-h-full max-w-full rounded-3xl shadow-2xl border border-slate-700" />
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div className={cn("p-5 rounded-3xl flex flex-col items-center justify-center border shadow-sm transition-transform hover:scale-105 bg-white group", color)}>
      <Icon className="w-4 h-4 opacity-40 mb-2 group-hover:scale-125 transition-transform" />
      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-center">{label}</p>
      <p className="text-2xl font-black mt-1">{value || 0}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, options, label, placeholder = "ALL" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <select 
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-none rounded-2xl px-3 py-2.5 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function ContextBox({ label, value, isLink }) {
  return (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      {isLink ? (
        <a href={value} target="_blank" className="text-[11px] font-bold text-indigo-600 underline break-all line-clamp-1">{value || "-"}</a>
      ) : (
        <p className="text-sm font-bold text-slate-800">{value}</p>
      )}
    </div>
  );
}

function RemarkArea({ label, value, disabled, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <textarea 
        disabled={disabled} value={value || ""} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-none rounded-3xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 h-28 shadow-inner transition-all disabled:opacity-60"
        placeholder={`Write ${label.toLowerCase()} here...`}
      />
    </div>
  );
}

export default Page;
