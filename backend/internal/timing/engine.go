package timing

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"
)

// RequestBinding is internal provenance binding. Never return or persist a birth-data digest publicly.
func RequestBinding(req Request) string {
	b, _ := json.Marshal(req)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
func blocked(req Request, now time.Time, day *Day, status Status, code string) Result {
	return Result{1, status, code, day, req.Activity, []Window{}, []string{"Personalized customer guidance is disabled until CORE-P0-01 inputs and owner-approved timing rules/release are independently verified.", "Traditional classifications are not empirically validated predictions; no success or investment probability is supplied."}, Provenance{CalculationVersion: Version, RuleVersion: RuleVersion, EphemerisMode: "UNAVAILABLE", RequestedEphemerisMode: req.EphemerisMode, Source: "NATIVE_SWISS_CONTRACT_UNAVAILABLE", CalculatedAt: now.UTC(), AccuracyStatus: "NOT_VERIFIED", ReleaseAuthorized: false}}
}
func (e *Engine) Calculate(ctx context.Context, req Request, now time.Time) (Result, error) {
	v, err := Validate(req)
	if err != nil {
		return Result{}, err
	}
	result := blocked(req, now, &v.Day, Unavailable, "CORE_P0_01_NOT_VERIFIED")
	if req.Birth.Certainty != "EXACT" {
		result.Status = Insufficient
		result.Code = "BIRTH_TIME_EVIDENCE_INSUFFICIENT"
		return result, nil
	}
	if e == nil || e.provider == nil {
		return result, nil
	}
	inputs, err := e.provider.Load(ctx, v)
	if ctx.Err() != nil {
		return blocked(req, now, &v.Day, Unavailable, "CALCULATION_TIMEOUT"), nil
	}
	if err != nil {
		return result, nil
	}
	// No native reference acceptance authority is implemented: real inputs cannot bypass CORE01 using status strings.
	if !inputs.Synthetic {
		return result, nil
	}
	result.Provenance.EphemerisMode = "SYNTHETIC"
	result.Provenance.Source = inputs.Source
	result.Provenance.EvidenceReference = inputs.EvidenceReference
	result.Provenance.LibraryVersion = inputs.LibraryVersion
	result.Provenance.TimeScale = inputs.TimeScale
	result.Provenance.AccuracyStatus = "SYNTHETIC_NOT_ACCURACY_EVIDENCE"
	observed := inputs.ObservedAt.UTC()
	result.Provenance.InputObservedAt = &observed
	if !validInputs(inputs, v) {
		result.Status = Insufficient
		result.Code = "INVALID_OR_UNBOUND_INPUT_EVIDENCE"
		return result, nil
	}
	rules := []Rule{}
	for _, r := range e.registry.Rules {
		if r.Activity == req.Activity {
			rules = append(rules, r)
		}
	}
	if len(rules) == 0 {
		result.Code = "ACTIVITY_RULES_UNAVAILABLE"
		return result, nil
	}
	type candidate struct {
		interval Interval
		rule     Rule
	}
	candidates := []candidate{}
	exclusions := []Interval{}
	for _, rule := range rules {
		if ctx.Err() != nil {
			return blocked(req, now, &v.Day, Unavailable, "CALCULATION_TIMEOUT"), nil
		}
		if rule.RequiresSunrise && (inputs.Sunrise == nil || inputs.Sunset == nil) {
			result.Status = Insufficient
			result.Code = "SOLAR_EVENTS_UNAVAILABLE"
			return result, nil
		}
		matches := []Interval{v.Day.Interval}
		for _, predicate := range rule.Predicates {
			available, selected := []Interval{}, []Interval{}
			for _, fact := range inputs.Facts {
				if fact.Kind == predicate.Kind && fact.Key == predicate.Key {
					available = append(available, fact.Interval)
					if fact.Value == predicate.Value {
						selected = append(selected, fact.Interval)
					}
				}
			}
			coverage := Intersect(available, []Interval{v.Day.Interval})
			if len(coverage) != 1 || !sameInterval(coverage[0], v.Day.Interval) {
				result.Status = Insufficient
				result.Code = "REQUIRED_FACT_COVERAGE_MISSING"
				return result, nil
			}
			matches = Intersect(matches, selected)
		}
		if rule.Effect == "EXCLUDE" {
			exclusions = append(exclusions, matches...)
		} else {
			for _, i := range matches {
				candidates = append(candidates, candidate{i, rule})
			}
		}
	}
	boundaries := []time.Time{}
	for _, c := range candidates {
		for _, v := range Subtract([]Interval{c.interval}, exclusions) {
			boundaries = append(boundaries, v.Start, v.End)
		}
	}
	boundaries = uniqueTimes(boundaries)
	type ranked struct {
		window   Window
		priority int
	}
	rankedWindows := []ranked{}
	for i := 1; i < len(boundaries); i++ {
		if ctx.Err() != nil {
			return blocked(req, now, &v.Day, Unavailable, "CALCULATION_TIMEOUT"), nil
		}
		interval := Interval{boundaries[i-1], boundaries[i]}
		if len(Subtract([]Interval{interval}, exclusions)) == 0 {
			continue
		}
		matched := map[string]Rule{}
		priority := -1
		for _, c := range candidates {
			if x, ok := intersection(interval, c.interval); ok && sameInterval(x, interval) {
				matched[c.rule.ID] = c.rule
				if c.rule.Priority > priority {
					priority = c.rule.Priority
				}
			}
		}
		if len(matched) == 0 {
			continue
		}
		ids := []string{}
		for id := range matched {
			ids = append(ids, id)
		}
		sort.Strings(ids)
		explanations := []string{}
		for _, id := range ids {
			rule := matched[id]
			explanations = append(explanations, id+" ("+rule.Version+"): "+rule.Applicability+" Source: "+rule.Source.Reference+" / "+rule.Source.Locator+". "+rule.Limitation)
		}
		w := Window{interval, int64(interval.End.Sub(interval.Start) / time.Second), 0, ids, explanations, "PROVISIONAL_TRADITIONAL_FAVORABLE"}
		if len(rankedWindows) > 0 {
			last := &rankedWindows[len(rankedWindows)-1]
			if last.window.End.Equal(w.Start) && last.priority == priority && strings.Join(last.window.RuleIDs, ",") == strings.Join(ids, ",") {
				last.window.End = w.End
				last.window.DurationSeconds += w.DurationSeconds
				continue
			}
		}
		rankedWindows = append(rankedWindows, ranked{w, priority})
	}
	if len(rankedWindows) > 128 {
		result.Status = Insufficient
		result.Code = "WINDOW_COMPLEXITY_LIMIT"
		return result, nil
	}
	sort.Slice(rankedWindows, func(i, j int) bool {
		a, b := rankedWindows[i], rankedWindows[j]
		if a.priority != b.priority {
			return a.priority > b.priority
		}
		if a.window.DurationSeconds != b.window.DurationSeconds {
			return a.window.DurationSeconds > b.window.DurationSeconds
		}
		if !a.window.Start.Equal(b.window.Start) {
			return a.window.Start.Before(b.window.Start)
		}
		return strings.Join(a.window.RuleIDs, ",") < strings.Join(b.window.RuleIDs, ",")
	})
	for i, w := range rankedWindows {
		w.window.Rank = i + 1
		result.Windows = append(result.Windows, w.window)
	}
	result.Status = Provisional
	result.Code = "SYNTHETIC_ALGORITHM_ONLY"
	if len(result.Windows) == 0 {
		result.Code = "NO_CANDIDATE_WINDOWS"
	}
	result.Limitations = append(result.Limitations, "Synthetic algorithm fixture only: these windows must never be used as customer recommendations.")
	return result, nil
}
func validInputs(in Inputs, v Validated) bool {
	if in.Binding != RequestBinding(v.Request) || !in.BirthUTC.Equal(v.BirthUTC) || !sameInterval(in.Day.Interval, v.Day.Interval) || in.Day.Date != v.Day.Date || in.Day.Timezone != v.Day.Timezone || in.EphemerisMode != v.Request.EphemerisMode || in.Source == "" || len(in.Source) > 200 || in.EvidenceReference == "" || len(in.EvidenceReference) > 200 || in.LibraryVersion == "" || len(in.LibraryVersion) > 100 || in.TimeScale == "" || len(in.TimeScale) > 100 || in.ObservedAt.IsZero() || len(in.Facts) > 512 {
		return false
	}
	if in.Sunrise != nil && in.Sunset != nil && (!in.Sunrise.Before(*in.Sunset) || in.Sunrise.Before(v.Day.Start) || !in.Sunset.Before(v.Day.End)) {
		return false
	}
	for i, a := range in.Facts {
		if !validKind(a.Kind) || !identifier.MatchString(a.Key) || a.Value == "" || len(a.Value) > 100 || !a.Interval.Start.Before(a.Interval.End) || a.Interval.Start.Nanosecond() != 0 || a.Interval.End.Nanosecond() != 0 {
			return false
		}
		for _, b := range in.Facts[:i] {
			if a.Kind == b.Kind && a.Key == b.Key && a.Value != b.Value {
				if _, ok := intersection(a.Interval, b.Interval); ok {
					return false
				}
			}
		}
	}
	return true
}

// NativeEngine deliberately registers no fabricated natal/Panchang/solar provider or unapproved rule.
// Future CORE01 acceptance must replace this binding in reviewed code, not through a runtime flag.
func NativeEngine() *Engine { e, _ := NewEngine(nil, Registry{Version: RuleVersion}); return e }
func Capability() map[string]any {
	return map[string]any{"schema_version": 1, "calculation_version": Version, "rule_version": RuleVersion, "status": Unavailable, "accuracy_status": "NOT_VERIFIED", "release_authorized": false, "missing_dependencies": []string{"CORE_P0_01_NATIVE_REFERENCE_ACCEPTANCE", "VERIFIED_PANCHANG_AND_SOLAR_EVENTS", "OWNER_APPROVED_ACTIVITY_RULES", "PERSONAL_TIMING_RELEASE_AUTHORIZATION"}}
}
