package uncertainty

import (
 "context"
 "math"
 "testing"
 "time"
 "astroengine-core/backend/internal/ephemeris"
)

func TestSripatiMembershipAndWrap(t *testing.T) {
 var cusps [12]float64
 for i:=0;i<12;i++ { cusps[i]=math.Mod(345+float64(i*30),360) }
 cases:=[]struct{degree float64;want int}{
  {345,1},{359.999,1},{15,2},{44.999,2},{314.999,12},{math.Mod(345+330,360),12},
 }
 for _,c:=range cases {
  got,e:=SripatiHouse(c.degree,cusps)
  if e!=nil||got!=c.want {t.Fatalf("%v got %d want %d err %v",c.degree,got,c.want,e)}
 }
 cusps[5]=cusps[4]
 if _,e:=SripatiHouse(12,cusps);e==nil{t.Fatal("duplicate cusp should be rejected")}
}
func TestBirthRangeValidation(t *testing.T) {
 base:=Request{SchemaVersion:1,BirthDate:"2000-01-01",BirthTime:"09:00:00",Certainty:"EXACT",Timezone:"Asia/Kolkata",Latitude:28.6,Longitude:77.2}
 start,end,e:=endpoints(base)
 if e!=nil||!start.Equal(end){t.Fatalf("exact: %v %v %v",start,end,e)}
 base.Certainty="APPROXIMATE";base.UncertaintyMinutes=30
 start,end,e=endpoints(base)
 if e!=nil||end.Sub(start)!=time.Hour{t.Fatalf("range: %v %v",end.Sub(start),e)}
 base.Certainty="UNKNOWN";base.BirthTime="";base.UncertaintyMinutes=0
 start,end,e=endpoints(base)
 if e!=nil||end.Sub(start)!=24*time.Hour{t.Fatalf("unknown: %v %v",end.Sub(start),e)}
 base.UncertaintyMinutes=5
 if _,_,e=endpoints(base);e==nil{t.Fatal("unknown time must not accept offset range")}
}
func TestDSTUnknownAndAmbiguousExact(t *testing.T){
 r:=Request{SchemaVersion:1,BirthDate:"2021-11-07",Timezone:"America/New_York",Latitude:40.7,Longitude:-74,Certainty:"UNKNOWN"}
 a,b,e:=endpoints(r)
 if e!=nil||b.Sub(a)!=25*time.Hour{t.Fatalf("DST day: %v %v",b.Sub(a),e)}
 r.Certainty="EXACT";r.BirthTime="01:30:00"
 if _,_,e=endpoints(r);e==nil||e.Error()!="AMBIGUOUS_LOCAL_TIME"{t.Fatalf("expected explicit repeated-time refusal: %v",e)}
}
func TestNoSilentAccuracyClaims(t *testing.T){
 values:=map[string]map[string]bool{"planet.rashi":{"2":true},"planet.house":{"3":true,"4":true}}
 result:=compare(values,2)
 if len(result)!=2||result[0].Classification!="OBSERVED_VARIABLE"||result[1].Classification!="OBSERVED_STABLE_NOT_PROVEN"{t.Fatalf("wrong labels: %+v",result)}
 r:=Request{SchemaVersion:1,BirthDate:"2000-01-01",BirthTime:"09:00:00",Certainty:"EXACT",Timezone:"UTC",Latitude:0,Longitude:0}
 _,e:=Examine(context.Background(),r,ephemeris.NativeConfig{Mode:"MOSHIER"})
 if e==nil||e.Error()!="F01_REQUIRES_REVIEWED_SWISS_FILE_CONFIGURATION"{t.Fatalf("diagnostic mode not blocked: %v",e)}
}
