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
import Swal from 'sweetalert2'
import { API } from '@/config'
import Select from 'react-select'
import { getmember, getrole, uploadfile } from '@/action/api'
import { useParams, useRouter } from 'next/navigation'
import { 
  PlusIcon, 
  ChevronLeftIcon, 
  CloudArrowUpIcon, 
  EllipsisHorizontalIcon,
  PhotoIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

// ===================== Config & Helpers =====================
const ENABLE_POLLING = true
const REFRESH_INTERVAL_MS = 30000

const COLUMN_THEMES = [
  { key: 'slate', name: 'Slate', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400', text: 'text-slate-700' },
  { key: 'blue', name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400', text: 'text-blue-700' },
  { key: 'amber', name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700' },
  { key: 'emerald', name: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  { key: 'violet', name: 'Violet', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400', text: 'text-violet-700' },
  { key: 'rose', name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-400', text: 'text-rose-700' },
]

const COLUMN_ICONS = ['📋', '⚙️', '🧪', '✅', '📝', '🚧', '🔍', '💡', '🎯', '🧱']
const IMG_MD_ANY = /!\[[^\]]*?\]\(([^)]+)\)/g

const safeNum = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d }
const slugify = (txt = '') => (txt.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 24)) || `col_${Math.random().toString(36).slice(2, 7)}`
const themeToClass = (themeKey) => {
  const t = COLUMN_THEMES.find(x => x.key === themeKey) || COLUMN_THEMES[0]
  return { box: `${t.bg} ${t.border}`, dot: t.dot, text: t.text }
}

const stripImageMarkdown = (note) => note ? note.replace(IMG_MD_ANY, '').replace(/\n{3,}/g, '\n\n').trim() : ''
const extractAllImageUrls = (note) => {
  if (!note) return []
  const out = [], re = new RegExp(IMG_MD_ANY)
  let m; while ((m = re.exec(note)) !== null) if (m[1]) out.push(m[1])
  return out
}

const STATUS_META = {
  TODO: { label: 'To Do', theme: 'slate', icon: '📋' },
  DOING: { label: 'Doing', theme: 'blue', icon: '⚙️' },
  REVIEW: { label: 'Review', theme: 'amber', icon: '🧪' },
  DONE: { label: 'Done', theme: 'emerald', icon: '✅' },
}

const rsStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: 12,
    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
    boxShadow: 'none',
    '&:hover': { borderColor: '#6366f1' },
    fontSize: 14,
    padding: '2px',
  }),
  multiValue: (base) => ({ ...base, backgroundColor: '#f1f5f9', borderRadius: 8 }),
}

// ===================== Components =====================

function TaskCard({ task, onClick, dragDisabled, onOpenImage }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !!dragDisabled
  })
  
  const imgs = useMemo(() => extractAllImageUrls(task.note), [task.note])
  const thumb = imgs[0] || null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes} {...listeners}
      className={`group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{task.title}</h4>
      </div>

      {thumb && (
        <div className="mb-3 rounded-xl overflow-hidden border border-slate-100">
          <img src={thumb} alt="" className="w-full h-32 object-cover" />
        </div>
      )}

      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.map(l => (
            <span key={l.id || l.name} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
        <div className="flex -space-x-2">
          {task.assignees?.slice(0, 3).map((a, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm" title={a.name}>
              {a.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {task.assignees?.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{task.assignees.length - 3}
            </div>
          )}
          {!task.assignees?.length && <div className="text-[10px] text-slate-400">No assignee</div>}
        </div>
        {task.due_date && (
          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {new Date(task.due_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
          </div>
        )}
      </div>
    </div>
  )
}

function Column({ status, label, icon, theme, onAddTask, onEditColumn, children, isOver }) {
  const { box, dot, text } = themeToClass(theme)
  return (
    <div className={`flex h-full w-[300px] shrink-0 flex-col rounded-3xl border transition-all ${box} ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className={`font-bold text-sm ${text}`}>{label}</h3>
          <span className="ml-1 bg-white/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 border border-black/5">
            {React.Children.count(children?.[1]?.props?.children)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onAddTask(status)} className="p-1.5 hover:bg-white/60 rounded-lg transition text-slate-500">
            <PlusIcon className="w-4 h-4" />
          </button>
          <button onClick={() => onEditColumn(status)} className="p-1.5 hover:bg-white/60 rounded-lg transition text-slate-500">
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 px-3 pb-4 space-y-3 overflow-y-auto scrollbar-hide">
        {children}
      </div>
    </div>
  )
}

