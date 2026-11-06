package payment

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"math/big"
	"time"
)

type ReconcileResult struct{ Examined, Repaired, Failed int }
type WorkerPolicy struct {
	Batch, MaxAttempts                                      int
	OlderThan, JobTimeout, Lease, BaseDelay, MaxDelay, Poll time.Duration
}

func DefaultWorkerPolicy() WorkerPolicy {
	return WorkerPolicy{20, 8, time.Minute, 30 * time.Second, 45 * time.Second, time.Minute, 24 * time.Hour, 15 * time.Second}
}
func (p WorkerPolicy) valid() bool {
	return p.Batch >= 1 && p.Batch <= 100 && p.MaxAttempts >= 1 && p.MaxAttempts <= 20 && p.OlderThan >= time.Minute && p.JobTimeout >= time.Second && p.JobTimeout <= 30*time.Second && p.Lease > p.JobTimeout && p.Lease <= 2*time.Minute && p.BaseDelay >= time.Second && p.MaxDelay >= p.BaseDelay && p.MaxDelay <= 24*time.Hour && p.Poll >= 5*time.Second
}
func backoff(p WorkerPolicy, attempt int) (time.Duration, error) {
	if attempt > 20 {
		attempt = 20
	}
	delay := p.BaseDelay * time.Duration(1<<attempt)
	if delay > p.MaxDelay {
		delay = p.MaxDelay
	}
	random, err := rand.Int(rand.Reader, big.NewInt(int64(delay/2)+1))
	if err != nil {
		return 0, problem("RECONCILIATION_RANDOM_UNAVAILABLE")
	}
	return delay/2 + time.Duration(random.Int64()), nil
}
func (s *Service) Reconcile(ctx context.Context, olderThan time.Duration, batch int) (ReconcileResult, error) {
	p := DefaultWorkerPolicy()
	p.OlderThan = olderThan
	p.Batch = batch
	return s.ReconcileWithPolicy(ctx, p)
}

