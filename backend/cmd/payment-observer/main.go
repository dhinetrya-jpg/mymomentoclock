// Read-only operator tool. No HTTP dashboard, payment success, refund or correction command exists.
package main

import (
	"astroengine-core/backend/internal/payment"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"log"
	"os"
	"time"
)

func main() {
	id := flag.String("order", "", "inspect a single opaque order reference")
	flag.Parse()
	log.SetFlags(0)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	config, err := payment.DatabaseConfigFromEnvironment()
	if err != nil {
		log.Fatal("OBSERVER_CONFIGURATION_INVALID")
	}
	db, err := payment.OpenDatabase(ctx, config)
	if err != nil {
		log.Fatal("OBSERVER_STORAGE_UNAVAILABLE")
	}
	defer db.Close()
	var observer, unsafe bool
	err = db.QueryRowContext(ctx, `SELECT pg_has_role(current_user,'mymomentoclock_payment_observer','member'),r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR has_table_privilege(current_user,'phase1_orders','UPDATE') OR has_table_privilege(current_user,'phase1_orders','DELETE') OR has_table_privilege(current_user,'payment_sessions','SELECT') FROM pg_roles r WHERE rolname=current_user`).Scan(&observer, &unsafe)
	if err != nil || !observer || unsafe {
		log.Fatal("OBSERVER_ROLE_UNSAFE")
	}
	if *id == "" {
		var pending, retry, dead, held int64
		if err = db.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM phase1_orders WHERE status IN ('CREATED','PENDING')),(SELECT count(*) FROM phase1_payment_events WHERE processing_status IN ('PENDING','RETRY')),(SELECT count(*) FROM phase1_orders WHERE reconcile_state='DEAD_LETTER'),(SELECT count(*) FROM phase1_orders WHERE provider_review_required)`).Scan(&pending, &retry, &dead, &held); err != nil {
			log.Fatal("OBSERVER_STORAGE_UNAVAILABLE")
		}
		_ = json.NewEncoder(os.Stdout).Encode(map[string]any{"pending": pending, "retry_events": retry, "dead_letter": dead, "review_holds": held})
		return
	}
	if len(*id) > 200 {
		log.Fatal("INVALID_ORDER_REFERENCE")
	}
	var customer, status, currency, product, job string
	var amount int64
	var review bool
	err = db.QueryRowContext(ctx, `SELECT customer_id,status,currency,product_id,amount_minor,reconcile_state,provider_review_required FROM phase1_orders WHERE order_id=$1`, *id).Scan(&customer, &status, &currency, &product, &amount, &job, &review)
	if err != nil {
		log.Fatal("ORDER_NOT_AVAILABLE")
	}
	var history, events, grants []byte
	err = db.QueryRowContext(ctx, `SELECT coalesce((SELECT jsonb_agg(x) FROM (SELECT action,outcome,created_at FROM phase1_payment_audit WHERE order_id=$1 ORDER BY created_at DESC LIMIT 50)x),'[]'::jsonb),coalesce((SELECT jsonb_agg(x) FROM (SELECT event_type,processing_status,failure_class,received_at FROM phase1_payment_events WHERE order_id=$1 ORDER BY received_at DESC LIMIT 50)x),'[]'::jsonb),coalesce((SELECT jsonb_agg(x) FROM (SELECT capability_id,active,expires_at,revoked_at,revocation_reason FROM phase1_entitlements WHERE order_id=$1)x),'[]'::jsonb)`, *id).Scan(&history, &events, &grants)
	if err != nil {
		log.Fatal("OBSERVER_STORAGE_UNAVAILABLE")
	}
	hash := sha256.Sum256([]byte(customer))
	_ = json.NewEncoder(os.Stdout).Encode(map[string]any{"owner_digest": hex.EncodeToString(hash[:]), "status": status, "currency": currency, "product_id": product, "amount_minor": amount, "reconciliation": job, "review_required": review, "audit_history": json.RawMessage(history), "event_processing": json.RawMessage(events), "entitlements": json.RawMessage(grants)})
	log.Print("operator_read_completed")
}
