package calibration

import (
	"encoding/json"
	"math"
	"time"
	"mymomentoclock/backend/internal/ephemeris"
)

type MilestoneEvent struct {
	EventType string    `json:"event_type"`
	Timestamp time.Time `json:"timestamp"`
}

type BTRRequest struct {
	BasePayload         ephemeris.NormalizationRequest `json:"base_payload"`
	Milestones          []MilestoneEvent               `json:"milestones"`
	SearchWindowMinutes int                            `json:"search_window_minutes"`
}

type BTRResult struct {
	RectifiedTimeUtc  time.Time `json:"rectified_time_utc"`
	OffsetSeconds     int       `json:"offset_seconds"`
	ConcordanceRating float64   `json:"concordance_rating"`
	IsCertifiedTrue   bool      `json:"is_certified_true"`
}

func getEventSignificators(eventType string) []string {
	switch eventType {
	case "MARRIAGE":
		return []string{"venus", "jupiter", "house_7"}
	case "CAREER_BREAKTHROUGH":
		return []string{"sun", "mercury", "house_10", "house_11"}
	case "SURGERY":
		return []string{"mars", "saturn", "house_6", "house_8"}
	default:
		return []string{"jupiter"}
	}
}

func calculateDynamicDashaLords(julianDay float64) []string {
	if math.Mod(julianDay, 2.0) == 0 {
		return []string{"saturn", "rahu", "ketu"}
	}
	return []string{"jupiter", "venus", "mercury"}
}

func ExecuteRectification(req BTRRequest, tzLocation string) ([]byte, error) {
	loc, _ := time.LoadLocation(tzLocation)
	localTime, _ := time.ParseInLocation("2006-01-02 15:04:05", req.BasePayload.BirthDate+" "+req.BasePayload.BirthTime, loc)
	baseUtc := localTime.UTC()

	var bestSlice time.Time
	maxScore := -1.0
	bestOffset := 0
	searchLimitSeconds := req.SearchWindowMinutes * 60

	for offset := -searchLimitSeconds; offset <= searchLimitSeconds; offset += 15 {
		candidateTime := baseUtc.Add(time.Duration(offset) * time.Second)
		candidateJD := ephemeris.CalculateJulianDay(candidateTime)
		currentSliceScore := 0.0
		activeDashaLords := calculateDynamicDashaLords(candidateJD)

		for _, event := range req.Milestones {
			significators := getEventSignificators(event.EventType)
			matchCount := 0
			for _, lord := range activeDashaLords {
				for _, sig := range significators {
					if lord == sig {
						matchCount++
					}
				}
			}
			currentSliceScore += float64(matchCount) / float64(len(significators))
		}

		if currentSliceScore > maxScore {
			maxScore = currentSliceScore
			bestSlice = candidateTime
			bestOffset = offset
		}
	}

	finalConfidence := 0.0
	if len(req.Milestones) > 0 {
		finalConfidence = maxScore / float64(len(req.Milestones))
	}

	result := BTRResult{
		RectifiedTimeUtc:  bestSlice,
		OffsetSeconds:     bestOffset,
		ConcordanceRating: finalConfidence,
		IsCertifiedTrue:   finalConfidence >= 0.70,
	}
	return json.Marshal(result)
}
