const GMGN_BASE = 'https://gmgn.ai/defi/quotation/v1'

export type Chain = 'sol' | 'bsc'

export interface SmartWallet {
  address: string; chain: Chain; rank: number
  winRate: number; pnl30d: number; txCount: number; tags: string[]
}

export interface TokenHolder {
  address: string; chain: Chain; rank: number
  amount: number; amountUsd: number; pct: number
  costBasis: number; unrealizedPnl: number
  lastAction: string; lastActionTime: number
  isSmartMoney: boolean; isCex: boolean; cexName?: string
  status: 'selling' | 'buying' | 'holding' | 'transferred'
  holdChangePct: number
}

export interface TokenInfo {
  address: string; symbol: string; name: string; price: number
  priceChange24h: number; marketCap: number; volume24h: number
  liquidity: number; holders: number; chain: Chain
}

export async function fetchSmartMoneyTop(chain: Chain, limit = 50): Promise<SmartWallet[]> {
  try {
    const url = `${GMGN_BASE}/rank/${chain}/wallets/7d?orderby=pnl&direction=desc&limit=${limit}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`GMGN error ${res.status}`)
    const data = await res.json()
    const list = data?.data?.rank || data?.data || []
    return list.slice(0, limit).map((w: any, i: number) => ({
      address: w.wallet_address || w.address,
      chain, rank: i + 1,
      winRate: parseFloat(w.winrate || 0) * 100,
      pnl30d: parseFloat(w.pnl_30d || 0),
      txCount: parseInt(w.txs_30d || 0),
      tags: w.tags || [],
    }))
  } catch (e) {
    console.error('fetchSmartMoneyTop error:', e)
    return []
  }
}

export async function fetchTokenInfo(ca: string, chain: Chain): Promise<TokenInfo | null> {
  try {
    const url = `${GMGN_BASE}/tokens/${chain}/${ca}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`Token info error ${res.status}`)
    const data = await res.json()
    const t = data?.data?.token || data?.data || {}
    return {
      address: ca, symbol: t.symbol || '???', name: t.name || 'Unknown',
      price: parseFloat(t.price || 0),
      priceChange24h: parseFloat(t.price_change_24h || 0),
      marketCap: parseFloat(t.market_cap || 0),
      volume24h: parseFloat(t.volume_24h || 0),
      liquidity: parseFloat(t.liquidity || 0),
      holders: parseInt(t.holder_count || 0),
      chain,
    }
  } catch (e) {
    console.error('fetchTokenInfo error:', e)
    return null
  }
}

export async function fetchTokenSmartHolders(
  ca: string, chain: Chain, smartWallets: SmartWallet[], limit = 50
): Promise<TokenHolder[]> {
  try {
    const url = `${GMGN_BASE}/tokens/${chain}/${ca}/top_holders?limit=${limit}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      next: { revalidate: 30 },
    })
    if (!res.ok) throw new Error(`Holders error ${res.status}`)
    const data = await res.json()
    const holders = data?.data?.holders || data?.data || []
    const smartSet = new Set(smartWallets.map(w => w.address.toLowerCase()))
    return holders.map((h: any, i: number) => {
      const changeAmt = parseFloat(h.balance_change || 0)
      const totalAmt = parseFloat(h.balance || 1)
      const changePct = totalAmt > 0 ? (changeAmt / totalAmt) * 100 : 0
      let status: TokenHolder['status'] = 'holding'
      if (changePct < -5) status = 'selling'
      else if (changePct > 5) status = 'buying'
      else if (h.last_action === 'transfer') status = 'transferred'
      return {
        address: h.wallet_address || h.address || '',
        chain, rank: i + 1,
        amount: parseFloat(h.balance || 0),
        amountUsd: parseFloat(h.balance_usd || 0),
        pct: parseFloat(h.percent || 0) * 100,
        costBasis: parseFloat(h.cost_basis || 0),
        unrealizedPnl: parseFloat(h.unrealized_pnl || 0),
        lastAction: h.last_action || 'unknown',
        lastActionTime: parseInt(h.last_active_timestamp || Date.now() / 1000),
        isSmartMoney: smartSet.has((h.wallet_address || '').toLowerCase()),
        isCex: !!(h.is_cex || h.cex_name),
        cexName: h.cex_name,
        status,
        holdChangePct: changePct,
      }
    })
  } catch (e) {
    console.error('fetchTokenSmartHolders error:', e)
    return []
  }
}