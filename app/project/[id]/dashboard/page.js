'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getbyProjectDashboad } from '@/action/api';
import { useParams } from 'next/navigation';

/* ============================== helpers ============================== */
const cn = (...c) => c.filter(Boolean).join(' ');
const fmtInt = (n) => Number(n || 0).toLocaleString('th-TH');
const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric', month: 'short', day: '2-digit',
  }).format(d);
};
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** คำนวณเปอร์เซ็นต์ความคืบหน้าจากช่วงเวลาเริ่ม-จบ (ถ้าไม่มี endDate ใช้วันนี้แทน) */
function progressFromDates(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  const now = Date.now();
  if (e <= s) return 100;
  const p = clamp01((now - s) / (e - s));
  return Math.round(p * 100);
}

/** รวมรายชื่อผู้รับผิดชอบ (TaskAssignees) -> string สั้นๆ */
function assigneeNames(task) {
  if (!task?.TaskAssignees?.length) return '-';
  const names = task.TaskAssignees.map(a => a?.User?.name || a?.userId).filter(Boolean);
  const uniq = [...new Set(names)];
  if (uniq.length <= 3) return uniq.join(', ');
  return `${uniq.slice(0, 3).join(', ')} +${uniq.length - 3}`;
}

/* ============================== main ============================== */
export default function DashboardPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [auto, setAuto] = useState(true);
  const intervalRef = useRef(null);

  const refresh = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      setError(null);
      const res = await getbyProjectDashboad(id);
      // คาดว่า API คืนรูปแบบตามที่ผู้ใช้แนบมา:
      // { message, data: { project, kanban[], tasks[], totalTasks } }
      setPayload(res?.data || res); // รองรับทั้ง {data:{...}} หรือ {...}
    } catch (e) {
      console.error(e);
      setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [id]);

  useEffect(() => {
    if (auto) {
      // รีเฟรชอัตโนมัติทุก ๆ 60 วินาที (เงียบๆ)
      intervalRef.current = setInterval(() => refresh(true), 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auto, id]);

  /* ============================== derived data ============================== */
  const {
    project,
    kanban = [],
    tasks = [],
    totalTasks: totalFromAPI,
  } = payload || {};

  // map statusId -> column object
  const statusById = useMemo(() => {
    const map = new Map();
    for (const k of kanban) map.set(String(k.id), k); // id เป็น string ในตัวอย่าง
    return map;
  }, [kanban]);

  // กลุ่มงานตาม status code (จาก column.status) และชื่อไทย (จาก column.name)
  const groupByStatus = useMemo(() => {
    const out = {};
    for (const t of tasks) {
      const col = statusById.get(String(t.statusId));
      const key = col?.status || 'UNKNOWN';
      if (!out[key]) out[key] = [];
      out[key].push(t);
    }
    return out;
  }, [tasks, statusById]);

  const allStatusKeys = useMemo(() => {
    // ใช้ status ที่โผล่จากข้อมูลจริง เพื่อไม่ล็อคไว้ที่ TODO/DOING/REVIEW/DONE
    const s = new Set();
    for (const k of kanban) if (k?.status) s.add(k.status);
    for (const k of Object.keys(groupByStatus)) s.add(k);
    return Array.from(s);
  }, [kanban, groupByStatus]);

  const totalTasks = totalFromAPI ?? tasks.length;
  const doneCount = groupByStatus['DONE']?.length || 0;
  const doingCount = groupByStatus['DOING']?.length || 0;
  const todoCount = groupByStatus['TODO']?.length || 0;
  const reviewCount = groupByStatus['REVIEW']?.length || 0;

  // ความคืบหน้าโดยรวม (จากสถานะ) ถ้าไม่มี DONE ให้ประเมินจากช่วงเวลาโครงการ
  const progressByStatus = totalTasks ? Math.round((doneCount / Math.max(1, totalTasks)) * 100) : 0;
  const progressByDate = useMemo(
    () => progressFromDates(project?.startDate, project?.endDate),
    [project?.startDate, project?.endDate]
  );
  const overallProgress = totalTasks ? progressByStatus : progressByDate;

  // จำนวนสมาชิกที่อยู่ในบอร์ด
  const uniqueMembers = useMemo(() => {
    const ids = new Set();
    for (const c of kanban) {
      for (const m of (c?.members || [])) ids.add(m?.id || m?.name);
    }
    return ids.size;
  }, [kanban]);

  // การกระจายงานต่อผู้รับผิดชอบ (top 5)
  const workload = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      for (const a of (t?.TaskAssignees || [])) {
        const key = a?.User?.name || a?.userId || 'unknown';
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    const arr = Array.from(map, ([name, count]) => ({ name, count }));
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 5);
  }, [tasks]);

  /* ============================== UI bits ============================== */
  const StatCard = ({ label, value, sub }) => (
    <div className="rounded-2xl bg-white p-5 border shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );

  const Progress = ({ value, caption }) => (
    <div className="rounded-2xl bg-white p-5 border shadow-sm">
      <div className="text-sm text-gray-500 mb-2">{caption}</div>
      <div className="w-full rounded-full bg-gray-100 h-3">
        <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-2 text-sm">{value}%</div>
    </div>
  );

  const StatusChip = ({ s, count }) => (
    <div className="rounded-xl border p-3 bg-white/60">
      <div className="text-xs text-gray-500">{s}</div>
      <div className="text-xl font-semibold">{fmtInt(count)}</div>
    </div>
  );

  const Shimmer = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-gray-200 rounded"></div>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="h-24 bg-gray-200 rounded-2xl"></div>
        <div className="h-24 bg-gray-200 rounded-2xl"></div>
        <div className="h-24 bg-gray-200 rounded-2xl"></div>
        <div className="h-24 bg-gray-200 rounded-2xl"></div>
      </div>
      <div className="h-56 bg-gray-200 rounded-2xl"></div>
    </div>
  );

  const Header = () => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm text-gray-500">Project</div>
        <h1 className="text-2xl font-bold">
          {project?.name || '—'}{' '}
          <span className="text-sm font-normal text-gray-500">
            #{project?.id || '-'}
          </span>
        </h1>
        <div className="text-xs text-gray-500">
          {fmtDate(project?.startDate)} – {fmtDate(project?.endDate)}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className={cn(
            'px-3 py-2 rounded-xl border text-sm',
            auto ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white'
          )}
          onClick={() => setAuto((v) => !v)}
          title="Auto refresh ทุก 60 วินาที"
        >
          {auto ? 'Auto refresh: ON' : 'Auto refresh: OFF'}
        </button>
        <button
          className="px-3 py-2 rounded-xl border bg-white text-sm hover:bg-gray-50 disabled:opacity-60"
          onClick={() => refresh()}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Header />
        <Shimmer />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Header />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 p-4">
          เกิดข้อผิดพลาด: {String(error)}
        </div>
      ) : null}

      {/* ===== KPIs ===== */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label="งานทั้งหมด" value={fmtInt(totalTasks)} />
        <StatCard label="งานที่เสร็จแล้ว" value={fmtInt(doneCount)} sub={`${Math.round((doneCount / Math.max(1, totalTasks)) * 100)}% ของทั้งหมด`} />
        <StatCard label="งานที่กำลังทำ" value={fmtInt(doingCount)} />
        <StatCard label="สมาชิกในบอร์ด" value={fmtInt(uniqueMembers)} />
      </div>

      {/* ===== Progress ===== */}
      <div className="grid md:grid-cols-2 gap-4">
        <Progress value={overallProgress} caption="ความคืบหน้าโดยรวม" />
        <div className="rounded-2xl bg-white p-5 border shadow-sm">
          <div className="text-sm text-gray-500 mb-2">ข้อมูลโครงการ</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">เริ่ม</div>
            <div className="font-medium">{fmtDate(project?.startDate)}</div>
            <div className="text-gray-500">สิ้นสุด</div>
            <div className="font-medium">{fmtDate(project?.endDate)}</div>
            <div className="text-gray-500">ประเมินเวลา</div>
            <div className="font-medium">{progressByDate}% ผ่านไป</div>
          </div>
        </div>
      </div>

      {/* ===== Status Buckets ===== */}
      <div className="rounded-2xl bg-white p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">งานคงค้างตามสถานะ</div>
          <div className="text-xs text-gray-400">
            รวม {fmtInt(totalTasks)} งาน • สถานะ {allStatusKeys.join(', ')}
          </div>
        </div>
        <ul className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {allStatusKeys.map((s) => (
            <li key={s}>
              <StatusChip s={s} count={groupByStatus[s]?.length || 0} />
            </li>
          ))}
        </ul>
      </div>

      {/* ===== Workload mini-bar ===== */}
      <div className="rounded-2xl bg-white p-5 border shadow-sm">
        <div className="text-sm text-gray-500 mb-4">งานต่อคน (Top 5)</div>
        {workload.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่พบผู้รับผิดชอบ</div>
        ) : (
          <div className="space-y-3">
            {workload.map((w, idx) => {
              const pct = totalTasks ? Math.round((w.count / totalTasks) * 100) : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="font-medium">{w.name}</div>
                    <div className="text-gray-600">
                      {fmtInt(w.count)} งาน · {pct}%
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Tasks table ===== */}
      <div className="rounded-2xl bg-white p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">รายการงานล่าสุด</div>
          <div className="text-xs text-gray-400">
            แสดง {Math.min(10, tasks.length)} จาก {fmtInt(tasks.length)} งาน
          </div>
        </div>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 w-16">#</th>
                <th className="text-left p-3">ชื่องาน</th>
                <th className="text-left p-3">สถานะ</th>
                <th className="text-left p-3">คอลัมน์</th>
                <th className="text-left p-3">ผู้รับผิดชอบ</th>
                <th className="text-left p-3 text-right">ลำดับ</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 10).map((t) => {
                const col = statusById.get(String(t.statusId));
                const statusCode = col?.status || '—';
                return (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 text-gray-500">{t.id}</td>
                    <td className="p-3">
                      <div className="font-medium">{t.title || '-'}</div>
                      {t.note ? (
                        <div className="text-xs text-gray-500 line-clamp-1">{t.note}</div>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs',
                          statusCode === 'DONE' && 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
                          statusCode === 'REVIEW' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
                          statusCode === 'DOING' && 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
                          statusCode === 'TODO' && 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
                          !['DONE','REVIEW','DOING','TODO'].includes(statusCode) && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                        )}
                      >
                        {statusCode}
                      </span>
                    </td>
                    <td className="p-3">{col?.name || '-'}</td>
                    <td className="p-3">{assigneeNames(t)}</td>
                    <td className="p-3 text-right">{t.position ?? '-'}</td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={6}>ไม่มีงานในโปรเจกต์นี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Kanban overview (columns) ===== */}
      <div className="rounded-2xl bg-white p-5 border shadow-sm">
        <div className="text-sm text-gray-500 mb-3">บอร์ด/คอลัมน์</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kanban.map((k) => {
            const count = tasks.filter(t => String(t.statusId) === String(k.id)).length;
            return (
              <div key={k.id} className="rounded-xl border p-4 bg-white/60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">{k.status || '-'}</div>
                    <div className="text-lg font-semibold">{k.name || '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{fmtInt(count)}</div>
                    <div className="text-xs text-gray-500">งานในคอลัมน์</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  สมาชิก: {k.members?.length ? k.members.map(m => m.name).join(', ') : '-'}
                </div>
              </div>
            );
          })}
          {kanban.length === 0 && (
            <div className="text-sm text-gray-500">ยังไม่มีคอลัมน์ในบอร์ด</div>
          )}
        </div>
      </div>
    </div>
  );
}
