'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable
} from '@dnd-kit/core'
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { closestCorners, closestCenter } from '@dnd-kit/core'
import { restrictToHorizontalAxis, snapCenterToCursor } from '@dnd-kit/modifiers'
import { API } from '@/config'

// React Select
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { getmember, getrole } from '@/action/api'

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

// ========= Helpers =========
const byPos = (a, b) => a.position - b.position
const now = () => Date.now()
const safeNum = (v, d = 0) => {
  const n = Number(v); return Number.isFinite(n) ? n : d
}
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

// ===== Status meta + fallback order =====
const STATUS_META = {
  TODO: { label: 'To Do', theme: 'gray', icon: '📋' },
  DOING: { label: 'Doing', theme: 'blue', icon: '⚙️' },
  REVIEW: { label: 'Review', theme: 'amber', icon: '🧪' },
  DONE: { label: 'Done', theme: 'emerald', icon: '✅' },
}
const STATUS_ORDER = ['TODO', 'DOING', 'REVIEW', 'DONE']

// ---------------- API adapters ----------------
function deriveStatusesFromApi(resp) {
  const arr = Array.isArray(resp?.data?.detail?.statuses) ? resp.data.detail.statuses : []
  if (arr.length) {
    // ใช้ order จาก API
    return [...arr].sort((a, b) => safeNum(a.order) - safeNum(b.order)).map(s => ({
      key: s.key, label: s.label ?? STATUS_META[s.key]?.label ?? s.key,
      theme: s.theme ?? STATUS_META[s.key]?.theme ?? 'gray',
      icon: s.icon ?? STATUS_META[s.key]?.icon ?? '📋',
    }))
  }
  // fallback จาก tasks
  const rows = Array.isArray(resp?.data?.detail?.tasks) ? resp.data.detail.tasks : []
  const present = new Set(rows.map(r => r?.status).filter(Boolean))
  const ordered = STATUS_ORDER.filter(k => present.has(k))
  const base = ordered.length ? ordered : STATUS_ORDER
  return base.map(k => ({ key: k, label: STATUS_META[k].label, theme: STATUS_META[k].theme, icon: STATUS_META[k].icon }))
}

function adaptTasksFromApi(resp) {
  const rows = Array.isArray(resp?.data?.detail?.tasks) ? resp.data.detail.tasks : []
  // ใช้ position จาก API ตรง ๆ
  return rows.map(r => ({
    id: r.id, // string ก็ได้
    title: r.title ?? '',
    status: r.status && STATUS_ORDER.includes(r.status) ? r.status : 'TODO',
    position: safeNum(r.position, 0),
    labels: (r.labels || []).map(x => ({ id: x?.id ?? null, name: x?.name ?? String(x) })).filter(x => x.name),
    assignees: (r.assignees || []).map(x => ({ id: x?.id ?? null, name: x?.name ?? String(x) })).filter(x => x.name),
    assignee: (r.assignees && r.assignees[0]?.name) || null,
    due_date: r.due_date || null,
    note: r.note || '',
    createdAt: safeNum(r.createdAt ?? r.updatedAt ?? Date.now(), Date.now()),
    updatedAt: safeNum(r.updatedAt ?? Date.now(), Date.now()),
  }))
}

// ========= React-Select Styles =========
const rsStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    borderRadius: 8,
    borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#d1d5db' },
    backgroundColor: 'white',
    fontSize: 14,
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 8px' }),
  multiValue: (base) => ({ ...base, backgroundColor: '#eef2ff', borderRadius: 9999, paddingRight: 2 }),
  multiValueLabel: (base) => ({ ...base, color: '#4338ca', fontSize: 12 }),
  multiValueRemove: (base) => ({ ...base, color: '#4f46e5', ':hover': { backgroundColor: '#e0e7ff', color: '#3730a3' } }),
  menu: (base) => ({ ...base, zIndex: 50 }),
}

// ========= Drag ids =========
const colDragId = (key) => `col:${key}`
const parseColId = (id) => (typeof id === 'string' && id.startsWith('col:')) ? id.slice(4) : null

// ========= Card =========
function TaskCard({ task, onClick, dragDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !!dragDisabled
  })
  const assigneeText = Array.isArray(task.assignees) && task.assignees.length
    ? task.assignees.map(a => a.name).join(', ')
    : '-'
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
      {Array.isArray(task.labels) && task.labels.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span key={`${l.id ?? l.name}`} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {l.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <span>👤 {assigneeText}</span>
        {task.due_date && <span className="text-right">📅 {new Date(task.due_date).toLocaleDateString('th-TH')}</span>}
      </div>
      {task.note ? <div className="mt-2 text-[11px] text-gray-500 line-clamp-2">📝 {task.note}</div> : null}
    </div>
  )
}

