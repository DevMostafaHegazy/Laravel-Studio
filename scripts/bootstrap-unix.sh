#!/usr/bin/env bash
set -euo pipefail

# Laravel Studio development bootstrap for Linux and macOS.
# This script itself is not a native installer; it prepares the source tree and
# starts the app. Use `npm run package:linux` / `npm run package:mac` to create
# native distributables on the matching operating system.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Missing required command: $1" >&2
        exit 1
    fi
}

need node
need npm
need php
need composer

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 24 ]; then
    echo "Laravel Studio requires Node.js 24 (found $(node --version))." >&2
    exit 1
fi

if ! php -r 'exit(version_compare(PHP_VERSION, "8.2.0", ">=") ? 0 : 1);'; then
    echo "Laravel Studio requires PHP 8.2 or newer." >&2
    exit 1
fi

echo "Installing Node dependencies…"
npm ci

echo "Fetching bundled VS Code extensions…"
npm run plugins

if [ "${1:-}" = "--package" ]; then
    case "$(uname -s)" in
        Darwin) npm run package:mac ;;
        Linux)  npm run package:linux ;;
        *)      echo "Use npm run package:* for this platform."; exit 1 ;;
    esac
    echo "Installers are in electron-app/dist/."
else
    echo "Starting Laravel Studio…"
    npm start
fi
