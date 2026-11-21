package f01reference

import (
 "crypto/sha256"
 "encoding/hex"
 "errors"
 "math"
 "os"
 "path/filepath"
 "strings"
 "testing"
)

func fixture(t *testing.T)(Reference,string){
 t.Helper()
 root:=t.TempDir()
 if e:=os.Mkdir(filepath.Join(root,"originals"),0700);e!=nil{t.Fatal(e)}
 raw:=[]byte("External worked chart, test-only fictitious data; NOT an astronomical reference.\n")
 if e:=os.WriteFile(filepath.Join(root,"originals","published-example.txt"),raw,0600);e!=nil{t.Fatal(e)}
 sum:=sha256.Sum256(raw)
 ref:=Reference{
  ID:"unit_fixture",UTC:"2000-01-01T12:00:00Z",Latitude:22.57,Longitude:88.36,
  HouseSystem:"SRIPATI_S_CUSP_START_1_BASED",Ayanamsa:"SWISS_SE_SIDM_LAHIRI",
  SiderealMode:"SIDEREAL_ECLIPTIC_OF_DATE",TimeScale:"UTC",
  SourceProducer:"TEST_ONLY_EXTERNAL_CALCULATOR",SourceMethod:"independent formula for parser tests",
  SourceVersion:"unit-v1",SourceURL:"https://example.org/test-only",
  OriginalFile:"published-example.txt",OriginalSHA256:hex.EncodeToString(sum[:]),
  ToleranceDegrees:0.0001,
 }
 for i:=range ref.ExpectedCusps {ref.ExpectedCusps[i]=float64(i*30)}
 return ref,root
}
func TestAdmissionAndWraparound(t *testing.T){
 ref,root:=fixture(t)
 if e:=Admit(ref,root);e!=nil{t.Fatal(e)}
 actual:=ref.ExpectedCusps
 actual[0]=359.99995
 ref.ExpectedCusps[0]=0
 r:=Compare(ref,actual)
 if r.Status!="PASS"{t.Fatalf("wrap %.8f %+v",r.MaxErrorDegrees,r)}
 actual[0]=359.98
 if Compare(ref,actual).Status!="FAIL"{t.Fatal("failed numerical comparison falsely admitted")}
}
func TestInvalidReferencesCannotBeAdmitted(t *testing.T){
 original,root:=fixture(t)
 cases:=map[string]func(*Reference){
  "swiss_not_independent":func(r *Reference){r.SourceProducer="Swiss Ephemeris"},
  "wrong_house":func(r *Reference){r.HouseSystem="PLACIDUS"},
  "wrong_ayanamsa":func(r *Reference){r.Ayanamsa="KP_NEW"},
  "wrong_timescale":func(r *Reference){r.TimeScale="TT"},
  "wrong_source_hash":func(r *Reference){r.OriginalSHA256=strings.Repeat("0",64)},
  "unsafe_path":func(r *Reference){r.OriginalFile="../published-example.txt"},
  "missing_producer":func(r *Reference){r.SourceProducer=""},
  "wrong_tolerance":func(r *Reference){r.ToleranceDegrees=1},
  "invalid_cusp":func(r *Reference){r.ExpectedCusps[3]=math.NaN()},
  "wrong_epoch":func(r *Reference){r.UTC="2000-01-01T12:00:00+00:00"},
  "invalid_latitude":func(r *Reference){r.Latitude=99},
 }
 for name,change:=range cases{
  t.Run(name,func(t *testing.T){
   r:=original
   change(&r)
   if e:=Admit(r,root);e==nil{t.Fatal("unverified source admitted")}
  })
 }
}
func TestMissingReferencesFailClosed(t *testing.T){
 root:=t.TempDir()
 data:=Dataset{SchemaVersion:1,DatasetPurpose:"F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON",References:[]Reference{}}
 report,e:=Run(data,root,func(Reference)([12]float64,error){t.Fatal("empty dataset executed calculation");return [12]float64{},nil})
 if e==nil||report.Status!=StatusBlocked||report.Accepted!=0{t.Fatalf("false admission %+v %v",report,e)}
}
func TestComparisonPassFailureAndNativeFailure(t *testing.T){
 ref,root:=fixture(t)
 set:=Dataset{SchemaVersion:1,DatasetPurpose:"F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON",References:[]Reference{ref}}
 success,e:=Run(set,root,func(Reference)([12]float64,error){return ref.ExpectedCusps,nil})
 if e!=nil||success.Status!=StatusPartial||success.Passed!=1||success.Failed!=0{t.Fatalf("pass %+v %v",success,e)}
 bad:=ref.ExpectedCusps;bad[1]=30.02
 failure,e:=Run(set,root,func(Reference)([12]float64,error){return bad,nil})
 if e==nil||failure.Status!=StatusFailed||failure.Failed!=1{t.Fatalf("false numerical PASS %+v %v",failure,e)}
 unavailable,e:=Run(set,root,func(Reference)([12]float64,error){return [12]float64{},errors.New("NATIVE_UNAVAILABLE")})
 if e==nil||unavailable.Status==StatusPartial{t.Fatalf("native fallback %+v %v",unavailable,e)}
}
