// pages/index.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

type Chain = 'sol' | 'bsc'
type StatusFilter = 'all' | 'selling' | 'buying' | 'transferred' | 'holding'

interface CAEntry { ca: string; chain: Chain; label?: string }
interface Holder {
  address: string; chain: Chain; rank: number
  amount: number; amountUsd: number; pct: number
  costBasis: number; unrealizedPnl: number
  lastAction: string; lastActionTime: number
  isSmartMoney: boolean; isCex: boolean; cexName?: string
  status: 'selling' | 'buying' | 'holding' | 'transferred'
  holdChangePct: number; smartRank?: number | null
}
interface TokenInfo {
  symbol: string; name: string; price: number
  priceChange24h: number; marketCap: number; volume24h: number
  liquidity: number; holders: number
}
interface Summary { total: number; smartMoney: number; selling: number; buying: number; transferred: number; cex: number }
interface MonitoredToken { ca: string; chain: Chain; label?: string; tokenInfo?: TokenInfo; holders: Holder[]; summary?: Summary; loading: boolean; error?: string; lastUpdated?: number }

function fmt(n: number) {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}
function fmtAddr(a: string) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : '—' }
function fmtPct(n: number) { const s = n >= 0 ? '+' : ''; return `${s}${n.toFixed(1)}%` }
function timeSince(ts: number) {
  const d = Math.floor(Date.now() / 1000) - ts
  if (d < 60) return `${d}s前`
  if (d < 3600) return `${Math.floor(d / 60)}m前`
  if (d < 86400) return `${Math.floor(d / 3600)}h前`
  return `${Math.floor(d / 86400)}d前`
}