// ========= Card Overlay (ให้ขนาดเท่าต้นฉบับ) =========
function TaskCardOverlay({ task, size }) {
  if (!task) return null
  const assigneeText = Array.isArray(task.assignees) && task.assignees.length
    ? task.assignees.map(a => a.name).join(', ')
    : '-'
  return (
    <div
      className="rounded-xl border bg-white p-3 shadow-lg pointer-events-none"
      style={{
        width: size?.w || undefined,
        height: size?.h || undefined,
        boxSizing: 'border-box',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-gray-900 leading-tight">{task.title}</h4>
        <span className="text-xs text-gray-400 select-none">#{task.id}</span>
      </div>
      {Array.isArray(task.labels) && task.labels.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.labels.map(l => (
            <span key={`${l.id ?? l.name}`} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {l.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <span>👤 {assigneeText}</span>
        {task.due_date && <span className="text-right">📅 {new Date(task.due_date).toLocaleDateString('th-TH')}</span>}
      </div>
      {task.note ? <div className="mt-2 text-[11px] text-gray-500 line-clamp-2">📝 {task.note}</div> : null}
    </div>
  )
}

// ========= Column (Sortable Shell) =========
function SortableColumnShell({ colKey, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: colDragId(colKey) })
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

function ColumnDropArea({ id, children }) {
  // ⭐ Droppable ของคอลัมน์ (เปิดตลอดเวลา) => คอลัมน์ว่างก็รับการ์ดได้
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 space-y-2 overflow-y-auto p-3 rounded-b-2xl ${isOver ? 'outline outline-2 outline-indigo-300/60' : ''}`}
    >
      {children}
    </div>
  )
}

function Column({ status, label, styleClass, dotClass, onAddTask, onEditColumn, children }) {
  return (
    <div className={`flex h-full flex-col rounded-2xl border shadow-sm hover:shadow ${styleClass || DEFAULT_COL_STYLE}`}>
      {/* sticky header */}
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

      {/* list area (droppable) */}
      {children}
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
  useEffect(() => { setLabel(column?.label || ''); setIcon(column?.icon || COLUMN_ICONS[0]); setTheme(column?.theme || COLUMN_THEMES[0].key) }, [column])
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

/** ------------------ Card Form (React Select Multi) ------------------ */
function CardFormRS({
  title, setTitle,
  assigneeOptions, assigneeValues, setAssigneeValues,
  labelOptions, labelValues, setLabelValues,
  due, setDue,
  note, setNote
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">หัวข้อ</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="เช่น ออกแบบหน้า Dashboard" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium">ผู้รับผิดชอบ</label>
          <Select
            isMulti
            options={assigneeOptions}
            value={assigneeValues}
            onChange={(vals) => setAssigneeValues(vals || [])}
            styles={rsStyles}
            placeholder="เลือกผู้รับผิดชอบ..."
            className="mt-1"
            classNamePrefix="rs"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">วันครบกำหนด</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">ป้าย (Labels)</label>
        <CreatableSelect
          isMulti
          options={labelOptions}
          value={labelValues}
          onChange={(vals) => setLabelValues(vals || [])}
          styles={rsStyles}
          placeholder="เลือก/พิมพ์เพื่อสร้างป้าย..."
          className="mt-1"
          classNamePrefix="rs"
          formatCreateLabel={(input) => `สร้าง "${input}"`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">โน้ตย่อ</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="รายละเอียดเพิ่มเติม..." />
      </div>
    </div>
  )
}

/** ------------------ Add Card Modal ------------------ */
function AddCardModal({
  open, onClose, onCreate, defaultStatus,
  memberOptions, roleOptions
}) {
  const [title, setTitle] = useState('งานใหม่')
  const [assignees, setAssignees] = useState([]) // option[]
  const [labels, setLabels] = useState([])       // option[]
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')

  if (!open) return null

  return (
    <ModalShell
      title="เพิ่มการ์ดใหม่"
      onClose={onClose}
      onSubmit={() => {
        const assArr = (assignees || []).map(o => ({ id: o.value?.id ?? null, name: o.value?.name ?? o.label }))
        const labArr = (labels || []).map(o => ({ id: o.value?.id ?? null, name: o.value?.name ?? o.label }))
        onCreate({
          title: title.trim() || 'งานใหม่',
          labels: labArr,
          due_date: due || undefined,
          note: note.trim(),
          status: defaultStatus,
          assignees: assArr,
          assignee: assArr[0]?.name || null,
        })
      }}
      submitText="เพิ่มการ์ด"
    >
      <CardFormRS
        title={title} setTitle={setTitle}
        assigneeOptions={memberOptions}
        assigneeValues={assignees}
        setAssigneeValues={setAssignees}
        labelOptions={roleOptions}
        labelValues={labels}
        setLabelValues={setLabels}
        due={due} setDue={setDue}
        note={note} setNote={setNote}
      />
    </ModalShell>
  )
}

/** ------------------ Edit Card Modal ------------------ */
function EditCardModal({
  open, onClose, task, onSave, onDelete,
  memberOptions, roleOptions
}) {
  const [title, setTitle] = useState(task?.title || '')
  const [assignees, setAssignees] = useState([]) // option[]
  const [labels, setLabels] = useState([])       // option[]
  const [due, setDue] = useState(task?.due_date || '')
  const [note, setNote] = useState(task?.note || '')

  const toOptions = (objs, pool) => {
    // map [{id,name}] => option (match by id, fallback by name)
    const byId = new Map((pool || []).map(o => [o.value?.id ?? o.value, o]))
    const byName = new Map((pool || []).map(o => [o.label, o]))
    return (objs || []).map(x => {
      if (x?.id != null && byId.has(x.id)) return byId.get(x.id)
      if (x?.name && byName.has(x.name)) return byName.get(x.name)
      return { value: { id: x?.id ?? null, name: x?.name ?? String(x) }, label: x?.name ?? String(x) }
    })
  }

  useEffect(() => {
    setTitle(task?.title || '')
    setAssignees(toOptions(task?.assignees || (task?.assignee ? [{ id: null, name: task.assignee }] : []), memberOptions))
    setLabels(toOptions(task?.labels || [], roleOptions))
    setDue(task?.due_date || '')
    setNote(task?.note || '')
  }, [task, memberOptions, roleOptions])

  if (!open || !task) return null

  return (
    <ModalShell
      title={`แก้ไขการ์ด #${task.id}`}
      onClose={onClose}
      onSubmit={() => {
        const assArr = (assignees || []).map(o => ({ id: o.value?.id ?? null, name: o.value?.name ?? o.label }))
        const labArr = (labels || []).map(o => ({ id: o.value?.id ?? null, name: o.value?.name ?? o.label }))
        onSave({
          title: title.trim() || 'งานใหม่',
          labels: labArr,
          due_date: due || undefined,
          note: note.trim(),
          assignees: assArr,
          assignee: assArr[0]?.name || null,
        })
      }}
      submitText="บันทึก"
      extraLeft={
        <button onClick={onDelete} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
          ลบการ์ด
        </button>
      }
    >
      <CardFormRS
        title={title} setTitle={setTitle}
        assigneeOptions={memberOptions}
        assigneeValues={assignees}
        setAssigneeValues={setAssignees}
        labelOptions={roleOptions}
        labelValues={labels}
        setLabelValues={setLabels}
        due={due} setDue={setDue}
        note={note} setNote={setNote}
      />
    </ModalShell>
  )
}

// ========= Page =========
export default function BoardPage() {
  const [boardId, setBoardId] = useState(null)
  const [projectId, setProjectId] = useState(null)

  const [statuses, setStatuses] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeId, setActiveId] = useState(null)
  const [activeSize, setActiveSize] = useState({ w: 0, h: 0 }) // << ขนาด item ตอนเริ่มลาก
  const [dragMode, setDragMode] = useState('none')

  const [openAddColumn, setOpenAddColumn] = useState(false)
  const [openAddCardFor, setOpenAddCardFor] = useState(null)
  const [editColKey, setEditColKey] = useState(null)
  const [editTaskId, setEditTaskId] = useState(null)

  const [roleMap, setroleMap] = useState([])     // [{id,name,...}]
  const [memberMap, setmemberMap] = useState([]) // [{id,name,email,...}]

  const nextTaskIdRef = useRef(1)

  async function fetchTasks(projId = '4') {
    try {
      setLoading(true); setError(null)

      const res = await fetch(`${API}/kanban/${projId}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`)
      }
      const data = await res.json()

      setBoardId(data?.data?.id ?? null)
      setProjectId(data?.data?.projectId ?? projId)

      const nextStatuses = deriveStatusesFromApi(data)
      const nextItems = adaptTasksFromApi(data)

      // จัด normalize ตามตำแหน่งในคอลัมน์ (ตั้งต้นจาก API position)
      const normalized = normalize(nextItems, nextStatuses)
      setStatuses(nextStatuses)
      setItems(normalized)

      const maxId = normalized.reduce((m, t) => Math.max(m, safeNum(t.id, 0)), 0)
      nextTaskIdRef.current = maxId + 1

      const role = await getrole()
      setroleMap(role?.data || [])
      const member = await getmember()
      setmemberMap(member?.data || [])
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks('4') }, [])

  // ===== React-Select Options =====
  const roleOptions = useMemo(
    () => (roleMap || []).map(r => ({ value: { id: r.id ?? null, name: r.name }, label: r.name })),
    [roleMap]
  )
  const memberOptions = useMemo(
    () => (memberMap || []).map(m => ({ value: { id: m.id ?? null, name: m.name }, label: m.name })),
    [memberMap]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const cols = useMemo(() => groupByStatus(items, statuses), [items, statuses])
  const activeTask = useMemo(() => items.find(t => t.id === activeId) || null, [activeId, items])

  // --- collision เฉพาะคอลัมน์ตอนลากคอลัมน์
  const dndCollision = dragMode === 'col'
    ? (args) => {
      const allowed = new Set(statuses.map(s => colDragId(s.key)))
      const filtered = args.droppableContainers.filter(c => allowed.has(c.id))
      return closestCenter({ ...args, droppableContainers: filtered })
    }
    : closestCorners
  const dndModifiers = dragMode === 'col' ? [restrictToHorizontalAxis, snapCenterToCursor] : [snapCenterToCursor]

  function onDragStart(e) {
    setActiveId(e.active.id)
    setDragMode(parseColId(e.active.id) ? 'col' : 'card')

    // วัดขนาด item ต้นทางให้ overlay เท่ากัน
    const rect = e?.active?.rect?.current?.initial
    if (rect) {
      setActiveSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
    } else {
      // fallback เผื่อกรณีไม่ได้ rect
      try {
        const node = e?.active?.node?.current
        if (node) {
          const r = node.getBoundingClientRect()
          setActiveSize({ w: Math.round(r.width), h: Math.round(r.height) })
        } else {
          setActiveSize({ w: 0, h: 0 })
        }
      } catch {
        setActiveSize({ w: 0, h: 0 })
      }
    }
  }

  function onDragEnd(e) {
    const { active, over } = e
    setActiveId(null)
    setActiveSize({ w: 0, h: 0 })
    const mode = parseColId(active.id) ? 'col' : 'card'
    setDragMode('none')
    if (!over) return

    // A) ลากคอลัมน์
    const activeColKey = parseColId(active.id)
    if (mode === 'col') {
      const overColKey = parseColId(over.id)
      if (!overColKey || activeColKey === overColKey) return
      const oldIndex = statuses.findIndex(s => s.key === activeColKey)
      const newIndex = statuses.findIndex(s => s.key === overColKey)
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

    // วางลงคอลัมน์ (ปลายทางเป็น id = status key) — รองรับคอลัมน์ว่าง
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
    const id = String(nextTaskIdRef.current++) // เก็บเป็น string เพื่อไม่ชน format จาก API
    const status = payload.status
    const lastPos = Math.max(-1, ...items.filter(t => t.status === status).map(t => t.position))
    const newTask = {
      id, title: payload.title, status, position: lastPos + 1,
      labels: (payload.labels || []).map(x => ({ id: x.id ?? null, name: x.name })),
      assignees: (payload.assignees || []).map(x => ({ id: x.id ?? null, name: x.name })),
      assignee: payload.assignee || (payload.assignees?.[0]?.name ?? null),
      due_date: payload.due_date || null,
      note: payload.note || '',
      createdAt: now(), updatedAt: now()
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
    setItems(prev => prev.map(t => t.id === editTaskId ? {
      ...t,
      ...payload,
      labels: (payload.labels || []).map(x => ({ id: x.id ?? null, name: x.name })),
      assignees: (payload.assignees || []).map(x => ({ id: x.id ?? null, name: x.name })),
      assignee: payload.assignee || (payload.assignees?.[0]?.name ?? null),
      updatedAt: now()
    } : t))
    setEditTaskId(null)
  }
  function deleteTask() {
    setItems(prev => normalize(prev.filter(t => t.id !== editTaskId), statuses))
    setEditTaskId(null)
  }

  // ---- SAVE (log payload) ----
  const onSaveBoard = async () => {
    const normalized = normalize(items, statuses)
    const payload = {
      id: boardId,
      projectId: projectId,
      detail: {
        statuses: statuses.map((s, idx) => ({
          key: s.key, label: s.label, theme: s.theme, icon: s.icon, order: idx
        })),
        tasks: normalized.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          position: t.position,
          labels: (t.labels || []).map(x => ({ id: x.id ?? null, name: x.name })),
          assignees: (t.assignees || []).map(x => ({ id: x.id ?? null, name: x.name })),
          due_date: t.due_date || null,
          note: t.note || '',
          updatedAt: String(t.updatedAt || now()),
        })),
      }
    }
    console.log('KANBAN_SAVE_PAYLOAD', payload)
    // ถ้าจะยิงจริง:
    let res = fetch(`${API}/kanban`, { method: 'Post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      fetchTasks(4)
    }
  }

  return (
    <div className="mx-auto min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Kanban (จาก API)</h1>
            <div className="text-sm text-gray-500">ลากการ์ด/คอลัมน์เพื่อจัดลำดับ • คลิกการ์ดเพื่อแก้ไข</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOpenAddColumn(true)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm bg-white hover:bg-gray-50 shadow-sm">
              <span className="text-lg">➕</span> เพิ่มคอลัมน์
            </button>
            <button onClick={() => onSaveBoard()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
              💾 บันทึก
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4">
        {error ? (
          <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{String(error)}</div>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={dndCollision}
          modifiers={dndModifiers}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {/* ชั้นคอลัมน์: ใช้ id = col:<key> สำหรับลากสลับคอลัมน์ */}
          <SortableContext items={statuses.map(s => colDragId(s.key))} strategy={horizontalListSortingStrategy}>
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
                          styleClass={box}
                          dotClass={dot}
                          onAddTask={() => setOpenAddCardFor(key)}
                          onEditColumn={openEditColumn}
                        >
                          {/* ⭐ Droppable ของคอลัมน์ (รับการ์ดเสมอ—even ว่าง) */}
                          <ColumnDropArea id={key}>
                            {tasks.length === 0 ? (
                              <div className="min-h-[80px] rounded-md border border-dashed border-slate-300" />
                            ) : null}
                            {tasks.map(t => (
                              <TaskCard key={t.id} task={t} dragDisabled={dragMode === 'col'} onClick={() => openEditTask(t.id)} />
                            ))}
                          </ColumnDropArea>
                        </Column>
                      </SortableContext>
                    </SortableColumnShell>
                  )
                })}
              </div>
            </div>
          </SortableContext>

          {/* ใช้ snapCenterToCursor + ทำเงาเท่าของจริงด้วย activeSize */}
          <DragOverlay modifiers={[snapCenterToCursor]}>
            {parseColId(activeId)
              ? (
                <div
                  className="rounded-xl border bg-white p-3 shadow-lg pointer-events-none"
                  style={{ width: 320 }}
                >
                  {statuses.find(s => s.key === parseColId(activeId))?.label || null}
                </div>
              )
              : (
                <TaskCardOverlay task={activeTask} size={activeSize} />
              )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      <AddColumnModal open={openAddColumn} onClose={() => setOpenAddColumn(false)} onCreate={createColumn} />

      <AddCardModal
        open={!!openAddCardFor}
        onClose={() => setOpenAddCardFor(null)}
        onCreate={createCard}
        defaultStatus={openAddCardFor || ''}
        memberOptions={memberOptions}
        roleOptions={roleOptions}
      />

      <EditColumnModal
        open={!!editColKey}
        onClose={() => setEditColKey(null)}
        column={statuses.find(s => s.key === editColKey) || null}
        onSave={saveEditColumn}
        onDelete={deleteColumn}
        isDeletable={(groupByStatus(items, statuses)[editColKey]?.length || 0) === 0}
      />

      <EditCardModal
        open={!!editTaskId}
        onClose={() => setEditTaskId(null)}
        task={items.find(t => t.id === editTaskId) || null}
        onSave={saveEditTask}
        onDelete={deleteTask}
        memberOptions={memberOptions}
        roleOptions={roleOptions}
      />
    </div>
  )
}
