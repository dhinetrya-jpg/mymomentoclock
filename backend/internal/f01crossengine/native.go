package crossengine

import (
 "astroengine-core/backend/internal/astronomy"
 "astroengine-core/backend/internal/ephemeris"
 "errors"
 "time"
)

func NativeCalculator(config ephemeris.NativeConfig)func(Case)([12]float64,string,string,error){
 return func(v Case)([12]float64,string,string,error){
  if err:=astronomy.RequireProductionConfiguration(config);err!=nil{return [12]float64{},"","",err}
  instant,e:=time.Parse(time.RFC3339,v.UTC)
  if e!=nil{return [12]float64{},"","",e}
  place:=ephemeris.NativePlace{Latitude:v.Latitude,Longitude:v.Longitude}
  snapshot,e:=ephemeris.NativeSnapshot(instant,config,nil,&place)
  if e!=nil{return [12]float64{},"","",e}
  if snapshot.Houses==nil||!snapshot.Houses.SripatiAvailable {
   return [12]float64{},"","",errors.New("F01_SRIPATI_HOUSES_UNAVAILABLE")
  }
  if _,e=ephemeris.CheckSripatiGeometry(snapshot.Houses);e!=nil{return [12]float64{},"","",e}
  return snapshot.Houses.SiderealSripatiCusps,snapshot.LibraryVersion,snapshot.ActualMode,nil
 }
}
