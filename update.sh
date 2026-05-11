#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin main

echo "Building frontend..."
npm install
npm run build

echo "Restarting services..."
systemctl restart alphatrack-backend
systemctl restart alphatrack-frontend

echo "Update complete!"
