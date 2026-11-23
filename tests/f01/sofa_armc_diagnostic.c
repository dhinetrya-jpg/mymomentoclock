#include <math.h>
#include <stdio.h>

#include <sofa.h>
#include <swephexp.h>

struct sample {
    int year, month, day;
    double dut1;
};

int main(void) {
    const struct sample cases[] = {
        {2000, 1, 1, 0.3550132},
        {2007, 4, 5, -0.072073685},
    };
    const double screening_arcseconds = 0.010;
    const double degrees_per_radian = 180.0 / acos(-1.0);
    int failed = 0;
    swe_set_tid_acc(SE_TIDAL_DEFAULT);

    for (size_t i = 0; i < sizeof cases / sizeof cases[0]; ++i) {
        const struct sample sample = cases[i];
        double utc1, utc2, tai1, tai2, tt1, tt2, ut11, ut12;
        if (iauDtf2d("UTC", sample.year, sample.month, sample.day, 12, 0, 0.0, &utc1, &utc2) != 0 ||
            iauUtctai(utc1, utc2, &tai1, &tai2) != 0 ||
            iauTaitt(tai1, tai2, &tt1, &tt2) != 0 ||
            iauUtcut1(utc1, utc2, sample.dut1, &ut11, &ut12) != 0) {
            fprintf(stderr, "SOFA time-scale conversion failed for %d\n", sample.year);
            return 1;
        }

        const double era = iauEra00(ut11, ut12) * degrees_per_radian;
        if (!isfinite(era)) {
            fprintf(stderr, "SOFA ERA unavailable for %d\n", sample.year);
            return 1;
        }
        if (sample.year == 2007 &&
            (fabs(((tt1 - 2454195.5) + tt2) - 0.500754444444444) > 1e-14 ||
             fabs(((ut11 - 2454195.5) + ut12) - 0.499999165813831) > 1e-14 ||
             fabs(era - 13.318492966097) > 2e-12)) {
            fprintf(stderr, "Cookbook time or ERA validation failed: %.17g + %.17g, %.17g + %.17g, ERA %.15f\n",
                tt1, tt2, ut11, ut12, era);
            return 1;
        }

        const double swiss_ut1 = ut11 + ut12;
        const double swiss_model_tt = swiss_ut1 + swe_deltat_ex(swiss_ut1, 0, NULL);
        double cusps[13], angles[10];
        const int status = swe_houses_ex(swiss_ut1, 0, 0.0, 0.0, 'W', cusps, angles);
        if (status < 0 || !isfinite(angles[SE_ARMC])) {
            fprintf(stderr, "Swiss ARMC unavailable for %d\n", sample.year);
            return 1;
        }

        const double gast = iauGst06a(ut11, ut12, tt1, tt2) * degrees_per_radian;
        if (!isfinite(gast)) {
            fprintf(stderr, "SOFA GAST unavailable for %d\n", sample.year);
            return 1;
        }
        const double residual = remainder(angles[SE_ARMC] - gast, 360.0) * 3600.0;
        printf("%04d-%02d-%02d noon UTC: SOFA UT1 %.17g + %.17g, TT %.17g + %.17g; Swiss UT1 %.17g, modeled TT %.17g; ARMC-GAST %.9f arcsec\n",
            sample.year, sample.month, sample.day, ut11, ut12, tt1, tt2,
            swiss_ut1, swiss_model_tt, residual);
        if (fabs(residual) > screening_arcseconds) {
            failed = 1;
        }
    }
    return failed;
}
