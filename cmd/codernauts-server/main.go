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
	"syscall"
	"time"

	"github.com/stirby/codernauts/internal/game"
	"github.com/stirby/codernauts/internal/server"
)

func main() {
	addr := flag.String("addr", listenAddrFromEnv(), "HTTP listen address")
	openAPIPath := flag.String("openapi", envOrDefault("CODERNAUTS_OPENAPI", "openapi/codernauts.yaml"), "OpenAPI document path")
	flag.Parse()

	resolvedOpenAPIPath := *openAPIPath
	if _, err := os.Stat(resolvedOpenAPIPath); err != nil && !filepath.IsAbs(resolvedOpenAPIPath) {
		if exe, exeErr := os.Executable(); exeErr == nil {
			candidate := filepath.Join(filepath.Dir(exe), resolvedOpenAPIPath)
			if _, statErr := os.Stat(candidate); statErr == nil {
				resolvedOpenAPIPath = candidate
			}
		}
	}

	store := game.NewStore(game.RealClock{})
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

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
