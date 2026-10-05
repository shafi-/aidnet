#!/usr/bin/env sh
# Pre-starts the static export server so Playwright's webServer (reuseExistingServer: true)
# reuses a stable, independently-managed `serve` instance. This avoids the flaky
# behavior where Playwright-managed `serve` dies under Chromium mobile emulation load,
# causing ERR_CONNECTION_REFUSED cascades ("did not run").
set -e

SERVE_PORT="${E2E_PORT:-3000}"
SERVE_LOG="${E2E_SERVE_LOG:-.temp/e2e-serve.log}"

# Start the static server in the background.
npx -y serve@latest out -l "$SERVE_PORT" > "$SERVE_LOG" 2>&1 &
SERVER_PID=$!

# Wait for the server to accept connections (max ~30s).
ready=0
for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$SERVE_PORT"; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "ERROR: static server did not start on port $SERVE_PORT (see $SERVE_LOG)" >&2
  kill "$SERVER_PID" 2>/dev/null || true
  exit 1
fi

# Run Playwright, forwarding any args (e.g. --project=...). Playwright reuses the
# already-running server via reuseExistingServer: true and will NOT start its own.
npx playwright test "$@"
TEST_EXIT=$?

# Tear down the server. $SERVER_PID is the `npx` wrapper; the actual `serve`
# node process is its child, so kill by port to catch the whole tree.
kill "$SERVER_PID" 2>/dev/null || true
if curl -s -o /dev/null "http://localhost:$SERVE_PORT"; then
  pkill -f "serve.*out -l $SERVE_PORT" 2>/dev/null || true
fi

exit "$TEST_EXIT"
