package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Named architecture blocks monitored for high-resolution p99 latency
const (
	StageEphemerisFFI     = "ephemeris_ffi"
	StageBTRSearch        = "btr_search"
	StageNeo4jSubgraph    = "neo4j_subgraph"
	StageLLMSSEFirstToken = "llm_sse_first_token"
)

var (
	// PipelineRequestsTotal tracks the total number of processed spatiotemporal computation requests.
	PipelineRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "astroengine_pipeline_requests_total",
			Help: "The total number of processed spatiotemporal computation requests.",
		},
		[]string{"status", "pillar"},
	)

	// EngineLatencyHistogram provides high-precision latency profiling per execution subsystem layer.
	EngineLatencyHistogram = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "astroengine_stage_duration_seconds",
			Help:    "High-precision latency profiling per execution subsystem layer.",
			Buckets: []float64{0.005, 0.010, 0.025, 0.050, 0.100, 0.200, 0.500, 1.000, 2.000},
		},
		[]string{"stage_name"},
	)
)

// TraceStageDuration observes the duration of an architecture stage in seconds.
func TraceStageDuration(stage string, startTime time.Time) {
	duration := time.Since(startTime).Seconds()
	EngineLatencyHistogram.WithLabelValues(stage).Observe(duration)
}
