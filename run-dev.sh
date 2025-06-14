#!/bin/bash

# Script to start the development servers for both client and server

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to clean up background processes on exit
cleanup() {
    echo "Stopping development servers..."
    # Kill all processes in the current process group
    kill 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to run the cleanup function
trap cleanup SIGINT SIGTERM

# Start the Python FastAPI server
echo "Starting Python FastAPI server..."
(
    cd server
    # Activate virtual environment if it exists and is not already active
    if [ -d "venv" ] && [ -z "$VIRTUAL_ENV" ]; then
        echo "Activating Python virtual environment..."
        source venv/bin/activate  # For Linux/macOS
        # For Windows Git Bash, it might be venv/Scripts/activate
    elif [ -d ".venv" ] && [ -z "$VIRTUAL_ENV" ]; then
        echo "Activating Python virtual environment..."
        source .venv/bin/activate # For Linux/macOS
    fi
    uvicorn main:app --reload --port 8000
) &
SERVER_PID=$!
echo "FastAPI server started with PID $SERVER_PID"

# Start the Next.js client
echo "Starting Next.js client development server..."
(
    cd client
    npm run dev
) &
CLIENT_PID=$!
echo "Next.js client started with PID $CLIENT_PID"

# Wait for both background processes to complete
# This allows the script to be interrupted and cleanup to run
wait $SERVER_PID
wait $CLIENT_PID

echo "Development servers have been stopped."