// Each job is claimed separately; lease exceeds a strict per-job timeout. No batch can outlive its lease.
func (s *Service) ReconcileWithPolicy(ctx context.Context, p WorkerPolicy) (ReconcileResult, error) {
	result := ReconcileResult{}
	if s == nil {
		return result, problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if !p.valid() {
		return result, problem("INVALID_RECONCILIATION_OPTIONS")
	}
	for index := 0; index < p.Batch; index++ {
		if ctx.Err() != nil {
			return result, problem("PAYMENT_TIMEOUT")
		}
		token := randomID()
		if token == "" {
			return result, problem("RECONCILIATION_RANDOM_UNAVAILABLE")
		}
		rows, err := s.store.DB.QueryContext(ctx, `WITH candidate AS(SELECT order_id FROM phase1_orders WHERE provider=$1 AND reconcile_state='ACTIVE' AND created_at<now()-$2*interval '1 second' AND next_reconcile_at<=now() AND (reconcile_lease_until IS NULL OR reconcile_lease_until<now()) AND (status IN ('CREATED','PENDING','FAILED','COMPLETED') OR provider_review_required OR EXISTS(SELECT 1 FROM phase1_payment_events e WHERE e.order_id=phase1_orders.order_id AND e.processing_status IN ('PENDING','RETRY'))) ORDER BY next_reconcile_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE phase1_orders o SET reconcile_lease_token=$3,reconcile_lease_until=now()+$4*interval '1 second',reconcile_attempts=reconcile_attempts+1 FROM candidate c WHERE o.order_id=c.order_id RETURNING o.order_id,o.customer_id,o.status,o.reconcile_attempts`, s.store.Provider, p.OlderThan.Seconds(), token, p.Lease.Seconds())
		if err != nil {
			return result, storageError(err)
		}
		if !rows.Next() {
			err = rows.Err()
			rows.Close()
			if err != nil {
				return result, storageError(err)
			}
			break
		}
		var id, customer, status string
		var attempts int
		err = rows.Scan(&id, &customer, &status, &attempts)
		rows.Close()
		if err != nil {
			return result, storageError(err)
		}
		result.Examined++
		job, done := context.WithTimeout(ctx, p.JobTimeout)
		err = s.reconcileOne(job, id, customer, status)
		done()
		outcome, state := "REPAIRED", "ACTIVE"
		delay := 24 * time.Hour
		if err != nil {
			result.Failed++
			s.store.Telemetry.Observe("reconcile_error", 0)
			outcome = "RETRY_REQUIRED"
			delay, err = backoff(p, attempts)
			if err != nil {
				return result, err
			}
			if attempts >= p.MaxAttempts {
				state = "DEAD_LETTER"
				outcome = "REVIEW_REQUIRED"
				s.store.Telemetry.Observe("reconcile_dead_letter", 0)
			}
		} else {
			result.Repaired++
		}
		// Recording with an independent bounded context preserves recovery state when the worker is cancelled.
		record, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		tx, recordErr := s.store.DB.BeginTx(record, nil)
		if recordErr != nil {
			cancel()
			return result, storageError(recordErr)
		}
		updated, recordErr := tx.ExecContext(record, `UPDATE phase1_orders SET reconcile_state=$3,reconcile_attempts=CASE WHEN $5='REPAIRED' THEN 0 ELSE reconcile_attempts END,next_reconcile_at=now()+$4*interval '1 second',reconcile_lease_token=NULL,reconcile_lease_until=NULL WHERE order_id=$1 AND reconcile_lease_token=$2`, id, token, state, delay.Seconds(), outcome)
		if recordErr == nil {
			n, e := updated.RowsAffected()
			if e != nil || n != 1 {
				recordErr = problem("RECONCILIATION_LEASE_LOST")
			}
		}
		if recordErr == nil {
			_, recordErr = tx.ExecContext(record, `INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'RECONCILE',$2)`, id, outcome)
		}
		if recordErr != nil {
			tx.Rollback()
			cancel()
			return result, storageError(recordErr)
		}
		recordErr = tx.Commit()
		cancel()
		if recordErr != nil {
			return result, storageError(recordErr)
		}
	}
	return result, nil
}
func (s *Service) reconcileOne(ctx context.Context, id, customer, status string) error {
	if identity, ok := s.identity.(interface {
		CustomerCountry(context.Context, string) (string, error)
	}); ok {
		country, err := identity.CustomerCountry(ctx, customer)
		if err != nil {
			return err
		}
		ctx = context.WithValue(ctx, countryContextKey{}, country)
	}
	if status == "CREATED" {
		o, err := s.store.ownOrder(ctx, customer, id)
		if err != nil {
			return err
		}
		if _, err = s.createOrder(ctx, customer, o.ProductID, retryKey(ctx, s, id), randomID()); err != nil {
			return err
		}
	}
	o, err := s.store.ownOrder(ctx, customer, id)
	if err != nil {
		return err
	}
	snapshot, err := s.provider.GetPaymentStatus(ctx, id, o.providerOrder)
	if err != nil {
		return problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if snapshot.OrderID != id || snapshot.ProviderOrderID != o.providerOrder || snapshot.Provider != s.store.Provider {
		return problem("PAYMENT_MISMATCH")
	}
	pending, err := s.store.DB.QueryContext(ctx, `SELECT safe_evidence FROM phase1_payment_events WHERE order_id=$1 AND processing_status IN ('PENDING','RETRY') ORDER BY received_at LIMIT 100`, id)
	if err != nil {
		return storageError(err)
	}
	events := []Event{}
	for pending.Next() {
		var b []byte
		var e Event
		if err = pending.Scan(&b); err != nil {
			break
		}
		if err = json.Unmarshal(b, &e); err != nil {
			break
		}
		events = append(events, e)
	}
	if err == nil {
		err = pending.Err()
	}
	pending.Close()
	if err != nil {
		return problem("PAYMENT_EVENT_INVALID_STORAGE")
	}
	for _, e := range events {
		if e.RiskHold && snapshot.Status != "REFUNDED" {
			snapshot.Status = "PAYMENT_REVIEW"
		}
	}
	if err = s.applySnapshot(ctx, snapshot); err != nil {
		return err
	}
	for _, e := range events {
		if e.NotificationOnly {
			_, err = s.store.DB.ExecContext(ctx, `UPDATE phase1_payment_events SET processing_status='PROCESSED',processing_attempts=processing_attempts+1 WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID)
		} else {
			_, err = s.store.ApplyVerifiedEvent(ctx, seal(e))
		}
		if err != nil {
			return storageError(err)
		}
	}
	var mismatch bool
	err = s.store.DB.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM phase1_orders o WHERE o.order_id=$1 AND ((o.status='COMPLETED' AND NOT o.provider_review_required AND (o.access_expires_at IS NULL OR o.access_expires_at>now()) AND NOT EXISTS(SELECT 1 FROM payment_customers c WHERE c.customer_id=o.customer_id AND c.deleted_at IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM phase1_entitlements e WHERE e.order_id=o.order_id AND e.active AND e.revoked_at IS NULL AND (e.expires_at IS NULL OR e.expires_at>now()))) OR ((o.status IN ('REFUNDED','REVERSED') OR o.provider_review_required) AND EXISTS(SELECT 1 FROM phase1_entitlements e WHERE e.order_id=o.order_id AND e.active))))`, id).Scan(&mismatch)
	if err != nil {
		return storageError(err)
	}
	if mismatch {
		s.store.Telemetry.Observe("entitlement_mismatch", 0)
		return problem("ENTITLEMENT_STATE_MISMATCH")
	}
	return nil
}
func (s *Service) RunWorker(ctx context.Context, p WorkerPolicy) error {
	if !p.valid() {
		return problem("INVALID_RECONCILIATION_OPTIONS")
	}
	timer := time.NewTicker(p.Poll)
	defer timer.Stop()
	for {
		if _, err := s.ReconcileWithPolicy(ctx, p); err != nil && ctx.Err() == nil {
			s.store.Telemetry.Observe("reconcile_error", 0)
		}
		select {
		case <-ctx.Done():
			return nil
		case <-timer.C:
		}
	}
}
func retryKey(ctx context.Context, s *Service, id string) string {
	var key string
	_ = s.store.DB.QueryRowContext(ctx, `SELECT idempotency_key FROM phase1_orders WHERE order_id=$1`, id).Scan(&key)
	return key
}

// OperationalStats is internal actual database state, never a public customer metric endpoint.
type OperationalStats struct{ PendingOrders, RetryEvents, RejectedEvents, OverdueReconciliation, PendingOverHour, DeadLetters, ReviewHolds int64 }

func (s *Service) OperationalStats(ctx context.Context) (OperationalStats, error) {
	var stats OperationalStats
	if s == nil {
		return stats, problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	err := s.store.DB.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND status IN ('CREATED','PENDING')), (SELECT count(*) FROM phase1_payment_events WHERE provider=$1 AND processing_status='RETRY'), (SELECT count(*) FROM phase1_payment_events WHERE provider=$1 AND processing_status='REJECTED'), (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND status IN ('CREATED','PENDING') AND next_reconcile_at<now()-interval '5 minutes'), (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND status IN ('CREATED','PENDING') AND created_at<now()-interval '1 hour'), (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND reconcile_state='DEAD_LETTER'), (SELECT count(*) FROM phase1_orders WHERE provider=$1 AND provider_review_required)`, s.store.Provider).Scan(&stats.PendingOrders, &stats.RetryEvents, &stats.RejectedEvents, &stats.OverdueReconciliation, &stats.PendingOverHour, &stats.DeadLetters, &stats.ReviewHolds)
	if err != nil {
		s.store.Telemetry.Observe("db_error", 0)
	}
	return stats, storageError(err)
}
