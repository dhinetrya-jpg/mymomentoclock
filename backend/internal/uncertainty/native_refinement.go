package uncertainty

import (
 "astroengine-core/backend/internal/astronomy"
 "astroengine-core/backend/internal/ephemeris"
 "context"
 "fmt"
 "strings"
 "time"
)

// factorAt computes one requested classification at a reviewed native instant.
// It does not infer planetary motion or reuse browser approximations.
func factorAt(ctx context.Context,at time.Time,factor string,lat,lon float64,config ephemeris.NativeConfig)(string,error){
 a:=at.UTC()
 snapshot,err:=astronomy.ComputeSnapshot(ctx,astronomy.SnapshotRequest{
  SchemaVersion:1,
  Civil:ephemeris.NormalizationRequest{
   BirthDate:a.Format("2006-01-02"),BirthTime:a.Format("15:04:05"),Timezone:"UTC",
   Latitude:&lat,Longitude:&lon,BirthTimeCertainty:"APPROXIMATE",RequiredMode:"SWISS_FILE",
  },
 },config)
 if err!=nil{return "",err}
 h:=snapshot.Native.Houses
 if h==nil||!h.SripatiAvailable{return "",issue("F01_SRIPATI_UNAVAILABLE")}
 if _,err:=ephemeris.CheckSripatiGeometry(h);err!=nil{return "",issue("F01_GEOMETRY_CHECK_FAILED")}
 parts:=strings.Split(factor,".")
 if len(parts)!=2{return "",issue("F01_UNKNOWN_FACTOR")}
 if parts[0]=="ascendant" {
  p,e:=astronomy.Classify(h.SiderealAscendant,&h.SiderealAscendant,false)
  if e!=nil{return "",e}
  switch parts[1]{
  case "rashi":return fmt.Sprint(p.RashiIndex),nil
  case "d2":return fmt.Sprint(p.D2Sign),nil
  case "d9":return fmt.Sprint(p.D9Sign),nil
  }
  return "",issue("F01_UNKNOWN_FACTOR")
 }
 planet,ok:=snapshot.Native.Planets[parts[0]]
 if !ok{return "",issue("F01_UNKNOWN_FACTOR")}
 p,e:=astronomy.Classify(planet.SiderealLongitude,&h.SiderealAscendant,false)
 if e!=nil{return "",e}
 switch parts[1] {
 case "rashi":return fmt.Sprint(p.RashiIndex),nil
 case "whole_sign_house":return fmt.Sprint(p.WholeSignHouse),nil
 case "d2":return fmt.Sprint(p.D2Sign),nil
 case "d9":return fmt.Sprint(p.D9Sign),nil
 case "nakshatra":
  if parts[0]=="moon"{return fmt.Sprint(p.Nakshatra),nil}
 case "pada":
  if parts[0]=="moon"{return fmt.Sprint(p.Pada),nil}
 case "sripati_house","rashi_chalit_difference":
  house,e:=SripatiHouse(planet.SiderealLongitude,h.SiderealSripatiCusps)
  if e!=nil{return "",e}
  if parts[1]=="sripati_house"{return fmt.Sprint(house),nil}
  return fmt.Sprint(house!=p.WholeSignHouse),nil
 }
 return "",issue("F01_UNKNOWN_FACTOR")
}

