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
    <>
      {/* 1. Header Section */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">Whale Tracker</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time BTC/USDT Transactions</p> 
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-500 font-mono text-sm">Live</span>
        </div>    
      </div>

      {/* 2. Stats Summary Section */}
      <div className="bg-slate-800/80 rounded-xl p-5 mb-6 border border-slate-700 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">Total Whales Caught</p>
          <p className="text-white text-2xl font-bold">{totalWhales} <span className="text-sm text-slate-500 font-normal">transactions</span></p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Volume</p>
          <p className="text-emerald-400 text-2xl font-mono font-bold">
            ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* 2.5 Filter Section */}
      <div className="mb-6 flex items-center justify-end gap-3">
        <label className="text-slate-400 text-sm font-medium">Min Volume ($):</label>
        <input 
          type="number"
          value={minVolume}
          onChange={(e) => setMinVolume(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 w-32 shadow-sm"
          placeholder="0"
          min="0"
          />
      </div>

      {/* 3. Chart Section */}
      {filteredWhales.length > 0 && (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg mb-6 h-72">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-emerald-400 font-bold text-sm">Real-time Volume Trend ($)</h2>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={80} tickFormatter={(value) => `$${value.toLocaleString()}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                formatter={(value) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Volume']}
                labelStyle={{ display: 'none' }}
              />
              <Line type="monotone" dataKey="volume" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 4. Data Feed Section (เพิ่มกลับเข้ามาให้แล้ว) */}
      <div className="space-y-4">
        {filteredWhales.length === 0 ? (
          <p className="text-slate-500 italic text-center py-8">Waiting for whales above ${minVolume}...</p>
        ) : (
          filteredWhales.map((whale, index) => {
            const price = parseFloat(whale.p)
            const qty = parseFloat(whale.q)
            const value = price * qty

            return (
              <div
                key={index}
                className={`p-4 rounded-lg flex justify-between items-center shadow-lg border-l-4 transition-all duration-500 ${
                  whale.isHistory
                    ? 'bg-slate-800/60 border-slate-600'
                    : 'bg-slate-800 border-emerald-500'
                }`}
              >
                <div>
                  <p className='font-mono text-xl font-bold text-white'>
                    ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}  
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Amount: {qty.toFixed(4)} BTC
                  </p>
                </div>

                <div className='text-right'>
                  <p className='font-mono text-slate-300'>
                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2})}
                  </p>
                  <span className='text-[10px] text-slate-500'>PRICE</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

export default App