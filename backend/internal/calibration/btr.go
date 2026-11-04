package calibration

import (
	"encoding/json"
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

// Parallel worker pool optimization for handling massive user loads concurrently
func ExecuteRectification(req BTRRequest, tzLocation string) ([]byte, error) {
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

	result := BTRResult{
		RectifiedTimeUtc:  bestSlice,
		OffsetSeconds:     bestOffset,
		ConcordanceRating: finalConfidence,
		IsCertifiedTrue:   finalConfidence >= 0.70,
	}
	return json.Marshal(result)
}
