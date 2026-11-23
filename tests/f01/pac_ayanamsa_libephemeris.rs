use libephemeris_core::{
    constants::SIDM_LAHIRI,
    sidereal::{SealedAyanamshaServing, SiderealSelection},
};

fn main() {
    let mut selection = SiderealSelection::unset();
    assert!(selection.set_sidereal_mode(SIDM_LAHIRI, 0.0, 0.0).is_empty());
    let serving = SealedAyanamshaServing::new(
        selection,
        &|_| panic!("mean TT layer must not request a UT clock for mode 1"),
        None,
    );

    for (jd_tt, pac_arcseconds) in [
        (2_451_545.0, 85_885.53),
        (2_460_676.25, 87_142.798_138_737),
        (2_461_041.50, 87_193.091_738_402),
    ] {
        let (mean, warning) = serving.mean_tt_with(jd_tt, false, false).unwrap();
        assert!(mean.is_finite() && warning.is_none());
        let residual = (mean * 3600.0 - pac_arcseconds + 648_000.0).rem_euclid(1_296_000.0)
            - 648_000.0;
        println!(
            "TT JD {jd_tt:.2}: PAC mean {pac_arcseconds:.9} arcsec; LibEphemeris mean {:.9} arcsec; delta {residual:+.9} arcsec",
            mean * 3600.0,
        );
        if jd_tt == 2_451_545.0 {
            assert!(residual.abs() <= 0.005 + 3600.0e-8, "anchor outside source precision");
        }
    }
    for (jd_tt, pac_mean, pac_nutation) in [
        (2_460_676.5, 87_142.832_562_755, 0.20),
        (2_460_679.5, 87_143.245_650_970, 0.41),
    ] {
        let (mean, mean_warning) = serving.mean_tt_with(jd_tt, false, false).unwrap();
        let (apparent, true_warning) = serving.true_tt_with(jd_tt, false, false).unwrap();
        assert!(mean.is_finite() && apparent.is_finite());
        assert!(mean_warning.is_none() && true_warning.is_none());
        let mean_delta = mean * 3600.0 - pac_mean;
        let nutation_delta = (apparent - mean) * 3600.0 - pac_nutation;
        let residual = apparent * 3600.0 - pac_mean - pac_nutation;
        let identity = if residual.abs() <= 0.010 + 3600.0e-8 {
            "IDENTITY_PASS"
        } else {
            "IDENTITY_FAIL"
        };
        println!("TT JD {jd_tt:.2}: LibEphemeris mean/true/nutation residuals {mean_delta:+.9}/{residual:+.9}/{nutation_delta:+.9} arcsec; {identity}");
    }

}
