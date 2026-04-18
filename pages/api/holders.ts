import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchSmartMoneyTop, fetchTokenInfo, fetchTokenSmartHolders, Chain } from '@/lib/gmgn'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ca, chain } = req.query
  if (!ca || !chain) return res.status(400).json({ success: false, error: 'Missing ca or chain' })
  const chainId = chain as Chain
  try {
    const [smartWallets, tokenInfo, holders] = await Promise.all([
      fetchSmartMoneyTop(chainId, 50),
      fetchTokenInfo(ca as string, chainId),
      fetchTokenSmartHolders(ca as string, chainId, [], 50),
    ])
    const smartSet = new Set(smartWallets.map(w => w.address.toLowerCase()))
    const enriched = holders.map(h => ({
      ...h,
      isSmartMoney: smartSet.has(h.address.toLowerCase()),
      smartRank: smartWallets.findIndex(w => w.address.toLowerCase() === h.address.toLowerCase()) + 1 || null,
    }))
    const sellingCount = enriched.filter(h => h.status === 'selling').length
    const buyingCount = enriched.filter(h => h.status === 'buying').length
    const transferCount = enriched.filter(h => h.status === 'transferred').length
    const smartCount = enriched.filter(h => h.isSmartMoney).length
    const cexCount = enriched.filter(h => h.isCex).length
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate')
    return res.status(200).json({
      success: true,
      tokenInfo,
      holders: enriched,
      summary: {
        total: enriched.length,
        smartMoney: smartCount,
        selling: sellingCount,
        buying: buyingCount,
        transferred: transferCount,
        cex: cexCount,
      }
    })
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message })
  }
}