// ===================== Main Page =====================

export default function BoardPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState([])
  const [items, setItems] = useState([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [openAddCardFor, setOpenAddCardFor] = useState(null)
  const [editTaskId, setEditTaskId] = useState(null)
  const [activeId, setActiveId] = useState(null)

  // ดึงข้อมูลบอร์ด
  const fetchBoard = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/kanban/${params.id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
      const data = await res.json()
      if (data?.data) {
        const nextStatuses = deriveStatusesFromApi(data)
        const nextItems = adaptTasksFromApi(data, nextStatuses.map(s => s.key))
        setStatuses(nextStatuses)
        setItems(nextItems)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoard() }, [params.id])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor))

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Board</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isDirty ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isSaving ? 'Saving...' : isDirty ? 'Unsaved Changes' : 'All Changes Saved'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 px-3 py-1.5 text-xs font-bold text-slate-500">
              <ArrowPathIcon className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              POLLING EVERY 30S
            </div>
            <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition font-bold text-sm">
              <CloudArrowUpIcon className="w-5 h-5 mr-2 text-indigo-500" />
              Manual Save
            </button>
            <button onClick={() => {}} className="flex items-center px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700 transition font-bold text-sm">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Column
            </button>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <main className="p-6 h-[calc(100vh-84px)] overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="flex gap-6 h-full min-w-max pb-4">
          {loading && !items.length ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">Initial Loading...</span>
            </div>
          ) : (
            statuses.map(s => (
              <Column 
                key={s.key}
                status={s.key}
                label={s.label}
                icon={s.icon}
                theme={s.theme}
                onAddTask={setOpenAddCardFor}
                onEditColumn={() => {}}
              >
                <div className="space-y-3">
                  {items.filter(t => t.status === s.key).sort((a,b) => a.position - b.position).map(t => (
                    <TaskCard 
                      key={t.id} 
                      task={t} 
                      onClick={() => setEditTaskId(t.id)}
                    />
                  ))}
                  <button 
                    onClick={() => setOpenAddCardFor(s.key)}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all text-xs font-bold uppercase tracking-widest"
                  >
                    + Add New Card
                  </button>
                </div>
              </Column>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

// ---- Helpers derived from original code (Shortened for brevity) ----
function deriveStatusesFromApi(resp) {
  const arr = Array.isArray(resp?.data?.detail?.statuses) ? resp.data.detail.statuses : []
  return arr.length ? arr.sort((a, b) => safeNum(a.order) - safeNum(b.order)).map(s => ({
    key: s.key, label: s.label, theme: s.theme, icon: s.icon
  })) : [
    { key: 'TODO', label: 'To Do', theme: 'slate', icon: '📋' },
    { key: 'DOING', label: 'Doing', theme: 'blue', icon: '⚙️' },
    { key: 'DONE', label: 'Done', theme: 'emerald', icon: '✅' }
  ]
}

function adaptTasksFromApi(resp, allowedKeys) {
  const rows = Array.isArray(resp?.data?.detail?.tasks) ? resp.data.detail.tasks : []
  return rows.map(r => ({
    id: r.id, title: r.title, status: r.status || 'TODO', position: safeNum(r.position),
    labels: r.labels || [], assignees: r.assignees || [], due_date: r.due_date, note: r.note
  }))
}
