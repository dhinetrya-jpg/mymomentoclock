package payment

import (
	"fmt"
	"io"
	"sync"
	"time"
)

var metricNames = map[string]bool{"order_attempt": true, "provider_create_error": true, "webhook_invalid": true, "webhook_error": true, "duplicate_event": true, "db_error": true, "reconcile_error": true, "reconcile_dead_letter": true, "provider_api_error": true, "provider_api": true, "payment_confirmation": true, "entitlement_denied": true, "refund_review": true, "entitlement_mismatch": true}

type measurement struct {
	Count   uint64
	Seconds float64
}
type Telemetry struct {
	mu     sync.Mutex
	values map[string]measurement
}

func (t *Telemetry) Observe(name string, duration time.Duration) {
	if t == nil || !metricNames[name] {
		return
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.values == nil {
		t.values = map[string]measurement{}
	}
	m := t.values[name]
	m.Count++
	m.Seconds += duration.Seconds()
	t.values[name] = m
}

// WritePrometheus is for a private observer/exporter, never registered on public API muxes.
func (t *Telemetry) WritePrometheus(w io.Writer) {
	if t == nil {
		return
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	for name, m := range t.values {
		fmt.Fprintf(w, "mymomento_payment_%s_total %d\nmymomento_payment_%s_seconds_sum %g\n", name, m.Count, name, m.Seconds)
	}
}
