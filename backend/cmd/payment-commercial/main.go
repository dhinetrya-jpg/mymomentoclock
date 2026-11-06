// A separately built commercial artifact. The standard native image cannot activate production.
package main

import (
	"astroengine-core/backend/internal/payment"
	"astroengine-core/backend/internal/payment/commercial"
	"astroengine-core/backend/internal/payment/release"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// Set only by a separately reviewed image build. No runtime env variable can supply this trust root.
var releaseTrustPublicKeyHex = ""

func main() {
	check := flag.Bool("check-ready", false, "validate without starting listeners")
	flag.Parse()
	log.SetFlags(0)
	config, raw, err := commercial.ReadConfig(os.Getenv("PAYMENT_COMMERCIAL_CONFIG_FILE"))
	if err != nil {
		log.Fatal("COMMERCIAL_CONFIGURATION_UNAPPROVED")
	}
	if config.Environment != os.Getenv("PAYMENT_MODE") {
		log.Fatal("PAYMENT_ENVIRONMENT_INVALID")
	}
	var approval *release.Authorization
	if config.Environment == "production" {
		if releaseTrustPublicKeyHex == "" {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
		manifest, e := os.ReadFile(os.Getenv("PAYMENT_RELEASE_MANIFEST_FILE"))
		if e != nil {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
		signatureText, e := os.ReadFile(os.Getenv("PAYMENT_RELEASE_SIGNATURE_FILE"))
		if e != nil {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
		signature, e := hex.DecodeString(string(bytesTrim(signatureText)))
		if e != nil {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
		binary, e := os.Executable()
		if e != nil {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
		contents, e := os.ReadFile(binary)
		if e != nil {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
		digest := sha256.Sum256(contents)
		approval, err = commercial.Authorize(manifest, signature, releaseTrustPublicKeyHex, hex.EncodeToString(digest[:]), release.ConfigHash(raw))
		if err != nil {
			log.Fatal("PAYMENT_RELEASE_NOT_AUTHORIZED")
		}
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()
	runtime, err := commercial.Build(ctx, config, approval)
	if err != nil {
		log.Fatal(err.Error())
	}
	defer runtime.Service.Close()
	if *check {
		if runtime.Service.Ready(ctx) != nil || runtime.Identity.Ready(ctx) != nil {
			log.Fatal("PAYMENT_NOT_READY")
		}
		log.Print("payment ready")
		return
	}
	private, public := runtime.Servers()
	fail := make(chan error, 2)
	go func() { fail <- private.ListenAndServeTLS("", "") }()
	go func() { fail <- public.ListenAndServeTLS("", "") }()
	if config.WorkerEnabled {
		go runtime.Service.RunWorker(ctx, payment.DefaultWorkerPolicy())
	}
	select {
	case <-ctx.Done():
	case err := <-fail:
		if err != http.ErrServerClosed {
			log.Print("PAYMENT_LISTENER_FAILED")
		}
		stop()
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = private.Shutdown(shutdown)
	_ = public.Shutdown(shutdown)
}
func bytesTrim(b []byte) []byte {
	for len(b) > 0 && (b[len(b)-1] == '\n' || b[len(b)-1] == '\r') {
		b = b[:len(b)-1]
	}
	return b
}
