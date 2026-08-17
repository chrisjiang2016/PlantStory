#!/bin/bash
set -e

echo "Installing Flutter..."
git clone https://github.com/flutter/flutter.git -b stable --depth 1
export PATH="$PATH:`pwd`/flutter/bin"

echo "Flutter version:"
flutter --version

echo "Building Flutter Web..."
cd client
flutter pub get
flutter build web --release --web-renderer canvaskit
