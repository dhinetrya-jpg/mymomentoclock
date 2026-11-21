//go:build cgo

package ephemeris

import (
 "testing"
 "time"
)

func TestF01SripatiPorphyryNativeCrossCheckAcrossEpochsAndHemispheres(t *testing.T){
 cases:=[]struct{
  name string
  year,month,day,hour int
  lat,lon float64
 }{
  {"kolkata_j2000",2000,1,1,12,22.57,88.36},
  {"delhi_2025",2025,6,21,18,28.61,77.21},
  {"sydney_2000",2000,1,1,12,-33.8688,151.2093},
  {"london_1970",1970,5,5,2,51.5074,-0.1278},
  {"new_york_2024",2024,11,3,5,40.7128,-74.006},
  {"equator_1900",1900,12,31,23,0,0},
  {"northern_2020",2020,3,20,12,58.0,10.0},
  {"southern_2020",2020,3,20,12,-55.0,-67.0},
 }
 for _,tc:=range cases{
  t.Run(tc.name,func(t *testing.T){
   place:=NativePlace{Latitude:tc.lat,Longitude:tc.lon}
   date:=time.Date(tc.year,time.Month(tc.month),tc.day,tc.hour,0,0,0,time.UTC)
   out,err:=NativeSnapshot(date,NativeConfig{Mode:"MOSHIER"},nil,&place)
   if err!=nil{t.Fatal(err)}
   geometry,err:=CheckSripatiGeometry(out.Houses)
   if err!=nil||geometry.Status!="GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED"{
    t.Fatalf("native Porphyry-Sripati mismatch %s: %+v %v",tc.name,geometry,err)
   }
   if geometry.MaxAngularErrorDegrees>SripatiGeometryToleranceDegrees{
    t.Fatalf("tolerance breach %+v",geometry)
   }
  })
 }
}
