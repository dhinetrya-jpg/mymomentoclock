package payment

import (
	"context"
	"encoding/json"
	"time"
)

type ReconcileResult struct{ Examined, Repaired, Failed int }

// Reconcile is internal and bounded. No scheduler or HTTP administrative route starts it.
// Claims use a durable lease; concurrent workers may retry the provider's idempotent operation.
func (s *Service) Reconcile(ctx context.Context, olderThan time.Duration, batch int) (ReconcileResult, error) {
	result := ReconcileResult{}
	if s == nil {
		return result, problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if olderThan < time.Minute || batch < 1 || batch > 100 {
		return result, problem("INVALID_RECONCILIATION_OPTIONS")
	}
	rows, err := s.store.DB.QueryContext(ctx, `WITH candidates AS (SELECT order_id FROM phase1_orders WHERE provider=$1 AND created_at<now()-$2*interval '1 second' AND next_reconcile_at<=now() AND (status IN ('CREATED','PENDING','FAILED','COMPLETED') OR EXISTS(SELECT 1 FROM phase1_payment_events e WHERE e.order_id=phase1_orders.order_id AND e.processing_status IN ('PENDING','RETRY'))) ORDER BY next_reconcile_at FOR UPDATE SKIP LOCKED LIMIT $3) UPDATE phase1_orders o SET next_reconcile_at=now()+interval '60 seconds',reconcile_attempts=reconcile_attempts+1 FROM candidates c WHERE o.order_id=c.order_id RETURNING o.order_id,o.customer_id,coalesce(o.provider_order_id,''),o.status,o.reconcile_attempts`, s.store.Provider, olderThan.Seconds(), batch)
	if err != nil {
		return result, storageError(err)
	}
	type candidate struct {
		id, customer, providerOrder, status string
		attempt                             int
	}
	list := []candidate{}
	for rows.Next() {
		var c candidate
		if err = rows.Scan(&c.id, &c.customer, &c.providerOrder, &c.status, &c.attempt); err != nil {
			rows.Close()
			return result, storageError(err)
		}
		list = append(list, c)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, storageError(err)
	}
	for _, c := range list {
		if ctx.Err() != nil {
			return result, problem("PAYMENT_TIMEOUT")
		}
		result.Examined++
		if c.status == "CREATED" {
			var o Order
			o, err = s.store.ownOrder(ctx, c.customer, c.id)
			if err == nil {
				_, err = s.createOrder(ctx, c.customer, o.ProductID, retryKey(ctx, s, c.id), randomID())
			}
		}
		if err == nil {
			var snapshot Event
			o, getErr := s.store.ownOrder(ctx, c.customer, c.id)
			if getErr != nil {
				err = getErr
			} else {
				snapshot, err = s.provider.GetPaymentStatus(ctx, c.id, o.providerOrder)
				if err == nil && (snapshot.OrderID != c.id || snapshot.ProviderOrderID != o.providerOrder || snapshot.Provider != s.store.Provider) {
					err = problem("PAYMENT_MISMATCH")
				}
			}
			if err == nil {
				err = s.applySnapshot(ctx, snapshot)
			}
		}
		if err == nil {
			pending, queryErr := s.store.DB.QueryContext(ctx, `SELECT safe_evidence FROM phase1_payment_events WHERE order_id=$1 AND processing_status IN ('PENDING','RETRY') ORDER BY received_at LIMIT 100`, c.id)
			if queryErr != nil {
				err = storageError(queryErr)
			} else {
				events := []Event{}
				for pending.Next() {
					var b []byte
					var e Event
					if queryErr = pending.Scan(&b); queryErr != nil {
						break
					}
					if queryErr = json.Unmarshal(b, &e); queryErr != nil {
						break
					}
					events = append(events, e)
				}
				if queryErr == nil {
					queryErr = pending.Err()
				}
				pending.Close()
				if queryErr != nil {
					err = problem("PAYMENT_EVENT_INVALID_STORAGE")
				} else {
					for _, e := range events {
						if e.NotificationOnly {
							if _, updateErr := s.store.DB.ExecContext(ctx, `UPDATE phase1_payment_events SET processing_status='PROCESSED',processing_attempts=processing_attempts+1 WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID); updateErr != nil {
								err = storageError(updateErr)
								break
							}
							continue
						}
						if _, applyErr := s.store.ApplyVerifiedEvent(ctx, seal(e)); applyErr != nil {
							err = applyErr
							break
						}
					}
				}
			}
		}
		outcome := "REPAIRED"
		if err != nil {
			result.Failed++
			outcome = "RETRY_REQUIRED"
		} else {
			result.Repaired++
		}
		attempt := c.attempt
		if attempt > 10 {
			attempt = 10
		}
		delay := time.Duration(1<<attempt) * time.Minute
		if err == nil {
			delay = 24 * time.Hour
		}
		_, updateErr := s.store.DB.ExecContext(ctx, `UPDATE phase1_orders SET next_reconcile_at=now()+$2*interval '1 second' WHERE order_id=$1`, c.id, delay.Seconds())
		if updateErr != nil {
			return result, storageError(updateErr)
		}
		_, updateErr = s.store.DB.ExecContext(ctx, `INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'RECONCILE',$2)`, c.id, outcome)
		if updateErr != nil {
			return result, storageError(updateErr)
		}
		err = nil
	}
	return result, nil
}
func retryKey(ctx context.Context, s *Service, id string) string {
	var key string
	_ = s.store.DB.QueryRowContext(ctx, `SELECT idempotency_key FROM phase1_orders WHERE order_id=$1`, id).Scan(&key)
	return key
}

// OperationalStats is internal actual database state, never a public customer metric endpoint.
type OperationalStats struct{ PendingOrders, RetryEvents, RejectedEvents, OverdueReconciliation int64 }

func (s *Service) OperationalStats(ctx context.Context) (OperationalStats, error) {
	var stats OperationalStats
	if s == nil {
		return stats, problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	err := s.store.DB.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND status IN ('CREATED','PENDING')), (SELECT count(*) FROM phase1_payment_events WHERE provider=$1 AND processing_status='RETRY'), (SELECT count(*) FROM phase1_payment_events WHERE provider=$1 AND processing_status='REJECTED'), (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND status IN ('CREATED','PENDING') AND next_reconcile_at<now()-interval '5 minutes')`, s.store.Provider).Scan(&stats.PendingOrders, &stats.RetryEvents, &stats.RejectedEvents, &stats.OverdueReconciliation)
	return stats, storageError(err)
}
