package ephemeris

import "testing"

func TestSripatiPublishedSandhis(t *testing.T) {
	// Sripatipaddhati, chapter I, printed p. 12. The source lists the
	// junction after each house. Start with 12–1 for house 1.
	type longitude struct{ sign, degree, minute, second int }
	madhyas := [12]longitude{
		{0, 14, 31, 46}, {1, 12, 15, 14}, {2, 9, 58, 43},
		{3, 7, 42, 11}, {4, 9, 58, 43}, {5, 12, 15, 14},
		{6, 14, 31, 46}, {7, 12, 15, 14}, {8, 9, 58, 43},
		{9, 7, 42, 11}, {10, 9, 58, 43}, {11, 12, 15, 14},
	}
	sandhis := [12]longitude{
		{11, 28, 23, 30}, {0, 28, 23, 30}, {1, 26, 6, 58},
		{2, 23, 50, 27}, {3, 23, 50, 27}, {4, 26, 6, 58},
		{5, 28, 23, 30}, {6, 28, 23, 30}, {7, 26, 6, 58},
		{8, 23, 50, 27}, {9, 23, 50, 27}, {10, 26, 6, 58},
	}
	toDegrees := func(value longitude) float64 {
		return float64((30*value.sign+value.degree)*3600+value.minute*60+value.second) / 3600
	}

	var centers [12]float64
	for i, center := range madhyas {
		centers[i] = toDegrees(center)
	}
	got, err := SripatiFromPorphyry(centers)
	if err != nil {
		t.Fatal(err)
	}

	// One arcsecond covers half a second at each end of the comparison
	// (the averaged input rounding and the rounded published output).
	const toleranceArcseconds = 1.0 + 1e-8
	var maxError float64
	for i, boundary := range sandhis {
		want := toDegrees(boundary)
		errorArcseconds := angularError(got[i], want) * 3600
		maxError = max(maxError, errorArcseconds)
		if errorArcseconds > toleranceArcseconds {
			t.Errorf("house %d boundary got %.9f°, table %.9f°, error %.6f arcsec", i+1, got[i], want, errorArcseconds)
		}
	}
	t.Logf("compared all 12 boundaries, maximum error %.6f arcsec", maxError)
}
