package main

import (
	"log" 
	"github.com/gorilla/websocket"
	"strconv"
	"encoding/json"
)

type Trade struct {
	Price		string	`json:"p"`
	Quantity	string	`json:"q"`
}

func main() {
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

		// สามารถทดสอบเปลี่ยนค่าเป็น 5000 เพื่อทดสอบการทำงาน
		if value < 50000 {
			continue
		}

		log.Printf("WHALE ALERT! มูลค่า: $%.2f (ราคา: %.2f,จำนวน: %.4f BTC)", value, price, quantity)
	}
}