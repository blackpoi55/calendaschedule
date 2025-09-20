'use client'
import React, { useMemo, useState } from 'react'
import {
    DndContext, DragOverlay,
    PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ---- Mock / Constants ----
const STATUSES = [
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

const initialTasks = [
    { id: 1, title: 'กำหนดขอบเขตโครงการ', status: 'TODO', position: 0, labels: ['PM'], assignee: 'Anong' },
    { id: 2, title: 'ออกแบบฐานข้อมูล', status: 'DOING', position: 0, labels: ['DB'], assignee: 'Somchai' },
    { id: 3, title: 'พัฒนา API /auth', status: 'DOING', position: 1, labels: ['API'], assignee: null },
    { id: 4, title: 'หน้า Login (Next.js)', status: 'REVIEW', position: 0, labels: ['FE'], assignee: 'Anong', due_date: new Date().toISOString().slice(0, 10) },
    { id: 5, title: 'ตั้ง CI/CD', status: 'DONE', position: 0, labels: ['DevOps'], assignee: 'Somchai' },
]

// ---- Utils ----
const byPos = (a, b) => a.position - b.position
const groupByStatus = (items) => ({
    TODO: items.filter(i => i.status === 'TODO').sort(byPos),
    DOING: items.filter(i => i.status === 'DOING').sort(byPos),
    REVIEW: items.filter(i => i.status === 'REVIEW').sort(byPos),
    DONE: items.filter(i => i.status === 'DONE').sort(byPos),
})
const normalize = (items) => {
    const g = groupByStatus(items)
    return [
        ...g.TODO.map((t, i) => ({ ...t, position: i })),
        ...g.DOING.map((t, i) => ({ ...t, position: i })),
        ...g.REVIEW.map((t, i) => ({ ...t, position: i })),
        ...g.DONE.map((t, i) => ({ ...t, position: i })),
    ]
}

// ---- Components ----
function TaskCard({ task }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
    return (
        <>
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
        </>
    )
}

function Column({ status, tasks, children }) {
    return (
        <div className={`flex flex-col rounded-2xl border p-3 ${STATUS_STYLES[status]} min-h-[320px]`}>
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700">
                        {STATUSES.find(s => s.key === status)?.label}
                    </h3>
                </div>
                <span className="text-xs text-gray-500">{tasks.length}</span>
            </div>
            <div className="flex-1 space-y-2">{children}</div>
        </div>
    )
}

export default function BoardPage() {
    const [items, setItems] = useState(normalize(initialTasks))
    const [activeId, setActiveId] = useState(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor)
    )

    const cols = useMemo(() => groupByStatus(items), [items])
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

        if (overTask) {
            const from = a.status
            const to = overTask.status

            const origin = next.filter(t => t.status === from).sort(byPos).filter(t => t.id !== a.id)
            const target = next.filter(t => t.status === to).sort(byPos)

            const moved = { ...a, status: to }
            const idx = target.findIndex(t => t.id === overTask.id)
            target.splice(idx, 0, moved)

            const write = (list) => list.forEach((t, i) => {
                const k = next.findIndex(n => n.id === t.id)
                next[k] = { ...next[k], status: t.status, position: i }
            })

            write(origin)
            write(target)
            setItems(next)
            return
        }

        // กรณีปล่อยลงคอลัมน์โดยรวม (id ของ over เท่ากับ key ของคอลัมน์)
        const col = STATUSES.find(s => s.key === over.id)?.key
        if (col) {
            const origin = next.filter(t => t.status === a.status).sort(byPos).filter(t => t.id !== a.id)
            const target = next.filter(t => t.status === col).sort(byPos)
            const moved = { ...a, status: col }
            target.push(moved)

            const write = (list) => list.forEach((t, i) => {
                const k = next.findIndex(n => n.id === t.id)
                next[k] = { ...next[k], status: t.status, position: i }
            })

            write(origin)
            write(target)
            setItems(next)
        }
    }

    return (
        <div className="mx-auto max-w-7xl">
            <header className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Kanban (Mock Data)</h1>
                <div className="text-sm text-gray-500">ลากแล้ววางเพื่อจัดลำดับ</div>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {STATUSES.map(({ key }) => (
                        <SortableContext
                            key={key}
                            items={cols[key].map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Column status={key} tasks={cols[key]}>
                                {/* ใส่ id ไว้เผื่อรองรับการ drop ลงคอลัมน์ว่าง */}
                                <div id={key} className="space-y-2 min-h-[120px]" />
                                {cols[key].map(t => <TaskCard key={t.id} task={t} />)}
                            </Column>
                        </SortableContext>
                    ))}
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
