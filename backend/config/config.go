package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	FrontendURL string
	AWSAccessKey string
	AWSSecretKey string
	AWSRegion    string
	AWSS3Bucket  string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("no .env file found, reading from environment")
		}
	}

	return &Config{
		DatabaseURL:  requireEnv("DATABASE_URL"),
		JWTSecret:    requireEnv("JWT_SECRET"),
		Port:         getEnv("PORT", "8080"),
		FrontendURL:  getEnv("FRONTEND_URL", "http://localhost:3000"),
		AWSAccessKey: getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		AWSRegion:    getEnv("AWS_REGION", ""),
		AWSS3Bucket:  getEnv("AWS_S3_BUCKET", ""),
	}
}

func requireEnv(key string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	log.Fatalf("%s is required", key)
	return ""
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
