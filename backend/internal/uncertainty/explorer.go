// Package uncertainty provides bounded birth-time sensitivity inspection.
// It neither rectifies birth time nor authorizes a traditional interpretation.
package uncertainty

import (
 "astroengine-core/backend/internal/astronomy"
 "astroengine-core/backend/internal/ephemeris"
 "context"
 "errors"
 "fmt"
 "math"
 "sort"
 "strings"
 "time"
)

const Version = "f01-sensitivity-v1"

type Request struct {
 SchemaVersion int `json:"schema_version"`
 BirthDate string `json:"birth_date"`
 BirthTime string `json:"birth_time,omitempty"`
 Certainty string `json:"certainty"`
 UncertaintyMinutes int `json:"uncertainty_minutes,omitempty"`
 Timezone string `json:"timezone"`
 UTCOffset *float64 `json:"utc_offset,omitempty"`
 Latitude float64 `json:"latitude"`
 Longitude float64 `json:"longitude"`
}
type Factor struct {
 Name string `json:"name"`
 Classification string `json:"classification"`
 ObservedValues []string `json:"observed_values"`
 Note string `json:"note"`
}
type Sample struct {
 BirthUTC time.Time `json:"birth_utc"`
 AscendantSign string `json:"ascendant_sign"`
 MoonSign string `json:"moon_sign"`
 Placements map[string]Pair `json:"placements"`
}
type Pair struct {
 Rashi int `json:"rashi_index_0_based"`
 WholeSignHouse int `json:"whole_sign_house_1_based"`
 SripatiHouse *int `json:"sripati_house_1_based,omitempty"`
 Nakshatra int `json:"nakshatra_1_based"`
 Pada int `json:"pada_1_based"`
}
type Result struct {
 SchemaVersion int `json:"schema_version"`
 Status string `json:"status"`
 ContractVersion string `json:"contract_version"`
 TimezoneDatabase string `json:"timezone_database"`
 BirthInput Request `json:"birth_input"`
 StartUTC time.Time `json:"start_utc"`
 EndUTC time.Time `json:"end_utc"`
 SampleCount int `json:"sample_count"`
 Samples []Sample `json:"samples"`
 Factors []Factor `json:"factors"`
 HouseSystem string `json:"house_system"`
 Authority astronomy.AuthorityContract `json:"authority"`
 CustomerTimingAuthorized bool `json:"customer_timing_authorized"`
 BTRStatus string `json:"btr_status"`
 Limitations []string `json:"limitations"`
}

func issue(code string) error { return errors.New(code) }
func finite(n float64) bool { return !math.IsNaN(n)&&!math.IsInf(n,0) }
func normalized(n float64) float64 { return math.Mod(math.Mod(n,360)+360,360) }
func arc(a,b float64) float64 { return normalized(b-a) }

