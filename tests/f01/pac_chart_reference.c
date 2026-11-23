#include <math.h>
#include <stdio.h>

#include <sofa.h>
#include <sofam.h>

struct vector { double x, y, z; };
struct date { int year, month, day; double dut1; const char *utc; };
struct place { double latitude, longitude; };

static struct vector cross(struct vector a, struct vector b) {
    return (struct vector){a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x};
}

static double dot(struct vector a, struct vector b) {
    return a.x*b.x + a.y*b.y + a.z*b.z;
}

static double wrap(double degrees) {
    const double angle = fmod(degrees, 360.0);
    return angle < 0 ? angle + 360.0 : angle;
}

static double intersection_longitude(struct vector pole, struct vector plane,
                                    struct vector hemisphere, double obliquity) {
    struct vector line = cross(pole, plane);
    const double side = dot(line, hemisphere);
    if (!isfinite(side) || fabs(side) < 1e-10 || dot(line,line) < 1e-10) {
        return NAN;
    }
    const double sign = side > 0 ? 1.0 : -1.0;
    const struct vector ecliptic_y = {0, cos(obliquity), sin(obliquity)};
    return wrap(atan2(sign * dot(line, ecliptic_y), sign * line.x) * DR2D);
}

static int boundaries(double asc, double mc, double sidereal, double starts[12]) {
    const double cardinals[] = {asc, wrap(mc+180), wrap(asc+180), mc};
    double centers[12], quadrant_total = 0.0, cycle = 0.0;
    for (size_t q = 0; q < 4; ++q) {
        const double width = wrap(cardinals[(q+1)%4] - cardinals[q]);
        if (!isfinite(width) || width <= 1e-8 || width >= 180) {
            return 0;
        }
        quadrant_total += width;
        for (size_t j = 0; j < 3; ++j) {
            centers[q*3+j] = wrap(cardinals[q] + width*(double)j/3.0);
        }
    }
    if (fabs(quadrant_total - 360.0) > 1e-8) {
        return 0;
    }
    for (size_t i = 0; i < 12; ++i) {
        const double previous = centers[(i+11)%12];
        starts[i] = wrap(previous + wrap(centers[i]-previous)/2.0 - sidereal);
    }
    for (size_t i = 0; i < 12; ++i) {
        const double width = wrap(starts[(i+1)%12]-starts[i]);
        const double opposite = wrap(starts[(i+6)%12]-starts[i]);
        if (!isfinite(width) || width <= 1e-8 || fabs(opposite - 180.0) > 1e-8) {
            return 0;
        }
        cycle += width;
    }
    return fabs(cycle-360.0) <= 1e-8;
}

static int check_published_geometry(void) {
    /* Śrīpatipaddhati, printed p. 12, junction 12–1 followed by 1–2, etc. */
    const int expected[12][3] = {
        {358,23,30},{28,23,30},{56,6,58},{83,50,27},{113,50,27},{146,6,58},
        {178,23,30},{208,23,30},{236,6,58},{263,50,27},{293,50,27},{326,6,58}
    };
    double starts[12];
    const double asc = 14 + 31.0/60 + 46.0/3600;
    const double mc = 277 + 42.0/60 + 11.0/3600;
    if (!boundaries(asc, mc, 0.0, starts)) {
        return 0;
    }
    for (size_t i = 0; i < 12; ++i) {
        const double degrees = expected[i][0] + expected[i][1]/60.0 + expected[i][2]/3600.0;
        if (fabs(remainder(starts[i]-degrees,360.0))*3600.0 > 1.0+1e-8) {
            fprintf(stderr, "Published geometry failed at boundary %zu\n", i+1);
            return 0;
        }
    }
    return 1;
}

static double pac_mean_arcseconds(double jd_tt_offset) {
    const double t = jd_tt_offset / 36525.0;
    return 85885.53 + t*(5028.796195 + t*(1.1054348 + t*(0.00007964 +
        t*(-0.00023857 - t*0.0000000383))));
}

int main(void) {
    const struct date dates[] = {
        {2000,1,1,0.3550132,"2000-01-01T12:00:00Z"},
        {2007,4,5,-0.0721024,"2007-04-05T12:00:00Z"},
    };
    const struct place places[] = {{0,0},{30,75},{-30,-120}};
    if (!check_published_geometry()) {
        return 1;
    }
    puts("{\"convention\":\"PAC_IAE_2025_P03_IAU2006_2000A_MEAN_POLE\",\"charts\":[");
    int first = 1;
    for (size_t i = 0; i < sizeof dates/sizeof dates[0]; ++i) {
        const struct date date = dates[i];
        double utc1,utc2,tai1,tai2,tt1,tt2,ut11,ut12,dpsi,deps;
        if (iauDtf2d("UTC",date.year,date.month,date.day,12,0,0,&utc1,&utc2) != 0 ||
            iauUtctai(utc1,utc2,&tai1,&tai2) != 0 || iauTaitt(tai1,tai2,&tt1,&tt2) != 0 ||
            iauUtcut1(utc1,utc2,date.dut1,&ut11,&ut12) != 0) {
            return 1;
        }
        iauNut06a(tt1,tt2,&dpsi,&deps);
        const double gast = iauGst06a(ut11,ut12,tt1,tt2);
        const double obliquity = iauObl06(tt1,tt2) + deps;
        const double mean = pac_mean_arcseconds((tt1-DJ00) + tt2);
        const double apparent = mean + dpsi*DR2AS;
        const struct vector pole = {0,-sin(obliquity),cos(obliquity)};
        for (size_t j = 0; j < sizeof places/sizeof places[0]; ++j) {
            const struct place place = places[j];
            const double sidereal = gast + place.longitude*DD2R;
            const double phi = place.latitude*DD2R;
            const struct vector up = {cos(phi)*cos(sidereal),cos(phi)*sin(sidereal),sin(phi)};
            const struct vector east = {-sin(sidereal),cos(sidereal),0};
            const double asc = intersection_longitude(pole,up,east,obliquity);
            const double mc = intersection_longitude(pole,east,up,obliquity);
            double starts[12];
            if (!boundaries(asc,mc,apparent/3600.0,starts)) {
                fprintf(stderr,"Invalid geometry for %s at latitude %.0f longitude %.0f\n",
                    date.utc,place.latitude,place.longitude);
                return 1;
            }
            printf("%s{\"utc\":\"%s\",\"latitude_deg\":%.0f,\"longitude_east_deg\":%.0f,"
                "\"dut1_s\":%.7f,\"ut1_jd\":[%.17g,%.17g],\"tt_jd\":[%.17g,%.17g],"
                "\"gast_deg\":%.12f,\"true_obliquity_deg\":%.12f,"
                "\"tropical_asc_deg\":%.12f,\"tropical_mc_deg\":%.12f,"
                "\"mean_ayanamsa_arcsec\":%.9f,\"nutation_longitude_arcsec\":%.9f,"
                "\"boundary_starts_deg\":[",first?"":",\n",date.utc,place.latitude,place.longitude,
                date.dut1,ut11,ut12,tt1,tt2,gast*DR2D,obliquity*DR2D,asc,mc,mean,dpsi*DR2AS);
            for (size_t k = 0; k < 12; ++k) {
                printf("%s%.12f",k?",":"",starts[k]);
            }
            fputs("]}",stdout);
            first = 0;
        }
    }
    puts("\n]}");
    return 0;
}
