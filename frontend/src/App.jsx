import { useState, useEffect } from 'react'

function App() {
  const [whales, setWhales] = useState([])

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
      //console.log("Whale Alert : ", trade)
      trade.isHistory = false
      setWhales((prevWhales) => [trade, ...prevWhales].slice(0, 50))
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <>
    <div className="flex justify-between items-center mb-8 border-b border-slate-700 pd-4">
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
    {/*Data Feed Section*/}
    <div className="space-y-4">
      {whales.length === 0 ? (
        <p className="text-slate-500 italic text-center py-8">Waiting for whale signals...</p>
      ) : (
        whales.map((whale, index) => {
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