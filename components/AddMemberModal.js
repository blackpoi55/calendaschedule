"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { addmemberteam, deletememberteam, editmember } from "@/action/api";
import Swal from "sweetalert2";
import { 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon, 
  XMarkIcon, 
  UserGroupIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  SwatchIcon,
  IdentificationIcon,
  EnvelopeIcon
} from "@heroicons/react/24/outline";

const cn = (...c) => c.filter(Boolean).join(' ');

function AddMemberModal({ data = [], onClose, refresh }) {
  const [form, setForm] = useState({
    id: null, name: "", email: "", image: "", color: "#6366f1", textcolor: "#ffffff", description: "", showindropdown: true,
  });
  const [loading, setLoading] = useState(false);
  const [isOpenForm, setIsOpenForm] = useState(false);
  const nameRef = useRef(null);

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const [userData, setuserData] = useState({});

  const initials = (name = "") => name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const user = localStorage.getItem("auth_user");
    if (user) setuserData(JSON.parse(user));
  }, []);

  useEffect(() => {
    if (isOpenForm) setTimeout(() => nameRef.current?.focus(), 100);
  }, [isOpenForm]);

  const resetForm = useCallback(() => {
    setForm({ id: null, name: "", email: "", image: "", color: "#6366f1", textcolor: "#ffffff", description: "", showindropdown: true });
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!search || search.trim().length < 2) { setResults([]); setActiveIdx(-1); return; }
    
    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setSearching(true);
      try {
        const q = encodeURIComponent(search.trim());
        const res = await fetch(`https://taxtrail.telecorpthailand.com/api/v1/users?q=${q}`, { signal: ac.signal });
        const raw = await res.json();
        const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setResults(arr.map(u => ({ id: u.id ?? u.userId ?? u._id, name: u.name ?? u.fullName ?? u.username ?? "", email: u.email ?? "", avatar: u.avatar, image: u.image })));
        setActiveIdx(0);
      } catch (e) {
        if (e?.name !== "AbortError") { setResults([]); setActiveIdx(-1); }
      } finally { setSearching(false); }
    }, 400);
    return () => window.clearTimeout(debounceRef.current);
  }, [search]);

  const pickUser = async (u) => {
    if (loading) return;
    setLoading(true);
    try {
      const payload = { teamId: data[0]?.teamId || userData?.id, userId: u.id, roleInProject: "member" };
      await addmemberteam(payload);
      Swal.fire({ title: "Success", text: `Added ${u.name} to team`, icon: "success", timer: 1500, showConfirmButton: false });
      refresh?.();
      setIsOpenForm(false);
      setSearch("");
      setResults([]);
    } finally { setLoading(false); }
  };

  const saveClick = async () => {
    if (!form.name.trim()) return Swal.fire("Required", "Please enter member name", "warning");
    setLoading(true);
    try {
      await editmember(form.id, { teamId: userData.id, userId: form.id, roleInProject: "member" });
      Swal.fire({ title: "Updated", text: "Member info updated", icon: "success", timer: 1500, showConfirmButton: false });
      refresh?.();
      setIsOpenForm(false);
      resetForm();
    } finally { setLoading(false); }
  };

  const deleteClick = async (member) => {
    const res = await Swal.fire({ title: "Remove Member?", text: `Are you sure you want to remove ${member.user.name}?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (!res.isConfirmed) return;
    setLoading(true);
    try {
      await deletememberteam({ teamId: userData.id, userId: member.user.id });
      Swal.fire({ title: "Removed", text: "Member removed from team", icon: "success", timer: 1200, showConfirmButton: false });
      refresh?.();
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-modalIn max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Team Members</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage access and roles</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition text-slate-300 hover:text-rose-500 shadow-sm border border-transparent hover:border-slate-100">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Active Members <span className="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-lg">{data.length} TOTAL</span></h3>
            <button onClick={() => { resetForm(); setIsOpenForm(true); }} className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition font-bold text-sm">
              <PlusIcon className="w-5 h-5 mr-2" /> Add New Member
            </button>
          </div>

          <div className="flex-1 border border-slate-100 rounded-[2rem] overflow-hidden flex flex-col bg-white shadow-inner">
            <div className="overflow-x-auto overflow-y-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">User Info</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">Colors</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((r, idx) => (
                    <tr key={r?.id ?? idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {r?.user.image ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm" dangerouslySetInnerHTML={{ __html: r.user.image }} />
                            ) : (
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md" style={{ backgroundColor: r.color || "#6366f1" }}>
                                {initials(r?.user?.name || "")}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{r?.user.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">ID: {r?.user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{r?.user.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md border border-white ring-1 ring-slate-200 shadow-sm" style={{ backgroundColor: r.color }} title="Avatar BG" />
                          <div className="w-4 h-4 rounded-md border border-white ring-1 ring-slate-200 shadow-sm" style={{ backgroundColor: r.textcolor }} title="Text Color" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter", r.showindropdown ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200")}>
                          {r.showindropdown ? "VISIBLE" : "HIDDEN"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setForm({ id: r?.user.id, name: r?.user.name, email: r?.user.email, image: r?.userimage, color: r.color, textcolor: r.textcolor, description: r?.user.description, showindropdown: r.showindropdown }); setIsOpenForm(true); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition">
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>
                          <button onClick={() => deleteClick(r)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Form & Search Modal */}
      {isOpenForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsOpenForm(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalIn flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{form.id ? "Edit Member Details" : "Add Team Member"}</h3>
              <button onClick={() => setIsOpenForm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-300">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 scrollbar-hide">
              {!form.id && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Search (TaxTrail)</span>
                  </div>
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
                    {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />}
                  </div>
                  {results.length > 0 && (
                    <div className="rounded-[2rem] border border-slate-100 bg-white shadow-xl overflow-hidden">
                      {results.map((u, i) => (
                        <button key={i} onClick={() => pickUser(u)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-indigo-50 transition-colors border-b last:border-none border-slate-50 group">
                          <div className="text-left">
                            <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600">{u.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                          </div>
                          <PlusIcon className="w-5 h-5 text-slate-200 group-hover:text-indigo-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); if (!loading) saveClick(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputBox label="Name" icon={IdentificationIcon} value={form.name} onChange={v => setForm({...form, name: v})} placeholder="Full name" />
                  <InputBox label="Email" icon={EnvelopeIcon} value={form.email} onChange={v => setForm({...form, email: v})} placeholder="Email address" type="email" />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><SwatchIcon className="w-3.5 h-3.5" /> Brand Colors</label>
                    <div className="flex gap-4 p-4 bg-slate-50 rounded-3xl shadow-inner">
                      <div className="flex-1 flex items-center gap-3">
                        <input type="color" className="w-8 h-8 rounded-lg cursor-pointer border-none p-0" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                        <span className="text-[10px] font-bold text-slate-500">Avatar</span>
                      </div>
                      <div className="w-px bg-slate-200" />
                      <div className="flex-1 flex items-center gap-3">
                        <input type="color" className="w-8 h-8 rounded-lg cursor-pointer border-none p-0" value={form.textcolor} onChange={e => setForm({...form, textcolor: e.target.value})} />
                        <span className="text-[10px] font-bold text-slate-500">Text</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4">
                    <input type="checkbox" id="m-show" className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={form.showindropdown} onChange={e => setForm({...form, showindropdown: e.target.checked})} />
                    <label htmlFor="m-show" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Show in dropdowns</label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Member Bio / Description</label>
                  <textarea className="w-full bg-slate-50 border-none rounded-3xl p-5 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 h-24 shadow-inner resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Internal notes about this team member..." />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsOpenForm(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition">Cancel</button>
                  <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-60">
                    {loading ? "Saving..." : "Save Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputBox({ label, icon: Icon, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <input
        type={type} placeholder={placeholder}
        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
        value={value} onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export default AddMemberModal;
