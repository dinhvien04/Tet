import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRealtimeWithFallback } from '@/lib/hooks/useRealtimeWithFallback'
import { createClient } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

describe('useRealtimeWithFallback', () => {
  let mockChannel: any
  let mockSupabase: any
  let subscribeCallback: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    subscribeCallback = null

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        subscribeCallback = callback
        return mockChannel
      })
    }

    mockSupabase = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn()
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start with disconnected status', () => {
    const fetchData = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
      })
    )

    expect(result.current.isConnected).toBe(false)
    expect(result.current.isPolling).toBe(false)
  })

  it('should connect to realtime when subscription succeeds', async () => {
    const fetchData = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
      })
    )

    // Simulate successful subscription
    if (subscribeCallback) {
      subscribeCallback('SUBSCRIBED', null)
    }

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
      expect(result.current.isPolling).toBe(false)
    })
  })

  it('should fallback to polling when realtime fails', async () => {
    const fetchData = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        pollInterval: 1000,
      })
    )

    // Simulate connection error 3 times (max attempts)
    if (subscribeCallback) {
      subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'))
      subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'))
      subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'))
    }

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isPolling).toBe(true)
    })

    // Verify polling is working
    expect(fetchData).toHaveBeenCalledTimes(0) // Not called yet

    vi.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(fetchData).toHaveBeenCalledTimes(1)
    })

    vi.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(fetchData).toHaveBeenCalledTimes(2)
    })
  })

  it('should call onInsert when new data is inserted', async () => {
    const fetchData = vi.fn().mockResolvedValue([])
    const onInsert = vi.fn()

    renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        onInsert,
      })
    )

    // Get the INSERT callback
    const insertCall = mockChannel.on.mock.calls.find(
      (call: any) => call[1]?.event === 'INSERT'
    )
    expect(insertCall).toBeDefined()

    const insertCallback = insertCall[2]
    const payload = { new: { id: '1', content: 'Test' } }

    insertCallback(payload)

    expect(onInsert).toHaveBeenCalledWith(payload)
  })

  it('should call onUpdate when data is updated', async () => {
    const fetchData = vi.fn().mockResolvedValue([])
    const onUpdate = vi.fn()

    renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        onUpdate,
      })
    )

    const updateCall = mockChannel.on.mock.calls.find(
      (call: any) => call[1]?.event === 'UPDATE'
    )
    expect(updateCall).toBeDefined()

    const updateCallback = updateCall[2]
    const payload = { new: { id: '1', content: 'Updated' }, old: { id: '1', content: 'Test' } }

    updateCallback(payload)

    expect(onUpdate).toHaveBeenCalledWith(payload)
  })

  it('should call onDelete when data is deleted', async () => {
    const fetchData = vi.fn().mockResolvedValue([])
    const onDelete = vi.fn()

    renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        onDelete,
      })
    )

    const deleteCall = mockChannel.on.mock.calls.find(
      (call: any) => call[1]?.event === 'DELETE'
    )
    expect(deleteCall).toBeDefined()

    const deleteCallback = deleteCall[2]
    const payload = { old: { id: '1' } }

    deleteCallback(payload)

    expect(onDelete).toHaveBeenCalledWith(payload)
  })

  it('should update lastUpdate timestamp on data changes', async () => {
    const fetchData = vi.fn().mockResolvedValue([])
    const onInsert = vi.fn()

    const { result } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        onInsert,
      })
    )

    expect(result.current.lastUpdate).toBeNull()

    // Simulate successful subscription
    if (subscribeCallback) {
      subscribeCallback('SUBSCRIBED', null)
    }

    // Trigger insert
    const insertCall = mockChannel.on.mock.calls.find(
      (call: any) => call[1]?.event === 'INSERT'
    )
    const insertCallback = insertCall[2]
    insertCallback({ new: { id: '1' } })

    await waitFor(() => {
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
    })
  })

  it('should cleanup subscriptions on unmount', () => {
    const fetchData = vi.fn().mockResolvedValue([])

    const { unmount } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
      })
    )

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('should stop polling on unmount', async () => {
    const fetchData = vi.fn().mockResolvedValue([])

    const { unmount } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        pollInterval: 1000,
      })
    )

    // Force polling mode
    if (subscribeCallback) {
      subscribeCallback('CHANNEL_ERROR', new Error('Failed'))
      subscribeCallback('CHANNEL_ERROR', new Error('Failed'))
      subscribeCallback('CHANNEL_ERROR', new Error('Failed'))
    }

    await waitFor(() => {
      expect(fetchData).toHaveBeenCalled()
    })

    const callCountBeforeUnmount = fetchData.mock.calls.length

    unmount()

    // Advance time and verify no more calls
    vi.advanceTimersByTime(5000)

    expect(fetchData).toHaveBeenCalledTimes(callCountBeforeUnmount)
  })

  it('should use custom poll interval', async () => {
    const fetchData = vi.fn().mockResolvedValue([])
    const customInterval = 3000

    renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        pollInterval: customInterval,
      })
    )

    // Force polling
    if (subscribeCallback) {
      subscribeCallback('CHANNEL_ERROR', new Error('Failed'))
      subscribeCallback('CHANNEL_ERROR', new Error('Failed'))
      subscribeCallback('CHANNEL_ERROR', new Error('Failed'))
    }

    await waitFor(() => {
      expect(fetchData).toHaveBeenCalled()
    })

    const initialCalls = fetchData.mock.calls.length

    // Advance by less than interval
    vi.advanceTimersByTime(2000)
    expect(fetchData).toHaveBeenCalledTimes(initialCalls)

    // Advance to complete interval
    vi.advanceTimersByTime(1000)
    await waitFor(() => {
      expect(fetchData).toHaveBeenCalledTimes(initialCalls + 1)
    })
  })

  it('should fallback to polling when connection closes', async () => {
    const fetchData = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() =>
      useRealtimeWithFallback({
        channelName: 'test-channel',
        table: 'posts',
        fetchData,
        pollInterval: 1000,
      })
    )

    // First connect successfully
    if (subscribeCallback) {
      subscribeCallback('SUBSCRIBED', null)
    }

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Then connection closes
    if (subscribeCallback) {
      subscribeCallback('CLOSED', null)
    }

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isPolling).toBe(true)
    })
  })
})