export default function Home() {
  const [caInput, setCaInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [chain, setChain] = useState<Chain>('sol')
  const [tokens, setTokens] = useState<MonitoredToken[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedCA, setSelectedCA] = useState<string | null>(null)
  const [alertLog, setAlertLog] = useState<string[]>([])
  const refreshRef = useRef<NodeJS.Timeout | null>(null)

  const addAlert = useCallback((msg: string) => {
    setAlertLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)])
  }, [])

  const loadToken = useCallback(async (entry: CAEntry) => {
    setTokens(prev => prev.map(t =>
      t.ca === entry.ca && t.chain === entry.chain ? { ...t, loading: true, error: undefined } : t
    ))
    try {
      const res = await fetch(`/api/holders?ca=${entry.ca}&chain=${entry.chain}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'API error')

      const prevToken = tokens.find(t => t.ca === entry.ca)
      const prevSelling = prevToken?.summary?.selling || 0
      const newSelling = data.summary?.selling || 0
      if (newSelling > prevSelling) {
        addAlert(`⚠️ ${data.tokenInfo?.symbol || fmtAddr(entry.ca)} [${entry.chain.toUpperCase()}] 出货钱包增加至 ${newSelling} 个`)
      }

      setTokens(prev => prev.map(t =>
        t.ca === entry.ca && t.chain === entry.chain
          ? { ...t, loading: false, tokenInfo: data.tokenInfo, holders: data.holders || [], summary: data.summary, lastUpdated: Date.now() }
          : t
      ))
    } catch (e: any) {
      setTokens(prev => prev.map(t =>
        t.ca === entry.ca && t.chain === entry.chain ? { ...t, loading: false, error: e.message } : t
      ))
    }
  }, [tokens, addAlert])

  const addToken = () => {
    const ca = caInput.trim()
    if (!ca) return
    const exists = tokens.some(t => t.ca === ca && t.chain === chain)
    if (exists) { setCaInput(''); return }
    const entry: MonitoredToken = { ca, chain, label: labelInput.trim() || undefined, holders: [], loading: true }
    setTokens(prev => [...prev, entry])
    setCaInput(''); setLabelInput('')
    if (!selectedCA) setSelectedCA(ca)
    loadToken({ ca, chain, label: labelInput.trim() || undefined })
  }

  const removeToken = (ca: string, ch: Chain) => {
    setTokens(prev => prev.filter(t => !(t.ca === ca && t.chain === ch)))
    if (selectedCA === ca) setSelectedCA(tokens.find(t => !(t.ca === ca && t.chain === ch))?.ca || null)
  }

  useEffect(() => {
    if (tokens.length === 0) return
    const interval = setInterval(() => {
      tokens.forEach(t => loadToken({ ca: t.ca, chain: t.chain, label: t.label }))
    }, 30000)
    return () => clearInterval(interval)
  }, [tokens.length])

  const currentToken = tokens.find(t => t.ca === selectedCA) || tokens[0]
  const displayedHolders = currentToken?.holders?.filter(h => filter === 'all' || h.status === filter) || []

  return (
    <>
      <Head>
        <title>Smart Money Monitor</title>
        <meta name="description" content="实时监控聪明钱动向" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0b0d;
          --surface: #111318;
          --surface2: #181c24;
          --border: #1e2430;
          --border2: #252d3d;
          --text: #e2e8f0;
          --muted: #64748b;
          --dim: #334155;
          --green: #22d3a0;
          --green-dim: #0d2e22;
          --red: #f43f5e;
          --red-dim: #2d0e17;
          --amber: #fbbf24;
          --amber-dim: #2d1f00;
          --blue: #60a5fa;
          --blue-dim: #0d1f3c;
          --purple: #a78bfa;
          --accent: #22d3a0;
        }
        html, body { background: var(--bg); color: var(--text); font-family: 'Space Grotesk', sans-serif; font-size: 14px; height: 100%; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .app { display: grid; grid-template-rows: auto 1fr; height: 100vh; max-height: 100vh; overflow: hidden; }
        .header { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; background: var(--surface); }
        .logo { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; color: var(--green); letter-spacing: 0.05em; white-space: nowrap; }
        .logo span { color: var(--muted); }
        .chain-toggle { display: flex; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .chain-btn { padding: 5px 14px; font-size: 12px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--muted); font-family: 'IBM Plex Mono', monospace; transition: all 0.15s; }
        .chain-btn.active { background: var(--accent); color: #000; }
        .input-group { display: flex; gap: 6px; flex: 1; min-width: 300px; }
        .input-group input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text); font-size: 12px; font-family: 'IBM Plex Mono', monospace; outline: none; }
        .input-group input:focus { border-color: var(--accent); }
        .input-group input::placeholder { color: var(--dim); }
        .btn { padding: 6px 14px; background: var(--accent); color: #000; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: 'Space Grotesk', sans-serif; transition: opacity 0.15s; }
        .btn:hover { opacity: 0.85; }
        .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
        .btn-ghost:hover { border-color: var(--border2); color: var(--text); }

        .body { display: grid; grid-template-columns: 220px 1fr 240px; height: 100%; overflow: hidden; }
        .sidebar { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-title { padding: 10px 14px; font-size: 10px; font-weight: 600; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .token-list { flex: 1; overflow-y: auto; }
        .token-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.1s; position: relative; }
        .token-item:hover { background: var(--surface2); }
        .token-item.active { background: var(--surface2); border-left: 2px solid var(--accent); }
        .token-sym { font-size: 13px; font-weight: 600; color: var(--text); }
        .token-ca { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 2px; }
        .token-chain-badge { display: inline-block; font-size: 9px; font-weight: 600; padding: 1px 5px; border-radius: 3px; margin-left: 6px; background: var(--blue-dim); color: var(--blue); font-family: 'IBM Plex Mono', monospace; }
        .token-chain-badge.bsc { background: var(--amber-dim); color: var(--amber); }
        .rm-btn { position: absolute; right: 8px; top: 10px; background: none; border: none; color: var(--dim); cursor: pointer; font-size: 14px; line-height: 1; }
        .rm-btn:hover { color: var(--red); }
        .empty-sidebar { padding: 20px 14px; font-size: 12px; color: var(--muted); line-height: 1.6; }

        .main { display: flex; flex-direction: column; overflow: hidden; }
        .token-header { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 20px; flex-wrap: wrap; background: var(--surface); }
        .token-title { font-size: 16px; font-weight: 600; }
        .token-price { font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
        .price-up { color: var(--green); }
        .price-down { color: var(--red); }
        .stat-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
        .chip { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; }
        .chip-red { background: var(--red-dim); color: var(--red); }
        .chip-green { background: var(--green-dim); color: var(--green); }
        .chip-amber { background: var(--amber-dim); color: var(--amber); }
        .chip-blue { background: var(--blue-dim); color: var(--blue); }
        .chip-dim { background: var(--surface2); color: var(--muted); }

        .filter-bar { padding: 8px 20px; border-bottom: 1px solid var(--border); display: flex; gap: 6px; align-items: center; }
        .filter-btn { padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: all 0.1s; }
        .filter-btn.active { background: var(--surface2); color: var(--text); border-color: var(--border2); }
        .refresh-time { margin-left: auto; font-size: 11px; color: var(--dim); font-family: 'IBM Plex Mono', monospace; }

        .table-wrap { flex: 1; overflow-y: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th { position: sticky; top: 0; background: var(--surface); padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 600; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid var(--border); white-space: nowrap; }
        tbody td { padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 12px; vertical-align: middle; }
        tbody tr:hover td { background: var(--surface2); }
        .addr-cell { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--blue); cursor: pointer; }
        .addr-cell:hover { text-decoration: underline; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; }
        .status-selling { background: var(--red-dim); color: var(--red); }
        .status-buying { background: var(--green-dim); color: var(--green); }
        .status-transferred { background: var(--amber-dim); color: var(--amber); }
        .status-holding { background: var(--surface2); color: var(--muted); }
        .smart-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; background: #2d1a5e; color: var(--purple); margin-left: 4px; }
        .cex-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; background: var(--amber-dim); color: var(--amber); margin-left: 4px; }
        .pct-pos { color: var(--green); }
        .pct-neg { color: var(--red); }
        .pct-zero { color: var(--muted); }
        .loading-row td { text-align: center; padding: 40px; color: var(--muted); }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .empty-main { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--muted); }
        .empty-icon { font-size: 40px; opacity: 0.3; }

        .right-panel { background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .panel-title { padding: 10px 14px; font-size: 10px; font-weight: 600; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .alert-log { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .alert-item { padding: 8px 10px; background: var(--surface2); border-radius: 4px; font-size: 11px; line-height: 1.4; border-left: 2px solid var(--red); color: var(--text); }
        .alert-time { font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: var(--muted); display: block; margin-top: 2px; }
        .no-alerts { padding: 20px 14px; font-size: 12px; color: var(--muted); }

        .stats-grid { padding: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-bottom: 1px solid var(--border); }
        .stat-box { background: var(--surface2); border-radius: 6px; padding: 8px 10px; }
        .stat-box-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
        .stat-box-val { font-size: 18px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; margin-top: 2px; }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">SM<span>/</span>MONITOR <span style={{color:'#22d3a0', marginLeft:4}}>v1.0</span></div>
          <div className="chain-toggle">
            <button className={`chain-btn${chain==='sol'?' active':''}`} onClick={()=>setChain('sol')}>SOL</button>
            <button className={`chain-btn${chain==='bsc'?' active':''}`} onClick={()=>setChain('bsc')}>BSC</button>
          </div>
          <div className="input-group">
            <input value={caInput} onChange={e=>setCaInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addToken()} placeholder="输入代币 CA 地址..." />
            <input value={labelInput} onChange={e=>setLabelInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addToken()} placeholder="备注（可选）" style={{maxWidth:120}} />
            <button className="btn" onClick={addToken}>+ 添加</button>
          </div>
        </header>

        <div className="body">
          {/* Left sidebar - token list */}
          <aside className="sidebar">
            <div className="sidebar-title">监控列表 ({tokens.length})</div>
            <div className="token-list">
              {tokens.length === 0 && (
                <div className="empty-sidebar">
                  输入代币 CA 地址开始监控<br /><br />
                  支持 Solana 和 BSC 双链，自动检测聪明钱动向
                </div>
              )}
              {tokens.map(t => (
                <div key={t.ca+t.chain} className={`token-item${currentToken?.ca===t.ca?' active':''}`} onClick={()=>setSelectedCA(t.ca)}>
                  <button className="rm-btn" onClick={e=>{e.stopPropagation();removeToken(t.ca,t.chain)}}>×</button>
                  <div className="token-sym">
                    {t.loading ? <span className="pulse" style={{color:'var(--muted)'}}>加载中…</span> : (t.tokenInfo?.symbol || t.label || '未知')}
                    <span className={`token-chain-badge${t.chain==='bsc'?' bsc':''}`}>{t.chain.toUpperCase()}</span>
                  </div>
                  <div className="token-ca">{fmtAddr(t.ca)}</div>
                  {t.summary && (
                    <div style={{marginTop:4, display:'flex', gap:4}}>
                      {t.summary.selling > 0 && <span className="chip chip-red" style={{fontSize:9,padding:'1px 6px'}}>{t.summary.selling} 出货</span>}
                      {t.summary.buying > 0 && <span className="chip chip-green" style={{fontSize:9,padding:'1px 6px'}}>{t.summary.buying} 买入</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="main">
            {!currentToken ? (
              <div className="empty-main">
                <div className="empty-icon">◎</div>
                <div style={{fontFamily:'IBM Plex Mono, monospace', fontSize:12}}>请添加代币 CA 开始监控</div>
              </div>
            ) : (
              <>
                {/* Token header */}
                <div className="token-header">
                  <div>
                    <div className="token-title">
                      {currentToken.tokenInfo?.name || currentToken.label || fmtAddr(currentToken.ca)}
                      {currentToken.tokenInfo?.symbol && <span style={{color:'var(--muted)',fontSize:13,fontWeight:400,marginLeft:8}}>{currentToken.tokenInfo.symbol}</span>}
                    </div>
                    <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:11,color:'var(--muted)',marginTop:2}}>{currentToken.ca}</div>
                  </div>
                  {currentToken.tokenInfo && (
                    <>
                      <div className="token-price">
                        <span style={{color:'var(--muted)',fontSize:11}}>价格 </span>
                        <span>{fmt(currentToken.tokenInfo.price)}</span>
                        <span className={currentToken.tokenInfo.priceChange24h>=0?'price-up':'price-down'} style={{fontSize:11,marginLeft:6}}>
                          {fmtPct(currentToken.tokenInfo.priceChange24h)}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>
                        <span>MC </span><span style={{color:'var(--text)'}}>{fmt(currentToken.tokenInfo.marketCap)}</span>
                        <span style={{marginLeft:12}}>Vol </span><span style={{color:'var(--text)'}}>{fmt(currentToken.tokenInfo.volume24h)}</span>
                      </div>
                    </>
                  )}
                  {currentToken.summary && (
                    <div className="stat-chips">
                      <span className="chip chip-red">{currentToken.summary.selling} 出货</span>
                      <span className="chip chip-green">{currentToken.summary.buying} 买入</span>
                      <span className="chip chip-amber">{currentToken.summary.transferred} 转移</span>
                      <span className="chip chip-blue">{currentToken.summary.smartMoney} 聪明钱</span>
                    </div>
                  )}
                  {currentToken.loading && <span className="pulse" style={{fontSize:11,color:'var(--muted)'}}>刷新中…</span>}
                  {!currentToken.loading && <button className="btn btn-ghost" style={{marginLeft:'auto',fontSize:11}} onClick={()=>loadToken({ca:currentToken.ca,chain:currentToken.chain,label:currentToken.label})}>↻ 刷新</button>}
                </div>

                {/* Filter bar */}
                <div className="filter-bar">
                  {(['all','selling','buying','transferred','holding'] as StatusFilter[]).map(f => (
                    <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                      {f==='all'?'全部':f==='selling'?'出货':f==='buying'?'买入':f==='transferred'?'转移':'持仓'}
                    </button>
                  ))}
                  <span className="refresh-time">
                    {currentToken.lastUpdated ? `更新于 ${new Date(currentToken.lastUpdated).toLocaleTimeString()}` : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="table-wrap">
                  {currentToken.error ? (
                    <div style={{padding:24,color:'var(--red)',fontSize:12,fontFamily:'IBM Plex Mono,monospace'}}>
                      错误: {currentToken.error}<br />
                      <span style={{color:'var(--muted)'}}>请检查 CA 地址是否正确</span>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>钱包地址</th>
                          <th>类型</th>
                          <th>持仓%</th>
                          <th>持仓变化</th>
                          <th>价值</th>
                          <th>最近动作</th>
                          <th>状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentToken.loading && displayedHolders.length === 0 ? (
                          <tr className="loading-row"><td colSpan={8}><span className="pulse">正在获取链上数据…</span></td></tr>
                        ) : displayedHolders.length === 0 ? (
                          <tr className="loading-row"><td colSpan={8}>没有符合条件的钱包</td></tr>
                        ) : displayedHolders.map((h, i) => (
                          <tr key={h.address}>
                            <td style={{color:'var(--dim)',fontFamily:'IBM Plex Mono,monospace',fontSize:11}}>{h.rank}</td>
                            <td>
                              <a className="addr-cell" href={
                                h.chain==='sol'
                                  ? `https://solscan.io/account/${h.address}`
                                  : `https://bscscan.com/address/${h.address}`
                              } target="_blank" rel="noopener noreferrer">
                                {fmtAddr(h.address)}
                              </a>
                              {h.isSmartMoney && <span className="smart-badge">SMART#{h.smartRank||'?'}</span>}
                              {h.isCex && <span className="cex-badge">{h.cexName||'CEX'}</span>}
                            </td>
                            <td style={{fontSize:11,color:'var(--muted)'}}>
                              {h.isCex ? '交易所' : h.isSmartMoney ? '聪明钱' : '普通'}
                            </td>
                            <td style={{fontFamily:'IBM Plex Mono,monospace'}}>{h.pct.toFixed(2)}%</td>
                            <td className={h.holdChangePct<0?'pct-neg':h.holdChangePct>0?'pct-pos':'pct-zero'} style={{fontFamily:'IBM Plex Mono,monospace'}}>
                              {fmtPct(h.holdChangePct)}
                            </td>
                            <td style={{fontFamily:'IBM Plex Mono,monospace'}}>{fmt(h.amountUsd)}</td>
                            <td style={{fontSize:11,color:'var(--muted)'}}>{timeSince(h.lastActionTime)}</td>
                            <td><span className={`status-badge status-${h.status}`}>
                              {h.status==='selling'?'出货':h.status==='buying'?'买入':h.status==='transferred'?'转移':'持仓'}
                            </span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </main>

          {/* Right panel - alerts */}
          <aside className="right-panel">
            {currentToken?.summary && (
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-box-label">总监控</div>
                  <div className="stat-box-val" style={{color:'var(--text)'}}>{currentToken.summary.total}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">聪明钱</div>
                  <div className="stat-box-val" style={{color:'var(--purple)'}}>{currentToken.summary.smartMoney}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">出货</div>
                  <div className="stat-box-val" style={{color:'var(--red)'}}>{currentToken.summary.selling}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-label">转交易所</div>
                  <div className="stat-box-val" style={{color:'var(--amber)'}}>{currentToken.summary.cex}</div>
                </div>
              </div>
            )}
            <div className="panel-title">警报记录</div>
            <div className="alert-log">
              {alertLog.length === 0 ? (
                <div className="no-alerts">暂无警报<br /><span style={{fontSize:10,color:'var(--dim)'}}>出货钱包增加时自动触发</span></div>
              ) : alertLog.map((a, i) => {
                const [time, ...rest] = a.split('] ')
                return (
                  <div key={i} className="alert-item">
                    {rest.join('] ')}
                    <span className="alert-time">{time.replace('[','')}</span>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
