'use client'
import React, { useMemo, useState } from 'react'
import { Gantt, ViewMode } from "@wamra/gantt-task-react"; 
import dayjs from 'dayjs'
//import { Gantt, ViewMode } from 'gantt-task-react'
//import 'gantt-task-react/dist/index.css'

export default function GanttPage() {
  const [view, setView] = useState(ViewMode.Week)

  const tasks = useMemo(() => [
    {
      id: '1',
      name: 'กำหนดขอบเขต',
      start: dayjs().subtract(2, 'day').toDate(),
      end: dayjs().add(3, 'day').toDate(),
      type: 'task',
      progress: 60,
      project: 'P1'
    },
    {
      id: '2',
      name: 'ออกแบบฐานข้อมูล',
      start: dayjs().add(1, 'day').toDate(),
      end: dayjs().add(10, 'day').toDate(),
      type: 'task',
      progress: 20,
      project: 'P1'
    },
    {
      id: '3',
      name: 'พัฒนา API',
      start: dayjs().add(5, 'day').toDate(),
      end: dayjs().add(20, 'day').toDate(),
      type: 'task',
      progress: 0,
      project: 'P1',
      dependencies: ['2']
    },
    {
      id: '4',
      name: 'Frontend Login',
      start: dayjs().add(8, 'day').toDate(),
      end: dayjs().add(18, 'day').toDate(),
      type: 'task',
      progress: 0,
      project: 'P1',
      dependencies: ['3']
    }
  ], [])

  // ปุ่ม view mode แบบ segmented
  const Segmented = ({ value, onChange }) => {
    const btn = (label, enumVal) => {
      const active = value === enumVal
      return (
        <button
          type="button"
          onClick={() => onChange(enumVal)}
          className={[
            'px-3 py-1.5 text-sm font-medium transition',
            active
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50',
            'first:rounded-l-lg last:rounded-r-lg border',
            active ? 'border-purple-600' : 'border-gray-200'
          ].join(' ')}
        >
          {label}
        </button>
      )
    }
    return (
      <div className="inline-flex rounded-lg overflow-hidden">
        {btn('Day', ViewMode.Day)}
        {btn('Week', ViewMode.Week)}
        {btn('Month', ViewMode.Month)}
      </div>
    )
  }

  // Tooltip ภาษาไทย (กัน null)
  const Tooltip = ({ task }) => {
    if (!task) return null
    const fmt = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '-')
    return (
      <div className="p-2 text-xs">
        <div className="font-semibold text-gray-900">{task.name}</div>
        <div className="mt-0.5 text-gray-700">📅 {fmt(task.start)} – {fmt(task.end)}</div>
        {typeof task.progress === 'number' && (
          <div className="mt-0.5 text-gray-700">✅ ความคืบหน้า: {Math.round(task.progress)}%</div>
        )}
      </div>
    )
  }

  // ปรับขนาดคอลัมน์ตามมุมมอง
  const columnWidth = view === ViewMode.Month ? 300 : view === ViewMode.Week ? 200 : 65

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            📊 แผนงาน Gantt (Mock)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            สลับมุมมองได้ • ลากเวลาจากข้อมูล mock ทดสอบการแสดงผล
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Segmented value={view} onChange={setView} />
          <span className="hidden sm:inline text-xs text-gray-500">
            วันนี้: <span className="inline-block align-middle h-2 w-2 bg-red-500 rounded-full mr-1" /> เส้นสีแดง
          </span>
        </div>
      </div>

      {/* Legend / สถานะ */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <span className="h-2 w-2 rounded-full bg-gray-400" /><span className="text-xs text-gray-700">กำหนดขอบเขต</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-xs text-gray-700">ออกแบบฐานข้อมูล</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs text-gray-700">พัฒนา API</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-xs text-gray-700">Frontend Login</span>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">ตารางแผนงาน</div>
            <div className="text-xs text-gray-500">มุมมอง: <span className="font-semibold">{view}</span></div>
          </div>
        </div>

        <div className="p-2">
          <Gantt
            tasks={tasks}
            viewMode={view}
            listCellWidth="240"
            columnWidth={columnWidth}
            barCornerRadius={6}
            barFill={60}
            todayColor="#ef4444"      // red-500
            TooltipContent={Tooltip}
            ganttHeight={520}
          />
        </div>
      </div>

      {/* หมายเหตุเล็กๆ */}
      <p className="mt-3 text-xs text-gray-500">
        เคล็ดลับ: ปรับขนาดคอนเทนเนอร์ด้วยคลาส <code className="rounded bg-gray-100 px-1 py-0.5">max-w-7xl</code>, 
        ใช้ <code className="rounded bg-gray-100 px-1 py-0.5">rounded-2xl</code> + <code className="rounded bg-gray-100 px-1 py-0.5">shadow-sm</code> 
        เพื่อหน้าตาที่นุ่มนวลขึ้น
      </p>
    </div>
  )
}
