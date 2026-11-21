// Package crossengine compares two distinct astronomical calculation stacks.
// This diagnostic is NOT accepted independent Sripati evidence because the
// external algorithm explicitly reused Swiss's Sripati house formulas.
package crossengine

import (
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "math"
 "os"
 "regexp"
 "time"
)

const DiagnosticMode="CROSS_ENGINE_NOT_INDEPENDENT_SRIPATI_FORMULA"
const ReportStatus="COMPARISON_COMPLETED_UNADMITTED"

type Case struct{
 ID string `json:"id"`
 UTC string `json:"utc"`
 Latitude float64 `json:"latitude"`
 Longitude float64 `json:"longitude"`
 SiderealAscendantDegrees float64 `json:"sidereal_ascendant_deg"`
 SiderealMCDegrees float64 `json:"sidereal_mc_deg"`
 Cusps [12]float64 `json:"sidereal_sripati_cusps_deg"`
}
type Package struct {Name string `json:"name"`;Version string `json:"version"`}
type Dataset struct{
 SchemaVersion int `json:"schema_version"`
 DiagnosticMode string `json:"diagnostic_mode"`
 AstronomicalProvider string `json:"astronomical_provider"`
 HouseFormulaOrigin string `json:"house_formula_origin"`
 SourcePackage Package `json:"source_package"`
 TimeBasePackage Package `json:"time_base_package"`
 Cases []Case `json:"cases"`
 CustomerTimingAuthorized bool `json:"customer_timing_authorized"`
 ScientificAcceptance string `json:"scientific_acceptance"`
}
type Measurement struct {
 ID string `json:"id"`
 UTC string `json:"utc"`
 MaximumCuspDifferenceDegrees float64 `json:"maximum_cusp_difference_degrees"`
 WorstCusp1Based int `json:"worst_cusp_1_based"`
 NativeVersion string `json:"native_version"`
 NativeMode string `json:"native_mode"`
 ScientificStatus string `json:"scientific_status"`
}
type Report struct{
 Status string `json:"status"`
 CasesCompared int `json:"cases_compared"`
 MaxObservedDifferenceDegrees float64 `json:"max_observed_difference_degrees"`
 Measurements []Measurement `json:"measurements"`
 CustomerTimingAuthorized bool `json:"customer_timing_authorized"`
 ScientificAcceptance string `json:"scientific_acceptance"`
 Limitations []string `json:"limitations"`
}
var caseID=regexp.MustCompile(`^[a-z0-9_]{4,60}$`)
func finite(v float64)bool{return !math.IsNaN(v)&&!math.IsInf(v,0)}
func angularDistance(a,b float64)float64{
 d:=math.Mod(math.Mod(a-b,360)+360,360)
 if d>180{return 360-d}
 return d
}
func Decode(path string)(Dataset,error){
 file,e:=os.Open(path);if e!=nil{return Dataset{},e};defer file.Close()
 d:=json.NewDecoder(io.LimitReader(file,1<<20));d.DisallowUnknownFields()
 var data Dataset
 if e=d.Decode(&data);e!=nil{return Dataset{},e}
 if d.Decode(new(any))!=io.EOF{return Dataset{},errors.New("F01_CROSS_ENGINE_TRAILING_DATA")}
 if data.SchemaVersion!=1||data.DiagnosticMode!=DiagnosticMode||data.AstronomicalProvider!="PYMEEUS_VSOP87_MEEUS"||data.HouseFormulaOrigin!="JYOTIPY_SRIPATI_TRANSCRIBED_FROM_SWISS_SOURCE"||data.SourcePackage!= (Package{"jyotipy","0.2.1"})||data.TimeBasePackage!=(Package{"PyMeeus","0.5.12"})||data.CustomerTimingAuthorized||data.ScientificAcceptance!="NOT_ESTABLISHED"||len(data.Cases)!=8{return Dataset{},errors.New("F01_CROSS_ENGINE_SOURCE_NOT_ADMITTED")}
 seen:=map[string]bool{}
 for _,v:=range data.Cases{
  t,e:=time.Parse(time.RFC3339,v.UTC)
  if e!=nil||t.Format("2006-01-02T15:04:05Z")!=v.UTC||t.Year()<1900||t.Year()>2100||!caseID.MatchString(v.ID)||seen[v.ID]||!finite(v.Latitude)||math.Abs(v.Latitude)>65||!finite(v.Longitude)||math.Abs(v.Longitude)>180||!finite(v.SiderealAscendantDegrees)||!finite(v.SiderealMCDegrees) {return Dataset{},errors.New("F01_CROSS_ENGINE_CASE_INVALID")}
  seen[v.ID]=true
  if v.SiderealAscendantDegrees<0||v.SiderealAscendantDegrees>=360||v.SiderealMCDegrees<0||v.SiderealMCDegrees>=360{return Dataset{},errors.New("F01_CROSS_ENGINE_ANGLE_INVALID")}
  sum:=0.0
  for i,cusp:=range v.Cusps{
   next:=v.Cusps[(i+1)%12]
   if !finite(cusp)||!finite(next)||cusp<0||cusp>=360{return Dataset{},errors.New("F01_CROSS_ENGINE_CUSP_INVALID")}
   delta:=math.Mod(math.Mod(next-cusp,360)+360,360)
   if delta<=1e-9||delta>=180{return Dataset{},errors.New("F01_CROSS_ENGINE_ARC_INVALID")}
   sum+=delta
  }
  if math.Abs(sum-360)>1e-5{return Dataset{},errors.New("F01_CROSS_ENGINE_CYCLE_INVALID")}
 }
 return data,nil
}
func Compare(data Dataset,calculate func(Case)([12]float64,string,string,error))(Report,error){
 report:=Report{Status:ReportStatus,Measurements:[]Measurement{},ScientificAcceptance:"NOT_ESTABLISHED",CustomerTimingAuthorized:false,Limitations:[]string{
  "The PyMeeus and Swiss astronomical pipelines differ but JyotiPy's Sripati formula is transcribed from Swiss; the house formula is not independently validated.",
  "A difference is a diagnostic, not a calibrated tolerance breach or proof of either source being right.",
  "The F01-P0-03 external-reference admission manifest remains separate; this diagnostic is never admitted there.",
 }}
 if len(data.Cases)!=8||data.DiagnosticMode!=DiagnosticMode||data.ScientificAcceptance!="NOT_ESTABLISHED"{return report,errors.New("F01_CROSS_ENGINE_DATA_INVALID")}
 for _,v:=range data.Cases{
  actual,version,mode,e:=calculate(v)
  if e!=nil{return report,fmt.Errorf("F01_NATIVE_UNAVAILABLE: %w",e)}
  if mode!="SWISS_FILE"||version!="2.10.03"{return report,errors.New("F01_NATIVE_AUTHORITY_MISMATCH")}
  record:=Measurement{ID:v.ID,UTC:v.UTC,NativeVersion:version,NativeMode:mode,ScientificStatus:"NOT_INDEPENDENT_SRIPATI_FORMULA"}
  for i:=0;i<12;i++{
   if !finite(actual[i])||actual[i]<0||actual[i]>=360{return report,errors.New("F01_NATIVE_CUSP_INVALID")}
   difference:=angularDistance(v.Cusps[i],actual[i])
   if difference>record.MaximumCuspDifferenceDegrees{record.MaximumCuspDifferenceDegrees=difference;record.WorstCusp1Based=i+1}
  }
  if record.MaximumCuspDifferenceDegrees>report.MaxObservedDifferenceDegrees{report.MaxObservedDifferenceDegrees=record.MaximumCuspDifferenceDegrees}
  report.CasesCompared++
  report.Measurements=append(report.Measurements,record)
 }
 return report,nil
}
