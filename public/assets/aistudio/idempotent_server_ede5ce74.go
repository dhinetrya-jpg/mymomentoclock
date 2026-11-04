package webhook

import (
	"context"
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
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	gatewaySignature := r.Header.Get("X-Gateway-Signature")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if !ws.VerifyWebhookSignature(body, gatewaySignature) {
		http.Error(w, "Unauthorized Signature", http.StatusUnauthorized)
		return
	}

	var event PaymentWebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "Invalid Payload", http.StatusBadRequest)
		return
	}

	if event.Type == "payment.succeeded" {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		tx, err := ws.DB.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		var currentStatus string
		err = tx.QueryRowContext(ctx, "SELECT status FROM payment_transactions WHERE session_token = $1 FOR UPDATE", event.SessionToken).Scan(&currentStatus)
		if err == sql.ErrNoRows {
			http.Error(w, "Transaction Not Found", http.StatusNotFound)
			return
		}

		if currentStatus == "COMPLETED" {
			tx.Commit()
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"already_processed_idempotent"}`))
			return
		}

		_, err = tx.ExecContext(ctx, "UPDATE payment_transactions SET status = 'COMPLETED', updated_at = NOW() WHERE session_token = $1", event.SessionToken)
		if err != nil {
			http.Error(w, "Update Failed", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "Commit Failed", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"verified_and_unlocked"}`))
}