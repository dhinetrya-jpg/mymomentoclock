package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

type PaymentWebhookEvent struct {
	EventID      string    `json:"event_id"`
	Type         string    `json:"type"`
	SessionToken string    `json:"session_token"`
	AmountPaid   float64   `json:"amount_paid"`
	Timestamp    time.Time `json:"timestamp"`
}

type WebhookServer struct {
	DB               *sql.DB
	WebhookSecretKey string
}

func (ws *WebhookServer) VerifyWebhookSignature(payload []byte, receivedSignature string) bool {
	mac := hmac.New(sha256.New, []byte(ws.WebhookSecretKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expectedSignature), []byte(receivedSignature))
}

func (ws *WebhookServer) HandlePaymentCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		return
	}
	gatewaySignature := r.Header.Get("X-Gateway-Signature")
	body, _ := io.ReadAll(r.Body)
	if !ws.VerifyWebhookSignature(body, gatewaySignature) {
		http.Error(w, "Unauthorized Signature", http.StatusUnauthorized)
		return
	}
	var event PaymentWebhookEvent
	json.Unmarshal(body, &event)
	if event.Type == "payment.succeeded" {
		queryUpdate := `UPDATE payment_transactions SET status = 'COMPLETED', updated_at = NOW() WHERE session_token = $1 AND status = 'PENDING'`
		ws.DB.Exec(queryUpdate, event.SessionToken)
	}
	w.WriteHeader(http.StatusOK)
}
