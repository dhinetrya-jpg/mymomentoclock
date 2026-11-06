package timing

import "regexp"

var identifier = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,79}$`)
var categoryDefinitions = []struct{ id, label string }{
	{"work", "Work, interviews and professional decisions"}, {"purchases", "Purchases and important transactions"}, {"travel", "Travel and journeys"}, {"learning", "Learning, examinations and study"}, {"family", "Family and personal occasions"}, {"finance", "Financial planning and trading context"},
}

func supportedActivity(id string) bool {
	for _, a := range categoryDefinitions {
		if a.id == id {
			return true
		}
	}
	return false
}
func Activities() []Activity {
	result := []Activity{}
	for _, a := range categoryDefinitions {
		limitation := "No owner-approved source rules or independently verified personalized inputs are available."
		if a.id == "finance" {
			limitation += " Traditional context only; no guaranteed profit, investment advantage or scientifically established predictive accuracy."
		}
		result = append(result, Activity{a.id, a.label, RuleVersion, Unavailable, []Source{{"OWNER_RULE_SOURCE_REQUIRED", "Exact edition/passage and applicability not supplied", "UNAPPROVED"}}, limitation})
	}
	return result
}
func validKind(k FactKind) bool {
	switch k {
	case Natal, Transit, Tithi, Nakshatra, Yoga, Karana, Weekday:
		return true
	}
	return false
}
func (r Registry) Validate() error {
	if r.Version != RuleVersion || len(r.Rules) > 64 {
		return problem("INVALID_RULE_REGISTRY")
	}
	seen := map[string]bool{}
	for _, rule := range r.Rules {
		if !identifier.MatchString(rule.ID) || seen[rule.ID] || rule.Version == "" || len(rule.Version) > 80 || !supportedActivity(rule.Activity) || (rule.Effect != "INCLUDE" && rule.Effect != "EXCLUDE") || rule.Priority < 0 || rule.Priority > 100 || rule.Source.Reference == "" || len(rule.Source.Reference) > 200 || rule.Source.Locator == "" || len(rule.Source.Locator) > 500 || (rule.Source.ReviewStatus != "PROVISIONAL" && rule.Source.ReviewStatus != "APPROVED") || rule.Applicability == "" || len(rule.Applicability) > 500 || rule.Limitation == "" || len(rule.Limitation) > 500 || len(rule.Predicates) < 1 || len(rule.Predicates) > 16 {
			return problem("INVALID_RULE_REGISTRY")
		}
		hasNatal := false
		for _, p := range rule.Predicates {
			if p.Kind == Natal {
				hasNatal = true
			}
			if !validKind(p.Kind) || !identifier.MatchString(p.Key) || p.Value == "" || len(p.Value) > 100 {
				return problem("INVALID_RULE_REGISTRY")
			}
		}
		if rule.Effect == "INCLUDE" && !hasNatal {
			return problem("PERSONAL_RULE_REQUIRES_NATAL_FACTOR")
		}
		seen[rule.ID] = true
	}
	return nil
}
