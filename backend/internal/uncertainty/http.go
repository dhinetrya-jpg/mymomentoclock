package uncertainty

import (
 "astroengine-core/backend/internal/ephemeris"
 "context"
 "encoding/json"
 "errors"
 "io"
 "net/http"
 "time"
)

func Handler(config ephemeris.NativeConfig) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("Content-Type","application/json")
  w.Header().Set("Cache-Control","no-store")
  w.Header().Set("X-Content-Type-Options","nosniff")
  fail:=func(code int,reason string){w.WriteHeader(code);_ = json.NewEncoder(w).Encode(map[string]any{"status":"UNAVAILABLE","code":reason,"contract_version":Version,"customer_timing_authorized":false,"btr_status":"UNAVAILABLE_UNVALIDATED_DASHA_METHOD"})}
  if r.URL.Path!="/api/v1/f01/explore" {fail(404,"NOT_FOUND");return}
  if r.URL.RawQuery!="" {fail(422,"URL_PARAMETERS_NOT_ALLOWED");return}
  if r.Method!="POST" {fail(405,"METHOD_NOT_ALLOWED");return}
  r.Body=http.MaxBytesReader(w,r.Body,16<<10)
  d:=json.NewDecoder(r.Body);d.DisallowUnknownFields()
  var req Request
  if e:=d.Decode(&req);e!=nil {
   var tooLarge *http.MaxBytesError
   if errors.As(e,&tooLarge){fail(413,"REQUEST_TOO_LARGE")}else{fail(422,"INVALID_REQUEST")}
   return
  }
  if d.Decode(new(any))!=io.EOF{fail(422,"INVALID_REQUEST");return}
  ctx,cancel:=context.WithTimeout(r.Context(),10*time.Second)
  defer cancel()
  result,err:=Examine(ctx,req,config)
  if err!=nil{
   status:=422
   switch err.Error(){
   case "F01_TIMEOUT","NATIVE_EPHEMERIS_UNAVAILABLE","NATIVE_CALCULATION_FAILED","EPHEMERIS_DATA_UNAVAILABLE","EPHEMERIS_CHECKSUM_MISMATCH","EPHEMERIS_CONFIGURATION_INVALID","F01_REQUIRES_REVIEWED_SWISS_FILE_CONFIGURATION","F01_HOUSES_UNAVAILABLE","F01_SRIPATI_UNAVAILABLE","PRODUCTION_DATASET_NOT_PINNED","PRODUCTION_EPHEMERIS_PATH_REQUIRED","EPHEMERIS_MODE_UNAVAILABLE":
    status=503
   }
   fail(status,err.Error());return
  }
  w.WriteHeader(200);_ = json.NewEncoder(w).Encode(result)
 })
}
