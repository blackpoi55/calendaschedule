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

// =====================================
// Presets (สีกับไอคอนคอลัมน์)
// =====================================
const COLUMN_THEMES = [
  { key: 'slate',  name: 'Slate',  bg: 'bg-slate-50',  border: 'border-slate-200',  dot: 'bg-slate-400'  },
  { key: 'gray',   name: 'Gray',   bg: 'bg-gray-50',   border: 'border-gray-200',   dot: 'bg-gray-400'   },
  { key: 'blue',   name: 'Blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400'   },
  { key: 'amber',  name: 'Amber',  bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  { key: 'emerald',name: 'Emerald',bg: 'bg-emerald-50',border: 'border-emerald-200',dot: 'bg-emerald-400'},
  { key: 'violet', name: 'Violet', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400' },
  { key: 'rose',   name: 'Rose',   bg: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-400'   },
]

const COLUMN_ICONS = ['📋','⚙️','🧪','✅','📝','🚧','🔍','💡','🎯','🧱']

// default style เมื่อคอลัมน์ใหม่ไม่มี mapping
const DEFAULT_COL_STYLE = 'bg-slate-50 border-slate-200'
const defaultDot = 'bg-slate-400'

// =====================================
// Initial Data
// =====================================
const INITIAL_STATUSES = [
  { key: 'TODO',   label: 'To Do',   theme: 'gray',   icon: '📋' },
  { key: 'DOING',  label: 'Doing',   theme: 'blue',   icon: '⚙️' },
  { key: 'REVIEW', label: 'Review',  theme: 'amber',  icon: '🧪' },
  { key: 'DONE',   label: 'Done',    theme: 'emerald',icon: '✅' },
]

const initialTasks = [
  { id: 1, title: 'กำหนดขอบเขตโครงการ', status: 'TODO', position: 0, labels: ['PM'], assignee: 'Anong', createdAt: Date.now(), updatedAt: Date.now(), note: '' },
  { id: 2, title: 'ออกแบบฐานข้อมูล', status: 'DOING', position: 0, labels: ['DB'], assignee: 'Somchai', createdAt: Date.now(), updatedAt: Date.now(), note: '' },
  { id: 3, title: 'พัฒนา API /auth', status: 'DOING', position: 1, labels: ['API'], assignee: null, createdAt: Date.now(), updatedAt: Date.now(), note: '' },
  { id: 4, title: 'หน้า Login (Next.js)', status: 'REVIEW', position: 0, labels: ['FE'], assignee: 'Anong', due_date: new Date().toISOString().slice(0, 10), createdAt: Date.now(), updatedAt: Date.now(), note: '' },
  { id: 5, title: 'ตั้ง CI/CD', status: 'DONE', position: 0, labels: ['DevOps'], assignee: 'Somchai', createdAt: Date.now(), updatedAt: Date.now(), note: '' },
]

// =====================================
// Helpers
// =====================================
const byPos = (a, b) => a.position - b.position
const now = () => Date.now()

const slugify = (txt) =>
  txt.toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || `col_${Math.random().toString(36).slice(2,7)}`

const themeToClass = (themeKey) => {
  const t = COLUMN_THEMES.find(x => x.key === themeKey)
  if (!t) return { box: DEFAULT_COL_STYLE, dot: defaultDot }
  return { box: `${t.bg} ${t.border}`, dot: t.dot }
}

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

const parseLabels = (text) =>
  (text || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)

// =====================================
// Drag Items
// =====================================
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

      {(task.labels?.length) ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span key={l} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{l}</span>
          ))}
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <span>👤 {task.assignee || '-'}</span>
        {task.due_date && <span className="text-right">📅 {new Date(task.due_date).toLocaleDateString('th-TH')}</span>}
      </div>

      {task.note ? (
        <div className="mt-2 text-[11px] text-gray-500 line-clamp-2">
          📝 {task.note}
        </div>
      ) : null}
    </div>
  )
}

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
  dotClass,
  onAddTask,
  children
}) {
  return (
    <div className={`flex flex-col rounded-2xl border p-3 ${styleClass || DEFAULT_COL_STYLE} min-h-[340px]`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${dotClass || defaultDot}`} />
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-gray-600 border">{tasks.length}</span>
          <button
            onClick={() => onAddTask(status)}
            className="rounded-md border px-2 py-1 text-xs bg-white/70 hover:bg-white transition"
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

// =====================================
// Modals (Add Column / Add Card)
// =====================================
function Backdrop({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    />
  )
}
function ModalShell({ title, children, onClose, onSubmit, submitText='บันทึก' }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border bg-white shadow-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h3 className="text-base font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="p-5">{children}</div>
          <div className="flex items-center justify-end gap-2 px-5 pb-5">
            <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm">ยกเลิก</button>
            <button onClick={onSubmit} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">{submitText}</button>
          </div>
        </div>
      </div>
    </>
  )
}

function AddColumnModal({ open, onClose, onCreate }) {
  const [label, setLabel] = useState('New Column')
  const [icon, setIcon] = useState(COLUMN_ICONS[0])
  const [theme, setTheme] = useState(COLUMN_THEMES[0].key)
  if (!open) return null

  return (
    <ModalShell
      title="เพิ่มคอลัมน์ใหม่"
      onClose={onClose}
      onSubmit={() => {
        const key = slugify(label)
        onCreate({ key, label: label.trim(), icon, theme })
      }}
      submitText="เพิ่มคอลัมน์"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">ชื่อคอลัมน์</label>
          <input value={label} onChange={e => setLabel(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="เช่น Backlog" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">ไอคอน</label>
            <div className="mt-1 grid grid-cols-6 gap-2">
              {COLUMN_ICONS.map(ic => (
                <button key={ic}
                  onClick={() => setIcon(ic)}
                  className={`h-10 rounded-md border text-xl ${icon===ic?'bg-indigo-50 border-indigo-400':'bg-white'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">ธีมสี</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {COLUMN_THEMES.map(t => (
                <button key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`rounded-md border px-2 py-2 text-sm flex items-center gap-2 ${theme===t.key?'ring-2 ring-indigo-400':''}`}>
                  <span className={`inline-block h-3 w-3 rounded-full ${t.dot}`} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          คีย์จะถูกสร้างอัตโนมัติตามชื่อ (เช่น <code>{slugify(label)}</code>)
        </div>
      </div>
    </ModalShell>
  )
}

function AddCardModal({ open, onClose, onCreate, defaultStatus }) {
  const [title, setTitle] = useState('งานใหม่')
  const [assignee, setAssignee] = useState('')
  const [labelsText, setLabelsText] = useState('')
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')

  if (!open) return null

  return (
    <ModalShell
      title="เพิ่มการ์ดใหม่"
      onClose={onClose}
      onSubmit={() => {
        const labels = parseLabels(labelsText)
        onCreate({
          title: title.trim() || 'งานใหม่',
          assignee: assignee.trim() || null,
          labels,
          due_date: due || undefined,
          note: note.trim(),
          status: defaultStatus
        })
      }}
      submitText="เพิ่มการ์ด"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">หัวข้อ</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="เช่น ออกแบบหน้า Dashboard" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">ผู้รับผิดชอบ</label>
            <input value={assignee} onChange={e => setAssignee(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="เช่น Somchai" />
          </div>
          <div>
            <label className="block text-sm font-medium">วันครบกำหนด</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">ป้าย (คั่นด้วย ,)</label>
          <input value={labelsText} onChange={e => setLabelsText(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="เช่น FE, Urgent" />
        </div>
        <div>
          <label className="block text-sm font-medium">โน้ตย่อ</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="รายละเอียดเพิ่มเติม..." />
        </div>
      </div>
    </ModalShell>
  )
}

// =====================================
// Page
// =====================================
export default function BoardPage() {
  const [statuses, setStatuses] = useState(INITIAL_STATUSES) // [{key,label,theme,icon}]
  const [items, setItems] = useState(normalize(initialTasks, INITIAL_STATUSES))
  const [activeId, setActiveId] = useState(null)

  // Modal states
  const [openAddColumn, setOpenAddColumn] = useState(false)
  const [openAddCardFor, setOpenAddCardFor] = useState(null) // statusKey | null

  const maxInitialId = initialTasks.length ? Math.max(...initialTasks.map(t => t.id)) : 0
  const nextTaskIdRef = useRef(maxInitialId + 1)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const cols = useMemo(() => groupByStatus(items, statuses), [items, statuses])
  const activeTask = useMemo(() => items.find(t => t.id === activeId) || null, [activeId, items])

  // ---------- DnD ----------
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

    if (overTask) {
      const from = a.status
      const to = overTask.status

      if (from === to) {
        const column = next.filter(t => t.status === from).sort(byPos)
        const oldIndex = column.findIndex(t => t.id === a.id)
        const newIndex = column.findIndex(t => t.id === overTask.id)
        const reordered = arrayMove(column, oldIndex, newIndex)
        reordered.forEach((t, i) => {
          const k = next.findIndex(n => n.id === t.id)
          next[k] = { ...next[k], position: i, updatedAt: now() }
        })
        setItems(next)
        return
      }

      const origin = next.filter(t => t.status === from).sort(byPos).filter(t => t.id !== a.id)
      const target = next.filter(t => t.status === to).sort(byPos)
      const moved = { ...a, status: to, updatedAt: now() }
      const idx = target.findIndex(t => t.id === overTask.id)
      target.splice(idx, 0, moved)

      const write = (list, forceStatus = null) => list.forEach((t, i) => {
        const k = next.findIndex(n => n.id === t.id)
        next[k] = { ...next[k], status: forceStatus || t.status, position: i, updatedAt: now() }
      })

      write(origin, from)
      write(target, to)
      setItems(next)
      return
    }

    const dropCol = statuses.find(s => s.key === over.id)?.key
    if (dropCol) {
      const from = a.status
      const origin = next.filter(t => t.status === from).sort(byPos).filter(t => t.id !== a.id)
      const target = next.filter(t => t.status === dropCol).sort(byPos)
      const moved = { ...a, status: dropCol, updatedAt: now() }
      target.push(moved)

      const write = (list, forceStatus = null) => list.forEach((t, i) => {
        const k = next.findIndex(n => n.id === t.id)
        next[k] = { ...next[k], status: forceStatus || t.status, position: i, updatedAt: now() }
      })

      write(origin, from)
      write(target, dropCol)
      setItems(next)
    }
  }

  // ---------- Create ----------
  function createColumn({ key, label, icon, theme }) {
    // กัน key ซ้ำ
    let finalKey = key
    const exists = statuses.some(s => s.key === finalKey)
    if (exists) finalKey = `${finalKey}_${Math.random().toString(36).slice(2,5)}`
    setStatuses(prev => [...prev, { key: finalKey, label, icon, theme }])
    setOpenAddColumn(false)
  }

  function createCard(payload) {
    const id = nextTaskIdRef.current++
    const status = payload.status
    const lastPos = Math.max(-1, ...items.filter(t => t.status === status).map(t => t.position))
    const newTask = {
      id,
      title: payload.title,
      status,
      position: lastPos + 1,
      labels: payload.labels,
      assignee: payload.assignee,
      due_date: payload.due_date,
      note: payload.note || '',
      createdAt: now(),
      updatedAt: now()
    }
    setItems(prev => normalize([...prev, newTask], statuses))
    setOpenAddCardFor(null)
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kanban (Mock Data)</h1>
          <div className="text-sm text-gray-500">ลากแล้ววางเพื่อจัดลำดับ • คลิก “เพิ่มคอลัมน์/เพิ่มการ์ด” เพื่อสร้างข้อมูล</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenAddColumn(true)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm bg-white hover:bg-gray-50 shadow-sm"
            title="เพิ่มคอลัมน์ใหม่"
          >
            <span className="text-lg">➕</span> เพิ่มคอลัมน์
          </button>
        </div>
      </header>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map(({ key, label, theme, icon }) => {
            const tasks = cols[key] || []
            const { box, dot } = themeToClass(theme)
            return (
              <SortableContext
                key={key}
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Column
                  status={key}
                  label={`${icon ? icon+' ' : ''}${label}`}
                  tasks={tasks}
                  styleClass={box}
                  dotClass={dot}
                  onAddTask={() => setOpenAddCardFor(key)}
                >
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

      {/* Modals */}
      <AddColumnModal
        open={openAddColumn}
        onClose={() => setOpenAddColumn(false)}
        onCreate={createColumn}
      />
      <AddCardModal
        open={!!openAddCardFor}
        onClose={() => setOpenAddCardFor(null)}
        onCreate={createCard}
        defaultStatus={openAddCardFor || ''}
      />
    </div>
  )
}
