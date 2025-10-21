'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import dayjs from 'dayjs'
import { useParams } from 'next/navigation'
import { getbyProjectGattId } from '@/action/api'
import * as XLSX from 'xlsx'
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
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [project, setProject] = useState(null)
  const [rawTasks, setRawTasks] = useState([])

  // filters & view
  const [view, setView] = useState('WEEK') // DAY | WEEK | MONTH
  const [q, setQ] = useState('')
  const [assigneeId, setAssigneeId] = useState('ALL')
  const [tab, setTab] = useState('TIMELINE') // TIMELINE | TABLE

  useEffect(() => { refresh() }, [id])

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await getbyProjectGattId(id)
      const pj = Array.isArray(res?.data) ? res.data[0] : null
      if (!pj) {
        setProject(null); setRawTasks([]); setError('ไม่พบโครงการ')
      } else {
        setProject(pj); setRawTasks(pj.Tasks || [])
      }
    } catch (e) {
      console.error(e)
      setError(e?.message || 'ดึงข้อมูลล้มเหลว'); setProject(null); setRawTasks([])
    } finally { setLoading(false) }
  }, [id])

  /* ---------- options for assignee filter ---------- */
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

  /* ---------- build derived dataset ---------- */
  const today = dayjs()
  const filteredTasks = useMemo(() => {
    return (rawTasks || []).filter(t => {
      const hitQ = q.trim()
        ? (t.title?.toLowerCase().includes(q.toLowerCase())
          || t.note?.toLowerCase?.().includes(q.toLowerCase())
          || t.Remark?.toLowerCase?.().includes(q.toLowerCase()))
        : true
      const hitAssignee = assigneeId !== 'ALL'
        ? (t.TaskAssignees || []).some(a => a?.User?.id === assigneeId)
        : true
      return hitQ && hitAssignee
    })
  }, [rawTasks, q, assigneeId])

  // enrich for table
  const tableRows = useMemo(() => {
    return filteredTasks.map((t, idx) => {
      const start = safeStart(t.startDate)
      const end = safeEnd(t.dueDate)
      const totalDays = diffDaysInclusive(start, end) || 1
      const passedDays = clamp(today.diff(dayjs(start), 'day') + 1, 0, totalDays)
      const progressPct = clamp(Math.round((passedDays / totalDays) * 100), 0, 100)
      const assignees = (t.TaskAssignees || []).map(a => a?.User).filter(Boolean)

      const status = end < today.valueOf() && progressPct < 100 ? 'overdue'
        : today.valueOf() >= start && today.valueOf() <= end ? 'inprogress'
          : 'upcoming'

      return {
        _i: idx,
        title: t.title || `Task #${idx + 1}`,
        start,
        due: end,
        days: totalDays,
        progress: progressPct,
        assignees,
        note: t.note ?? '',
        remark: t.Remark ?? '',
        status
      }
    })
  }, [filteredTasks, today])

  // quick stats
  const stats = useMemo(() => {
    const total = tableRows.length
    const inprogress = tableRows.filter(r => r.status === 'inprogress').length
    const upcoming = tableRows.filter(r => r.status === 'upcoming').length
    const overdue = tableRows.filter(r => r.status === 'overdue').length
    return { total, inprogress, upcoming, overdue }
  }, [tableRows])

  /* ---------- chart series & options ---------- */
  const { series, options } = useMemo(() => {
    const projStart = project?.startDate ? safeStart(project.startDate) : null
    const projEnd = project?.endDate ? safeEnd(project.endDate) : null
    const padDays = view === 'DAY' ? 3 : view === 'WEEK' ? 14 : 45
    const minX = (projStart ?? (tableRows[0]?.start || dayjs().startOf('month').valueOf())) - padDays * 86400000
    const maxX = (projEnd ?? (tableRows[0]?.due || dayjs().endOf('month').valueOf())) + padDays * 86400000

    const data = tableRows.map((r, idx) => {
      const progressPos = r.start + (r.due - r.start) * (r.progress / 100)
      return {
        x: r.title,
        y: [r.start, r.due],
        fillColor: colorByIndex(idx),
        goals: [{
          name: `Progress ${r.progress}%`,
          value: progressPos,
          strokeColor: '#0f172a',
          strokeWidth: 2,
          strokeDashArray: 2
        }],
        meta: {
          assignees: r.assignees,
          note: r.note,
          remark: r.remark,
          progressPct: r.progress,
          start: r.start,
          end: r.due,
        }
      }
    })

    const series = [{ name: 'Tasks', data }]
    const options = {
      chart: { type: 'rangeBar', height: 560, toolbar: { show: false }, foreColor: '#334155' },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 10, barHeight: '65%', rangeBarGroupRows: false }
      },
      grid: { borderColor: '#e5e7eb', strokeDashArray: 3, padding: { left: 12, right: 12, top: 10, bottom: 10 } },
      xaxis: {
        type: 'datetime', min: minX, max: maxX,
        labels: { datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM' }, style: { fontSize: '12px' } },
        axisBorder: { color: '#e5e7eb' }, axisTicks: { color: '#e5e7eb' }
      },
      yaxis: { labels: { style: { fontSize: '12px', colors: '#0f172a' } } },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: {
        theme: 'light',
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          try {
            const d = w.config.series[seriesIndex].data[dataPointIndex]
            const m = d.meta || {}
            const people = (m.assignees || []).map(u => `<span class="px-2 py-0.5 rounded-full border border-slate-200 text-[11px]">${(u?.name) || u?.email}</span>`).join(' ')
            const note = m.note ? `<div class="mt-2 text-[12px]">📝 ${escapeHtml(m.note)}</div>` : ''
            const remark = m.remark ? `<div class="mt-1 text-[12px]">💬 ${escapeHtml(m.remark)}</div>` : ''
            return `
              <div style="padding:10px;max-width:320px">
                <div style="font-weight:600;color:#0f172a">${escapeHtml(d.x)}</div>
                <div style="margin-top:4px;color:#334155;font-size:12px">
                  📅 ${fmt(m.start)} – ${fmt(m.end)}
                </div>
                <div style="margin-top:4px;color:#334155;font-size:12px">
                  ✅ ความคืบหน้า: ${m.progressPct}%
                </div>
                ${people ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${people}</div>` : ''}
                ${note}${remark}
              </div>
            `
          } catch { return '' }
        }
      },
      // Today line
      annotations: {
        xaxis: [{
          x: dayjs().startOf('day').valueOf(),
          strokeDashArray: 4,
          borderColor: '#ef4444',
          label: { text: 'Today', style: { background: '#ef4444', color: '#fff', fontSize: '10px' } }
        }]
      },
      states: { hover: { filter: { type: 'lighten', value: .05 } }, active: { filter: { type: 'darken', value: .10 } } },
      fill: { opacity: .95 },
      theme: { mode: 'light' }
    }
    return { series, options }
  }, [tableRows, project, view])

  /* ---------- table sort / paging / export ---------- */
  const [sortKey, setSortKey] = useState('start') // start | due | title | progress | days | status
  const [sortDir, setSortDir] = useState('asc')   // asc | desc
  const [page, setPage] = useState(1)
  const pageSize = 8

  const sortedRows = useMemo(() => {
    const rows = [...tableRows]
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'title' || sortKey === 'status') {
        va = String(va || ''); vb = String(vb || '')
        return va.localeCompare(vb) * dir
      }
      return (va - vb) * dir
    })
    return rows
  }, [tableRows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const pageRows = useMemo(() => {
    const startIdx = (page - 1) * pageSize
    return sortedRows.slice(startIdx, startIdx + pageSize)
  }, [sortedRows, page])

  const onSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const exportExcel = () => {
    // เตรียมข้อมูลจากตารางที่เรียงแล้ว (sortedRows) เพื่อส่งออก
    const rows = sortedRows.map(r => ({
      Title: r.title || '',
      Start: new Date(r.start),                     // ให้เป็น Date object เพื่อให้ Excel รู้ว่าเป็นวันที่
      Due: new Date(r.due),
      Days: r.days,
      'Progress(%)': r.progress,
      Assignees: (r.assignees || [])
        .map(u => (u?.name || u?.email || '')).join(' | '),
      Note: r.note || '',
      Remark: r.remark || '',
      Status: r.status || ''
    }))

    // แปลงเป็น worksheet (ให้ Excelเก็บชนิดเป็นวันที่จริง)
    const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true })

    // จัดความกว้างคอลัมน์ให้อ่านง่าย
    ws['!cols'] = [
      { wch: 32 }, // Title
      { wch: 12 }, // Start
      { wch: 12 }, // Due
      { wch: 10 }, // Days
      { wch: 12 }, // Progress(%)
      { wch: 28 }, // Assignees
      { wch: 30 }, // Note
      { wch: 30 }, // Remark
      { wch: 12 }, // Status
    ]

    // กำหนดรูปแบบวันที่ (ฝั่งไฟล์) – community เวอร์ชันจะอ่านได้โดย Excel อยู่แล้ว
    // ถ้าต้องการบังคับให้ทุกเซลล์วันที่แสดง dd mmm yyyy:
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let C of [1, 2]) { // คอลัมน์ Start(1), Due(2)
      for (let R = range.s.r + 1; R <= range.e.r; R++) { // ข้ามหัวตารางแถวแรก
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (ws[addr] && ws[addr].t === 'd') ws[addr].z = 'dd mmm yyyy'
      }
    }

    // สร้าง workbook และบันทึกไฟล์ .xlsx
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, (project?.name || 'Project').slice(0, 31)) // ชื่อชีทไม่เกิน 31 ตัว
    XLSX.writeFile(wb, `${project?.name || 'project'}-tasks.xlsx`, { cellDates: true })
  }


  const printTable = () => {
    window.print()
  }

  /* ============================== UI ============================== */
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-white to-[#f8fafc] text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow"></div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">📊 แผนงาน • {project?.name || 'โครงการ'}</h1>
                <p className="text-sm text-slate-500">สวยขึ้น ใช้ง่ายขึ้น ใช้ข้อมูลจริงจาก API</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented value={view} onChange={setView} />
              <button onClick={refresh} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                {loading ? 'กำลังรีเฟรช…' : 'รีเฟรช'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="ค้นหาชื่องาน / โน้ต / หมายเหตุ…"
                className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch />
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2 items-center">
              <AssigneeSelect value={assigneeId} onChange={(v) => { setAssigneeId(v); setPage(1) }} options={assigneeOptions} />
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                วันนี้: <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> เส้นสีแดงในกราฟ
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="งานทั้งหมด" value={stats.total} badge="ALL" />
            <StatCard label="กำลังทำ" value={stats.inprogress} badge="In Progress" color="emerald" />
            <StatCard label="ใกล้กำหนด/รอเริ่ม" value={stats.upcoming} badge="Upcoming" color="indigo" />
            <StatCard label="เกินกำหนด" value={stats.overdue} badge="Overdue" color="rose" />
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            <TabBtn active={tab === 'TIMELINE'} onClick={() => setTab('TIMELINE')}>Timeline</TabBtn>
            <TabBtn active={tab === 'TABLE'} onClick={() => setTab('TABLE')}>Table</TabBtn>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && <Alert tone="error" title="เกิดข้อผิดพลาด" desc={error} />}

        {/* TIMELINE */}
        {tab === 'TIMELINE' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,.06)] overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-medium">ตารางแผนงาน (Timeline)</div>
              <div className="text-xs text-slate-500">มุมมอง: <b>{view}</b></div>
            </div>
            <div className="p-2">
              {loading ? <Skeleton /> : <ReactApexChart type="rangeBar" height={560} series={series} options={options} />}
            </div>
          </div>
        )}

        {/* TABLE */}
        {tab === 'TABLE' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(0,0,0,.06)] overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-medium">ตารางข้อมูลงาน</div>
              <div className="flex items-center gap-2">
                {/* ลบปุ่ม CSV เดิมทิ้งได้ */}
                <button
                  onClick={exportExcel}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Export Excel (.xlsx)
                </button>
                <button onClick={printTable} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                  Print
                </button>
              </div>

            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-slate-600">
                    <Th label="งาน" onClick={() => onSort('title')} active={sortKey === 'title'} dir={sortDir} />
                    <Th label="เริ่ม" onClick={() => onSort('start')} active={sortKey === 'start'} dir={sortDir} />
                    <Th label="สิ้นสุด" onClick={() => onSort('due')} active={sortKey === 'due'} dir={sortDir} />
                    <Th label="วันทั้งหมด" onClick={() => onSort('days')} active={sortKey === 'days'} dir={sortDir} align="right" />
                    <Th label="%คืบหน้า" onClick={() => onSort('progress')} active={sortKey === 'progress'} dir={sortDir} align="right" />
                    <Th label="ผู้รับผิดชอบ" />
                    <Th label="หมายเหตุ" />
                    <Th label="หมายเหตุย่อย" />
                    <Th label="สถานะ" onClick={() => onSort('status')} active={sortKey === 'status'} dir={sortDir} />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" className="p-6 text-center"><Skeleton /></td></tr>
                  ) : pageRows.length === 0 ? (
                    <tr><td colSpan="9" className="p-6 text-center text-slate-500">ไม่มีข้อมูลตรงตามเงื่อนไข</td></tr>
                  ) : (
                    pageRows.map((r, i) => (
                      <tr key={`${r._i}-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{r.title}</td>
                        <td className="p-3">{fmt(r.start)}</td>
                        <td className="p-3">{fmt(r.due)}</td>
                        <td className="p-3 text-right">{r.days.toLocaleString('th-TH')}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span>{r.progress}%</span>
                            <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-2 bg-indigo-500" style={{ width: `${r.progress}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(r.assignees || []).map(u => (
                              <span key={u?.id} className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[12px]">
                                {u?.name || u?.email}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">{r.note || '-'}</td>
                        <td className="p-3">{r.remark || '-'}</td>
                        <td className="p-3">
                          <StatusPill status={r.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                แสดง {Math.min((page - 1) * pageSize + 1, sortedRows.length)}–{Math.min(page * pageSize, sortedRows.length)} จาก {sortedRows.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>ก่อนหน้า</button>
                <div className="text-sm">{page} / {totalPages}</div>
                <button className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>ถัดไป</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/* ============================== UI Bits ============================== */
function Segmented({ value, onChange }) {
  const Btn = (label, v) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      className={[
        'px-3 py-2 text-sm font-medium transition border first:rounded-l-xl last:rounded-r-xl',
        value === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
      ].join(' ')}
    >{label}</button>
  )
  return (
    <div className="inline-flex rounded-xl overflow-hidden">
      {Btn('DAY', 'DAY')}
      {Btn('WEEK', 'WEEK')}
      {Btn('MONTH', 'MONTH')}
    </div>
  )
}

function Th({ label, onClick, active, dir, align = 'left' }) {
  return (
    <th
      onClick={onClick}
      className={`p-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
      title="คลิกเพื่อเรียง"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (dir === 'asc' ? <ArrowUp /> : <ArrowDown />) : <ArrowSort />}
      </span>
    </th>
  )
}

function StatusPill({ status }) {
  const map = {
    inprogress: { text: 'กำลังทำ', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    upcoming: { text: 'ใกล้กำหนด/รอเริ่ม', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    overdue: { text: 'เกินกำหนด', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  }
  const m = map[status] || { text: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] ${m.cls}`}>{m.text}</span>
}

function StatCard({ label, value, badge, color = 'slate' }) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(0,0,0,.04)]">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 flex items-end justify-between">
        <div className="text-2xl font-bold">{value.toLocaleString('th-TH')}</div>
        <span className={`text-xs rounded-full px-2 py-0.5 border ${colorMap[color] || colorMap.slate}`}>{badge}</span>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 text-sm rounded-xl border transition',
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function AssigneeSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm pr-8 outline-none focus:border-indigo-400"
      >
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
        <IconChevronDown />
      </div>
    </div>
  )
}

function Alert({ tone = 'neutral', title, desc }) {
  const cls = tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-slate-200 bg-white text-slate-700'
  const Icon = tone === 'error' ? IconAlert : IconInfo
  return (
    <div className={`mb-4 rounded-2xl border px-4 py-4 ${cls}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-6 w-6 rounded-lg grid place-items-center bg-slate-100 text-slate-600">
          <Icon />
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm opacity-80">{desc}</div>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-100 rounded mb-2" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-7 bg-slate-100 rounded my-2" />
      ))}
      <div className="h-8 bg-slate-100 rounded mt-2" />
    </div>
  )
}

/* ============================== Icons ============================== */
function IconSearch() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 21l-3.7-3.7M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
function IconChevronDown() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
function IconInfo() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8h.01M11 12h2v4h-2z" fill="currentColor" /></svg>) }
function IconAlert() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A1 1 0 0 0 2.62 20h18.76a1 1 0 0 0 .86-1.44L13.76 3.86a1 1 0 0 0-1.73 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
function ArrowSort() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 10l5-5 5 5M7 14l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
function ArrowUp() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
function ArrowDown() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
