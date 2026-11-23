#include <math.h>
#include <stdio.h>

#include <swephexp.h>

struct angle {
    int sign;
    int degree;
    int minute;
};

struct sample {
    int lst_hours;
    int latitude;
    struct angle ascendant;
    struct angle midheaven;
};

static double tropical_degrees(struct angle raw) {
    /* Lahiri's tables use a fixed 23-degree offset (construction, p. 83). */
    return fmod(raw.sign * 30.0 + raw.degree + raw.minute / 60.0 + 23.0, 360.0);
}

int main(void) {
    /* Lahiri, Tables of Ascendants, ninth edition, printed pp. 8, 9 and 15. */
    const struct sample cases[] = {
        {3, 0, {3, 19, 32}, {0, 24, 28}},
        {9, 0, {6, 24, 28}, {3, 19, 32}},
        {3, 8, {3, 21, 54}, {0, 24, 28}},
    };
    const double obliquity = 23.0 + 27.0 / 60.0;
    /* Provisional diagnostic limit: one printed minute plus arithmetic slack. */
    const double tolerance_arcminutes = 1.0 + 60.0e-8;
    int failures = 0;

    for (size_t i = 0; i < sizeof cases / sizeof cases[0]; ++i) {
        const struct sample *sample = &cases[i];
        double cusps[13], angles[10];
        const int status = swe_houses_armc(
            sample->lst_hours * 15.0, sample->latitude, obliquity, 'S', cusps, angles
        );
        if (status != OK || !isfinite(angles[SE_ASC]) || !isfinite(angles[SE_MC])) {
            fprintf(stderr, "LST %02d:00, latitude %d: house calculation failed\n",
                sample->lst_hours, sample->latitude);
            ++failures;
            continue;
        }

        const double asc_error = fabs(remainder(
            angles[SE_ASC] - tropical_degrees(sample->ascendant), 360.0
        )) * 60.0;
        const double mc_error = fabs(remainder(
            angles[SE_MC] - tropical_degrees(sample->midheaven), 360.0
        )) * 60.0;
        printf("LST %02d:00, latitude %d: Asc residual %.6f arcmin; MC residual %.6f arcmin\n",
            sample->lst_hours, sample->latitude, asc_error, mc_error);
        if (asc_error > tolerance_arcminutes || mc_error > tolerance_arcminutes) {
            ++failures;
        }
    }

    if (failures != 0) {
        fprintf(stderr, "%d fixed-angle samples exceeded the diagnostic or failed\n", failures);
        return 1;
    }
    return 0;
}
