#!/bin/bash
# Fonetik Launcher (Production Mode)
DIR="/home/chris/fonetik"
cd "$DIR"

# Load Gemini API Key
if [ -f "/home/chris/wordhord/wordhord_api.txt" ]; then
    export GOOGLE_API_KEY=$(cat "/home/chris/wordhord/wordhord_api.txt")
fi

# Load Google Cloud Credentials
if [ -f "/home/chris/panglossia/google-credentials.json" ]; then
    export GOOGLE_APPLICATION_CREDENTIALS="/home/chris/panglossia/google-credentials.json"
fi

# Launch the production build
# Using DRI_PRIME=0 and no-sandbox for Linux stability
DRI_PRIME=0 npx electron . --no-sandbox --disable-gpu-sandbox --disable-software-rasterizer --disable-dev-shm-usage > /tmp/fonetik.log 2>&1
