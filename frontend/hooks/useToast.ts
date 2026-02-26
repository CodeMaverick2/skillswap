import { useToastStore } from '@/store/toast.store'

export function useToast() {
  return useToastStore()
}
