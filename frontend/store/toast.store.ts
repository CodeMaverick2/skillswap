import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, type?: ToastType, duration?: number) => void
  hide: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).slice(2)
    set(state => ({ toasts: [...state.toasts, { id, message, type, duration }] }))
    setTimeout(() => get().hide(id), duration)
  },
  hide: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  success: (message) => get().show(message, 'success'),
  error: (message) => get().show(message, 'error', 4000),
  info: (message) => get().show(message, 'info'),
}))
