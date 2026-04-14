import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

export type ToastItem = {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
type ToastListener = (toasts: ToastItem[]) => void
const listeners: ToastListener[] = []
let toasts: ToastItem[] = []

function notify() {
  listeners.forEach(l => l([...toasts]))
}

export const toast = {
  show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = ++toastId
    toasts = [...toasts, { id, message, type }]
    notify()
    if (type !== 'loading') {
      setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id)
        notify()
      }, duration)
    }
    return id
  },
  dismiss(id: number) {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  },
  success(msg: string) { return this.show(msg, 'success') },
  error(msg: string) { return this.show(msg, 'error') },
  info(msg: string) { return this.show(msg, 'info') },
  loading(msg: string) { return this.show(msg, 'loading', 999999) },
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  loading: (
    <svg className="w-5 h-5 text-blue-500 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l-3 3-5-3z" />
    </svg>
  ),
}

const bgMap: Record<ToastType, string> = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error: 'border-l-4 border-red-500 bg-white',
  info: 'border-l-4 border-blue-500 bg-white',
  loading: 'border-l-4 border-blue-400 bg-white',
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => {
      const idx = listeners.indexOf(setItems)
      if (idx !== -1) listeners.splice(idx, 1)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-80 pointer-events-none">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-800 pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-300 ${bgMap[item.type]}`}
        >
          {iconMap[item.type]}
          <span className="flex-1 leading-snug">{item.message}</span>
          <button
            onClick={() => toast.dismiss(item.id)}
            className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
