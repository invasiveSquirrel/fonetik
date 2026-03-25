#!/bin/bash
DIR="/home/chris/fonetik"
cd "$DIR"

# Load NVM if available (using common paths)
export NVM_DIR="/home/chris/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Kill existing
fuser -k 5175/tcp 8004/tcp >/dev/null 2>&1

# Start Sidecar API
nohup npx tsx sidecar_server.ts > sidecar.log 2>&1 &

# Start Vite Frontend
nohup npm run dev -- --port 5175 --host 127.0.0.1 > vite.log 2>&1 &

echo "Fonetik headless services started"
