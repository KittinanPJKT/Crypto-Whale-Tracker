import { useState, useEffect } from 'react'

function App() {
  const [whales, setWhales] = useState([])

  useEffect(() => {
    
    const ws = new WebSocket('ws://localhost:9090/ws')

    ws.onopen = () => {
      console.log('Connected to Go Server!')
    }

    ws.onmessge = (event) => {
      const trade = JSON.parse(event.data)
      console.log("Whale Alert : ", trade)

      setWhales((prevWhales) => [trade, ...prevWhales].slice(0, 10))
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <div style={{ padding: '20px', fontfamily: 'sans-serif' }}>
      <h1>Crypto Whale Tracker</h1>
      <p>กำรังรอข้อมูล... (สามารถปรับค่าราคาใน Go เป็น 5000 ได้หากต้องการทดสอบความเร็ว)</p>

      <ul>
        {whales.map((whale, index) => {
            // คำนวณมูลค่ารวม
            const value = parseFloat(whale.p) * parseFloat(whale.q)

            return (
              <li key={index} style={{ marginBottom: '10px' }}>
                <strong>มูลค่า : </strong> ${value.toLocaleString()}
                (ราคา : {whale.p}, จำนวน : {whale.q} BTC)
              </li>
            )
        })}
      </ul>
    </div>
  )
}

export default App