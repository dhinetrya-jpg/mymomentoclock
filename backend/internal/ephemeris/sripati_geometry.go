package ephemeris

import (
 "errors"
 "math"
)

const SripatiGeometryToleranceDegrees = 1e-6

func normalizeLongitude(v float64) float64 {
 return math.Mod(math.Mod(v,360)+360,360)
}
func forwardArc(a,b float64) float64{return normalizeLongitude(b-a)}
func angularError(a,b float64) float64{
 d:=forwardArc(a,b)
 if d>180 {d=360-d}
 return d
}

// SripatiFromPorphyry is an independent Go implementation of the house-sector
// midpoint rule: Sripati cusp i = midpoint(Porphyry cusp i-1, cusp i).
// It checks mathematical consistency, NOT independent ephemeris accuracy.
func SripatiFromPorphyry(porphyry [12]float64)([12]float64,error){
 var result [12]float64
 total:=0.0
 for i:=0;i<12;i++{
  current:=porphyry[i]
  previous:=porphyry[(i+11)%12]
  if math.IsNaN(current)||math.IsInf(current,0)||current<0||current>=360 {
   return result,errors.New("PORPHYRY_INVALID_CUSP")
  }
  if math.IsNaN(previous)||math.IsInf(previous,0)||previous<0||previous>=360{
   return result,errors.New("PORPHYRY_INVALID_CUSP")
  }
  width:=forwardArc(previous,current)
  if width<=1e-9||width>=180{return result,errors.New("PORPHYRY_INVALID_ARC")}
  total+=width
  result[i]=normalizeLongitude(previous+width/2)
 }
 if math.Abs(total-360)>1e-6{return [12]float64{},errors.New("PORPHYRY_INVALID_CYCLE")}
 return result,nil
}

type SripatiGeometryResult struct{
 Status string `json:"status"`
 ToleranceDegrees float64 `json:"tolerance_degrees"`
 MaxAngularErrorDegrees float64 `json:"max_angular_error_degrees"`
 Source string `json:"source"`
}

func CheckSripatiGeometry(h *NativeHouses)(SripatiGeometryResult,error){
 diagnostic:=SripatiGeometryResult{Status:"NOT_CHECKED",ToleranceDegrees:SripatiGeometryToleranceDegrees,Source:"INTERNAL_PORPHYRY_MIDPOINT_CROSSCHECK_NOT_INDEPENDENT_ASTRONOMICAL_REFERENCE"}
 if h==nil||!h.SripatiAvailable||!h.PorphyryAvailable{
  return diagnostic,errors.New("F01_GEOMETRY_REFERENCE_UNAVAILABLE")
 }
 expected,err:=SripatiFromPorphyry(h.SiderealPorphyryCusps)
 if err!=nil{return diagnostic,err}
 max:=0.0
 for i:=0;i<12;i++{
  observed:=h.SiderealSripatiCusps[i]
  if math.IsNaN(observed)||math.IsInf(observed,0)||observed<0||observed>=360{
   return diagnostic,errors.New("F01_SRIPATI_INVALID_CUSP")
  }
  delta:=angularError(expected[i],observed)
  if delta>max{max=delta}
 }
 diagnostic.MaxAngularErrorDegrees=max
 if max>SripatiGeometryToleranceDegrees{
  diagnostic.Status="FAILED"
  return diagnostic,errors.New("F01_SRIPATI_PORPHYRY_DISAGREEMENT")
 }
 diagnostic.Status="GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED"
 return diagnostic,nil
}
