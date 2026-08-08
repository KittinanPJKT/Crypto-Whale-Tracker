package main

import (
	"log" 
	"github.com/gorilla/websocket"
	"strconv"
	"encoding/json"
	"net/http"
	"os"

	"database/sql"
	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

type Trade struct {
	Price		string	`json:"p"`
	Quantity	string	`json:"q"`
}

type WhaleRecord struct {
	ID			int			`json:"id"`
	Price	 	float64 	`json:"price"`
	Quantity	float64 	`json:"quantity"`
	Value 		float64 	`json:"value"`
	CreatedAt 	string 		`json:"created_at"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var (
    whalesCaughtTotal = promauto.NewCounter(prometheus.CounterOpts{
        Name: "whale_tracker_caught_total",
        Help: "The total number of whales caught by the tracker",
    })
)

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan Trade)
var db *sql.DB

func initDB() {
	var err error

	connStr := os.Getenv("DB_URL")

	if connStr == "" {
		connStr = "postgres://root:password@localhost:5432/whale_tracker?sslmode=disable"
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("เกิดปัญหาในการเปิดฐานข้อมูล: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Printf("ไม่สามารถเชื่อมฐานข้อมูลได้: %v", err)
		return
	}

	log.Println("เชื่อมต่อฐานข้อมูล PostgreSQL สำเร็จ")

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS whales (
			id SERIAL PRIMARY KEY,
			price NUMERIC(10, 2),
			quantity NUMERIC(10, 4),
			value NUMERIC(15, 2),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("สร้างตารางไม่สำเร็จ: %v", err)
	}

	log.Println("ตรสจสอบและสร้างตาราง 'whales' เรียบร้อย")
}


func main() {

	http.Handle("/metrics", promhttp.Handler())

	initDB()

	go handleMessages()

	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/api/whales", getWhalesHistory)

	go func() {
		log.Println("เปิดสถานีส่งสัญญาณที่พอร์ต : 9090")
		err := http.ListenAndServe(":9090", nil)
		if err != nil {
			log.Fatal("ไม่สามารถเปิดเซิร์ฟเวอร์ได้ : ", err)
		}
	}()
	url := "wss://stream.binance.com/ws/btcusdt@trade"
	log.Printf("กำลังทำการเชื่อมต่อ %s...", url)

	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		log.Fatalf("เชื่อมต่อล้มเหลว %v", err)
	}
	defer conn.Close()

	log.Println("เชื่อมต่อสำเร็จ! กำลังรอรับข้อมูล...")

	for {
		_,  message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("เกิดข้อผิดพลาดในการอ่านข้อมูล %v", err)
			break
		}

		var trade Trade

		err = json.Unmarshal(message, &trade)
		if err != nil {
			log.Printf("แกะ JSON ไม่ออก: %v", err)
			continue
		}

		price, _ := strconv.ParseFloat(trade.Price, 64)
		quantity, _ := strconv.ParseFloat(trade.Quantity, 64)

		value := price * quantity

		// สามารถทดสอบเปลี่ยนค่าเป็น 5000 เพื่อทดสอบการทำงานของโปรแกรม
		if value > 10 {
			log.Printf("WHALE ALERT! มูลค่า: $%.2f (ราคา: %.2f,จำนวน: %.4f BTC)", value, price, quantity)	
			
			whalesCaughtTotal.Inc()
			broadcast <- trade


			insertQuery := `INSERT INTO whales (price, quantity, value) VALUES ($1, $2, $3)`
			_, err = db.Exec(insertQuery, price, quantity, value)
			if err != nil {
				log.Printf("บันทึกข้อมูล DB ไม่สำเร็จ : %v", err)
			} else {
				log.Println("บันทึกลงฐานข้อมูลเรียบร้อย")
			} 
		}

		//log.Println("Go Backend started on :9090")
    	//http.ListenAndServe(":9090", nil)

		
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("อัปเกรดเป็น Websocket ไม่สำเร็จ : %v", err)
		return
	}
	defer ws.Close()

	clients[ws] = true
	log.Println("มีหน้าจอ React เชื่อมต่อเข้ามาใหม่")

	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			log.Println("หน้อจอ React ตัดการเชื่อมต่อ")
			delete(clients, ws)
			break
		}
	}
}

func handleMessages() {
	for {
		whale := <-broadcast

		for client := range clients {
			err := client.WriteJSON(whale)
			if err != nil {
				log.Printf("ส่งข้อมูลล้มเหลว: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

func getWhalesHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-type", "application/json")

	rows, err := db.Query("SELECT id, price, quantity, value, created_at FROM whales ORDER BY id DESC LIMIT 50")
	if err != nil {
		http.Error(w, "Query failed", http.StatusInternalServerError)
		log.Printf("ดึงประวัติข้อมูลล้มเหลว: %v",err)
		return
	}
	defer rows.Close() 

	var whales []WhaleRecord
	for rows.Next() {
		var record WhaleRecord
		if err := rows.Scan(&record.ID, &record.Price, &record.Quantity, &record.Value, &record.CreatedAt); err != nil {
			log.Printf("แปลงข้อมูลล้มเหลว %v", err)
			continue
		}
		whales = append(whales, record)
	} 

	json.NewEncoder(w).Encode(whales)
}