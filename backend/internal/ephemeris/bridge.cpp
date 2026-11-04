#include <iostream>
#include <mutex>
#include "swephexp.h"

std::mutex ephemeris_mutex;

extern "C" {
    typedef struct {
        double longitude;
        double latitude;
        double speed;
        int32_t error_code;
    } PlanetCoordinate;

    PlanetCoordinate compute_celestial_position_safe(double julian_day, int32_t planet_id) {
        std::lock_guard<std::mutex> lock(ephemeris_mutex);
        PlanetCoordinate coord;
        double x[6];
        char serr[256];
        int32_t iflag = SEFLG_SIDEREAL | SEFLG_SPEED;

        swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
        int32_t ret = swe_calc_ut(julian_day, planet_id, iflag, x, serr);

        if (ret < 0) {
            coord.longitude = 0.0;
            coord.latitude = 0.0;
            coord.speed = 0.0;
            coord.error_code = ret;
            return coord;
        }

        coord.longitude = x[0];
        coord.latitude = x[1];
        coord.speed = x[2];
        coord.error_code = 0;
        return coord;
    }

    PlanetCoordinate compute_celestial_position(double julian_day, int32_t planet_id) {
        return compute_celestial_position_safe(julian_day, planet_id);
    }
}
