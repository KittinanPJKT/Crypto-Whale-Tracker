import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid} from 'recharts'

function App() {
  const [whales, setWhales] = useState([])
  const [minVolume, setMinVolume] = useState(0)
  const [selectedSymbol, setSelectedSymbol] = useState('ALL')
  
  const [isPaused, setIsPaused] = useState(false)
  const [toast, setToast] = useState(null)
  
  const [backendThreshold, setBackendThreshold] = useState(100000)

  const isPausedRef = useRef(isPaused)
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    fetch('http://localhost:9090/api/threshold')
      .then(res => res.json())
      .then(data => setBackendThreshold(data.value))
      .catch(err => console.error(err))
  }, [])

  const updateBackendThreshold = (newValue) => {
    setBackendThreshold(newValue)
    fetch('http://localhost:9090/api/threshold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: Number(newValue) })
    }).catch(err => console.error(err))
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const filteredWhales = whales.filter((whale) => {
    const value = parseFloat(whale.p) * parseFloat(whale.q)
    const matchVolume = value >= minVolume
    const matchSymbol = selectedSymbol === 'ALL' || whale.s === selectedSymbol
    return matchVolume && matchSymbol
  })

  const totalWhales = filteredWhales.length
  const totalVolume = filteredWhales.reduce((sum, whale) => sum + (parseFloat(whale.p) * parseFloat(whale.q)), 0)
  
  const chartData = [...filteredWhales].reverse().map((whale, index) =>({
    time: index + 1,
    volume: parseFloat(whale.p) * parseFloat(whale.q),
    price: parseFloat(whale.p)
  }))

  useEffect(() => {
    fetch('http://localhost:9090/api/whales')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const historyWhales = data.map((record) => ({
            s: record.symbol || 'BTCUSDT',
            p: record.price.toString(),
            q: record.quantity.toString(),
            isHistory: true,
            // เพิ่มการอ่านเวลาประวัติเก่า (ถ้าหลังบ้านส่งมา ถ้าไม่มีให้ขึ้นว่า History)
            timestamp: record.created_at ? new Date(record.created_at).toLocaleTimeString('th-TH', { hour12: false }) : 'Historical'
          }))
          setWhales(historyWhales)
        }
      })
      .catch((err) => console.error('ดึงประวัติล้มเหลว : ', err))
    
    const ws = new WebSocket('ws://localhost:9090/ws')

    ws.onopen = () => console.log('Connected to Go Server!')

    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data)
      trade.isHistory = false
      
      // 🌟 สร้างเวลาประทับ (Timestamp) ณ วินาทีที่ข้อมูลวิ่งเข้ามา
      trade.timestamp = new Date().toLocaleTimeString('th-TH', { hour12: false })
      
      const tradeValue = parseFloat(trade.p) * parseFloat(trade.q)

      if (tradeValue >= 500000) {
        setToast({
          symbol: trade.s || 'BTC',
          value: tradeValue
        })
      }

      setWhales((prevWhales) => {
        if (isPausedRef.current) return prevWhales
        return [trade, ...prevWhales].slice(0, 50)
      })
    }

    return () => ws.close()
  }, [])

  const formatSymbol = (symbol) => {
    if (!symbol) return 'BTC'
    return symbol.replace('USDT', '')
  }

  return (
    <div className="relative min-h-screen bg-slate-950 p-4 md:p-8 font-sans overflow-hidden">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-8 right-8 z-50 animate-bounce transition-all duration-300">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/50 border-l-4 border-l-amber-500 p-4 rounded-xl shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)] flex items-center gap-4">
            <div className="text-3xl">🚨</div>
            <div>
              <p className="text-amber-400 font-bold text-xs tracking-widest mb-1">MEGA WHALE DETECTED!</p>
              <p className="text-white font-mono text-lg font-bold">
                ${toast.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm text-slate-400 font-sans font-normal ml-1">{formatSymbol(toast.symbol)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Background Lights */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed top-[40%] left-[30%] w-[800px] h-[400px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              Whale Tracker
            </h1>
            <p className="text-sm text-slate-400 mt-1">Real-time Multi-Coin Transactions (BTC, ETH, SOL)</p> 
          </div>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg transition-all duration-300 ${
              isPaused 
                ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20' 
                : 'bg-slate-800/40 backdrop-blur-md border-white/5 hover:bg-slate-700/50'
            }`}
          >
            {!isPaused ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-mono text-sm tracking-wide">Live Stream</span>
              </>
            ) : (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-amber-400 font-mono text-sm tracking-wide">Paused</span>
              </>
            )}
          </button>    
        </div>

        {/* Stats Summary */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10 shadow-2xl flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1 tracking-wide">TOTAL WHALES CAUGHT ({selectedSymbol})</p>
            <p className="text-white text-3xl font-bold">{totalWhales} <span className="text-sm text-slate-500 font-normal">TXs</span></p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm font-medium mb-1 tracking-wide">TOTAL VOLUME</p>
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 text-3xl font-mono font-bold">
              ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg gap-1">
            {['ALL', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 ${
                  selectedSymbol === symbol
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {symbol === 'ALL' ? '🌐 ALL' : formatSymbol(symbol)}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <label className="text-amber-400 text-sm font-medium tracking-wide">BACKEND FILTER ($):</label>
              <input 
                type="number"
                value={backendThreshold}
                onChange={(e) => updateBackendThreshold(e.target.value)}
                className="bg-slate-900/50 backdrop-blur-md border border-amber-500/30 text-amber-400 font-mono text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-2.5 w-32 shadow-inner outline-none transition-all"
                min="0"
                step="10000"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-slate-400 text-sm font-medium tracking-wide">MIN VOLUME ($):</label>
              <input 
                type="number"
                value={minVolume}
                onChange={(e) => setMinVolume(Number(e.target.value))}
                className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 w-32 shadow-inner outline-none transition-all"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Chart */}
        {filteredWhales.length > 0 && (
          <div className="bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl mb-8 h-80">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-emerald-400/90 font-semibold text-sm tracking-widest">REAL-TIME VOLUME TREND ($)</h2>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                  formatter={(value) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Volume']}
                  labelStyle={{ display: 'none' }}
                />
                <Line type="monotone" dataKey="volume" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#022c22' }} activeDot={{ r: 7, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Data Feed Section */}
        <div className="space-y-4">
          {filteredWhales.length === 0 ? (
            <div className="bg-slate-800/30 backdrop-blur-md border border-white/5 rounded-2xl p-10 text-center shadow-inner">
              <p className="text-slate-400 italic">Waiting for whales in {selectedSymbol} above ${minVolume}...</p>
            </div>
          ) : (
            filteredWhales.map((whale, index) => {
              const price = parseFloat(whale.p)
              const qty = parseFloat(whale.q)
              const value = price * qty
              const symbolText = formatSymbol(whale.s)

              return (
                <div
                  key={index}
                  className={`p-5 rounded-2xl flex justify-between items-center shadow-lg border-l-4 transition-all duration-500 hover:scale-[1.01] hover:bg-slate-700/50 ${
                    whale.isHistory
                      ? 'bg-slate-800/30 backdrop-blur-md border-white/5 border-l-slate-600'
                      : 'bg-slate-800/50 backdrop-blur-xl border-white/10 border-l-emerald-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                        {symbolText}
                      </span>
                      
                      {/* 🌟 แสดงเวลาตรงนี้ 🌟 */}
                      <span className="text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-md text-[10px] font-mono border border-white/5">
                        🕒 {whale.timestamp}
                      </span>

                      <p className='font-mono text-xl font-bold text-slate-100 inline-block ml-1'>
                        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}  
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">
                      AMOUNT: <span className="text-emerald-400/80">{qty.toFixed(4)} {symbolText}</span>
                    </p>
                  </div>

                  <div className='text-right'>
                    <p className='font-mono text-slate-300 font-medium'>
                      ${price.toLocaleString(undefined, { minimumFractionDigits: 2})}
                    </p>
                    <span className='text-[10px] text-slate-500 tracking-widest font-bold'>PRICE</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 mb-8 border-t border-white/10 pt-8">
          {/* ... (โค้ด Footer เหมือนเดิม) ... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <h3 className="text-emerald-400 font-semibold tracking-widest text-xs">DATA LEGEND</h3>
              <ul className="text-slate-400 space-y-2 text-xs md:text-sm">
                <li><span className="text-slate-300 font-medium">Whale (ปลาวาฬ):</span> ธุรกรรมการซื้อขายที่มีปริมาณมหาศาลผิดปกติ</li>
                <li><span className="text-slate-300 font-medium">Min Volume:</span> ตัวกรองมูลค่าขั้นต่ำ (USD) เพื่อคัดกรองเฉพาะไม้ใหญ่</li>
                <li><span className="text-slate-300 font-medium">Live Trend:</span> กราฟแสดงปริมาณการเทรดแบบเรียลไทม์ (50 ธุรกรรมล่าสุด)</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-emerald-400 font-semibold tracking-widest text-xs">DISCLAIMER</h3>
              <p className="text-slate-400 leading-relaxed text-xs md:text-sm">
                ข้อมูลทั้งหมดบนเว็บไซต์นี้ดึงมาจาก Binance WebSocket แบบเรียลไทม์ 
                <span className="text-amber-400/80"> จัดทำขึ้นเพื่อการศึกษาและการทดสอบระบบเท่านั้น ไม่ใช่คำแนะนำทางการเงินหรือการลงทุน (Not Financial Advice)</span>
              </p>
            </div>
            <div className="space-y-3 md:text-right">
              <h3 className="text-emerald-400 font-semibold tracking-widest text-xs">SYSTEM & CREDITS</h3>
              <p className="text-slate-400 text-xs md:text-sm">Powered by React, Go, and PostgreSQL</p>
              <div className="pt-2 text-[11px] text-slate-500 font-mono space-y-1">
                <p>© 2026 Kittinan Patjaikotha.</p>
                <p>Computer Engineering, Suranaree University of Technology</p>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}

export default App