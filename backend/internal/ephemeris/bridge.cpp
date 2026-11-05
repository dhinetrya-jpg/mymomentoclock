#include <iostream>
#include <mutex>
#include <swephexp.h>

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
        PlanetCoordinate result;
        double xx[6];
        char err_msg[256];
        int32_t calculation_flags = SEFLG_SIDEREAL | SEFLG_SPEED;

        swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
        int32_t call_status = swe_calc_ut(julian_day, planet_id, calculation_flags, xx, err_msg);

        if (call_status >= 0) {
            result.longitude = xx[0];
            result.latitude = xx[1];
            result.speed = xx[3];
            result.error_code = 0;
        } else {
            result.longitude = 0.0;
            result.latitude = 0.0;
            result.speed = 0.0;
            result.error_code = call_status;
        }
        return result;
    }

    PlanetCoordinate compute_celestial_position(double julian_day, int32_t planet_id) {
        return compute_celestial_position_safe(julian_day, planet_id);
    }
}
