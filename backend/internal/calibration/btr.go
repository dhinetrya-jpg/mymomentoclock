package calibration

import (
	"astroengine-core/backend/internal/ephemeris"
	"fmt"
	"time"
)

type MilestoneEvent struct {
	Type       string    `json:"type,omitempty"`
	ApproxDate string    `json:"approxDate,omitempty"`
	EventType  string    `json:"event_type"`
	Timestamp  time.Time `json:"timestamp"`
	Confidence string    `json:"confidence"`
}
type BTRRequest struct {
	BasePayload         ephemeris.NormalizationRequest `json:"base_payload"`
	Milestones          []MilestoneEvent               `json:"milestones"`
	SearchWindowMinutes int                            `json:"search_window_minutes"`
}

// No source-reviewed Dasha method exists in this Go implementation. No candidate is manufactured.
func ExecuteRectification(req BTRRequest, tzLocation string) ([]byte, error) {
	birth, err := ephemeris.ParseBirth(req.BasePayload, tzLocation)
	if err != nil {
		return nil, err
	}
	if len(req.Milestones) == 0 {
		return nil, fmt.Errorf("MILESTONES_REQUIRED")
	}
	if len(req.Milestones) > 100 {
		return nil, fmt.Errorf("INVALID_MILESTONES")
	}
	if req.SearchWindowMinutes < 0 || req.SearchWindowMinutes > 15 {
		return nil, fmt.Errorf("INVALID_SEARCH_WINDOW")
	}
	seen := map[string]bool{}
	for _, m := range req.Milestones {
		if m.Type != "" || m.ApproxDate != "" {
			if m.EventType != "" || !m.Timestamp.IsZero() {
				return nil, fmt.Errorf("INVALID_MILESTONES")
			}
			switch m.Type {
			case "CAREER_PROMOTION", "MARRIAGE_UNION", "RELOCATION_TRAVEL", "HEALTH_PHYSICAL", "FINANCIAL_ACQUISITION":
			default:
				return nil, fmt.Errorf("INVALID_MILESTONES")
			}
			layout := "2006-01-02"
			birthLimit := birth.Format(layout)
			todayLimit := time.Now().UTC().Format(layout)
			if len(m.ApproxDate) == 7 {
				layout = "2006-01"
				birthLimit = birth.Format(layout)
				todayLimit = time.Now().UTC().Format(layout)
			}
			if _, err := time.Parse(layout, m.ApproxDate); err != nil || m.ApproxDate < birthLimit || m.ApproxDate > todayLimit || (m.Confidence != "HIGH" && m.Confidence != "MEDIUM") {
				return nil, fmt.Errorf("INVALID_MILESTONES")
			}
			key := m.Type + ":" + m.ApproxDate
			if seen[key] {
				return nil, fmt.Errorf("DUPLICATE_MILESTONE")
			}
			seen[key] = true
			continue
		}

		switch m.EventType {
		case "MARRIAGE", "CAREER_BREAKTHROUGH", "SURGERY", "RELOCATION_TRAVEL", "FINANCIAL_ACQUISITION":
		default:
			return nil, fmt.Errorf("INVALID_MILESTONES")
		}
		if m.Timestamp.IsZero() || m.Timestamp.Before(birth) || m.Timestamp.After(time.Now()) || (m.Confidence != "HIGH" && m.Confidence != "MEDIUM") {
			return nil, fmt.Errorf("INVALID_MILESTONES")
		}
		key := m.EventType + m.Timestamp.UTC().Format(time.RFC3339Nano)
		if seen[key] {
			return nil, fmt.Errorf("DUPLICATE_MILESTONE")
		}
		seen[key] = true
	}
	return nil, fmt.Errorf("DASHA_CALCULATION_UNAVAILABLE")
}
