package uncertainty

import (
 "context"
 "time"
)

// TransitionRefinement describes only the geometry of detected changes.
// There is NO continuous-time proof here. Endpoint agreement cannot exclude
// two hidden changes; a one-second bracket is not independent accuracy evidence.
const (
 MaxRefinementEvaluations = 12
 RefinementTarget = time.Minute
)

// RefineObservedBrackets uses a bounded number of midpoint evaluations to narrow
// observed changes. It never interprets equal endpoints as stability.
func RefineObservedBrackets(ctx context.Context, observations []TransitionBracket, evaluate func(context.Context,time.Time,string)(string,error))([]TransitionBracket,int,error){
 out:=append([]TransitionBracket{},observations...)
 if len(out)==0{return out,0,nil}
 used:=0
 // Round-robin: don't spend all work on the first planet.
 for pass:=0;pass<MaxRefinementEvaluations && used<MaxRefinementEvaluations;pass++{
  progress:=false
  for i:=range out {
   if used>=MaxRefinementEvaluations {break}
   b:=&out[i]
   if b.ToUTC.Sub(b.FromUTC)<=RefinementTarget {continue}
   width:=b.ToUTC.Sub(b.FromUTC)
   middle:=b.FromUTC.Add(width/2).Truncate(time.Second)
   if !middle.After(b.FromUTC)||!middle.Before(b.ToUTC){continue}
   if err:=ctx.Err();err!=nil{return nil,used,issue("F01_TIMEOUT")}
   value,err:=evaluate(ctx,middle,b.Factor)
   if err!=nil{return nil,used,err}
   used++;progress=true
   switch value{
   case b.FromValue:
    b.FromUTC=middle
   case b.ToValue:
    b.ToUTC=middle
   default:
    // A third label shows that a simple two-state bisection is not a complete
    // transition model. Retain the original interval conservatively.
    b.Evidence="OBSERVED_CHANGE_WITH_INTERMEDIATE_STATE_UNRESOLVED"
   }
   if b.Evidence=="OBSERVED_CHANGE_WITH_INTERMEDIATE_STATE_UNRESOLVED" {
    continue
   }
  }
  if !progress{break}
 }
 return out,used,nil
}
