// Package astronomy composes the existing native Swiss engine. It never authorizes personal timing.
package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"errors"
	"math"
	"sort"
	"time"
)

const Version = "astronomy-provider-v1"
const MathematicalConvention = "angular-segmentation-v1; half-open [start,end); Lahiri per actual native SE_SIDM_LAHIRI"

func problem(code string) error { return errors.New(code) }
func norm(angle float64) float64 {
	v := math.Mod(angle, 360)
	if v < 0 {
		v += 360
		if v == 360 {
			v = math.Nextafter(360, 0)
		}
	}
	return v
}
func signed(angle float64) float64 { return norm(angle+180) - 180 }

type Elements struct {
	Tithi       int    `json:"tithi_1_based"`
	Paksha      string `json:"paksha"`
	Nakshatra   int    `json:"nakshatra_1_based"`
	Pada        int    `json:"pada_1_based"`
	Yoga        int    `json:"yoga_1_based"`
	KaranaIndex int    `json:"karana_index_0_based"`
	Karana      string `json:"karana_name"`
}

func Segment(sunTropical, moonTropical, sunSidereal, moonSidereal float64) (Elements, error) {
	for _, v := range []float64{sunTropical, moonTropical, sunSidereal, moonSidereal} {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return Elements{}, problem("INVALID_ANGLE")
		}
	}
	elongation := norm(moonTropical - sunTropical)
	tithi := int(math.Floor(elongation / 12))
	karana := int(math.Floor(elongation / 6))
	names := []string{"Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"}
	name := "Kimstughna"
	if karana >= 1 && karana <= 56 {
		name = names[(karana-1)%7]
	} else if karana >= 57 {
		name = []string{"Shakuni", "Chatushpada", "Naga"}[karana-57]
	}
	moon := norm(moonSidereal)
	nakshatra := int(math.Floor(moon * 27 / 360))
	pada := int(math.Floor(moon*108/360))%4 + 1
	paksha := "SHUKLA"
	if tithi >= 15 {
		paksha = "KRISHNA"
	}
	return Elements{tithi + 1, paksha, nakshatra + 1, pada, int(math.Floor(norm(sunSidereal+moonSidereal)*27/360)) + 1, karana, name}, nil
}

type Sampler func(time.Time) (float64, error)
type Boundary struct {
	At              time.Time `json:"at_utc"`
	Kind            string    `json:"kind"`
	TargetAngle     float64   `json:"target_angle_degrees"`
	AngularResidual float64   `json:"angular_residual_degrees"`
	BracketSeconds  float64   `json:"final_bracket_seconds"`
	Iterations      int       `json:"iterations"`
	PrecisionStatus string    `json:"precision_status"`
}

// Transitions follows small signed increments before bracketing; a wrap at360 is not a root by itself.
// The time bracket is a solver bound, never an independent astronomical accuracy claim.
func Transitions(ctx context.Context, kind string, start, end time.Time, step float64, sample Sampler) ([]Boundary, error) {
	if !start.Before(end) || end.Sub(start) > 8*24*time.Hour || math.IsNaN(step) || math.IsInf(step, 0) || step <= 0 || step > 180 || sample == nil {
		return nil, problem("INVALID_TRANSITION_REQUEST")
	}
	a, err := sample(start)
	if err != nil {
		return nil, err
	}
	if math.IsNaN(a) || math.IsInf(a, 0) {
		return nil, problem("INVALID_NATIVE_ANGLE")
	}
	previous := norm(a)
	unwrapped := previous
	left := start
	out := []Boundary{}
	target := (math.Floor(unwrapped/step) + 1) * step
	for left.Before(end) {
		if ctx.Err() != nil {
			return nil, problem("ASTRONOMY_TIMEOUT")
		}
		right := left.Add(time.Hour)
		if right.After(end) {
			right = end
		}
		raw, err := sample(right)
		if err != nil {
			return nil, err
		}
		if math.IsNaN(raw) || math.IsInf(raw, 0) {
			return nil, problem("INVALID_NATIVE_ANGLE")
		}
		delta := signed(norm(raw) - previous)
		if delta <= 0 || delta >= step || delta > 30 {
			return nil, problem("TRANSITION_MODEL_NOT_MONOTONIC_OR_UNDERSAMPLED")
		}
		next := unwrapped + delta
		for target <= next {
			lo, hi := left, right
			loAngle := unwrapped
			iterations := 0
			residual := math.Inf(1)
			for hi.Sub(lo) > time.Second && iterations < 64 {
				if ctx.Err() != nil {
					return nil, problem("ASTRONOMY_TIMEOUT")
				}
				mid := lo.Add(hi.Sub(lo) / 2)
				m, err := sample(mid)
				if err != nil {
					return nil, err
				}
				if math.IsNaN(m) || math.IsInf(m, 0) {
					return nil, problem("INVALID_NATIVE_ANGLE")
				}
				value := loAngle + signed(norm(m)-norm(loAngle))
				if value < loAngle || value > next+1e-8 {
					return nil, problem("TRANSITION_BRACKET_INVALID")
				}
				iterations++
				if value < target {
					lo = mid
					loAngle = value
				} else {
					hi = mid
				}
			}
			if hi.Sub(lo) > time.Second {
				return nil, problem("TRANSITION_DID_NOT_CONVERGE")
			}
			at := lo.Add(hi.Sub(lo) / 2).UTC()
			angle, err := sample(at)
			if err != nil {
				return nil, err
			}
			if math.IsNaN(angle) || math.IsInf(angle, 0) {
				return nil, problem("INVALID_NATIVE_ANGLE")
			}
			residual = math.Abs(signed(angle - target))
			if at.After(start) && !at.After(end) {
				out = append(out, Boundary{at, kind, norm(target), residual, hi.Sub(lo).Seconds(), iterations, "SOLVER_BRACKET_ONLY_NOT_EXTERNAL_ACCURACY"})
			}
			target += step
		}
		left = right
		previous = norm(raw)
		unwrapped = next
	}
	return out, nil
}

