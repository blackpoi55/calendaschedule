'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import dayjs from 'dayjs'
import { useParams, useRouter } from 'next/navigation'
import { getbyProjectGattId } from '@/action/api'
import * as XLSX from 'xlsx'
import { 
  ChevronLeftIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  TableCellsIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

/* ============================== helpers ============================== */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
const COLORS = ['#6366f1', '#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#a855f7', '#10b981', '#3b82f6', '#e11d48', '#14b8a6', '#f97316']
const colorByIndex = (i) => COLORS[i % COLORS.length]
const fmt = (d, f = 'DD MMM YYYY') => (d ? dayjs(d).format(f) : '-')
const safeStart = (d) => {
  const m = dayjs(d)
  return (m.isValid() ? m.startOf('day') : dayjs().startOf('day')).valueOf()
}
const safeEnd = (d) => {
  const m = dayjs(d)
  return (m.isValid() ? m.endOf('day') : dayjs().endOf('day')).valueOf()
}
const diffDaysInclusive = (start, end) => {
  const s = dayjs(start).startOf('day')
  const e = dayjs(end).endOf('day')
  const d = e.diff(s, 'day') + 1
  return d < 0 ? 0 : d
}
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))

/* ============================== main ============================== */
export default function ProjectTimelinePage() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [project, setProject] = useState(null)
  const [rawTasks, setRawTasks] = useState([])

  const [view, setView] = useState('WEEK')
  const [q, setQ] = useState('')
  const [assigneeId, setAssigneeId] = useState('ALL')
  const [tab, setTab] = useState('TIMELINE')

  useEffect(() => { refresh() }, [id])

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await getbyProjectGattId(id)
      const pj = Array.isArray(res?.data) ? res.data[0] : null
      if (!pj) {
        setError('ไม่พบโครงการ')
      } else {
        setProject(pj); setRawTasks(pj.Tasks || [])
      }
    } catch (e) {
      setError(e?.message || 'ดึงข้อมูลล้มเหลว')
    } finally { setLoading(false) }
  }, [id])

  const assigneeOptions = useMemo(() => {
    const map = new Map()
    for (const t of rawTasks) {
      for (const a of (t.TaskAssignees || [])) {
        const u = a?.User
        if (u?.id && !map.has(u.id)) map.set(u.id, { id: u.id, name: u.name || u.email || `User #${u.id}` })
      }
    }
    return [{ id: 'ALL', name: 'ผู้รับผิดชอบทั้งหมด' }, ...[...map.values()]]
  }, [rawTasks])

  const today = dayjs()
  const tableRows = useMemo(() => {
    return (rawTasks || []).filter(t => {
      const hitQ = q.trim() ? (t.title?.toLowerCase().includes(q.toLowerCase()) || t.note?.toLowerCase?.().includes(q.toLowerCase())) : true
      const hitAssignee = assigneeId !== 'ALL' ? (t.TaskAssignees || []).some(a => a?.User?.id === assigneeId) : true
      return hitQ && hitAssignee
    }).map((t, idx) => {
      const start = safeStart(t.startDate)
      const end = safeEnd(t.dueDate)
      const totalDays = diffDaysInclusive(start, end) || 1
      const passedDays = clamp(today.diff(dayjs(start), 'day') + 1, 0, totalDays)
      const progressPct = clamp(Math.round((passedDays / totalDays) * 100), 0, 100)
      const assignees = (t.TaskAssignees || []).map(a => a?.User).filter(Boolean)
      const status = end < today.valueOf() && progressPct < 100 ? 'overdue' : today.valueOf() >= start && today.valueOf() <= end ? 'inprogress' : 'upcoming'
      return { _i: idx, title: t.title || `Task #${idx + 1}`, start, due: end, days: totalDays, progress: progressPct, assignees, status }
    })
  }, [rawTasks, q, assigneeId, today])

  const stats = useMemo(() => {
    return {
      total: tableRows.length,
      inprogress: tableRows.filter(r => r.status === 'inprogress').length,
      upcoming: tableRows.filter(r => r.status === 'upcoming').length,
      overdue: tableRows.filter(r => r.status === 'overdue').length
    }
  }, [tableRows])

  const { series, options } = useMemo(() => {
    const projStart = project?.startDate ? safeStart(project.startDate) : null
    const projEnd = project?.endDate ? safeEnd(project.endDate) : null
    const padDays = view === 'DAY' ? 3 : view === 'WEEK' ? 14 : 45
    const minX = (projStart ?? (tableRows[0]?.start || dayjs().startOf('month').valueOf())) - padDays * 86400000
    const maxX = (projEnd ?? (tableRows[0]?.due || dayjs().endOf('month').valueOf())) + padDays * 86400000

    const data = tableRows.map((r, idx) => ({
      x: r.title,
      y: [r.start, r.due],
      fillColor: colorByIndex(idx),
      meta: { progressPct: r.progress, start: r.start, end: r.due }
    }))

    return {
      series: [{ name: 'Tasks', data }],
      options: {
        chart: { type: 'rangeBar', height: 500, toolbar: { show: false }, fontFamily: 'Sarabun, sans-serif' },
        plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '70%' } },
        xaxis: { type: 'datetime', min: minX, max: maxX, labels: { style: { colors: '#64748b', fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: '#1e293b', fontSize: '12px', fontWeight: 600 } } },
        grid: { borderColor: '#f1f5f9' },
        tooltip: { theme: 'light' },
        annotations: {
          xaxis: [{ x: dayjs().startOf('day').valueOf(), borderColor: '#ef4444', label: { text: 'TODAY', style: { background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700 } } }]
        }
      }
    }
  }, [tableRows, project, view])

  const exportExcel = () => {
    const rows = tableRows.map(r => ({ Title: r.title, Start: fmt(r.start), Due: fmt(r.due), Progress: `${r.progress}%`, Status: r.status }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Timeline")
    XLSX.writeFile(wb, `${project?.name || 'Project'}-Timeline.xlsx`)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-xl transition border border-slate-200 shadow-sm">
              <ChevronLeftIcon className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Timeline • {project?.name || 'Loading...'}</h1>
              <p className="text-sm text-slate-500">จัดการแผนงานและติดตามความคืบหน้าด้วย Gantt Chart</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium text-sm">
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
            <button onClick={exportExcel} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition font-medium text-sm">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="งานทั้งหมด" value={stats.total} color="bg-slate-500" />
          <StatCard label="กำลังดำเนินการ" value={stats.inprogress} color="bg-emerald-500" />
          <StatCard label="รอการเริ่ม" value={stats.upcoming} color="bg-indigo-500" />
          <StatCard label="เกินกำหนด" value={stats.overdue} color="bg-rose-500" />
        </div>

        {/* View Controls & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['DAY', 'WEEK', 'MONTH'].map(v => (
                <button 
                  key={v} 
                  onClick={() => setView(v)} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex-1 relative w-full">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={q} 
                onChange={e => setQ(e.target.value)}
                placeholder="ค้นหาชื่องาน..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select 
              value={assigneeId} 
              onChange={e => setAssigneeId(e.target.value)}
              className="w-full lg:w-48 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {assigneeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button onClick={() => setTab('TIMELINE')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${tab === 'TIMELINE' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <CalendarDaysIcon className="w-5 h-5" /> Timeline View
            </button>
            <button onClick={() => setTab('TABLE')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${tab === 'TABLE' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <TableCellsIcon className="w-5 h-5" /> Table View
            </button>
          </div>

          <div className="p-4 md:p-6">
            {tab === 'TIMELINE' ? (
              <div className="min-h-[500px]">
                {loading ? <div className="h-[500px] flex items-center justify-center text-slate-400 animate-pulse">กำลังโหลดกราฟ...</div> : <ReactApexChart type="rangeBar" height={500} series={series} options={options} />}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-4 py-3">Task Name</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Progress</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-4 font-bold text-slate-700">{r.title}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{fmt(r.start)}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{fmt(r.due)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-xs font-bold text-slate-600">{r.progress}%</span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.progress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${r.status === 'overdue' ? 'bg-rose-100 text-rose-600' : r.status === 'inprogress' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {r.status === 'overdue' ? 'Overdue' : r.status === 'inprogress' ? 'In Progress' : 'Upcoming'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-2xl ${color} opacity-10 flex items-center justify-center`} />
    </div>
  )
}
