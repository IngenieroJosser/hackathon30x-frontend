#!/usr/bin/env bash
# Old environment keys are read only for backwards compatibility.
for role in ADMIN APPROVER AUDITOR; do
  for field in EMAIL PASSWORD; do
    new="FINVIGIA_${role}_${field}"
    old="BLINKA_${role}_${field}"
    if [ -z "${!new:-}" ] && [ -n "${!old:-}" ]; then export "$new=${!old}"; fi
  done
done
export FINVIGIA_API_URL="${FINVIGIA_API_URL:-${BLINKA_API_URL:-http://localhost:3000}}"
# Run locally with set -a; source .env; set +a, and yarn dev in another terminal.
set -euo pipefail
: "${FINVIGIA_ADMIN_EMAIL:?Define FINVIGIA_ADMIN_EMAIL}"
: "${FINVIGIA_ADMIN_PASSWORD:?Define FINVIGIA_ADMIN_PASSWORD}"
BASE="${FINVIGIA_API_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"; trap 'rm -f "$COOKIE_JAR"' EXIT
LOGIN_PAYLOAD="$(mktemp)"; trap 'rm -f "$COOKIE_JAR" "$LOGIN_PAYLOAD"' EXIT
python3 - "$LOGIN_PAYLOAD" <<'PYLOGIN'
import os,sys,json
with open(sys.argv[1],'w') as f: json.dump({'email':os.environ['FINVIGIA_ADMIN_EMAIL'],'password':os.environ['FINVIGIA_ADMIN_PASSWORD']},f)
PYLOGIN
chmod 600 "$LOGIN_PAYLOAD"
curl --fail-with-body -sS -c "$COOKIE_JAR" -o /dev/null "$BASE/api/auth/session" -H "Origin: $BASE" -H 'Content-Type: application/json' --data-binary "@$LOGIN_PAYLOAD"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; rm -f "$COOKIE_JAR" "$LOGIN_PAYLOAD"' EXIT
NUMBER="E2E-$(date +%s)"
echo "1 / Registrar factura sintética única: $NUMBER"
curl --fail-with-body -sS "$BASE/api/invoices" -b "$COOKIE_JAR" -H "Origin: $BASE" -H 'Content-Type: application/json' \
  --data "{\"sandbox\":true,\"externalNumber\":\"$NUMBER\",\"vendorName\":\"Nexa Software\",\"amount\":\"620.00\",\"currency\":\"USD\",\"issueDate\":\"2026-10-14\",\"dueDate\":\"2026-10-28\",\"source\":\"TEXT\",\"description\":\"Factura sintética E2E\"}" > "$TMP/create.json"
ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["invoice"]["id"])' "$TMP/create.json")"
echo "   UUID: $ID"
echo '2 / Confirmar campos mediante API'
curl --fail-with-body -sS "$BASE/api/invoices/$ID/verify" -X POST -b "$COOKIE_JAR" -H "Origin: $BASE" -H 'Content-Type: application/json' \
  --data "{\"number\":\"$NUMBER\",\"vendor\":\"Nexa Software\",\"amount\":\"620.00\",\"currency\":\"USD\",\"issueDate\":\"2026-10-14\",\"dueDate\":\"2026-10-28\"}" > "$TMP/verify.json"
echo '3 / Evaluar contra política y presupuesto de Neon'
curl --fail-with-body -sS "$BASE/api/invoices/$ID/evaluate" -X POST -b "$COOKIE_JAR" -H "Origin: $BASE" -H 'Content-Type: application/json' --data '{}' > "$TMP/eval.json"
python3 -c 'import json,sys; a=json.load(open(sys.argv[1])); print("   Resultado:",a["result"]["outcome"], "·", a["result"]["ruleCode"])' "$TMP/eval.json"
echo '4 / Reconstruir expediente persistente, decisiones y eventos'
curl --fail-with-body -sS "$BASE/api/invoices/$ID" -b "$COOKIE_JAR" -H "Origin: $BASE" > "$TMP/detail.json"
python3 -c 'import json,sys; a=json.load(open(sys.argv[1]))["invoice"]; print("   Expediente:",a["externalNumber"], "·",a["status"], "\n   Decisiones:",len(a["decisions"]), "\n   Auditorías:",len(a["auditEvents"]))' "$TMP/detail.json"
echo '5 / Verificar workspace único'
curl --fail-with-body -sS "$BASE/api/workspace" -b "$COOKIE_JAR" -H "Origin: $BASE" > "$TMP/workspace.json"
python3 -c 'import json,sys; a=json.load(open(sys.argv[1])); print("   Fuente:",a["source"], "· Facturas:",len(a["invoices"]), "· Beneficiarios:",len(a["vendors"]), "· Eventos:",len(a["audit"]))' "$TMP/workspace.json"
echo 'Hecho. No se movió dinero ni se publicaron datos reales.'
