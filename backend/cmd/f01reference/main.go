// f01reference is an offline numerical acceptance tool, not a public endpoint.
package main

import (
 "astroengine-core/backend/internal/astronomy"
 "astroengine-core/backend/internal/ephemeris"
 "astroengine-core/backend/internal/f01reference"
 "encoding/json"
 "fmt"
 "os"
 "path/filepath"
)

func main(){
 root:="tests/calculation/reference/f01"
 if len(os.Args)>2{fmt.Fprintln(os.Stderr,"usage: f01reference [reference-root]");os.Exit(2)}
 if len(os.Args)==2{root=os.Args[1]}
 manifest,err:=f01reference.Load(filepath.Join(root,"manifest.json"))
 if err!=nil{fmt.Fprintln(os.Stderr,"REFERENCE_MANIFEST_INVALID:",err);os.Exit(2)}
 dir:=os.Getenv("F01_REFERENCE_EPHEMERIS_DIR")
 // The manifest's absent-source case must not be bypassed by missing Swiss
 // configuration: report evidence as BLOCKED, not a fraudulent PASS.
 if len(manifest.References)==0 {
  report,runErr:=f01reference.Run(manifest,root,nil)
  _=json.NewEncoder(os.Stdout).Encode(report)
  fmt.Fprintln(os.Stderr,runErr)
  os.Exit(2)
 }
 if dir==""{fmt.Fprintln(os.Stderr,"F01_REFERENCE_EPHEMERIS_DIR_REQUIRED");os.Exit(2)}
 dir,err=filepath.Abs(dir)
 if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(2)}
 cfg:=ephemeris.NativeConfig{Mode:"SWISS_FILE",Usage:"PRODUCTION_AUTHORITY",EphemerisPath:dir,FileSHA256:astronomy.PinnedDataHashes()}
 if err=astronomy.RequireProductionConfiguration(cfg);err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(2)}
 report,runErr:=f01reference.Run(manifest,root,f01reference.NativeCalculator(cfg))
 _=json.NewEncoder(os.Stdout).Encode(report)
 if runErr!=nil{fmt.Fprintln(os.Stderr,runErr);os.Exit(1)}
}
