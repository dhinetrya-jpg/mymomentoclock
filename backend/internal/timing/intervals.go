package timing

import (
	"sort"
	"time"
)

func intersection(a, b Interval) (Interval, bool) {
	s, e := a.Start, a.End
	if b.Start.After(s) {
		s = b.Start
	}
	if b.End.Before(e) {
		e = b.End
	}
	return Interval{s, e}, s.Before(e)
}

// Normalize unions overlapping/touching half-open intervals, independent of input ordering.
func Normalize(input []Interval) []Interval {
	values := []Interval{}
	for _, i := range input {
		if i.Start.Before(i.End) {
			values = append(values, i)
		}
	}
	sort.Slice(values, func(i, j int) bool {
		if values[i].Start.Equal(values[j].Start) {
			return values[i].End.Before(values[j].End)
		}
		return values[i].Start.Before(values[j].Start)
	})
	result := []Interval{}
	for _, v := range values {
		if len(result) == 0 || v.Start.After(result[len(result)-1].End) {
			result = append(result, v)
		} else if v.End.After(result[len(result)-1].End) {
			result[len(result)-1].End = v.End
		}
	}
	return result
}
func Intersect(left, right []Interval) []Interval {
	result := []Interval{}
	for _, a := range left {
		for _, b := range right {
			if v, ok := intersection(a, b); ok {
				result = append(result, v)
			}
		}
	}
	return Normalize(result)
}
func Subtract(input, excluded []Interval) []Interval {
	result := Normalize(input)
	for _, x := range Normalize(excluded) {
		next := []Interval{}
		for _, v := range result {
			cut, ok := intersection(v, x)
			if !ok {
				next = append(next, v)
				continue
			}
			if v.Start.Before(cut.Start) {
				next = append(next, Interval{v.Start, cut.Start})
			}
			if cut.End.Before(v.End) {
				next = append(next, Interval{cut.End, v.End})
			}
		}
		result = next
	}
	return result
}
func sameInterval(a, b Interval) bool { return a.Start.Equal(b.Start) && a.End.Equal(b.End) }
func uniqueTimes(values []time.Time) []time.Time {
	sort.Slice(values, func(i, j int) bool { return values[i].Before(values[j]) })
	r := []time.Time{}
	for _, v := range values {
		if len(r) == 0 || !v.Equal(r[len(r)-1]) {
			r = append(r, v)
		}
	}
	return r
}
