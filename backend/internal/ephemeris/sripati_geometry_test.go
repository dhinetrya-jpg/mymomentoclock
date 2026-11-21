package ephemeris

import (
 "math"
 "testing"
)

func TestSripatiPorphyryMidpointWrap(t *testing.T){
 var o [12]float64
 for i:=0;i<12;i++{o[i]=float64(i*30)}
 got,err:=SripatiFromPorphyry(o)
 if err!=nil{t.Fatal(err)}
 for i:=0;i<12;i++{
  want:=math.Mod(float64(i*30)+345,360)
  if angularError(got[i],want)>1e-10 {t.Fatalf("cusp %d got %.8f want %.8f",i+1,got[i],want)}
 }
 h:=&NativeHouses{PorphyryAvailable:true,SripatiAvailable:true,SiderealPorphyryCusps:o,SiderealSripatiCusps:got}
 diagnostic,err:=CheckSripatiGeometry(h)
 if err!=nil||diagnostic.Status!="GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED"{t.Fatalf("wrong reference validation: %+v %v",diagnostic,err)}
 h.SiderealSripatiCusps[2]+=0.002
 d,err:=CheckSripatiGeometry(h)
 if err==nil||err.Error()!="F01_SRIPATI_PORPHYRY_DISAGREEMENT"||d.Status!="FAILED" {t.Fatalf("unjustified tolerance: %+v %v",d,err)}
}
func TestSripatiGeometryInvalidInputs(t *testing.T){
 var o [12]float64
 if _,err:=SripatiFromPorphyry(o);err==nil {t.Fatal("degenerate Porphyry accepted")}
 for i:=0;i<12;i++{o[i]=float64(i*30)}
 o[3]=math.NaN()
 if _,err:=SripatiFromPorphyry(o);err==nil {t.Fatal("NaN Porphyry accepted")}
 if _,err:=CheckSripatiGeometry(nil);err==nil {t.Fatal("missing geometry accepted")}
}
