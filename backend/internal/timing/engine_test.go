package timing

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"
)

func ptr(n float64) *float64 { return &n }
func request() Request {
	return Request{1, Birth{Place{"Asia/Kolkata", ptr(22.57), ptr(88.36)}, "2000-01-01", "12:00:00", "EXACT", nil, 0}, Target{Place{"Asia/Kolkata", ptr(22.57), ptr(88.36)}, "2026-02-28"}, "work", RuleVersion, "MOSHIER"}
}

var now = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

type fixtureProvider func(Validated) Inputs

func (f fixtureProvider) Load(_ context.Context, v Validated) (Inputs, error) { return f(v), nil }
func facts(v Validated) Inputs {
	return Inputs{Binding: RequestBinding(v.Request), BirthUTC: v.BirthUTC, Day: v.Day, Source: "SYNTHETIC_ALGORITHM_FIXTURE", EvidenceReference: "test:engine_test.go", EphemerisMode: v.Request.EphemerisMode, LibraryVersion: "synthetic-no-astronomy", TimeScale: "FIXTURE_UTC", ObservedAt: now, Synthetic: true, Facts: []Fact{{Natal, "fixture-natal", "yes", v.Day.Interval}, {Transit, "fixture-transit", "yes", v.Day.Interval}}}
}
func rule(id, effect string, priority int) Rule {
	return Rule{id, "fixture-v1", "work", Source{"synthetic:algorithm-test", "engine_test.go; not a traditional rule", "PROVISIONAL"}, "Fixture conditions matched; no astronomical or predictive claim.", "Synthetic inputs are not customer guidance.", effect, priority, false, []Predicate{{Natal, "fixture-natal", "yes"}, {Transit, "fixture-transit", "yes"}}}
}
func engine(t *testing.T, p fixtureProvider, rules ...Rule) *Engine {
	t.Helper()
	e, err := NewEngine(p, Registry{RuleVersion, rules})
	if err != nil {
		t.Fatal(err)
	}
	return e
}
func TestLocalDaysAndBirthDST(t *testing.T) {
	for _, x := range []struct {
		zone, date string
		seconds    int64
	}{{"Asia/Kolkata", "2026-03-08", 86400}, {"America/New_York", "2026-03-08", 82800}, {"America/Toronto", "2026-11-01", 90000}, {"America/Vancouver", "2026-03-08", 82800}, {"Australia/Lord_Howe", "2026-10-04", 84600}} {
		t.Run(x.zone+x.date, func(t *testing.T) {
			d, err := LocalDay(Target{Place{x.zone, ptr(45), ptr(-73)}, x.date})
			if err != nil || d.ElapsedSeconds != x.seconds {
				t.Fatal(d, err)
			}
		})
	}
	r := request()
	r.Target.Date = "2026-11-03"
	r.Birth.Place = Place{"America/New_York", ptr(40), ptr(-74)}
	r.Birth.Date = "2026-03-08"
	r.Birth.Time = "02:30:00"
	if _, err := Validate(r); err == nil || err.Error() != "NONEXISTENT_LOCAL_TIME" {
		t.Fatal("DST gap", err)
	}
	r.Birth.Date = "2026-11-01"
	r.Birth.Time = "01:30:00"
	if _, err := Validate(r); err == nil || err.Error() != "AMBIGUOUS_LOCAL_TIME" {
		t.Fatal("DST fold", err)
	}
	r.Birth.UTCOffset = ptr(-4)
	a, err := Validate(r)
	if err != nil {
		t.Fatal(err)
	}
	r.Birth.UTCOffset = ptr(-5)
	b, err := Validate(r)
	if err != nil || b.BirthUTC.Sub(a.BirthUTC) != time.Hour {
		t.Fatal("explicit fold offset", err)
	}
	r.Birth.UTCOffset = ptr(5.5)
	if _, err := Validate(r); err == nil {
		t.Fatal("wrong offset accepted")
	}
}
func TestStrictInputAndUncertainty(t *testing.T) {
	mutations := []func(*Request){func(r *Request) { r.Target.Date = "2026-02-29" }, func(r *Request) { r.Birth.Date = "1900-02-29" }, func(r *Request) { r.Target.Place.Timezone = "Local" }, func(r *Request) { r.Birth.Latitude = ptr(91) }, func(r *Request) { r.Target.Longitude = nil }, func(r *Request) { r.EphemerisMode = "ANALYTICAL" }, func(r *Request) { r.RuleVersion = "unapproved" }, func(r *Request) { r.Birth.Time = "25:00" }, func(r *Request) { r.Activity = "stock-profit" }, func(r *Request) { r.Target.Date = "1999-01-01" }, func(r *Request) { r.Birth.Date = "2100-01-01" }, func(r *Request) { r.Birth.Certainty = "APPROXIMATE" }}
	for i, change := range mutations {
		r := request()
		change(&r)
		if _, err := Validate(r); err == nil {
			t.Fatal("invalid request accepted", i)
		}
	}
	r := request()
	r.Target.Date = "2024-02-29"
	if _, err := Validate(r); err != nil {
		t.Fatal("leap day", err)
	}
	for _, certainty := range []string{"UNKNOWN", "APPROXIMATE"} {
		r := request()
		r.Birth.Certainty = certainty
		if certainty == "UNKNOWN" {
			r.Birth.Time = ""
		} else {
			r.Birth.UncertaintyMinutes = 15
		}
		out, err := engine(t, facts, rule("fixture-include", "INCLUDE", 1)).Calculate(context.Background(), r, now)
		if err != nil || out.Status != Insufficient || len(out.Windows) != 0 {
			t.Fatal("uncertainty must not invent precision", out, err)
		}
	}
}
func TestIntervalAlgebraAndMidnight(t *testing.T) {
	base := now
	at := func(h int) time.Time { return base.Add(time.Duration(h) * time.Hour) }
	got := Subtract([]Interval{{at(-2), at(26)}}, []Interval{{at(4), at(8)}, {at(6), at(10)}, {at(22), at(30)}})
	expected := []Interval{{at(-2), at(4)}, {at(10), at(22)}}
	if !reflect.DeepEqual(got, expected) {
		t.Fatal(got)
	}
	if len(Intersect([]Interval{{at(0), at(1)}}, []Interval{{at(1), at(2)}})) != 0 {
		t.Fatal("touching boundary overlaps")
	}
	r := request()
	p := func(v Validated) Inputs {
		i := facts(v)
		i.Facts[1].Interval = Interval{v.Day.Start.Add(-2 * time.Hour), v.Day.End.Add(2 * time.Hour)}
		return i
	}
	out, err := engine(t, p, rule("fixture-include", "INCLUDE", 1)).Calculate(context.Background(), r, now)
	if err != nil || len(out.Windows) != 1 || !sameInterval(out.Windows[0].Interval, out.Day.Interval) {
		t.Fatal("midnight clipping", out, err)
	}
}
func TestDeterministicExclusionRankingAndTies(t *testing.T) {
	p := func(v Validated) Inputs {
		i := facts(v)
		s := v.Day.Start
		i.Facts = append(i.Facts, Fact{Transit, "fixture-risk", "clear", Interval{s, s.Add(4 * time.Hour)}}, Fact{Transit, "fixture-risk", "blocked", Interval{s.Add(4 * time.Hour), s.Add(8 * time.Hour)}}, Fact{Transit, "fixture-risk", "clear", Interval{s.Add(8 * time.Hour), v.Day.End}})
		return i
	}
	include := rule("fixture-include", "INCLUDE", 1)
	exclude := rule("fixture-exclude", "EXCLUDE", 100)
	exclude.Predicates = []Predicate{{Transit, "fixture-risk", "blocked"}}
	e := engine(t, p, exclude, include)
	a, err := e.Calculate(context.Background(), request(), now)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := e.Calculate(context.Background(), request(), now)
	if !reflect.DeepEqual(a, b) || a.Status != Provisional || len(a.Windows) != 2 || a.Windows[0].DurationSeconds != 16*3600 || a.Windows[1].DurationSeconds != 4*3600 || a.Windows[0].Rank != 1 || a.Provenance.ReleaseAuthorized {
		t.Fatal(a)
	}
	encoded, _ := json.Marshal(a)
	for _, bad := range []string{`"confidence":`, `"probability":`, "2000-01-01", `"latitude":`} {
		if strings.Contains(string(encoded), bad) {
			t.Fatal("unexpected personal or fabricated field", bad)
		}
	}
	// Rule order/fact order cannot affect output.
	reversed := engine(t, func(v Validated) Inputs {
		i := p(v)
		for a, b := 0, len(i.Facts)-1; a < b; a, b = a+1, b-1 {
			i.Facts[a], i.Facts[b] = i.Facts[b], i.Facts[a]
		}
		return i
	}, include, exclude)
	c, _ := reversed.Calculate(context.Background(), request(), now)
	if !reflect.DeepEqual(a, c) {
		t.Fatal("ordering changed result")
	}
}
func TestMissingEvidenceModesAndPolar(t *testing.T) {
	for _, change := range []func(*Inputs){func(i *Inputs) { i.Synthetic = false }, func(i *Inputs) { i.Binding = "wrong" }, func(i *Inputs) { i.Facts = nil }, func(i *Inputs) { i.EphemerisMode = "SWISS_FILE" }, func(i *Inputs) { i.Day.Timezone = "wrong" }, func(i *Inputs) { i.Facts = append(i.Facts, Fact{Natal, "fixture-natal", "conflict", i.Day.Interval}) }} {
		e := engine(t, func(v Validated) Inputs { i := facts(v); change(&i); return i }, rule("fixture-include", "INCLUDE", 1))
		out, err := e.Calculate(context.Background(), request(), now)
		if err != nil || len(out.Windows) != 0 || out.Status == Provisional {
			t.Fatal("bad evidence released", out, err)
		}
	}
	solar := rule("fixture-solar", "INCLUDE", 1)
	solar.RequiresSunrise = true
	r := request()
	r.Target.Latitude = ptr(89)
	out, err := engine(t, facts, solar).Calculate(context.Background(), r, now)
	if err != nil || out.Code != "SOLAR_EVENTS_UNAVAILABLE" {
		t.Fatal(out, err)
	}
	out, err = NativeEngine().Calculate(context.Background(), request(), now)
	if err != nil || out.Status != Unavailable || len(out.Windows) != 0 {
		t.Fatal("native gate bypass", out, err)
	}
}
func TestRuleRegistryAndSnapshot(t *testing.T) {
	bad := rule("fixture", "INCLUDE", 1)
	bad.Source.Locator = ""
	if _, err := NewEngine(fixtureProvider(facts), Registry{RuleVersion, []Rule{bad}}); err == nil {
		t.Fatal("missing source")
	}
	bad = rule("fixture", "INCLUDE", 1)
	bad.Predicates = []Predicate{{Weekday, "day", "yes"}}
	if _, err := NewEngine(fixtureProvider(facts), Registry{RuleVersion, []Rule{bad}}); err == nil {
		t.Fatal("generic rule substituted for personal")
	}
	original := rule("fixture", "INCLUDE", 1)
	e := engine(t, facts, original)
	original.Predicates[0].Value = "changed"
	out, err := e.Calculate(context.Background(), request(), now)
	if err != nil || len(out.Windows) != 1 {
		t.Fatal("mutable rules", err)
	}
}
func TestHTTPContractsFailClosed(t *testing.T) {
	handler := Handler(NativeEngine(), func() time.Time { return now })
	raw, _ := json.Marshal(request())
	for _, x := range []struct {
		method, path, body string
		status             int
	}{{"POST", "/api/v1/timing/daily", string(raw), 503}, {"GET", "/api/v1/timing/daily?birth=private", "", 422}, {"POST", "/api/v1/timing/daily", `{"profile_id":"other"}`, 422}, {"POST", "/api/v1/timing/daily", strings.Repeat(" ", 17000), 413}, {"GET", "/api/v1/timing/activities", "", 200}, {"GET", "/api/v1/timing/capability", "", 200}, {"GET", "/api/v1/timing/daily", "", 405}} {
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, httptest.NewRequest(x.method, x.path, strings.NewReader(x.body)))
		if w.Code != x.status || w.Header().Get("Cache-Control") != "no-store" || strings.Contains(w.Body.String(), "2000-01-01") {
			t.Fatal(x.method, x.path, w.Code, w.Body.String())
		}
	}
}

