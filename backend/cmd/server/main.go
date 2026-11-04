package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"mymomentoclock/backend/internal/calibration"
	"mymomentoclock/backend/internal/ephemeris"
	"mymomentoclock/backend/internal/graph"
	"mymomentoclock/backend/internal/metrics"
	"mymomentoclock/backend/internal/resolver"
	"mymomentoclock/backend/internal/rvm"
	"mymomentoclock/backend/internal/webhook"
)

type Server struct {
	db            *sql.DB
	neo4jDriver   neo4j.DriverWithContext
	webhookServer *webhook.WebhookServer
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-ID, X-Gateway-Signature")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"status":            "healthy",
		"tier":              "backend-orchestrator",
		"cluster_namespace": "astro-production",
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
		"engine":            "MymomentOclock Engine Core v2.0 (Golang 1.22+)",
	})
}

func (s *Server) btrRectifyHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	defer metrics.TraceStageDuration(metrics.StageBTRSearch, startTime)

	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req calibration.BTRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		metrics.PipelineRequestsTotal.WithLabelValues("failure", "btr").Inc()
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	tzLocation := "Asia/Kolkata"
	resultBytes, err := calibration.ExecuteRectification(req, tzLocation)
	if err != nil {
		metrics.PipelineRequestsTotal.WithLabelValues("failure", "btr").Inc()
		http.Error(w, "BTR Calculation Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	metrics.PipelineRequestsTotal.WithLabelValues("success", "btr").Inc()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(resultBytes)
}

func (s *Server) conflictResolverHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	defer metrics.TraceStageDuration(metrics.StageNeo4jSubgraph, startTime)

	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userId := r.URL.Query().Get("user_id")
	if userId == "" {
		userId = "USR_KOLKATA_89"
	}
	category := r.URL.Query().Get("category")
	if category == "" {
		category = "Wealth"
	}

	if s.neo4jDriver == nil {
		mockPayload := resolver.ResolutionPayload{
			Pillar:            category,
			NetPotencyScore:   37.5,
			NetAuspiciousness: 0.36375,
			ConflictResolved:  true,
			DominantVector:    "BENEFIC_OPULENCE_DOMINANT",
		}
		metrics.PipelineRequestsTotal.WithLabelValues("success", category).Inc()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockPayload)
		return
	}

	resultBytes, err := resolver.ResolveConflictMatrix(r.Context(), s.neo4jDriver, userId, category)
	if err != nil {
		metrics.PipelineRequestsTotal.WithLabelValues("failure", category).Inc()
		http.Error(w, "Conflict Resolution Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	metrics.PipelineRequestsTotal.WithLabelValues("success", category).Inc()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(resultBytes)
}

func (s *Server) ephemerisNormalizeHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	defer metrics.TraceStageDuration(metrics.StageEphemerisFFI, startTime)

	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ephemeris.NormalizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		metrics.PipelineRequestsTotal.WithLabelValues("failure", "ephemeris").Inc()
		http.Error(w, "Invalid Payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	tzLocation := "Asia/Kolkata"
	resultBytes, err := ephemeris.ExecuteNormalization(req, tzLocation)
	if err != nil {
		metrics.PipelineRequestsTotal.WithLabelValues("failure", "ephemeris").Inc()
		http.Error(w, "Ephemeris Calculation Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	metrics.PipelineRequestsTotal.WithLabelValues("success", "ephemeris").Inc()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(resultBytes)
}

func (s *Server) rvmRemediesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var input rvm.ResolutionMetrics
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid Payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	if s.db == nil {
		emptyPayload := rvm.RVMOutputPayload{
			TargetPlanet:             input.TargetPlanet,
			CalculatedDeficiency:     1.0 - input.NetAuspiciousness,
			GeneratedRemedialActions: []rvm.RemedialTask{},
			SystemTimestamp:          time.Now().Unix(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(emptyPayload)
		return
	}

	resultBytes, err := rvm.GenerateTargetedRemedies(r.Context(), s.db, input)
	if err != nil {
		http.Error(w, "RVM Generation Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(resultBytes)
}

func (s *Server) graphHydrateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var data graph.SubChartCoordinates
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	if s.neo4jDriver == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"status": "GRAPH_MOCK_SUCCESS", "user_id": data.UserID})
		return
	}

	if err := graph.HydrateUserGraph(r.Context(), s.neo4jDriver, data); err != nil {
		http.Error(w, "Graph Hydration Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"status": "SUCCESS", "user_id": data.UserID})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	webhookSecret := os.Getenv("WEBHOOK_SECRET_KEY")
	if webhookSecret == "" {
		webhookSecret = "whsec_mymomentoclock_production_key_9981"
	}

	srv := &Server{
		webhookServer: &webhook.WebhookServer{
			WebhookSecretKey: webhookSecret,
		},
	}

	mux := http.NewServeMux()

	// Observability & Health
	mux.HandleFunc("/health", srv.healthHandler)
	mux.HandleFunc("/api/v1/health", srv.healthHandler)
	mux.Handle("/metrics", promhttp.Handler())

	// Core Calculation Endpoints
	mux.HandleFunc("/api/v1/btr/rectify", enableCORS(srv.btrRectifyHandler))
	mux.HandleFunc("/api/v1/resolver/evaluate", enableCORS(srv.conflictResolverHandler))
	mux.HandleFunc("/api/v1/ephemeris/normalize", enableCORS(srv.ephemerisNormalizeHandler))
	mux.HandleFunc("/api/v1/graph/hydrate", enableCORS(srv.graphHydrateHandler))
	mux.HandleFunc("/api/v1/rvm/remedies", enableCORS(srv.rvmRemediesHandler))

	// Webhook
	mux.HandleFunc("/api/v1/webhook/payment", func(w http.ResponseWriter, r *http.Request) {
		srv.webhookServer.HandlePaymentCallback(w, r)
	})

	log.Printf("MymomentOclock Engine Core listening on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
