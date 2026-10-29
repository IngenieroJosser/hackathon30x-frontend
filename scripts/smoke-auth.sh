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
set -euo pipefail
: "${FINVIGIA_ADMIN_EMAIL:?Set FINVIGIA_ADMIN_EMAIL locally}"
: "${FINVIGIA_ADMIN_PASSWORD:?Set FINVIGIA_ADMIN_PASSWORD locally}"
: "${FINVIGIA_APPROVER_EMAIL:?Set FINVIGIA_APPROVER_EMAIL locally}"
: "${FINVIGIA_APPROVER_PASSWORD:?Set FINVIGIA_APPROVER_PASSWORD locally}"
: "${FINVIGIA_AUDITOR_EMAIL:?Set FINVIGIA_AUDITOR_EMAIL locally}"
: "${FINVIGIA_AUDITOR_PASSWORD:?Set FINVIGIA_AUDITOR_PASSWORD locally}"
BASE="${FINVIGIA_API_URL:-http://localhost:3000}"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
chmod 700 "$WORK"
make_payload(){ ROLE="$1" python3 - "$WORK/$1.json" <<'PYLOGIN'
import os,json,sys
role=os.environ['ROLE']
with open(sys.argv[1],'w') as f: json.dump({'email':os.environ[f'FINVIGIA_{role}_EMAIL'],'password':os.environ[f'FINVIGIA_{role}_PASSWORD']},f)
PYLOGIN
chmod 600 "$WORK/$1.json"
}
login(){ local role="$1"; make_payload "$role"; local code
 code="$(curl -sS -c "$WORK/$role.cookies" -o "$WORK/$role.login" -w '%{http_code}' "$BASE/api/auth/session" -H "Origin: $BASE" -H 'Content-Type: application/json' --data-binary "@$WORK/$role.json")"
 [[ "$code" == '200' ]] || { echo "Login $role HTTP $code"; cat "$WORK/$role.login"; exit 1; }
 echo "  $role: sesión válida"
}
assert_http(){ local expected="$1"; shift; local status
 status="$(curl -sS -o /dev/null -w '%{http_code}' "$@")"
 [[ "$status" == "$expected" ]] || { echo "FALLO: esperado $expected, recibido $status"; exit 1; }
 echo "  ✓ HTTP $expected"
}
for role in ADMIN APPROVER AUDITOR; do login "$role"; done
POLICY='{"action":"publish_policy","payload":{"autonomousLimit":1000,"hardLimit":5000,"monthlyBudget":10000,"expectedVersion":1}}'
APPROVAL='{"action":"APPROVED","justification":"Aprobación de prueba no válida"}'
echo 'Una llamada sin sesión no puede publicar políticas:'
assert_http 401 "$BASE/api/workspace/actions" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "$POLICY"
echo 'APPROVER no puede publicar políticas:'
assert_http 403 "$BASE/api/workspace/actions" -b "$WORK/APPROVER.cookies" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "$POLICY"
echo 'AUDITOR no puede publicar políticas:'
assert_http 403 "$BASE/api/workspace/actions" -b "$WORK/AUDITOR.cookies" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "$POLICY"
echo 'ADMIN no puede aprobar facturas:'
assert_http 403 "$BASE/api/approvals/00000000-0000-0000-0000-000000000000/resolve" -b "$WORK/ADMIN.cookies" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "$APPROVAL"
echo 'AUDITOR no puede aprobar facturas:'
assert_http 403 "$BASE/api/approvals/00000000-0000-0000-0000-000000000000/resolve" -b "$WORK/AUDITOR.cookies" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "$APPROVAL"
echo 'APPROVER no puede importar documentos:'
assert_http 403 "$BASE/api/invoices/intake" -b "$WORK/APPROVER.cookies" -H "Origin: $BASE" -d 'text=Factura ficticia'
echo 'Una petición de otro origen no puede escribir:'
assert_http 403 "$BASE/api/workspace/actions" -b "$WORK/ADMIN.cookies" -H 'Origin: https://host-no-permitido.invalid' -H 'Content-Type: application/json' -d "$POLICY"
echo 'AUDITOR sí puede leer el workspace:'
assert_http 200 "$BASE/api/workspace" -b "$WORK/AUDITOR.cookies"
echo '✅ Matriz RBAC validada sin realizar pagos ni modificar políticas.'