func TestPriorityOverlapsTiesAndEmptyWindows(t *testing.T) {
	low := rule("fixture-low", "INCLUDE", 1)
	high := rule("fixture-high", "INCLUDE", 20)
	high.Predicates = append(high.Predicates, Predicate{Transit, "fixture-priority", "yes"})
	p := func(v Validated) Inputs {
		i := facts(v)
		s := v.Day.Start
		i.Facts = append(i.Facts, Fact{Transit, "fixture-priority", "no", Interval{s, s.Add(6 * time.Hour)}}, Fact{Transit, "fixture-priority", "yes", Interval{s.Add(6 * time.Hour), s.Add(8 * time.Hour)}}, Fact{Transit, "fixture-priority", "no", Interval{s.Add(8 * time.Hour), v.Day.End}})
		return i
	}
	out, err := engine(t, p, low, high).Calculate(context.Background(), request(), now)
	if err != nil || len(out.Windows) != 3 || out.Windows[0].DurationSeconds != 7200 || strings.Join(out.Windows[0].RuleIDs, ",") != "fixture-high,fixture-low" || out.Windows[1].DurationSeconds != 16*3600 {
		t.Fatal("explicit priority/split overlap", out, err)
	}
	exclusion := rule("fixture-middle", "EXCLUDE", 1)
	exclusion.Predicates = []Predicate{{Transit, "fixture-priority", "yes"}}
	p = func(v Validated) Inputs {
		i := facts(v)
		s := v.Day.Start
		i.Facts = append(i.Facts, Fact{Transit, "fixture-priority", "no", Interval{s, s.Add(8 * time.Hour)}}, Fact{Transit, "fixture-priority", "yes", Interval{s.Add(8 * time.Hour), s.Add(16 * time.Hour)}}, Fact{Transit, "fixture-priority", "no", Interval{s.Add(16 * time.Hour), v.Day.End}})
		return i
	}
	out, err = engine(t, p, low, exclusion).Calculate(context.Background(), request(), now)
	if err != nil || len(out.Windows) != 2 || out.Windows[0].DurationSeconds != out.Windows[1].DurationSeconds || !out.Windows[0].Start.Before(out.Windows[1].Start) {
		t.Fatal("stable earliest tie", out, err)
	}
	excludeAll := rule("fixture-all", "EXCLUDE", 100)
	out, err = engine(t, facts, low, excludeAll).Calculate(context.Background(), request(), now)
	if err != nil || out.Code != "NO_CANDIDATE_WINDOWS" || len(out.Windows) != 0 {
		t.Fatal("empty result invented window", out, err)
	}
}
func TestMidnightCrossingAndSkippedCivilDate(t *testing.T) {
	p := func(v Validated) Inputs {
		i := facts(v)
		s, e := v.Day.Start, v.Day.End
		i.Facts = []Fact{{Natal, "fixture-natal", "yes", v.Day.Interval}, {Transit, "fixture-transit", "no", Interval{s, e.Add(-time.Hour)}}, {Transit, "fixture-transit", "yes", Interval{e.Add(-time.Hour), e.Add(2 * time.Hour)}}}
		return i
	}
	out, err := engine(t, p, rule("fixture-midnight", "INCLUDE", 1)).Calculate(context.Background(), request(), now)
	if err != nil || len(out.Windows) != 1 || out.Windows[0].DurationSeconds != 3600 || !out.Windows[0].End.Equal(out.Day.End) {
		t.Fatal("cross-midnight window not clipped", out, err)
	}
	if _, err := LocalDay(Target{Place{"Pacific/Apia", ptr(-13), ptr(-171)}, "2011-12-30"}); err == nil {
		t.Fatal("skipped local date guessed")
	}
}
