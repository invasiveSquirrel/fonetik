#!/bin/bash
# Fonetik Launcher
DIR="/home/chris/fonetik"
cd "$DIR"

# Load environment if needed (e.g. for Google Credentials)
if [ -f "/home/chris/wordhord/wordhord_api.txt" ]; then
    export GOOGLE_API_KEY=$(cat "/home/chris/wordhord/wordhord_api.txt")
fi

if [ -f "/home/chris/panglossia/google-credentials.json" ]; then
    export GOOGLE_APPLICATION_CREDENTIALS="/home/chris/panglossia/google-credentials.json"
fi

# Run in development mode for now (or 'npm run build' then 'electron .')
# Using DRI_PRIME=0 to ensure it uses the Intel iGPU for the UI
DRI_PRIME=0 npm run dev > /tmp/fonetik.log 2>&1
