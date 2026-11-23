#include <math.h>
#include <stdio.h>

#include <swephexp.h>

static double pac_mean_arcseconds(double jd_tt) {
    /* Indian Astronomical Ephemeris 2025, printed p. 374. */
    const double t = (jd_tt - 2451545.0) / 36525.0;
    return 85885.53 + t * (5028.796195 + t * (1.1054348 + t * (0.00007964 +
        t * (-0.00023857 - t * 0.0000000383))));
}

static double signed_difference(double value, double expected) {
    return remainder(value - expected, 1296000.0);
}

int main(void) {
    const double mean_epochs[] = {2451545.0, 2460676.25, 2461041.5};
    const double true_epochs[] = {2460676.5, 2460679.5};
    /* PAC 2025 printed p. 18, longitude nutation at 00:00 TT. */
    const double pac_nutation[] = {0.20, 0.41};
    const double arithmetic_arcseconds = 3600.0e-8;
    int failed = 0;

    swe_set_sid_mode(SE_SIDM_LAHIRI, 0.0, 0.0);
    for (size_t i = 0; i < sizeof mean_epochs / sizeof mean_epochs[0]; ++i) {
        const double tt = mean_epochs[i];
        const double pac = pac_mean_arcseconds(tt);
        double mean;
        if (swe_get_ayanamsa_ex(tt, SEFLG_SWIEPH | SEFLG_NONUT, &mean, NULL) < 0 ||
            !isfinite(mean)) {
            fprintf(stderr, "Swiss mean ayanamsa unavailable at TT JD %.2f\n", tt);
            return 1;
        }
        const double residual = signed_difference(mean * 3600.0, pac);
        printf("TT JD %.2f: PAC mean %.9f arcsec; Swiss mean residual %+.9f arcsec\n",
            tt, pac, residual);
        /* Only the printed J2000 anchor has a source-precision bound here. */
        if (i == 0 && fabs(residual) > 0.005 + arithmetic_arcseconds) {
            failed = 1;
        }
    }

    for (size_t i = 0; i < sizeof true_epochs / sizeof true_epochs[0]; ++i) {
        const double tt = true_epochs[i];
        const double pac_mean = pac_mean_arcseconds(tt);
        const double pac_true = pac_mean + pac_nutation[i];
        double mean, apparent;
        if (swe_get_ayanamsa_ex(tt, SEFLG_SWIEPH | SEFLG_NONUT, &mean, NULL) < 0 ||
            swe_get_ayanamsa_ex(tt, SEFLG_SWIEPH, &apparent, NULL) < 0 ||
            !isfinite(mean) || !isfinite(apparent)) {
            fprintf(stderr, "Swiss ayanamsa unavailable at TT JD %.2f\n", tt);
            return 1;
        }
        const double mean_delta = signed_difference(mean * 3600.0, pac_mean);
        const double true_delta = signed_difference(apparent * 3600.0, pac_true);
        const double nutation_delta = signed_difference((apparent - mean) * 3600.0, pac_nutation[i]);
        printf("TT JD %.2f: PAC true %.9f arcsec; Swiss mean/true/nutation residuals %+.9f/%+.9f/%+.9f arcsec\n",
            tt, pac_true, mean_delta, true_delta, nutation_delta);
        if (fabs(true_delta) > 0.010 + arithmetic_arcseconds) {
            failed = 1;
        }
    }

    if (failed) {
        fprintf(stderr, "Swiss PAC source-precision diagnostic failed\n");
    }
    return failed;
}
