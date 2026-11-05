package calibration

import (
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"astroengine-core/backend/internal/ephemeris"
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
	RectifiedTimeUtc       time.Time `json:"rectified_time_utc"`
	OffsetSeconds          int       `json:"offset_seconds"`
	ConcordanceRating      float64   `json:"concordance_rating"`
	// CFR-003: Renamed from IsCertifiedTrue — the value is a threshold comparison, not an absolute claim.
	IsCertified            bool      `json:"is_certified"`
	CertificationThreshold float64   `json:"certification_threshold"`
	MilestoneCount         int       `json:"milestone_count"`
	Disclaimer             string    `json:"disclaimer"`
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

// ExecuteRectification runs a parallel BTR search across a ±searchWindowMinutes window
// in 15-second intervals and returns the best matching candidate.
//
// CFR-002: Returns an error if BasePayload.BirthDate or BasePayload.BirthTime are empty.
// CFR-003: IsCertified is derived from concordance >= threshold; never hardcoded.
func ExecuteRectification(req BTRRequest, tzLocation string) ([]byte, error) {
	// CFR-002: Input validation — do not silently default missing birth data
	if req.BasePayload.BirthDate == "" {
		return nil, fmt.Errorf("MISSING_REQUIRED_FIELD: base_payload.birth_date is required; no default is substituted")
	}
	if req.BasePayload.BirthTime == "" {
		return nil, fmt.Errorf("MISSING_REQUIRED_FIELD: base_payload.birth_time is required; no default is substituted")
	}

	loc, _ := time.LoadLocation(tzLocation)
	localTime, _ := time.ParseInLocation("2006-01-02 15:04:05", req.BasePayload.BirthDate+" "+req.BasePayload.BirthTime, loc)
	baseUtc := localTime.UTC()

	searchLimitSeconds := req.SearchWindowMinutes * 60
	type sliceResult struct {
		time   time.Time
		offset int
		score  float64
	}

	resultsChan := make(chan sliceResult, (searchLimitSeconds*2)/15+1)
	var wg sync.WaitGroup

	for offset := -searchLimitSeconds; offset <= searchLimitSeconds; offset += 15 {
		wg.Add(1)
		go func(currentOffset int) {
			defer wg.Done()
			candidateTime := baseUtc.Add(time.Duration(currentOffset) * time.Second)
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
			resultsChan <- sliceResult{time: candidateTime, offset: currentOffset, score: currentSliceScore}
		}(offset)
	}

	wg.Wait()
	close(resultsChan)

	var bestSlice time.Time
	maxScore := -1.0
	bestOffset := 0

	for res := range resultsChan {
		if res.score > maxScore {
			maxScore = res.score
			bestSlice = res.time
			bestOffset = res.offset
		}
	}

	finalConfidence := 0.0
	if len(req.Milestones) > 0 {
		finalConfidence = maxScore / float64(len(req.Milestones))
	}

	// CFR-003: Certification threshold — never hardcoded true
	const certThreshold = 0.70
	isCertified := len(req.Milestones) > 0 && finalConfidence >= certThreshold

	result := BTRResult{
		RectifiedTimeUtc:       bestSlice,
		OffsetSeconds:          bestOffset,
		ConcordanceRating:      finalConfidence,
		IsCertified:            isCertified,
		CertificationThreshold: certThreshold,
		MilestoneCount:         len(req.Milestones),
		Disclaimer: "BTR concordance is a heuristic estimate. It is NOT a validated astronomical certainty. " +
			"Results should be reviewed by a qualified Jyotisha practitioner.",
	}
	return json.Marshal(result)
}
