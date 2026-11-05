package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"
)

type WebhookServer struct {
	DB               *sql.DB
	WebhookSecretKey string
}

func (ws *WebhookServer) VerifyWebhookSignature(payload []byte, signature string) bool {
	if ws.WebhookSecretKey == "" || len(signature) != 64 {
		return false
	}
	got, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(ws.WebhookSecretKey))
	mac.Write(payload)
	return hmac.Equal(mac.Sum(nil), got)
}

// No configured provider signing protocol or authorized order service exists. Never fulfill here.
func (ws *WebhookServer) HandlePaymentCallback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusServiceUnavailable)
	json.NewEncoder(w).Encode(map[string]any{"error": "PAYMENT_PROVIDER_UNAVAILABLE", "message": "Payments are not enabled. No entitlement was granted."})
}

type PaymentWebhookEvent struct {
	EventID      string    `json:"event_id"`
	Type         string    `json:"type"`
	SessionToken string    `json:"session_token"`
	AmountPaid   float64   `json:"amount_paid"`
	Timestamp    time.Time `json:"timestamp"`
}
