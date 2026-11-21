package main

import (
 "astroengine-core/backend/internal/astronomy"
 "astroengine-core/backend/internal/ephemeris"
 f01crossengine "astroengine-core/backend/internal/f01crossengine"
 "encoding/json"
 "fmt"
 "os"
 "path/filepath"
)
func main(){
 if len(os.Args)!=2 {fmt.Fprintln(os.Stderr,"usage: f01crossengine <diagnostic-capture.json>");os.Exit(2)}
 dataset,err:=f01crossengine.Decode(os.Args[1])
 if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(2)}
 root:=os.Getenv("F01_REFERENCE_EPHEMERIS_DIR")
 if root=="" {fmt.Fprintln(os.Stderr,"F01_REFERENCE_EPHEMERIS_DIR_REQUIRED");os.Exit(2)}
 root,err=filepath.Abs(root)
 if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(2)}
 cfg:=ephemeris.NativeConfig{Mode:"SWISS_FILE",Usage:astronomy.ProductionAuthority,EphemerisPath:root,FileSHA256:astronomy.PinnedDataHashes()}
 if err=astronomy.RequireProductionConfiguration(cfg);err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(2)}
 report,err:=f01crossengine.Compare(dataset,f01crossengine.NativeCalculator(cfg))
 if err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}
 if err=json.NewEncoder(os.Stdout).Encode(report);err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}
}
