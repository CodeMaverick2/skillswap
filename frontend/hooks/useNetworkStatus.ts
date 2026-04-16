import { useEffect, useState } from 'react'
import * as Network from 'expo-network'

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    let timer: ReturnType<typeof setInterval> | null = null

    const refresh = async () => {
      try {
        const state = await Network.getNetworkStateAsync()
        if (!mounted) return
        setIsConnected(!!state.isConnected && !!state.isInternetReachable)
      } catch {
        if (!mounted) return
        setIsConnected(false)
      } finally {
        if (mounted) setIsChecking(false)
      }
    }

    refresh()
    timer = setInterval(refresh, 5000)

    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
  }, [])

  return { isConnected, isChecking }
}
