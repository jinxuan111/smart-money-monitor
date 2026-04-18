import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchSmartMoneyTop, Chain } from '@/lib/gmgn'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const chain = (req.query.chain as Chain) || 'sol'
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  try {
    const wallets = await fetchSmartMoneyTop(chain, limit)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json({ success: true, data: wallets, chain, count: wallets.length })
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message })
  }
}