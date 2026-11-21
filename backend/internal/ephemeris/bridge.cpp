//go:build cgo

#include <mutex>
#include <cmath>
#include <swephexp.h>
std::mutex ephemeris_mutex;
namespace { void native_configure(const char*,const char*); }
extern "C" {
 typedef struct {
 double longitude,latitude,speed;
 int32_t error_code,requested_flags,returned_flags;
 char warning[256],library_version[256];
 } PlanetCoordinate;
 PlanetCoordinate compute_celestial_position_safe(double jd,int32_t id) {
 std::lock_guard<std::mutex> lock(ephemeris_mutex);
 native_configure("","");
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

#include <cstring>
#include <string>
namespace {
 std::string native_last_path;
 std::string native_last_jpl;
 bool native_configured = false;
 void native_configure(const char *path,const char *jpl) {
  std::string p=path?path:"",j=jpl?jpl:"";
  // Reset the complete Swiss cache on every request. Flags alone do not reliably isolate its process-global state.
  swe_close();
  swe_set_ephe_path(p.c_str());
  if(!j.empty()) swe_set_jpl_file(j.c_str());
  native_last_path=p;native_last_jpl=j;native_configured=true;
  swe_set_tid_acc(SE_TIDAL_DEFAULT);
  swe_set_sid_mode(SE_SIDM_LAHIRI,0,0);
 }
 bool native_leaps_ready=false;
 void native_prepare_time(){
  if(!native_leaps_ready){
   native_configure("/__mymomentoclock_builtin_leaps_only__","");
   double jd[2]{};char error[AS_MAXCH]{};
   if(swe_utc_to_jd(2000,1,1,0,0,0,SE_GREG_CAL,jd,error)>=0)native_leaps_ready=true;
  }
 }
 bool native_finite(const double *values,int count){for(int i=0;i<count;i++)if(!std::isfinite(values[i]))return false;return true;}
}
extern "C" {
 typedef struct {double tt,ut1;int error;} MMOEpoch;
 typedef struct {int year,month,day,hour,minute;double second;int error;} MMOCalendar;
 MMOEpoch mmo_utc_to_jd(int year,int month,int day,int hour,int minute,double second) {
  std::lock_guard<std::mutex> lock(ephemeris_mutex);MMOEpoch r{};
  native_prepare_time();
  swe_set_tid_acc(SE_TIDAL_DEFAULT);
  double jd[2]{};char error[AS_MAXCH]{};
  r.error=swe_utc_to_jd(year,month,day,hour,minute,second,SE_GREG_CAL,jd,error);
  if(!native_finite(jd,2))r.error=-1;
  r.tt=jd[0];r.ut1=jd[1];return r;
 }
 MMOCalendar mmo_ut1_to_utc(double jd) {
  std::lock_guard<std::mutex> lock(ephemeris_mutex);MMOCalendar r{};
  native_prepare_time();swe_set_tid_acc(SE_TIDAL_DEFAULT);
  swe_jdut1_to_utc(jd,SE_GREG_CAL,&r.year,&r.month,&r.day,&r.hour,&r.minute,&r.second);
  if(!std::isfinite(r.second)||r.year<1)r.error=-1;return r;
 }
 typedef struct {double tropical[6],sidereal[6];int32_t tropical_flags,sidereal_flags;int error;} MMOPlanet;
 typedef struct {MMOPlanet planets[9];double ayanamsa;double tropical_ascendant,sidereal_ascendant,cusps[12];char version[AS_MAXCH];int error,house_error;} MMOSnapshot;
 MMOSnapshot mmo_snapshot(double tt,double ut1,int32_t flag,const char *path,const char *jpl,int houses,double latitude,double longitude) {
  std::lock_guard<std::mutex> lock(ephemeris_mutex);MMOSnapshot r{};
  native_configure(path,jpl);swe_set_tid_acc(SE_TIDAL_DEFAULT);swe_version(r.version);
  int32_t ids[9]={SE_SUN,SE_MOON,SE_MERCURY,SE_VENUS,SE_MARS,SE_JUPITER,SE_SATURN,SE_MEAN_NODE,SE_TRUE_NODE};
  char error[AS_MAXCH]{};
  for(int i=0;i<9;i++) {
   auto &p=r.planets[i];
   p.tropical_flags=swe_calc(tt,ids[i],flag|SEFLG_SPEED,p.tropical,error);
   p.sidereal_flags=swe_calc(tt,ids[i],flag|SEFLG_SPEED|SEFLG_SIDEREAL,p.sidereal,error);
   if(p.tropical_flags<0||p.sidereal_flags<0||!native_finite(p.tropical,6)||!native_finite(p.sidereal,6)){p.error=-1;r.error=-1;return r;}
   if((p.tropical_flags&7)!=flag||(p.sidereal_flags&7)!=flag){p.error=-2;r.error=-2;return r;}
  }
  if(swe_get_ayanamsa_ex(tt,flag,&r.ayanamsa,error)<0||!std::isfinite(r.ayanamsa)){r.error=-1;return r;}
  if(houses) {
   double cusps[13]{},angles[10]{};
   if(std::fabs(latitude)>=89.999999 || swe_houses_ex(ut1,0,latitude,longitude,'W',cusps,angles)<0||!native_finite(cusps,13)||!native_finite(angles,10)){r.house_error=-1;return r;}
   r.tropical_ascendant=angles[0];
   if(swe_houses_ex(ut1,SEFLG_SIDEREAL,latitude,longitude,'W',cusps,angles)<0||!native_finite(cusps,13)||!native_finite(angles,10)){r.house_error=-1;return r;}
   r.sidereal_ascendant=angles[0];for(int i=0;i<12;i++)r.cusps[i]=cusps[i+1];
  }
  return r;
 }
 typedef struct {double rise,set,noon,lower,upper_altitude,lower_altitude,set_after_rise;int rise_status,set_status,noon_status,lower_status,set_after_rise_status;int32_t returned_flags;char version[AS_MAXCH];int error;} MMOSolar;
 MMOSolar mmo_solar(double start,int32_t flag,const char *path,const char *jpl,double latitude,double longitude,double elevation) {
  std::lock_guard<std::mutex> lock(ephemeris_mutex);MMOSolar r{};
  native_configure(path,jpl);swe_set_tid_acc(SE_TIDAL_DEFAULT);swe_version(r.version);
  double position[6]{},geo[3]={longitude,latitude,elevation};char error[AS_MAXCH]{};
  r.returned_flags=swe_calc_ut(start,SE_SUN,flag|SEFLG_SPEED,position,error);
  if(r.returned_flags<0){r.error=-1;return r;}if((r.returned_flags&7)!=flag){r.error=-2;return r;}
  r.rise_status=swe_rise_trans(start,SE_SUN,nullptr,flag,SE_CALC_RISE,geo,0,15,&r.rise,error);
  r.set_status=swe_rise_trans(start,SE_SUN,nullptr,flag,SE_CALC_SET,geo,0,15,&r.set,error);
  r.noon_status=swe_rise_trans(start,SE_SUN,nullptr,flag,SE_CALC_MTRANSIT,geo,0,15,&r.noon,error);
  r.lower_status=swe_rise_trans(start,SE_SUN,nullptr,flag,SE_CALC_ITRANSIT,geo,0,15,&r.lower,error);
  r.set_after_rise_status=-2;
  if(r.rise_status>=0)r.set_after_rise_status=swe_rise_trans(r.rise+1.0/86400.0,SE_SUN,nullptr,flag,SE_CALC_SET,geo,0,15,&r.set_after_rise,error);
  double horizontal[3]{};
  if(r.noon_status>=0 && swe_calc_ut(r.noon,SE_SUN,flag|SEFLG_EQUATORIAL,position,error)>=0){swe_azalt(r.noon,SE_EQU2HOR,geo,0,15,position,horizontal);r.upper_altitude=horizontal[1];}
  if(r.lower_status>=0 && swe_calc_ut(r.lower,SE_SUN,flag|SEFLG_EQUATORIAL,position,error)>=0){swe_azalt(r.lower,SE_EQU2HOR,geo,0,15,position,horizontal);r.lower_altitude=horizontal[1];}
  return r;
 }
}
