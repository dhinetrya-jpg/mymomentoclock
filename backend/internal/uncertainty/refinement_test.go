package uncertainty

import (
 "context"
 "errors"
 "fmt"
 "testing"
 "time"
)

func TestRefineSingleObservedCrossing(t *testing.T){
 start:=time.Date(2020,1,1,0,0,0,0,time.UTC)
 original:=TransitionBracket{Factor:"moon.rashi",FromValue:"1",ToValue:"2",FromUTC:start,ToUTC:start.Add(16*time.Minute),Evidence:"OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION"}
 cross:=start.Add(7*time.Minute)
 refined,calls,err:=RefineObservedBrackets(context.Background(),[]TransitionBracket{original},func(_ context.Context,at time.Time,key string)(string,error){
  if key!="moon.rashi" {t.Fatal(key)}
  if at.Before(cross) {return "1",nil}
  return "2",nil
 })
 if err!=nil||calls==0||len(refined)!=1{t.Fatalf("unexpected: %+v %d %v",refined,calls,err)}
 v:=refined[0]
 if v.ToUTC.Sub(v.FromUTC)>RefinementTarget||v.FromUTC.After(cross)||!v.ToUTC.After(cross){t.Fatalf("crossing not bracketed: %+v",v)}
 if v.Evidence!="OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION"{t.Fatalf("false certification: %+v",v)}
}
func TestRefinementBudgetCannotProveStability(t *testing.T){
 start:=time.Date(2020,1,1,0,0,0,0,time.UTC)
 brackets:=make([]TransitionBracket,40)
 for i:=range brackets{
  brackets[i]=TransitionBracket{Factor:fmt.Sprintf("factor.%d",i),FromValue:"A",ToValue:"B",FromUTC:start,ToUTC:start.Add(24*time.Hour),Evidence:"OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION"}
 }
 refined,calls,err:=RefineObservedBrackets(context.Background(),brackets,func(_ context.Context,at time.Time,key string)(string,error){return "A",nil})
 if err!=nil||calls>MaxRefinementEvaluations||len(refined)!=40{t.Fatalf("budget: calls=%d err=%v",calls,err)}
 if refined[35].ToUTC.Sub(refined[35].FromUTC)!=24*time.Hour{t.Fatal("unvisited bracket was silently narrowed")}
}
func TestThirdStateAndFailureFailClosed(t *testing.T){
 start:=time.Date(2020,1,1,0,0,0,0,time.UTC)
 initial:=[]TransitionBracket{{Factor:"planet.d9",FromValue:"1",ToValue:"3",FromUTC:start,ToUTC:start.Add(30*time.Minute),Evidence:"OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION"}}
 refined,calls,err:=RefineObservedBrackets(context.Background(),initial,func(context.Context,time.Time,string)(string,error){return "2",nil})
 if err!=nil||calls!=1||refined[0].Evidence!="OBSERVED_CHANGE_WITH_INTERMEDIATE_STATE_UNRESOLVED"||!refined[0].FromUTC.Equal(start)||!refined[0].ToUTC.Equal(initial[0].ToUTC){t.Fatalf("intermediate state lost: %+v %v",refined,err)}
 _,_,err=RefineObservedBrackets(context.Background(),initial,func(context.Context,time.Time,string)(string,error){return "",errors.New("NATIVE_UNAVAILABLE")})
 if err==nil||err.Error()!="NATIVE_UNAVAILABLE"{t.Fatalf("provider failed open: %v",err)}
 ctx,cancel:=context.WithCancel(context.Background());cancel()
 _,_,err=RefineObservedBrackets(ctx,initial,func(context.Context,time.Time,string)(string,error){t.Fatal("cancelled evaluation executed");return "1",nil})
 if err==nil||err.Error()!="F01_TIMEOUT"{t.Fatalf("cancelled context accepted: %v",err)}
}
func TestNoBracketsNeedsNoNativeProbes(t *testing.T){
 got,calls,err:=RefineObservedBrackets(context.Background(),nil,func(context.Context,time.Time,string)(string,error){t.Fatal("no brackets");return "",nil})
 if err!=nil||calls!=0||len(got)!=0{t.Fatalf("%v %d %v",got,calls,err)}
}
