// Package timing evaluates supplied, provenance-bound timing facts. It does not invent astronomy or traditional rules.
package timing

import (
	"context"
	"time"
)

const Version = "timing-v1"
const RuleVersion = "timing-rules-v1"

type Status string

const (
	Unavailable  Status = "UNAVAILABLE"
	Insufficient Status = "INSUFFICIENT_EVIDENCE"
	Provisional  Status = "PROVISIONAL"
)

type Place struct {
	Timezone  string   `json:"timezone"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}
type Birth struct {
	Place
	Date               string   `json:"date"`
	Time               string   `json:"time,omitempty"`
	Certainty          string   `json:"certainty"`
	UTCOffset          *float64 `json:"utc_offset,omitempty"`
	UncertaintyMinutes int      `json:"uncertainty_minutes,omitempty"`
}
type Target struct {
	Place
	Date string `json:"date"`
}
type Request struct {
	SchemaVersion int    `json:"schema_version"`
	Birth         Birth  `json:"birth"`
	Target        Target `json:"target"`
	Activity      string `json:"activity"`
	RuleVersion   string `json:"rule_version"`
	EphemerisMode string `json:"ephemeris_mode"`
}
type Interval struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}
type Day struct {
	Interval
	Date           string `json:"date"`
	Timezone       string `json:"timezone"`
	ElapsedSeconds int64  `json:"elapsed_seconds"`
}
type Validated struct {
	Request  Request
	BirthUTC time.Time
	Day      Day
}
type FactKind string

const (
	Natal     FactKind = "natal"
	Transit   FactKind = "transit"
	Tithi     FactKind = "tithi"
	Nakshatra FactKind = "nakshatra"
	Yoga      FactKind = "yoga"
	Karana    FactKind = "karana"
	Weekday   FactKind = "weekday"
)

// Fact segments are absolute, half-open intervals over which an independently supplied fact is constant.
type Fact struct {
	Kind       FactKind
	Key, Value string
	Interval   Interval
}
type Inputs struct {
	Binding           string
	BirthUTC          time.Time
	Day               Day
	Source            string
	EvidenceReference string
	EphemerisMode     string
	LibraryVersion    string
	TimeScale         string
	ObservedAt        time.Time
	Synthetic         bool
	Sunrise, Sunset   *time.Time
	Facts             []Fact
}
type Provider interface {
	Load(context.Context, Validated) (Inputs, error)
}
type Source struct {
	Reference    string `json:"reference"`
	Locator      string `json:"locator"`
	ReviewStatus string `json:"review_status"`
}
type Predicate struct {
	Kind       FactKind
	Key, Value string
}
type Rule struct {
	ID, Version, Activity     string
	Source                    Source
	Applicability, Limitation string
	Effect                    string // INCLUDE or EXCLUDE; excludes always win.
	Priority                  int    // Explicit rule precedence, never a probability or confidence score.
	RequiresSunrise           bool
	Predicates                []Predicate
}
type Registry struct {
	Version string
	Rules   []Rule
}
type Activity struct {
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	RuleVersion string   `json:"rule_version"`
	Status      Status   `json:"status"`
	Sources     []Source `json:"sources"`
	Limitation  string   `json:"limitation"`
}
type Window struct {
	Interval
	DurationSeconds int64    `json:"duration_seconds"`
	Rank            int      `json:"rank"`
	RuleIDs         []string `json:"rule_ids"`
	Explanations    []string `json:"explanations"`
	Classification  string   `json:"classification"`
}
type Provenance struct {
	CalculationVersion     string     `json:"calculation_version"`
	RuleVersion            string     `json:"rule_version"`
	EphemerisMode          string     `json:"ephemeris_mode"`
	RequestedEphemerisMode string     `json:"requested_ephemeris_mode"`
	Source                 string     `json:"source"`
	EvidenceReference      string     `json:"evidence_reference,omitempty"`
	LibraryVersion         string     `json:"library_version,omitempty"`
	TimeScale              string     `json:"time_scale,omitempty"`
	CalculatedAt           time.Time  `json:"calculated_at"`
	InputObservedAt        *time.Time `json:"input_observed_at,omitempty"`
	AccuracyStatus         string     `json:"accuracy_status"`
	ReleaseAuthorized      bool       `json:"release_authorized"`
}
type Result struct {
	SchemaVersion int        `json:"schema_version"`
	Status        Status     `json:"status"`
	Code          string     `json:"code"`
	Day           *Day       `json:"day,omitempty"`
	Activity      string     `json:"activity"`
	Windows       []Window   `json:"windows"`
	Limitations   []string   `json:"limitations"`
	Provenance    Provenance `json:"provenance"`
}
type Engine struct {
	provider Provider
	registry Registry
}

// NewEngine snapshots rules. HTTP clients cannot supply a Provider, facts, rules or approval flags.
func NewEngine(provider Provider, registry Registry) (*Engine, error) {
	if err := registry.Validate(); err != nil {
		return nil, err
	}
	copyRegistry := Registry{Version: registry.Version, Rules: append([]Rule(nil), registry.Rules...)}
	for i := range copyRegistry.Rules {
		copyRegistry.Rules[i].Predicates = append([]Predicate(nil), registry.Rules[i].Predicates...)
	}
	return &Engine{provider, copyRegistry}, nil
}
