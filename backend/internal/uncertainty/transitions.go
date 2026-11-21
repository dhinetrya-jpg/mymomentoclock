package uncertainty

import (
 "sort"
 "time"
)

// ObservedBrackets creates conservative evidence of transitions actually seen
// between consecutive samples. No inferred exact boundary or stability claim.
func ObservedBrackets(samples []Sample) []TransitionBracket {
 out:=make([]TransitionBracket,0)
 if len(samples)<2{return out}
 for i:=1;i<len(samples);i++ {
  previous,current:=samples[i-1],samples[i]
  if !current.BirthUTC.After(previous.BirthUTC){continue}
  for key,before:=range previous.FactorValues {
   after,ok:=current.FactorValues[key]
   if !ok||before==after||before=="UNAVAILABLE"||after=="UNAVAILABLE"{continue}
   out=append(out,TransitionBracket{
    Factor:key,FromValue:before,ToValue:after,FromUTC:previous.BirthUTC,
    ToUTC:current.BirthUTC,
    Evidence:"OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION",
   })
  }
 }
 sort.Slice(out,func(i,j int)bool{
  if out[i].FromUTC.Equal(out[j].FromUTC){
   if out[i].Factor==out[j].Factor{return out[i].ToUTC.Before(out[j].ToUTC)}
   return out[i].Factor<out[j].Factor
  }
  return out[i].FromUTC.Before(out[j].FromUTC)
 })
 return out
}

// Clamp a request time range to a deterministic UTC timeline without assuming
// an offset or probability distribution for the actual instant of birth.
func UTCInterval(start,end time.Time)(time.Duration,error){
 if end.Before(start){return 0,issue("INVALID_BIRTH_RANGE")}
 return end.Sub(start),nil
}
