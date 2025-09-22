'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay,
  PointerSensor, KeyboardSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { closestCorners, closestCenter } from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { API } from '@/config'




// next id จะตั้งหลังโหลดเสร็จ


// ========= Presets =========
const COLUMN_THEMES = [
  { key: 'slate', name: 'Slate', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' },
  { key: 'gray', name: 'Gray', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' },
  { key: 'blue', name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
  { key: 'amber', name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  { key: 'emerald', name: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { key: 'violet', name: 'Violet', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400' },
  { key: 'rose', name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-400' },
]
const COLUMN_ICONS = ['📋', '⚙️', '🧪', '✅', '📝', '🚧', '🔍', '💡', '🎯', '🧱']
const DEFAULT_COL_STYLE = 'bg-slate-50 border-slate-200'
const defaultDot = 'bg-slate-400'

// ====== ใช้ payload ที่ให้มา ======

// ========= Helpers =========
const byPos = (a, b) => a.position - b.position
const now = () => Date.now()
const slugify = (txt = '') =>
  (txt.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 24)) || `col_${Math.random().toString(36).slice(2, 7)}`
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
  statuses.forEach(({ key }) => { g[key] = items.filter(i => i.status === key).sort(byPos) })
  return g
}
const parseLabels = (text = '') =>
  text.split(',').map(s => s.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

// ===== Status meta + order (JS object/array ธรรมดา) =====
const STATUS_META = {
  TODO: { label: 'To Do', theme: 'gray', icon: '📋' },
  DOING: { label: 'Doing', theme: 'blue', icon: '⚙️' },
  REVIEW: { label: 'Review', theme: 'amber', icon: '🧪' },
  DONE: { label: 'Done', theme: 'emerald', icon: '✅' },
}
const STATUS_ORDER = ['TODO', 'DOING', 'REVIEW', 'DONE']

function deriveStatusesFromData(resp) {
  const rows = Array.isArray(resp?.data) ? resp.data : []
  const present = new Set(rows.map(r => r?.status).filter(Boolean))
  const order = STATUS_ORDER.filter(k => present.has(k))
  const base = (order.length ? order : STATUS_ORDER)
  return base.map(k => ({ key: k, label: STATUS_META[k].label, theme: STATUS_META[k].theme, icon: STATUS_META[k].icon }))
}

function adaptProjectTasksToBoard(resp) {
  const rows = Array.isArray(resp?.data) ? resp.data : []
  const bucket = {}
  STATUS_ORDER.forEach(k => { bucket[k] = [] })

  const safeTs = (s) => {
    const t = s ? Date.parse(s) : NaN
    return Number.isFinite(t) ? t : Date.now()
  }

  rows.forEach(r => {
    const roleLabels = (r?.ProjectTaskAssignments || [])
      .flatMap(a => [a?.role?.name])   // ถ้าจะรวม user ด้วย ก็ใส่ a?.user?.name ด้วย
      .filter(Boolean)

    const assignees = (r?.ProjectTaskAssignments || [])
      .map(a => a?.user?.name)
      .filter(Boolean)

    const status = (r?.status && STATUS_ORDER.includes(r.status)) ? r.status : 'TODO'

    const item = {
      id: r.id,
      title: r.name,
      status,
      position: 0,
      labels: Array.from(new Set(roleLabels)),
      assignees,
      due_date: r?.end_date || undefined,
      note: r?.description || '',
      createdAt: safeTs(r?.created_at),
      updatedAt: safeTs(r?.updated_at || r?.created_at),
    }
    if (!bucket[status]) bucket[status] = []
    bucket[status].push(item)
  })

  let items = []
  STATUS_ORDER.forEach(st => {
    const list = (bucket[st] || []).sort((a, b) => {
      const ad = a.due_date ? Date.parse(a.due_date) : Number.POSITIVE_INFINITY
      const bd = b.due_date ? Date.parse(b.due_date) : Number.POSITIVE_INFINITY
      if (ad !== bd) return ad - bd
      return a.id - b.id
    })
    list.forEach((t, i) => { t.position = i })
    items = items.concat(list)
  })

  return items
}

// ========= Card =========
function TaskCard({ task, onClick, dragDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !!dragDisabled
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      {...attributes} {...listeners}
      className={`rounded-xl border bg-white p-3 shadow-sm hover:shadow ${dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-gray-900 leading-tight">{task.title}</h4>
        <span className="text-xs text-gray-400 select-none">#{task.id}</span>
      </div>
      {task.labels?.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span key={l} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{l}</span>
          ))}
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <span>
          👤 {task.assignees?.length ? task.assignees.join(', ') : '-'}
        </span>
        {task.due_date && <span className="text-right">📅 {new Date(task.due_date).toLocaleDateString('th-TH')}</span>}
      </div>
      {task.note ? <div className="mt-2 text-[11px] text-gray-500 line-clamp-2">📝 {task.note}</div> : null}
    </div>
  )
}

// ========= Column (Sortable Shell) =========
function SortableColumnShell({ colKey, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: colKey })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1 }}
      {...attributes} {...listeners}
      className="h-full w-[320px] shrink-0"
      data-col-key={colKey}
    >
      {children}
    </div>
  )
}

function Column({ status, label, tasks, styleClass, dotClass, onAddTask, onEditColumn, children }) {
  return (
    <div className={`flex h-full flex-col rounded-2xl border shadow-sm hover:shadow ${styleClass || DEFAULT_COL_STYLE}`}>
      <div className="sticky top-0 z-10 -m-px rounded-t-2xl border-b bg-white/80 backdrop-blur px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${dotClass || defaultDot}`} />
            <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEditColumn(status)} className="rounded-md border px-2 py-1 text-xs bg-white hover:bg-gray-50">⚙️ แก้ไข</button>
            <button onClick={() => onAddTask(status)} className="rounded-md border px-2 py-1 text-xs bg-white hover:bg-gray-50">+ การ์ด</button>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  )
}

// ========= Basic UI (modals reused) =========
function Backdrop({ onClose }) { return <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" onClick={onClose} /> }
function ModalShell({ title, children, onClose, onSubmit, submitText = 'บันทึก', extraLeft }) {
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
          <div className="flex items-center justify-between gap-2 px-5 pb-5">
            <div className="flex items-center gap-2">{extraLeft}</div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm">ยกเลิก</button>
              <button onClick={onSubmit} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">{submitText}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
function ColumnForm({ label, setLabel, icon, setIcon, theme, setTheme, readonlyKey }) {
  return (
    <div className="space-y-4">
      {readonlyKey && (
        <div>
          <label className="block text-sm font-medium">คีย์คอลัมน์</label>
          <input value={readonlyKey} readOnly className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium">ชื่อคอลัมน์</label>
        <input value={label} onChange={e => setLabel(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="เช่น Backlog" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">ไอคอน</label>
          <div className="mt-1 grid grid-cols-6 gap-2">
            {COLUMN_ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} type="button" className={`h-10 rounded-md border text-xl ${icon === ic ? 'bg-indigo-50 border-indigo-400' : 'bg-white'}`}>{ic}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">ธีมสี</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {COLUMN_THEMES.map(t => (
              <button key={t.key} onClick={() => setTheme(t.key)} type="button" className={`rounded-md border px-2 py-2 text-sm flex items-center gap-2 ${theme === t.key ? 'ring-2 ring-indigo-400' : ''}`}>
                <span className={`inline-block h-3 w-3 rounded-full ${t.dot}`} /> {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
function AddColumnModal({ open, onClose, onCreate }) {
  const [label, setLabel] = useState('New Column')
  const [icon, setIcon] = useState(COLUMN_ICONS[0])
  const [theme, setTheme] = useState(COLUMN_THEMES[0].key)
  if (!open) return null
  return (
    <ModalShell title="เพิ่มคอลัมน์ใหม่" onClose={onClose} onSubmit={() => onCreate({ key: slugify(label), label: label.trim(), icon, theme })} submitText="เพิ่มคอลัมน์">
      <ColumnForm label={label} setLabel={setLabel} icon={icon} setIcon={setIcon} theme={theme} setTheme={setTheme} />
    </ModalShell>
  )
}
function EditColumnModal({ open, onClose, column, onSave, onDelete, isDeletable }) {
  const [label, setLabel] = useState(column?.label || '')
  const [icon, setIcon] = useState(column?.icon || COLUMN_ICONS[0])
  const [theme, setTheme] = useState(column?.theme || COLUMN_THEMES[0].key)
  React.useEffect(() => { setLabel(column?.label || ''); setIcon(column?.icon || COLUMN_ICONS[0]); setTheme(column?.theme || COLUMN_THEMES[0].key) }, [column])
  if (!open || !column) return null
  return (
    <ModalShell
      title={`แก้ไขคอลัมน์: ${column.label}`} onClose={onClose}
      onSubmit={() => onSave({ label: label.trim(), icon, theme })} submitText="บันทึก"
      extraLeft={
        <button onClick={() => isDeletable ? onDelete() : null} disabled={!isDeletable}
          className={`rounded-md px-3 py-1.5 text-sm ${isDeletable ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'border text-gray-300 cursor-not-allowed'}`}
          title={isDeletable ? 'ลบคอลัมน์ (ต้องว่าง)' : 'ต้องลบการ์ดในคอลัมน์ให้หมดก่อน'}>
          ลบคอลัมน์
        </button>
      }
    >
      <ColumnForm label={label} setLabel={setLabel} icon={icon} setIcon={setIcon} theme={theme} setTheme={setTheme} readonlyKey={column.key} />
    </ModalShell>
  )
}
function CardForm({ title, setTitle, assignee, setAssignee, labelsText, setLabelsText, due, setDue, note, setNote }) {
  return (
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
    <ModalShell title="เพิ่มการ์ดใหม่" onClose={onClose} onSubmit={() => onCreate({
      title: title.trim() || 'งานใหม่',
      assignee: assignee.trim() || null,
      labels: parseLabels(labelsText),
      due_date: due || undefined,
      note: note.trim(),
      status: defaultStatus
    })} submitText="เพิ่มการ์ด">
      <CardForm {...{ title, setTitle, assignee, setAssignee, labelsText, setLabelsText, due, setDue, note, setNote }} />
    </ModalShell>
  )
}
function EditCardModal({ open, onClose, task, onSave, onDelete }) {
  const [title, setTitle] = useState(task?.title || '')
  // รับหลายคนเป็น CSV string; ถ้า task.assignees เป็น array จะ join ให้
  const [assignee, setAssignee] = useState(
    Array.isArray(task?.assignees)
      ? task.assignees.join(', ')
      : (task?.assignee || '')
  )
  const [labelsText, setLabelsText] = useState((task?.labels || []).join(', '))
  const [due, setDue] = useState(task?.due_date || '')
  const [note, setNote] = useState(task?.note || '')

  React.useEffect(() => {
    setTitle(task?.title || '')
    setAssignee(
      Array.isArray(task?.assignees)
        ? task.assignees.join(', ')
        : (task?.assignee || '')
    )
    setLabelsText((task?.labels || []).join(', '))
    setDue(task?.due_date || '')
    setNote(task?.note || '')
  }, [task])

  if (!open || !task) return null

  return (
    <ModalShell
      title={`แก้ไขการ์ด #${task.id}`}
      onClose={onClose}
      onSubmit={() => {
        // แปลง CSV -> array และกันค่าว่างซ้ำซ้อนด้วย parseLabels เดิม
        const assigneesArr = parseLabels(assignee) // ['Ann UX','John Dev', ...]
        onSave({
          title: title.trim() || 'งานใหม่',
          // คงส่ง labels เป็น array เดิม
          labels: parseLabels(labelsText),
          due_date: due || undefined,
          note: note.trim(),
          // ใหม่: ส่งทั้งแบบหลายคน (assignees) และสำรองเป็นคนแรก (assignee) เพื่อรองรับ UI เก่า
          assignees: assigneesArr,
          assignee: assigneesArr[0] || null,
        })
      }}
      submitText="บันทึก"
      extraLeft={
        <button
          onClick={onDelete}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          ลบการ์ด
        </button>
      }
    >
      {/* ช่องผู้รับผิดชอบยังใช้ input เดิม แต่อนุญาตให้กรอกหลายชื่อคั่นด้วย , */}
      <CardForm
        {...{
          title,
          setTitle,
          assignee,        // CSV string
          setAssignee,     // setter ของ CSV
          labelsText,
          setLabelsText,
          due,
          setDue,
          note,
          setNote,
        }}
      />
    </ModalShell>
  )
}

// function EditCardModal({ open, onClose, task, onSave, onDelete }) {
//   const [title, setTitle] = useState(task?.title || '')
//   const [assignee, setAssignee] = useState(task?.assignee || '')
//   const [labelsText, setLabelsText] = useState((task?.labels || []).join(', '))
//   const [due, setDue] = useState(task?.due_date || '')
//   const [note, setNote] = useState(task?.note || '')
//   React.useEffect(() => {
//     setTitle(task?.title || ''); setAssignee(task?.assignee || '')
//     setLabelsText((task?.labels || []).join(', ')); setDue(task?.due_date || ''); setNote(task?.note || '')
//   }, [task])
//   if (!open || !task) return null
//   return (
//     <ModalShell title={`แก้ไขการ์ด #${task.id}`} onClose={onClose}
//       onSubmit={() => onSave({
//         title: title.trim() || 'งานใหม่',
//         assignee: assignee.trim() || null,
//         labels: parseLabels(labelsText),
//         due_date: due || undefined,
//         note: note.trim()
//       })}
//       submitText="บันทึก"
//       extraLeft={<button onClick={onDelete} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">ลบการ์ด</button>}
//     >
//       <CardForm {...{ title, setTitle, assignee, setAssignee, labelsText, setLabelsText, due, setDue, note, setNote }} />
//     </ModalShell>
//   )
// }

// ========= Page =========
export default function BoardPage() {
  // ใช้ statuses/items ที่ได้จาก payload
  // const INITIAL_STATUSES = deriveStatusesFromData(PROJECT_TASKS_PAYLOAD)
  // const initialTasks = adaptProjectTasksToBoard(PROJECT_TASKS_PAYLOAD)

  const [statuses, setStatuses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const [dragMode, setDragMode] = useState('none');

  const [openAddColumn, setOpenAddColumn] = useState(false);
  const [openAddCardFor, setOpenAddCardFor] = useState(null);
  const [editColKey, setEditColKey] = useState(null);
  const [editTaskId, setEditTaskId] = useState(null);

  // next id จะตั้งหลังโหลดเสร็จ
  const nextTaskIdRef = useRef(1);

  async function fetchTasks(projectId = '5') {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API}/projectTask/searchProjectTaskAssignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId }), // ตาม cURL: "id": "5"
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`);
      }

      const data = await res.json();
      const nextStatuses = deriveStatusesFromData(data);
      const nextItems = adaptProjectTasksToBoard(data);

      setStatuses(nextStatuses);
      setItems(nextItems);

      const maxId = nextItems.length ? Math.max(...nextItems.map(t => t.id)) : 0;
      nextTaskIdRef.current = maxId + 1;
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks('5'); // ถ้าจะทำให้ไดนามิก ค่อยโยกเป็น props/route param
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const cols = useMemo(() => groupByStatus(items, statuses), [items, statuses])
  const activeTask = useMemo(() => items.find(t => t.id === activeId) || null, [activeId, items])

  const isColumnId = (id) => typeof id === 'string' && statuses.some(s => s.key === id)

  const columnOnlyCollision = (args) => {
    const columnIds = new Set(statuses.map(s => s.key))
    const filtered = args.droppableContainers.filter(c => columnIds.has(c.id))
    return closestCenter({ ...args, droppableContainers: filtered })
  }

  function onDragStart(e) {
    setActiveId(e.active.id)
    setDragMode(isColumnId(e.active.id) ? 'col' : 'card')
  }

  function onDragEnd(e) {
    const { active, over } = e
    setActiveId(null)
    const mode = isColumnId(active.id) ? 'col' : 'card'
    setDragMode('none')
    if (!over) return

    // A) ลากคอลัมน์
    if (mode === 'col') {
      if (!isColumnId(over.id) || active.id === over.id) return
      const oldIndex = statuses.findIndex(s => s.key === active.id)
      const newIndex = statuses.findIndex(s => s.key === over.id)
      setStatuses(arrayMove(statuses, oldIndex, newIndex))
      return
    }

    // B) ลากการ์ด
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
        setItems(next); return
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
      write(origin, from); write(target, to); setItems(next); return
    }

    // วางบนคอลัมน์
    if (isColumnId(over.id)) {
      const dropCol = over.id
      const from = a.status
      const origin = next.filter(t => t.status === from).sort(byPos).filter(t => t.id !== a.id)
      const target = next.filter(t => t.status === dropCol).sort(byPos)
      const moved = { ...a, status: dropCol, updatedAt: now() }
      target.push(moved)
      const write = (list, forceStatus = null) => list.forEach((t, i) => {
        const k = next.findIndex(n => n.id === t.id)
        next[k] = { ...next[k], status: forceStatus || t.status, position: i, updatedAt: now() }
      })
      write(origin, from); write(target, dropCol); setItems(next)
    }
  }

  function createColumn({ key, label, icon, theme }) {
    let finalKey = key
    if (statuses.some(s => s.key === finalKey)) finalKey = `${finalKey}_${Math.random().toString(36).slice(2, 5)}`
    setStatuses(prev => [...prev, { key: finalKey, label, icon, theme }])
    setOpenAddColumn(false)
  }
  function createCard(payload) {
    const id = nextTaskIdRef.current++
    const status = payload.status
    const lastPos = Math.max(-1, ...items.filter(t => t.status === status).map(t => t.position))
    const newTask = {
      id, title: payload.title, status, position: lastPos + 1,
      labels: payload.labels, assignee: payload.assignee, due_date: payload.due_date,
      note: payload.note || '', createdAt: now(), updatedAt: now()
    }
    setItems(prev => normalize([...prev, newTask], statuses))
    setOpenAddCardFor(null)
  }
  function openEditColumn(statusKey) { setEditColKey(statusKey) }
  function saveEditColumn({ label, icon, theme }) {
    setStatuses(prev => prev.map(s => s.key === editColKey ? { ...s, label, icon, theme } : s))
    setEditColKey(null)
  }
  function deleteColumn() {
    const key = editColKey
    if ((groupByStatus(items, statuses)[key]?.length || 0) > 0) return
    setStatuses(prev => prev.filter(s => s.key !== key))
    setEditColKey(null)
  }

  const editingTask = useMemo(() => items.find(t => t.id === editTaskId) || null, [editTaskId, items])
  function openEditTask(taskId) { setEditTaskId(taskId) }
  function saveEditTask(payload) {
    setItems(prev => prev.map(t => t.id === editTaskId ? { ...t, ...payload, updatedAt: now() } : t))
    setEditTaskId(null)
  }
  function deleteTask() {
    setItems(prev => normalize(prev.filter(t => t.id !== editTaskId), statuses))
    setEditTaskId(null)
  }

  const dndCollision = dragMode === 'col' ? columnOnlyCollision : closestCorners
  const dndModifiers = dragMode === 'col' ? [restrictToHorizontalAxis] : undefined

  return (
    <div className="mx-auto min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Kanban (จาก Payload)</h1>
            <div className="text-sm text-gray-500">ลากการ์ด/คอลัมน์เพื่อจัดลำดับ • คลิกการ์ดเพื่อแก้ไข</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOpenAddColumn(true)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm bg-white hover:bg-gray-50 shadow-sm">
              <span className="text-lg">➕</span> เพิ่มคอลัมน์
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4">
        <DndContext
          sensors={sensors}
          collisionDetection={dndCollision}
          modifiers={dndModifiers}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={statuses.map(s => s.key)} strategy={horizontalListSortingStrategy}>
            <div className="h-[calc(100vh-160px)] w-full overflow-x-auto overflow-y-hidden">
              <div className="flex h-full gap-4 pr-4">
                {statuses.map(({ key, label, theme, icon }) => {
                  const tasks = cols[key] || []
                  const { box, dot } = themeToClass(theme)
                  return (
                    <SortableColumnShell key={key} colKey={key}>
                      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <Column
                          status={key}
                          label={`${icon ? icon + ' ' : ''}${label}`}
                          tasks={tasks}
                          styleClass={box}
                          dotClass={dot}
                          onAddTask={() => setOpenAddCardFor(key)}
                          onEditColumn={openEditColumn}
                        >
                          {tasks.length === 0 ? (
                            <div className="min-h-[80px] rounded-md border border-dashed border-slate-300" />
                          ) : null}
                          {tasks.map(t => (
                            <TaskCard key={t.id} task={t} dragDisabled={dragMode === 'col'} onClick={() => openEditTask(t.id)} />
                          ))}
                        </Column>
                      </SortableContext>
                    </SortableColumnShell>
                  )
                })}
              </div>
            </div>
          </SortableContext>

          <DragOverlay>
            <div className="rounded-xl border bg-white p-3 shadow-lg">
              {isColumnId(activeId) ? (statuses.find(s => s.key === activeId)?.label || null) : (activeTask?.title || null)}
            </div>
          </DragOverlay>
        </DndContext>
      </div>

      <AddColumnModal open={openAddColumn} onClose={() => setOpenAddColumn(false)} onCreate={createColumn} />
      <AddCardModal open={!!openAddCardFor} onClose={() => setOpenAddCardFor(null)} onCreate={createCard} defaultStatus={openAddCardFor || ''} />
      <EditColumnModal open={!!editColKey} onClose={() => setEditColKey(null)} column={statuses.find(s => s.key === editColKey) || null} onSave={saveEditColumn} onDelete={deleteColumn} isDeletable={(groupByStatus(items, statuses)[editColKey]?.length || 0) === 0} />
      <EditCardModal open={!!editTaskId} onClose={() => setEditTaskId(null)} task={items.find(t => t.id === editTaskId) || null} onSave={saveEditTask} onDelete={deleteTask} />
    </div>
  )
}
