#ifndef SWEPHEXP_H
#define SWEPHEXP_H

#include <stdint.h>

#define SE_SIDM_LAHIRI 1
#define SE_SIDM_KP 2
#define SE_SIDM_RAMAN 3
#define SEFLG_SIDEREAL (1 << 16)
#define SEFLG_SPEED 256

#ifdef __cplusplus
extern "C" {
#endif

void swe_set_sid_mode(int32_t sid_mode, double t0, double ayan_t0);
int32_t swe_calc_ut(double tjd_ut, int32_t ipl, int32_t iflag, double *xx, char *serr);

#ifdef __cplusplus
}
#endif

#endif // SWEPHEXP_H
