'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useFamily } from '@/components/family/FamilyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Dice5 } from 'lucide-react'
import { toast } from 'sonner'

const BAU_CUA_ITEMS = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'] as const
type BauCuaItem = (typeof BAU_CUA_ITEMS)[number]

interface GameState {
  wallet: {
    balance: number
    available_balance: number
  }
  round: {
    id: string
    round_number: number
    status: 'betting' | 'rolling' | 'rolled'
    dice_results: BauCuaItem[]
    started_at: string
    rolled_at: string | null
  } | null
  bets_summary: Record<BauCuaItem, number>
  my_bets: Array<{ id: string; item: BauCuaItem; amount: number }>
  my_total_bet: number
  leaderboard: Array<{
    user_id: string
    name: string
    avatar: string | null
    balance: number
  }>
}

function getInitialBetAmounts() {
  return BAU_CUA_ITEMS.reduce<Record<BauCuaItem, string>>((acc, item) => {
    acc[item] = '10'
    return acc
  }, {} as Record<BauCuaItem, string>)
}

export default function BauCuaPage() {
  const { currentFamily } = useFamily()

  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<'start' | 'roll' | null>(null)
  const [betLoadingItem, setBetLoadingItem] = useState<BauCuaItem | null>(null)
  const [betAmounts, setBetAmounts] = useState<Record<BauCuaItem, string>>(getInitialBetAmounts())

  const fetchState = useCallback(
    async (silent = false) => {
      if (!currentFamily?.id) return

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await fetch(`/api/games/bau-cua?familyId=${currentFamily.id}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || 'Khong the tai game')
        }

        const data = (await response.json()) as GameState
        setState(data)
      } catch (error) {
        console.error('Error fetching Bau Cua state:', error)
        toast.error(error instanceof Error ? error.message : 'Khong the tai game')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [currentFamily?.id]
  )

  useEffect(() => {
    void fetchState()
  }, [fetchState])

  useEffect(() => {
    if (!currentFamily?.id) return

    const timer = setInterval(() => {
      void fetchState(true)
    }, 5000)

    return () => clearInterval(timer)
  }, [currentFamily?.id, fetchState])

  const handleStartRound = async () => {
    if (!currentFamily?.id) return
    try {
      setActionLoading('start')
      const response = await fetch('/api/games/bau-cua/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: currentFamily.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Khong the mo van moi')
      }

      toast.success('Da mo van moi')
      await fetchState(true)
    } catch (error) {
      console.error('Error starting round:', error)
      toast.error(error instanceof Error ? error.message : 'Khong the mo van moi')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePlaceBet = async (item: BauCuaItem) => {
    if (!currentFamily?.id) return
    const amount = Number(betAmounts[item])

    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error('Nhap so diem hop le')
      return
    }

    try {
      setBetLoadingItem(item)
      const response = await fetch('/api/games/bau-cua/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: currentFamily.id,
          item,
          amount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Khong the dat cuoc')
      }

      toast.success(`Dat cuoc ${amount} diem vao ${item}`)
      await fetchState(true)
    } catch (error) {
      console.error('Error placing bet:', error)
      toast.error(error instanceof Error ? error.message : 'Khong the dat cuoc')
    } finally {
      setBetLoadingItem(null)
    }
  }

  const handleRoll = async () => {
    if (!currentFamily?.id) return

    try {
      setActionLoading('roll')
      const response = await fetch('/api/games/bau-cua/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: currentFamily.id }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Khong the quay xuc xac')
      }

      const myNet = data?.my_net || 0
      if (myNet > 0) {
        toast.success(`Thang ${myNet} diem`)
      } else if (myNet < 0) {
        toast.error(`Thua ${Math.abs(myNet)} diem`)
      } else {
        toast('Van nay ban hoa diem')
      }

      await fetchState(true)
    } catch (error) {
      console.error('Error rolling dice:', error)
      toast.error(error instanceof Error ? error.message : 'Khong the quay xuc xac')
    } finally {
      setActionLoading(null)
    }
  }

  const myBetsByItem = useMemo(() => {
    const map = BAU_CUA_ITEMS.reduce<Record<BauCuaItem, number>>((acc, item) => {
      acc[item] = 0
      return acc
    }, {} as Record<BauCuaItem, number>)

    if (!state) return map
    state.my_bets.forEach((bet) => {
      map[bet.item] += bet.amount
    })
    return map
  }, [state])

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600">Vui long chon gia dinh de choi game</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-red-600">Bau Cua Online</h1>
              <p className="text-sm text-gray-600">
                Cuoc diem ao trong gia dinh. Khong lien quan tien that.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void fetchState(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lam moi'}
            </Button>
          </div>

          {loading || !state ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Vi diem cua ban</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-bold">{state.wallet.balance}</p>
                    <p className="text-sm text-muted-foreground">
                      Kha dung: {state.wallet.available_balance}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trang thai van</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {state.round ? (
                      <>
                        <p className="text-sm">Van #{state.round.round_number}</p>
                        <p className="text-sm font-medium uppercase">{state.round.status}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Chua co van nao</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dieu khien</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      onClick={handleStartRound}
                      disabled={actionLoading !== null}
                      className="flex-1"
                    >
                      {actionLoading === 'start' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Mo van moi'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRoll}
                      disabled={actionLoading !== null || state.round?.status !== 'betting'}
                      className="flex-1"
                    >
                      {actionLoading === 'roll' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Dice5 className="h-4 w-4 mr-2" />
                          Quay
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {state.round?.status === 'rolled' && state.round.dice_results.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ket qua van #{state.round.round_number}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {state.round.dice_results.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Ban cuoc</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BAU_CUA_ITEMS.map((item) => (
                      <div key={item} className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold uppercase">{item}</p>
                          <span className="text-xs text-muted-foreground">
                            Tong: {state.bets_summary[item] || 0}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ban da dat: {myBetsByItem[item] || 0}
                        </p>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor={`bet-${item}`} className="text-xs">
                              Diem
                            </Label>
                            <Input
                              id={`bet-${item}`}
                              type="number"
                              min={1}
                              value={betAmounts[item]}
                              onChange={(e) =>
                                setBetAmounts((prev) => ({ ...prev, [item]: e.target.value }))
                              }
                              disabled={state.round?.status !== 'betting' || betLoadingItem !== null}
                            />
                          </div>
                          <Button
                            onClick={() => void handlePlaceBet(item)}
                            disabled={state.round?.status !== 'betting' || betLoadingItem !== null}
                          >
                            {betLoadingItem === item ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Dat'
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cuoc cua ban</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {state.my_bets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chua dat cuoc</p>
                    ) : (
                      <div className="space-y-2">
                        {state.my_bets.map((bet) => (
                          <div key={bet.id} className="flex items-center justify-between text-sm">
                            <span className="uppercase">{bet.item}</span>
                            <span>{bet.amount}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t flex items-center justify-between font-medium">
                          <span>Tong dat</span>
                          <span>{state.my_total_bet}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bang xep hang</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {state.leaderboard.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chua co du lieu</p>
                    ) : (
                      <div className="space-y-2">
                        {state.leaderboard.map((entry, index) => (
                          <div
                            key={entry.user_id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate">
                              {index + 1}. {entry.name}
                            </span>
                            <span className="font-medium">{entry.balance}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
