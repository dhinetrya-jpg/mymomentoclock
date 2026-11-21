//go:build cgo

package ephemeris

import (
 "math"
 "testing"
 "time"
)

// Native geometry integration smoke. Not independent Sripati numerical acceptance.
func TestF01NativeSripatiAndWholeSignRemainSeparate(t *testing.T){
 place:=NativePlace{Latitude:22.57,Longitude:88.36}
 snapshot,err:=NativeSnapshot(time.Date(2000,1,1,12,0,0,0,time.UTC),NativeConfig{Mode:"MOSHIER"},nil,&place)
 if err!=nil{t.Fatal(err)}
 if snapshot.Houses==nil||!snapshot.Houses.SripatiAvailable||snapshot.Houses.System!="WHOLE_SIGN_SWISS_W"||snapshot.Houses.SripatiSystem!="SWISS_S_SIDEREAL_LAHIRI"{
  t.Fatalf("Sripati and Rashi authority not both exposed: %+v",snapshot.Houses)
 }
 h:=snapshot.Houses
 total:=0.0
 distance:=func(a,b float64)float64{return math.Mod(math.Mod(b-a,360)+360,360)}
 distinct:=false
 for i:=0;i<12;i++{
  a,b:=h.SiderealSripatiCusps[i],h.SiderealSripatiCusps[(i+1)%12]
  if math.IsNaN(a)||math.IsInf(a,0)||a<0||a>=360 {t.Fatalf("invalid cusp %d: %v",i,a)}
  span:=distance(a,b)
  if span<=0||span>=180{t.Fatalf("invalid arc %d: %v",i,span)}
  total+=span
  if distance(a,h.SiderealCusps[i])>0.001 {distinct=true}
 }
 if math.Abs(total-360)>0.00001||!distinct{t.Fatalf("invalid or conflated cusp geometry total=%v distinct=%v",total,distinct)}
 if snapshot.ValidationStatus!="NOT_INDEPENDENTLY_VERIFIED" {t.Fatal("false numerical verification claim")}
}
