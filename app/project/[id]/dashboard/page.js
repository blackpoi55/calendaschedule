'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getbyProjectDashboad } from '@/action/api';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeftIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UserGroupIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

/* ============================== helpers ============================== */
const cn = (...c) => c.filter(Boolean).join(' ');
const fmtInt = (n) => Number(n || 0).toLocaleString('th-TH');
const fmtDate = (iso) => iso ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(iso)) : '-';
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function progressFromDates(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const s = new Date(startISO).getTime(), e = new Date(endISO).getTime(), now = Date.now();
  if (e <= s) return 100;
  return Math.round(clamp01((now - s) / (e - s)) * 100);
}

function assigneeNames(task) {
  if (!task?.TaskAssignees?.length) return '-';
  const names = [...new Set(task.TaskAssignees.map(a => a?.User?.name || a?.userId).filter(Boolean))];
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/* ============================== Components ============================== */

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start justify-between group hover:border-indigo-200 transition-all">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      {sub && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{sub}</p>}
    </div>
    <div className={cn("p-3 rounded-2xl", color)}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

const ProgressCard = ({ value, label, sub }) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
    <div className="flex justify-between items-end mb-4">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}%</h3>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{sub}</p>
    </div>
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out" 
        style={{ width: `${value}%` }} 
      />
    </div>
  </div>
);

/* ============================== main ============================== */
export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState(null);
  const [auto, setAuto] = useState(true);
  const intervalRef = useRef(null);

  const refresh = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await getbyProjectDashboad(id);
      setPayload(res?.data || res);
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [id]);

  useEffect(() => {
    if (auto) intervalRef.current = setInterval(() => refresh(true), 60000);
    return () => clearInterval(intervalRef.current);
  }, [auto, id]);

  const { project, kanban = [], tasks = [], totalTasks: totalFromAPI } = payload || {};

  const statusById = useMemo(() => {
    const map = new Map();
    kanban.forEach(k => map.set(String(k.id), k));
    return map;
  }, [kanban]);

  const groupByStatus = useMemo(() => {
    const out = {};
    tasks.forEach(t => {
      const col = statusById.get(String(t.statusId));
      const key = col?.status || 'UNKNOWN';
      if (!out[key]) out[key] = [];
      out[key].push(t);
    });
    return out;
  }, [tasks, statusById]);

  const totalTasks = totalFromAPI ?? tasks.length;
  const doneCount = groupByStatus['DONE']?.length || 0;
  const doingCount = groupByStatus['DOING']?.length || 0;
  const todoCount = groupByStatus['TODO']?.length || 0;

  const progressByStatus = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
  const progressByDate = useMemo(() => progressFromDates(project?.startDate, project?.endDate), [project]);
  const overallProgress = totalTasks ? progressByStatus : progressByDate;

  const workload = useMemo(() => {
    const map = new Map();
    tasks.forEach(t => t?.TaskAssignees?.forEach(a => {
      const key = a?.User?.name || a?.userId || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    }));
    return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [tasks]);

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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Stats • {project?.name || 'Loading...'}</h1>
              <p className="text-sm text-slate-500">ภาพรวมความคืบหน้าและสถิติของโครงการ</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setAuto(!auto)} 
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                auto ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-white border-slate-200 text-slate-400"
              )}
            >
              AUTO SYNC: {auto ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => refresh()} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition font-medium text-sm">
              <ArrowPathIcon className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              Refresh Data
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm font-bold uppercase tracking-widest">Generating Insights...</span>
          </div>
        ) : (
          <>
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Tasks" value={fmtInt(totalTasks)} icon={ClipboardDocumentListIcon} color="bg-indigo-50 text-indigo-600" />
              <StatCard label="Completed" value={fmtInt(doneCount)} sub={`${progressByStatus}% of all tasks`} icon={CheckCircleIcon} color="bg-emerald-50 text-emerald-600" />
              <StatCard label="In Progress" value={fmtInt(doingCount)} icon={ClockIcon} color="bg-sky-50 text-sky-600" />
              <StatCard label="Team Capacity" value={fmtInt(workload.length)} sub="Active contributors" icon={UserGroupIcon} color="bg-violet-50 text-violet-600" />
            </div>

            {/* Progress & Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProgressCard value={overallProgress} label="Overall Progress" sub={`Based on status completion`} />
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Timeline</p>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{progressByDate}% Time Elapsed</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1 border-r border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Start Date</p>
                    <p className="text-lg font-black text-slate-800">{fmtDate(project?.startDate)}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Due Date</p>
                    <p className="text-lg font-black text-slate-800">{fmtDate(project?.endDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workload & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-indigo-500" /> Member Workload
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Top 5 Performers</span>
                </div>
                <div className="space-y-5">
                  {workload.map((w, idx) => {
                    const pct = totalTasks ? Math.round((w.count / totalTasks) * 100) : 0;
                    return (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-bold text-slate-700">{w.name}</span>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{w.count} Tasks</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full group-hover:bg-indigo-600 transition-colors" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {!workload.length && <p className="text-center text-slate-400 py-8 italic">No active workload data</p>}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest text-slate-400">Status Distribution</h3>
                <div className="space-y-3">
                  {Object.keys(groupByStatus).map(s => (
                    <div key={s} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-bold text-slate-600">{s}</span>
                      <span className="text-lg font-black text-slate-900">{groupByStatus[s]?.length || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Recent Task Activities</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest 10 Tasks</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-slate-50">
                      <th className="px-6 py-4">Task Info</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Assignee</th>
                      <th className="px-6 py-4 text-right">Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tasks.slice(0, 10).map((t) => {
                      const col = statusById.get(String(t.statusId));
                      const statusCode = col?.status || '—';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800 text-sm">{t.title || '-'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{col?.name || '-'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              'px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider',
                              statusCode === 'DONE' ? 'bg-emerald-100 text-emerald-600' : 
                              statusCode === 'DOING' ? 'bg-sky-100 text-sky-600' : 
                              statusCode === 'REVIEW' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                            )}>
                              {statusCode}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">{assigneeNames(t)}</td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">{t.position ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
