'use client'
import React, { useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay,
  PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ================= Mock / Constants =================
const INITIAL_STATUSES = [
  { key: 'TODO', label: 'To Do' },
  { key: 'DOING', label: 'Doing' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'DONE', label: 'Done' },
]

const STATUS_STYLES = {
  TODO: 'bg-gray-50 border-gray-200',
  DOING: 'bg-blue-50 border-blue-200',
  REVIEW: 'bg-amber-50 border-amber-200',
  DONE: 'bg-emerald-50 border-emerald-200',
}

// ใช้กับคอลัมน์ใหม่ที่ยังไม่มี style เฉพาะ
const DEFAULT_COL_STYLE = 'bg-slate-50 border-slate-200'

const initialTasks = [
  { id: 1, title: 'กำหนดขอบเขตโครงการ', status: 'TODO', position: 0, labels: ['PM'], assignee: 'Anong' },
  { id: 2, title: 'ออกแบบฐานข้อมูล', status: 'DOING', position: 0, labels: ['DB'], assignee: 'Somchai' },
  { id: 3, title: 'พัฒนา API /auth', status: 'DOING', position: 1, labels: ['API'], assignee: null },
  { id: 4, title: 'หน้า Login (Next.js)', status: 'REVIEW', position: 0, labels: ['FE'], assignee: 'Anong', due_date: new Date().toISOString().slice(0, 10) },
  { id: 5, title: 'ตั้ง CI/CD', status: 'DONE', position: 0, labels: ['DevOps'], assignee: 'Somchai' },
]

// ================= Utils =================
const byPos = (a, b) => a.position - b.position

const normalize = (items, statuses) => {
  const next = [...items]
  statuses.forEach(({ key }) => {
    const list = next.filter(t => t.status === key).sort(byPos)
    list.forEach((t, i) => {
      const idx = next.findIndex(n => n.id === t.id)
      next[idx] = { ...next[idx], position: i }
    })
  })
  return next
}

const groupByStatus = (items, statuses) => {
  const g = {}
  statuses.forEach(({ key }) => {
    g[key] = items.filter(i => i.status === key).sort(byPos)
  })
  return g
}

// ================= Drag Components =================
function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1
      }}
      {...attributes}
      {...listeners}
      className="rounded-xl border bg-white p-3 shadow-sm hover:shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-gray-900 leading-tight">{task.title}</h4>
        <span className="text-xs text-gray-400 select-none">#{task.id}</span>
      </div>
      {Array.isArray(task.labels) && task.labels.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span key={l} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{l}</span>
          ))}
        </div>
      ) : null}
      <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
        <span>👤 {task.assignee || '-'}</span>
        {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('th-TH')}</span>}
      </div>
    </div>
  )
}

// พื้นที่ drop สำหรับคอลัมน์ว่าง (แสดงเฉพาะเมื่อคอลัมน์ไม่มีการ์ด)
function EmptyDropZone({ id }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`min-h-[80px] rounded-md border border-dashed transition-all ${
        isOver ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-300 bg-transparent'
      }`}
    />
  )
}

