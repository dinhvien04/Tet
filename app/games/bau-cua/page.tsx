'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useFamily } from '@/components/family/FamilyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Dice5, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const BAU_CUA_ITEMS = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'] as const
type BauCuaItem = (typeof BAU_CUA_ITEMS)[number]
const BOARD_LAYOUT: BauCuaItem[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom']

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

const ITEM_META: Record<BauCuaItem, { label: string; icon: string; accent: string; decor: [string, string, string, string] }> = {
  bau: { label: 'Bau', icon: '🎃', accent: '#c81e1e', decor: ['🧧', '✨', '🎋', '🪔'] },
  cua: { label: 'Cua', icon: '🦀', accent: '#dc2626', decor: ['🧨', '🎊', '🧧', '🎇'] },
  tom: { label: 'Tom', icon: '🦐', accent: '#e85d04', decor: ['🌿', '🧧', '🎍', '🪙'] },
  ca: { label: 'Ca', icon: '🐟', accent: '#2563eb', decor: ['🌊', '🎏', '🧧', '🪙'] },
  ga: { label: 'Ga', icon: '🐓', accent: '#ca8a04', decor: ['🪭', '🎐', '🧧', '✨'] },
  nai: { label: 'Nai', icon: '🦌', accent: '#b45309', decor: ['🎉', '🧧', '🎊', '🍀'] },
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
        body: JSON.stringify({ familyId: currentFamily.id, item, amount }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Khong the dat cuoc')
      }

      toast.success(`Dat ${amount} diem vao ${ITEM_META[item].label}`)
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
      if (myNet > 0) toast.success(`Thang ${myNet} diem`)
      else if (myNet < 0) toast.error(`Thua ${Math.abs(myNet)} diem`)
      else toast('Van nay hoa diem')

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

  const rolledItemSet = useMemo(() => new Set(state?.round?.dice_results || []), [state?.round?.dice_results])

  const canBet = state?.round?.status === 'betting' && actionLoading === null
  const canRoll = state?.round?.status === 'betting' && actionLoading === null

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
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="rounded-2xl border border-[#e8bf85] bg-[linear-gradient(120deg,#fff4df_0%,#fee6c0_100%)] p-5 md:p-6 shadow-[0_16px_40px_rgba(131,74,13,0.15)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase text-[#8f4f0f] font-semibold">Tet Board</p>
                <h1 className="text-3xl md:text-4xl font-black text-[#8c1f17]">Bau Cua Online</h1>
                <p className="text-sm text-[#5f4122] mt-1">Bo cuc theo chieu bau cua co truyen (2 hang, moi hang 3 o)</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void fetchState(true)}
                  disabled={loading || refreshing}
                  className="border-[#d6ab6f] bg-white/70"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-2" />Lam moi</>}
                </Button>
                <Button onClick={handleStartRound} disabled={actionLoading !== null} className="bg-[#b91c1c] hover:bg-[#991b1b] text-white">
                  {actionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mo van moi'}
                </Button>
                <Button variant="outline" onClick={handleRoll} disabled={!canRoll} className="border-[#955f1d] text-[#7b4208] bg-[#fff4df]">
                  {actionLoading === 'roll' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Dice5 className="h-4 w-4 mr-2" />Quay</>}
                </Button>
              </div>
            </div>

            {state?.round && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-white border border-[#ebcb9a]">Van #{state.round.round_number}</span>
                <span className="px-3 py-1 rounded-full bg-white border border-[#ebcb9a] uppercase">{state.round.status}</span>
                <span className="px-3 py-1 rounded-full bg-white border border-[#ebcb9a]">Vi: {state.wallet.balance}</span>
                <span className="px-3 py-1 rounded-full bg-white border border-[#ebcb9a]">Kha dung: {state.wallet.available_balance}</span>
              </div>
            )}
          </section>

          {loading || !state ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-9 w-9 animate-spin text-red-600" /></div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-[#7a2b15]">Ban cuoc</h2>
                  <p className="text-xs text-muted-foreground">Thu tu dung theo mau: nai - bau - ga / ca - cua - tom</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {BOARD_LAYOUT.map((item) => {
                    const meta = ITEM_META[item]
                    const isHit = state.round?.status === 'rolled' && rolledItemSet.has(item)
                    const [decoTL, decoTR, decoBL, decoBR] = meta.decor

                    return (
                      <div
                        key={item}
                        className={`rounded-[26px] p-2 border border-[#2b5cb0]/40 shadow-[0_15px_26px_rgba(24,62,130,0.24)] bg-[#2f64bd] transition-all ${isHit ? 'ring-4 ring-[#f6d365] scale-[1.015]' : ''}`}
                      >
                        <div className="relative aspect-square rounded-[22px] overflow-hidden bg-[#2f64bd]">
                          <span className="absolute left-3 top-2 text-xl">{decoTL}</span>
                          <span className="absolute right-3 top-2 text-xl">{decoTR}</span>
                          <span className="absolute left-3 bottom-2 text-xl">{decoBL}</span>
                          <span className="absolute right-3 bottom-2 text-xl">{decoBR}</span>

                          <div className="absolute inset-[7%] rounded-full bg-[repeating-conic-gradient(from_0deg,#e5b85f_0deg_10deg,#2f64bd_10deg_20deg)]" />
                          <div className="absolute inset-[12%] rounded-full border-[4px] border-[#d53b30] bg-white" />

                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <span className="text-7xl md:text-8xl" role="img" aria-label={meta.label}>{meta.icon}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.12em]" style={{ backgroundColor: `${meta.accent}1A`, color: meta.accent }}>
                              {meta.label}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-end gap-2">
                          <div className="flex-1">
                            <p className="text-[10px] text-[#eaf2ff] mb-1 uppercase">Diem dat</p>
                            <Input
                              type="number"
                              min={1}
                              value={betAmounts[item]}
                              onChange={(e) => setBetAmounts((prev) => ({ ...prev, [item]: e.target.value }))}
                              disabled={!canBet || betLoadingItem !== null}
                              className="h-9 bg-white border-[#dab479]"
                            />
                          </div>
                          <Button
                            onClick={() => void handlePlaceBet(item)}
                            disabled={!canBet || betLoadingItem !== null}
                            className="h-9 bg-[#b91c1c] hover:bg-[#991b1b] text-white"
                          >
                            {betLoadingItem === item ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dat'}
                          </Button>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#eaf2ff]">
                          <span>Cua ban: {myBetsByItem[item] || 0}</span>
                          <span>Tong ban: {state.bets_summary[item] || 0}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {state.round?.status === 'rolled' && state.round.dice_results.length > 0 && (
                <Card className="border-[#ebcb99] bg-[#fff9f0]">
                  <CardHeader>
                    <CardTitle className="text-[#7a2d17]">Ket qua van #{state.round.round_number}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {state.round.dice_results.map((item, index) => (
                        <div key={`${item}-${index}`} className="px-3 py-2 rounded-xl border border-[#e8cb9c] bg-white flex items-center gap-2">
                          <span className="text-2xl">{ITEM_META[item].icon}</span>
                          <span className="text-sm font-semibold uppercase">{ITEM_META[item].label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-[#ebcb99] bg-[#fff9f0]">
                  <CardHeader><CardTitle className="text-[#7a2d17]">Cuoc cua ban</CardTitle></CardHeader>
                  <CardContent>
                    {state.my_bets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chua dat cuoc o van nay</p>
                    ) : (
                      <div className="space-y-2">
                        {state.my_bets.map((bet) => (
                          <div key={bet.id} className="flex items-center justify-between rounded-lg border border-[#efd8b4] bg-white px-3 py-2 text-sm">
                            <span className="uppercase font-semibold">{ITEM_META[bet.item].label}</span>
                            <span>{bet.amount}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[#ecd3ae] flex items-center justify-between text-sm font-semibold">
                          <span>Tong dat</span>
                          <span>{state.my_total_bet}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-[#ebcb99] bg-[#fff9f0]">
                  <CardHeader><CardTitle className="text-[#7a2d17]">Bang xep hang</CardTitle></CardHeader>
                  <CardContent>
                    {state.leaderboard.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chua co du lieu</p>
                    ) : (
                      <div className="space-y-2">
                        {state.leaderboard.map((entry, index) => (
                          <div key={entry.user_id} className="flex items-center justify-between rounded-lg border border-[#efd8b4] bg-white px-3 py-2 text-sm">
                            <span className="truncate">{index + 1}. {entry.name}</span>
                            <span className="font-semibold">{entry.balance}</span>
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