// Sripati cusps here are *start boundaries*, not Bhava Madhya.
// Reject malformed/degenerate/non-cyclic cusp sets rather than silently assign a house.
func SripatiHouse(longitude float64, cusps [12]float64) (int,error) {
 if !finite(longitude) { return 0,issue("INVALID_LONGITUDE") }
 total:=0.0
 for i:=0;i<12;i++ {
   a,b:=cusps[i],cusps[(i+1)%12]
   if !finite(a)||!finite(b){return 0,issue("INVALID_SRIPATI_BOUNDARIES")}
   width:=arc(a,b)
   if width<=1e-9 || width>=180 {return 0,issue("INVALID_SRIPATI_BOUNDARIES")}
   total+=width
 }
 if math.Abs(total-360)>1e-5{return 0,issue("INVALID_SRIPATI_BOUNDARIES")}
 for i:=0;i<12;i++ {
  if arc(cusps[i],longitude)<arc(cusps[i],cusps[(i+1)%12]) {return i+1,nil}
 }
 return 0,issue("SRIPATI_HOUSE_UNRESOLVED")
}
func validDate(s string)(time.Time,error){
 d,e:=time.Parse("2006-01-02",s)
 if e!=nil||d.Format("2006-01-02")!=s||d.Year()<1900||d.Year()>2100{return time.Time{},issue("INVALID_BIRTH_DATE")}
 return d,nil
}
func endpoints(r Request)(time.Time,time.Time,error){
 if r.SchemaVersion!=1 {return time.Time{},time.Time{},issue("INVALID_SCHEMA_VERSION")}
 if _,e:=validDate(r.BirthDate);e!=nil{return time.Time{},time.Time{},e}
 if !finite(r.Latitude)||!finite(r.Longitude)||math.Abs(r.Latitude)>=89.999999||math.Abs(r.Longitude)>180{return time.Time{},time.Time{},issue("INVALID_BIRTH_LOCATION")}
 if r.Timezone==""||r.Timezone=="Local"||len(r.Timezone)>100||strings.TrimSpace(r.Timezone)!=r.Timezone{return time.Time{},time.Time{},issue("INVALID_TIMEZONE")}
 loc,e:=ephemeris.LoadCalculationLocation(r.Timezone)
 if e!=nil{return time.Time{},time.Time{},issue("INVALID_TIMEZONE")}
 lat,lon:=r.Latitude,r.Longitude
 if r.Certainty=="UNKNOWN" {
  if r.BirthTime!=""||r.UncertaintyMinutes!=0||r.UTCOffset!=nil{return time.Time{},time.Time{},issue("INVALID_BIRTH_UNCERTAINTY")}
  d,_:=validDate(r.BirthDate)
  start:=time.Date(d.Year(),d.Month(),d.Day(),0,0,0,0,loc)
  next:=d.AddDate(0,0,1)
  end:=time.Date(next.Year(),next.Month(),next.Day(),0,0,0,0,loc)
  if start.In(loc).Format("2006-01-02 15:04:05")!=r.BirthDate+" 00:00:00"||end.In(loc).Format("2006-01-02 15:04:05")!=next.Format("2006-01-02")+" 00:00:00"||!end.After(start)||end.Sub(start)>28*time.Hour||end.Sub(start)<20*time.Hour {return time.Time{},time.Time{},issue("LOCAL_DAY_UNAVAILABLE")}
  return start.UTC(),end.UTC(),nil
 }
 if r.Certainty!="EXACT"&&r.Certainty!="APPROXIMATE" {return time.Time{},time.Time{},issue("INVALID_BIRTH_CERTAINTY")}
 if r.Certainty=="EXACT"&&r.UncertaintyMinutes!=0||r.Certainty=="APPROXIMATE"&&(r.UncertaintyMinutes<1||r.UncertaintyMinutes>1440){return time.Time{},time.Time{},issue("INVALID_BIRTH_UNCERTAINTY")}
 instant,e:=ephemeris.ParseBirth(ephemeris.NormalizationRequest{BirthDate:r.BirthDate,BirthTime:r.BirthTime,Timezone:r.Timezone,TimezoneOffset:r.UTCOffset,Latitude:&lat,Longitude:&lon,BirthTimeCertainty:r.Certainty},"")
 if e!=nil {return time.Time{},time.Time{},e}
 if r.Certainty=="EXACT" {return instant,instant,nil}
 span:=time.Duration(r.UncertaintyMinutes)*time.Minute
 return instant.Add(-span),instant.Add(span),nil
}
func compare(values map[string]map[string]bool, observations int)[]Factor{
 out:=make([]Factor,0,len(values))
 for k,set:=range values {
  seen:=make([]string,0,len(set))
  for v:=range set{seen=append(seen,v)}
  sort.Strings(seen)
  status:="OBSERVED_STABLE_NOT_PROVEN"
  note:="The sampled values agree; crossings between samples have not been excluded."
  if len(seen)>1 {status="OBSERVED_VARIABLE";note="The sampled range contains multiple values. Change times have not been resolved."}
  if observations==0||len(seen)==0 {status="UNRESOLVED";note="No reliable samples were available."}
  out=append(out,Factor{k,status,seen,note})
 }
 sort.Slice(out,func(i,j int)bool{return out[i].Name<out[j].Name})
 return out
}
func Examine(ctx context.Context,req Request,config ephemeris.NativeConfig)(Result,error){
 start,end,e:=endpoints(req)
 if e!=nil{return Result{},e}
 if config.Mode!="SWISS_FILE" {return Result{},issue("F01_REQUIRES_REVIEWED_SWISS_FILE_CONFIGURATION")}
 if e=astronomy.RequireProductionConfiguration(config);e!=nil{return Result{},e}
 result:=Result{SchemaVersion:1,Status:"COMPUTED_UNVERIFIED",ContractVersion:Version,TimezoneDatabase:ephemeris.TimezoneDatabaseVersion,BirthInput:req,StartUTC:start,EndUTC:end,HouseSystem:"SWISS_S_SIDEREAL_LAHIRI",Authority:astronomy.Authority(config),CustomerTimingAuthorized:false,BTRStatus:"UNAVAILABLE_UNVALIDATED_DASHA_METHOD",Samples:[]Sample{},Factors:[]Factor{},Limitations:[]string{
 "Exploratory astronomical classifications, NOT birth-time rectification or proof of predictive accuracy.",
 "Sample agreement cannot prove stability between samples; all sample-stable factors remain unproven. Native file checks bound sampling to 17 points.",
 "Rashi and Sripati house placements are distinct; they are not blended into an invented score.",
 "D60 and birth-time selection by retrospective milestones are disabled.",
 "Customer timing and activity recommendations remain disabled pending scientific, traditional, and licensing approval.",
 }}
 // Deliberately bounded to 17 astronomical calls because the pinned native provider
 // independently checks full ephemeris data hashes per snapshot. No root coverage claim.
 interval:=end.Sub(start)
 count:=1
 if interval>0 {count=17}
 values:=map[string]map[string]bool{}
 add:=func(k,v string){if values[k]==nil{values[k]=map[string]bool{}};values[k][v]=true}
 place:=ephemeris.NativePlace{Latitude:req.Latitude,Longitude:req.Longitude}
 for i:=0;i<count;i++{
  if ctx.Err()!=nil{return Result{},issue("F01_TIMEOUT")}
  t:=start
  if count>1 {t=start.Add(time.Duration(int64(interval)*int64(i)/int64(count-1)))}
  s,e:=astronomy.ComputeSnapshot(ctx,astronomy.SnapshotRequest{SchemaVersion:1,Civil:ephemeris.NormalizationRequest{
    BirthDate:t.In(time.UTC).Format("2006-01-02"),BirthTime:t.In(time.UTC).Format("15:04:05"),
    Timezone:"UTC",Latitude:&place.Latitude,Longitude:&place.Longitude,BirthTimeCertainty:"APPROXIMATE",
    RequiredMode:"SWISS_FILE"},ElevationMeters:0},config)
  if e!=nil{return Result{},e}
  if s.Native.Houses==nil{return Result{},issue("F01_HOUSES_UNAVAILABLE")}
  h:=s.Native.Houses
  sample:=Sample{BirthUTC:t.UTC(),AscendantSign:fmt.Sprint(int(math.Floor(normalized(h.SiderealAscendant)/30))),Placements:map[string]Pair{}}
  add("ascendant.rashi",sample.AscendantSign)
  ascClassification,err:=astronomy.Classify(h.SiderealAscendant,&h.SiderealAscendant,false)
  if err!=nil{return Result{},err}
  add("ascendant.d9",fmt.Sprint(ascClassification.D9Sign))
  add("ascendant.d2",fmt.Sprint(ascClassification.D2Sign))
  for planet,p:=range s.Native.Planets {
   placement,e:=astronomy.Classify(p.SiderealLongitude,&h.SiderealAscendant,false)
   if e!=nil{return Result{},e}
   pair:=Pair{Rashi:placement.RashiIndex,WholeSignHouse:placement.WholeSignHouse,Nakshatra:placement.Nakshatra,Pada:placement.Pada}
   add(planet+".rashi",fmt.Sprint(pair.Rashi))
   add(planet+".whole_sign_house",fmt.Sprint(pair.WholeSignHouse))
   add(planet+".d9",fmt.Sprint(placement.D9Sign))
   add(planet+".d2",fmt.Sprint(placement.D2Sign))
   if planet=="moon" {sample.MoonSign=fmt.Sprint(pair.Rashi);add("moon.nakshatra",fmt.Sprint(pair.Nakshatra));add("moon.pada",fmt.Sprint(pair.Pada))}
   if h.SripatiAvailable {
    house,err:=SripatiHouse(p.SiderealLongitude,h.SiderealSripatiCusps)
    if err!=nil{return Result{},err}
    pair.SripatiHouse=&house
    add(planet+".sripati_house",fmt.Sprint(house))
   }else {
    add(planet+".sripati_house","UNAVAILABLE")
   }
   sample.Placements[planet]=pair
  }
  result.Samples=append(result.Samples,sample)
 }
 result.SampleCount=len(result.Samples)
 result.Factors=compare(values,len(result.Samples))
 if len(result.Samples)>0&&result.Samples[0].Placements["moon"].SripatiHouse==nil {
   result.Limitations=append(result.Limitations,"Native Sripati house boundaries were unavailable; no house assignment was inferred.")
 }
 return result,nil
}