function Column({
  status,
  label,
  tasks,
  styleClass,
  onAddTask,
  children
}) {
  return (
    <div className={`flex flex-col rounded-2xl border p-3 ${styleClass || DEFAULT_COL_STYLE} min-h-[320px]`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{tasks.length}</span>
          <button
            onClick={() => onAddTask(status)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-white/60"
            title="เพิ่มการ์ดในคอลัมน์นี้"
          >
            + เพิ่มการ์ด
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-2">{children}</div>
    </div>
  )
}

// ================= Page =================
export default function BoardPage() {
  const [statuses, setStatuses] = useState(INITIAL_STATUSES)
  const [items, setItems] = useState(normalize(initialTasks, statuses))
  const [activeId, setActiveId] = useState(null)

  const maxInitialId = initialTasks.length ? Math.max(...initialTasks.map(t => t.id)) : 0
  const nextTaskIdRef = useRef(maxInitialId + 1)
  const nextColIndexRef = useRef(1)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const cols = useMemo(() => groupByStatus(items, statuses), [items, statuses])
  const activeTask = useMemo(() => items.find(t => t.id === activeId) || null, [activeId, items])

  function onDragStart(e) {
    setActiveId(e.active.id)
  }

  function onDragEnd(e) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return

    const a = items.find(x => x.id === active.id)
    if (!a) return

    const next = [...items]
    const overTask = items.find(x => x.id === over.id)

    // ----- วางบนการ์ด -----
    if (overTask) {
      const from = a.status
      const to = overTask.status

      if (from === to) {
        // === รีออเดอร์ภายในคอลัมน์เดียวกัน ด้วย arrayMove ===
        const column = next.filter(t => t.status === from).sort(byPos)
        const oldIndex = column.findIndex(t => t.id === a.id)
        const newIndex = column.findIndex(t => t.id === overTask.id)
        const reordered = arrayMove(column, oldIndex, newIndex)

        // เขียนกลับตำแหน่งใหม่
        reordered.forEach((t, i) => {
          const k = next.findIndex(n => n.id === t.id)
          next[k] = { ...next[k], position: i } // status คงเดิม
        })
        setItems(next)
        return
      }

      // === ย้ายข้ามคอลัมน์ + แทรก ณ จุด overTask ===
      const origin = next.filter(t => t.status === from).sort(byPos).filter(t => t.id !== a.id)
      const target = next.filter(t => t.status === to).sort(byPos)

      const moved = { ...a, status: to }
      const idx = target.findIndex(t => t.id === overTask.id)
      target.splice(idx, 0, moved)

      const write = (list, forceStatus = null) => list.forEach((t, i) => {
        const k = next.findIndex(n => n.id === t.id)
        next[k] = { ...next[k], status: forceStatus || t.status, position: i }
      })

      write(origin, from)
      write(target, to)
      setItems(next)
      return
    }

    // ----- วางบนคอลัมน์ (รวมถึงคอลัมน์ว่าง) -----
    const dropCol = statuses.find(s => s.key === over.id)?.key
    if (dropCol) {
      const from = a.status
      const origin = next.filter(t => t.status === from).sort(byPos).filter(t => t.id !== a.id)
      const target = next.filter(t => t.status === dropCol).sort(byPos)

      const moved = { ...a, status: dropCol }
      target.push(moved) // วางต่อท้ายคอลัมน์เป้าหมาย

      const write = (list, forceStatus = null) => list.forEach((t, i) => {
        const k = next.findIndex(n => n.id === t.id)
        next[k] = { ...next[k], status: forceStatus || t.status, position: i }
      })

      write(origin, from)
      write(target, dropCol)
      setItems(next)
    }
  }

  // ===== เพิ่มการ์ดใหม่ในคอลัมน์ =====
  function handleAddTask(status) {
    const id = nextTaskIdRef.current++
    const lastPos = Math.max(-1, ...items.filter(t => t.status === status).map(t => t.position))
    const title = (typeof window !== 'undefined'
      ? window.prompt('หัวข้อการ์ดใหม่', 'งานใหม่')
      : 'งานใหม่') || 'งานใหม่'
    const newTask = { id, title, status, position: lastPos + 1 }
    setItems(prev => normalize([...prev, newTask], statuses))
  }

  // ===== เพิ่มคอลัมน์ใหม่ =====
  function handleAddColumn() {
    const labelDefault = `Column ${nextColIndexRef.current}`
    const label = (typeof window !== 'undefined'
      ? window.prompt('ชื่อคอลัมน์ใหม่', labelDefault)
      : labelDefault)
    if (!label || !label.trim()) return
    const key = `COL_${nextColIndexRef.current++}`

    setStatuses(prev => [...prev, { key, label: label.trim() }])
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kanban (Mock Data)</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">ลากแล้ววางเพื่อจัดลำดับ</div>
          <button
            onClick={handleAddColumn}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white/60"
            title="เพิ่มคอลัมน์ใหม่"
          >
            + เพิ่มคอลัมน์
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map(({ key, label }) => {
            const tasks = cols[key] || []
            return (
              <SortableContext
                key={key}
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Column
                  status={key}
                  label={label}
                  tasks={tasks}
                  styleClass={STATUS_STYLES[key] || DEFAULT_COL_STYLE}
                  onAddTask={handleAddTask}
                >
                  {/* แสดง DropZone เฉพาะคอลัมน์ว่าง เพื่อไม่บังการ์ดเวลา reorder */}
                  {tasks.length === 0 ? <EmptyDropZone id={key} /> : null}
                  {tasks.map(t => <TaskCard key={t.id} task={t} />)}
                </Column>
              </SortableContext>
            )
          })}
        </div>

        <DragOverlay>
          <div className="rounded-xl border bg-white p-3 shadow-lg">
            {activeTask?.title}
          </div>
        </DragOverlay>
      </DndContext>
    </div>
  )
}
