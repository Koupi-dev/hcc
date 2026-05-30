#!/bin/bash

# start.sh - Launch both backend and frontend servers for JaruCat

echo "🚀 Starting JaruCat Application..."

# Automatically kill any stale processes using ports 3001 and 5173 to prevent EADDRINUSE errors
PORT_3001_PID=$(lsof -t -i:3001 2>/dev/null)
PORT_5173_PID=$(lsof -t -i:5173 2>/dev/null)

if [ ! -z "$PORT_3001_PID" ]; then
    echo "⚠️ Port 3001 is already in use. Cleaning up stale process ($PORT_3001_PID)..."
    kill -9 $PORT_3001_PID 2>/dev/null
fi

if [ ! -z "$PORT_5173_PID" ]; then
    echo "⚠️ Port 5173 is already in use. Cleaning up stale process ($PORT_5173_PID)..."
    kill -9 $PORT_5173_PID 2>/dev/null
fi

# Function to clean up both background processes upon termination
cleanup() {
    echo "Stopping servers..."
    kill "$SERVER_PID" "$FRONTEND_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

# 1. Start SQLite Backend
echo "Starting backend server (port 3001)..."
cd server
npm start &
SERVER_PID=$!
cd ..

# 2. Start Frontend
echo "Starting frontend dev server (http://localhost:5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Both servers are starting. Press Ctrl+C to stop both."
wait
