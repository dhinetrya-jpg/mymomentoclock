//go:build cgo

#include <mutex>
#include <cmath>
#include <swephexp.h>
std::mutex ephemeris_mutex;
extern "C" {
 typedef struct {
 double longitude,latitude,speed;
 int32_t error_code,requested_flags,returned_flags;
 char warning[256],library_version[256];
 } PlanetCoordinate;
 PlanetCoordinate compute_celestial_position_safe(double jd,int32_t id) {
 std::lock_guard<std::mutex> lock(ephemeris_mutex);
 PlanetCoordinate result{};
 swe_version(result.library_version);
 result.requested_flags=SEFLG_SWIEPH|SEFLG_SIDEREAL|SEFLG_SPEED;
 if(!std::isfinite(jd) || (id!=0&&id!=1&&id!=4&&id!=6)) {result.error_code=-1;return result;}
 double xx[6]{};
 swe_set_sid_mode(SE_SIDM_LAHIRI,0,0);
 result.returned_flags=swe_calc_ut(jd,id,result.requested_flags,xx,result.warning);
 if(result.returned_flags<0) {result.error_code=result.returned_flags;return result;}
 for(int i=0;i<6;i++){if(!std::isfinite(xx[i])){result.error_code=-1;return result;}}
 result.longitude=xx[0];result.latitude=xx[1];result.speed=xx[3];return result;
 }
 PlanetCoordinate compute_celestial_position(double jd,int32_t id) {return compute_celestial_position_safe(jd,id);}
}
