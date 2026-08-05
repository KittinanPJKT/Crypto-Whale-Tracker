import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid} from 'recharts'

function App() {
  const [whales, setWhales] = useState([])
  const [minVolume, setMinVolume] = useState(0);

  const filteredWhales = whales.filter((whale) => {
    const value = parseFloat(whale.p) * parseFloat(whale.q);
    return value >= minVolume;
  });

  const totalWhales = filteredWhales.length;
  const totalVolume = filteredWhales.reduce((sum, whale) => sum + (parseFloat(whale.p) * parseFloat(whale.q)), 0);
  
  const chartData = [...filteredWhales].reverse().map((whale, index) =>({
    time: index +1,
    volume: parseFloat(whale.p) * parseFloat(whale.q),
    price: parseFloat(whale.p)
  }));

  useEffect(() => {
    fetch('http://localhost:9090/api/whales')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const historyWhales = data.map((record) => ({
            p: record.price.toString(),
            q: record.quantity.toString(),
            isHistory: true
          }))
          setWhales(historyWhales)
        }
      })
      .catch((err) => console.error('ดึงประวัติล้มเหลว : ', err))
    
    const ws = new WebSocket('ws://localhost:9090/ws')

    ws.onopen = () => {
      console.log('Connected to Go Server!')
    }

    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data)
      trade.isHistory = false
      setWhales((prevWhales) => [trade, ...prevWhales].slice(0, 50))
    }

    return () => {
      ws.close()
    }
  }, [])

return (
    /* 1. พื้นหลังหลักสีเข้ม */
    <div className="relative min-h-screen bg-slate-950 p-4 md:p-8 font-sans overflow-hidden">
      
      {/* 2. ดวงไฟสีๆ พื้นหลัง (เพื่อให้กระจกมีอะไรให้เบลอ) */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed top-[40%] left-[30%] w-[800px] h-[400px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      {/* 3. คอนเทนต์หลัก (ต้องมี relative และ z-10 เพื่อให้อยู่เหนือแสง) */}
      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              Whale Tracker
            </h1>
            <p className="text-sm text-slate-400 mt-1">Real-time BTC/USDT Transactions</p> 
          </div>

          <div className="flex items-center gap-2 bg-slate-800/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-mono text-sm tracking-wide">Live</span>
          </div>    
        </div>

        {/* Stats Summary Section */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/10 shadow-2xl flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1 tracking-wide">TOTAL WHALES CAUGHT</p>
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
        <div className="mb-6 flex items-center justify-end gap-3">
          <label className="text-slate-400 text-sm font-medium tracking-wide">MIN VOLUME ($):</label>
          <input 
            type="number"
            value={minVolume}
            onChange={(e) => setMinVolume(Number(e.target.value))}
            className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 w-36 shadow-inner outline-none transition-all"
            placeholder="0"
            min="0"
            />
        </div>

        {/* Chart Section */}
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
              <p className="text-slate-400 italic">Waiting for whales above ${minVolume}...</p>
            </div>
          ) : (
            filteredWhales.map((whale, index) => {
              const price = parseFloat(whale.p)
              const qty = parseFloat(whale.q)
              const value = price * qty

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
                    <p className='font-mono text-xl font-bold text-slate-100'>
                      ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}  
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
                      AMOUNT: <span className="text-emerald-400/80">{qty.toFixed(4)} BTC</span>
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

      </div>
    </div>
  )
}

export default App