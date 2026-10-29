#!/usr/bin/env bash
set -euo pipefail
: "${BLINKA_ADMIN_EMAIL:?Define BLINKA_ADMIN_EMAIL}"
: "${BLINKA_ADMIN_PASSWORD:?Define BLINKA_ADMIN_PASSWORD}"
API_URL="${BLINKA_API_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"; trap 'rm -f "$COOKIE_JAR"' EXIT
LOGIN_PAYLOAD="$(mktemp)"; trap 'rm -f "$COOKIE_JAR" "$LOGIN_PAYLOAD"' EXIT
python3 - "$LOGIN_PAYLOAD" <<'PYLOGIN'
import os,sys,json
with open(sys.argv[1],'w') as f: json.dump({'email':os.environ['BLINKA_ADMIN_EMAIL'],'password':os.environ['BLINKA_ADMIN_PASSWORD']},f)
PYLOGIN
chmod 600 "$LOGIN_PAYLOAD"
curl --fail-with-body -sS -c "$COOKIE_JAR" -o /dev/null "$API_URL/api/auth/session" -H "Origin: $API_URL" -H 'Content-Type: application/json' --data-binary "@$LOGIN_PAYLOAD"

echo '1) Guardando una factura sintética en Neon...'
curl --fail-with-body --silent --show-error \
  -X POST "${API_URL}/api/invoices" \
  -b "$COOKIE_JAR" -H "Origin: $API_URL" -H 'Content-Type: application/json' \
  --data '{"sandbox":true,"externalNumber":"NX-2026-001","vendorName":"Nexa Software","amount":"620.00","currency":"USD","issueDate":"2026-10-14","dueDate":"2026-10-28","description":"Desarrollo y mantenimiento (sandbox)","source":"PDF","idempotencyKey":"smoke-neon-nexa-2026-001"}' | python3 -m json.tool

echo ''
echo '2) Recuperando desde PostgreSQL sin localStorage...'
curl --fail-with-body --silent --show-error "${API_URL}/api/invoices" -b "$COOKIE_JAR" -H "Origin: $API_URL" | python3 -m json.tool