type FactorInterval struct {
	Kind  string    `json:"kind"`
	Value int       `json:"value"`
	Start time.Time `json:"start_utc"`
	End   time.Time `json:"end_utc"`
}
type TraditionalInterval struct {
	Name           string    `json:"name"`
	Start          time.Time `json:"start_utc"`
	End            time.Time `json:"end_utc"`
	Convention     string    `json:"convention"`
	ApprovalStatus string    `json:"approval_status"`
}
type DayRequest struct {
	SchemaVersion   int      `json:"schema_version"`
	Date            string   `json:"date"`
	Timezone        string   `json:"timezone"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	ElevationMeters float64  `json:"elevation_meters"`
	RequiredMode    string   `json:"required_mode"`
	DUT1Seconds     *float64 `json:"dut1_seconds,omitempty"`
}
type DayResult struct {
	Authority                AuthorityContract              `json:"authority"`
	ContractVersion          string                         `json:"contract_version"`
	Status                   string                         `json:"status"`
	Start                    time.Time                      `json:"day_start_utc"`
	End                      time.Time                      `json:"day_end_utc"`
	Timezone                 string                         `json:"timezone"`
	Vara                     string                         `json:"vara_civil_weekday"`
	AtStart                  Elements                       `json:"elements_at_civil_midnight"`
	Snapshot                 ephemeris.NativeSnapshotResult `json:"native_at_start"`
	Solar                    ephemeris.NativeSolarResult    `json:"solar"`
	Transitions              []Boundary                     `json:"transitions"`
	FactorIntervals          []FactorInterval               `json:"factor_intervals"`
	EnclosingFactors         []FactorInterval               `json:"factors_enclosing_midnight"`
	Traditional              []TraditionalInterval          `json:"traditional_intervals"`
	ValidationStatus         string                         `json:"validation_status"`
	CustomerTimingAuthorized bool                           `json:"customer_timing_authorized"`
	Limitations              []string                       `json:"limitations"`
}

func dayBounds(r DayRequest) (time.Time, time.Time, error) {
	if r.SchemaVersion != 1 || r.Latitude == nil || r.Longitude == nil || r.Timezone == "" || r.Timezone == "Local" {
		return time.Time{}, time.Time{}, problem("INVALID_DAY_REQUEST")
	}
	date, err := time.Parse("2006-01-02", r.Date)
	if err != nil || date.Year() < 1801 || date.Year() > 2398 {
		return time.Time{}, time.Time{}, problem("INVALID_DATE")
	}
	resolve := func(date string) (time.Time, error) {
		return ephemeris.ParseBirth(ephemeris.NormalizationRequest{BirthDate: date, BirthTime: "00:00:00", Timezone: r.Timezone, Latitude: r.Latitude, Longitude: r.Longitude}, "")
	}
	start, err := resolve(r.Date)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end, err := resolve(date.AddDate(0, 0, 1).Format("2006-01-02"))
	if err != nil || end.Sub(start) < 20*time.Hour || end.Sub(start) > 28*time.Hour {
		return time.Time{}, time.Time{}, problem("LOCAL_DAY_UNAVAILABLE")
	}
	return start, end, nil
}
func TraditionalIntervals(solar ephemeris.NativeSolarResult, weekday time.Weekday) []TraditionalInterval {
	out := []TraditionalInterval{}
	sunset := solar.Sunset
	if solar.SunsetAfterSunrise != nil {
		sunset = solar.SunsetAfterSunrise
	}
	if solar.Sunrise == nil || sunset == nil || !solar.Sunrise.Before(*sunset) {
		return out
	}
	rise, set := *solar.Sunrise, *sunset
	day := set.Sub(rise)
	// Explicit commonly used schedule variant; source/owner approval remains absent. Never a personal recommendation.
	for _, v := range []struct {
		name     string
		segments [7]int
	}{{"RAHU_KAAL", [7]int{8, 2, 7, 5, 6, 4, 3}}, {"YAMAGANDA", [7]int{5, 4, 3, 2, 1, 7, 6}}, {"GULIKA_KAAL", [7]int{7, 6, 5, 4, 3, 2, 1}}} {
		segment := v.segments[int(weekday)]
		a := rise.Add(day * time.Duration(segment-1) / 8)
		b := rise.Add(day * time.Duration(segment) / 8)
		out = append(out, TraditionalInterval{v.name, a, b, "weekday-daylight-eighths-v1; Sunday index0; unapproved schedule variant", "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING"})
	}
	middle := rise.Add(day / 2)
	out = append(out, TraditionalInterval{"ABHIJIT_MUHURTA", middle.Add(-day / 30), middle.Add(day / 30), "daylight-fifteenth-centered-v1; no favorable-day interpretation", "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING"}, TraditionalInterval{"BRAHMA_MUHURTA", rise.Add(-96 * time.Minute), rise.Add(-48 * time.Minute), "fixed96-to48-minutes-before-sunrise-v1; alternative night-duration conventions exist", "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING"})
	return out
}
func ComputeDay(ctx context.Context, r DayRequest, configuration ephemeris.NativeConfig) (DayResult, error) {
	if configuration.Mode == "SWISS_FILE" {
		if err := RequireProductionConfiguration(configuration); err != nil {
			return DayResult{}, err
		}
	}
	if configuration.Mode == "" {
		configuration.Mode = "MOSHIER"
	}
	start, end, err := dayBounds(r)
	if err != nil {
		return DayResult{}, err
	}
	if r.RequiredMode != "" && r.RequiredMode != configuration.Mode {
		return DayResult{}, problem("EPHEMERIS_MODE_UNAVAILABLE")
	}
	place := ephemeris.NativePlace{Latitude: *r.Latitude, Longitude: *r.Longitude, ElevationMeters: r.ElevationMeters}
	first, err := ephemeris.NativeSnapshot(start, configuration, r.DUT1Seconds, nil)
	if err != nil {
		return DayResult{}, err
	}
	if err := verifyActualAuthority(first, configuration); err != nil {
		return DayResult{}, err
	}
	solar, err := ephemeris.NativeSolarDay(start, end, place, configuration, r.DUT1Seconds)
	if err != nil {
		return DayResult{}, err
	}
	cache := map[int64]ephemeris.NativeSnapshotResult{start.UnixNano(): first}
	positions := func(t time.Time) (ephemeris.NativeSnapshotResult, error) {
		if ctx.Err() != nil {
			return ephemeris.NativeSnapshotResult{}, problem("ASTRONOMY_TIMEOUT")
		}
		if s, ok := cache[t.UnixNano()]; ok {
			return s, nil
		}
		s, e := ephemeris.NativeSnapshot(t, configuration, r.DUT1Seconds, nil)
		if e == nil {
			cache[t.UnixNano()] = s
		}
		return s, e
	}
	elements := func(s ephemeris.NativeSnapshotResult) (Elements, error) {
		sun, moon := s.Planets["sun"], s.Planets["moon"]
		return Segment(sun.TropicalLongitude, moon.TropicalLongitude, sun.SiderealLongitude, moon.SiderealLongitude)
	}
	atStart, err := elements(first)
	if err != nil {
		return DayResult{}, err
	}
	transitions := []Boundary{}
	intervals := []FactorInterval{}
	enclosing := []FactorInterval{}
	for _, kind := range []string{"tithi", "nakshatra", "yoga", "karana"} {
		step := 360.0 / 27
		if kind == "tithi" {
			step = 12
		}
		if kind == "karana" {
			step = 6
		}
		sample := func(t time.Time) (float64, error) {
			s, e := positions(t)
			if e != nil {
				return 0, e
			}
			sun, moon := s.Planets["sun"], s.Planets["moon"]
			switch kind {
			case "tithi", "karana":
				return norm(moon.TropicalLongitude - sun.TropicalLongitude), nil
			case "nakshatra":
				return moon.SiderealLongitude, nil
			default:
				return norm(moon.SiderealLongitude + sun.SiderealLongitude), nil
			}
		}
		found, e := Transitions(ctx, kind, start.Add(-3*24*time.Hour), end.Add(3*24*time.Hour), step, sample)
		if e != nil {
			return DayResult{}, e
		}
		previous, next := time.Time{}, time.Time{}
		for _, b := range found {
			if !b.At.After(start) {
				previous = b.At
			} else if next.IsZero() {
				next = b.At
			}
		}
		if previous.IsZero() || next.IsZero() {
			return DayResult{}, problem("PANCHANG_ENCLOSING_BOUNDARY_UNAVAILABLE")
		}
		current := atStart.Tithi
		switch kind {
		case "nakshatra":
			current = atStart.Nakshatra
		case "yoga":
			current = atStart.Yoga
		case "karana":
			current = atStart.KaranaIndex
		}
		enclosing = append(enclosing, FactorInterval{kind, current, previous, next})
		// Include each transition in the requested civil day, plus clipped constant-factor intervals.
		edges := []time.Time{start, end}
		for _, b := range found {
			if !b.At.Before(start) && b.At.Before(end) {
				transitions = append(transitions, b)
				edges = append(edges, b.At)
			}
		}
		sort.Slice(edges, func(i, j int) bool { return edges[i].Before(edges[j]) })
		for i := 1; i < len(edges); i++ {
			if !edges[i-1].Before(edges[i]) {
				continue
			}
			mid := edges[i-1].Add(edges[i].Sub(edges[i-1]) / 2)
			s, e := positions(mid)
			if e != nil {
				return DayResult{}, e
			}
			v, e := elements(s)
			if e != nil {
				return DayResult{}, e
			}
			number := v.Tithi
			switch kind {
			case "nakshatra":
				number = v.Nakshatra
			case "yoga":
				number = v.Yoga
			case "karana":
				number = v.KaranaIndex
			}
			intervals = append(intervals, FactorInterval{kind, number, edges[i-1], edges[i]})
		}
	}
	loc, _ := ephemeris.LoadCalculationLocation(r.Timezone)
	weekday := start.In(loc).Weekday()
	sort.Slice(transitions, func(i, j int) bool {
		if transitions[i].At.Equal(transitions[j].At) {
			return transitions[i].Kind < transitions[j].Kind
		}
		return transitions[i].At.Before(transitions[j].At)
	})
	traditional := TraditionalIntervals(solar, weekday)
	if solar.Sunrise != nil {
		rise := *solar.Sunrise
		if rise.Before(end) {
			traditional = append(traditional, TraditionalInterval{"VARA_" + weekday.String(), rise, end, "sunrise-day-v1; solar-source and traditional approval pending", "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING"})
		}
		if start.Before(rise) {
			traditional = append(traditional, TraditionalInterval{"VARA_" + time.Weekday((int(weekday)+6)%7).String(), start, rise, "sunrise-day-v1; before sunrise uses previous civil weekday", "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING"})
		}
	}
	return DayResult{Authority: Authority(configuration), ContractVersion: Version, Status: "COMPUTED_UNVERIFIED", Start: start, End: end, Timezone: r.Timezone, Vara: weekday.String(), AtStart: atStart, Snapshot: first, Solar: solar, Transitions: transitions, FactorIntervals: intervals, EnclosingFactors: enclosing, Traditional: traditional, ValidationStatus: "NOT_INDEPENDENTLY_VERIFIED", CustomerTimingAuthorized: false, Limitations: []string{"Panchang angular segmentation and numerical convergence are not independent astronomical validation.", "Vara here is civil weekday; a sunrise-based day convention must be separately selected and approved.", "Traditional interval schedules are explicitly unapproved variants and do not authorize personal timing or financial predictions.", "Solar model pressure,temperature,limb and elevation assumptions limit real-world event accuracy; no sub-minute accuracy promise."}}, nil
}
