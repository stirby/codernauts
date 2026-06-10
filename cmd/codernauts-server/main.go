package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/stirby/codernauts/internal/game"
	"github.com/stirby/codernauts/internal/server"
)

func main() {
	addr := flag.String("addr", listenAddrFromEnv(), "HTTP listen address")
	openAPIPath := flag.String("openapi", envOrDefault("CODERNAUTS_OPENAPI", "openapi/codernauts.yaml"), "OpenAPI document path")
	timeScale := flag.Float64("time-scale", timeScaleFromEnv(), "game clock speed multiplier, such as 2, 5, or 10")
	flag.Parse()

	if *timeScale <= 0 {
		log.Fatalf("time-scale must be positive, got %v", *timeScale)
	}

	resolvedOpenAPIPath := *openAPIPath
	if _, err := os.Stat(resolvedOpenAPIPath); err != nil && !filepath.IsAbs(resolvedOpenAPIPath) {
		if exe, exeErr := os.Executable(); exeErr == nil {
			candidate := filepath.Join(filepath.Dir(exe), resolvedOpenAPIPath)
			if _, statErr := os.Stat(candidate); statErr == nil {
				resolvedOpenAPIPath = candidate
			}
		}
	}

	var clock game.Clock = game.RealClock{}
	if *timeScale != 1 {
		clock = game.NewScaledClock(*timeScale)
		log.Printf("game clock running at %gx speed", *timeScale)
	}
	store := game.NewStore(clock)
	store.SetAuthToken(envOrDefault("CODERNAUTS_DEV_TOKEN", game.DevToken))
	handler := server.New(store, resolvedOpenAPIPath).Handler()
	httpServer := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("codernauts server listening on %s", *addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server shutdown failed: %v", err)
	}
}

func listenAddrFromEnv() string {
	if addr := os.Getenv("CODERNAUTS_ADDR"); addr != "" {
		return addr
	}
	if port := os.Getenv("PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}

func timeScaleFromEnv() float64 {
	value := os.Getenv("CODERNAUTS_TIME_SCALE")
	if value == "" {
		return 1
	}
	scale, err := strconv.ParseFloat(value, 64)
	if err != nil || scale <= 0 {
		log.Fatalf("CODERNAUTS_TIME_SCALE must be a positive number, got %q", value)
	}
	return scale
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
