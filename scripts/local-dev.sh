#!/bin/bash

# Trap SIGINT to kill background processes on exit
trap 'kill 0' SIGINT

echo "🦁 Starting LionHeart Local Environment..."

# Check if .env exists for agent
if [ ! -f agent/.env ]; then
  echo "⚠️  agent/.env not found! Copying from example..."
  cp .env.example agent/.env
fi

# Check if .env.local exists for web
if [ ! -f web/.env.local ]; then
  echo "⚠️  web/.env.local not found! Creating default..."
  echo "NEXT_PUBLIC_GATEWAY_URL=http://localhost:18789" > web/.env.local
  echo "NEXT_PUBLIC_OPENCLAW_GATEWAY_URL=ws://localhost:18789" >> web/.env.local
fi

echo "🚀 Starting Agent (Port 18789)..."
cd agent && npm run dev &

echo "🌐 Starting Web (Port 3000)..."
cd web && npm run dev &

# Wait for both processes
wait
