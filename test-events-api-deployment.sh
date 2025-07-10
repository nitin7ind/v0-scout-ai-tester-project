#!/bin/bash

# Test script to verify the Events API route is working properly

echo "🧪 Testing Events API Route..."

# Build the project first
echo "📦 Building project..."
npm run build

# Start the server in background
echo "🚀 Starting server..."
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 10

# Test the validation endpoint
echo "🔍 Testing validation endpoint..."
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"action": "validate", "apiKey": "'"$WOBOT_API_KEY"'", "environment": "production"}' \
  -s -o /dev/null -w "HTTP Status: %{http_code}\n"

# Clean up
echo "🧹 Cleaning up..."
kill $SERVER_PID

echo "✅ Test completed!"
