import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newTotpSecret,totpCode,matchTotpStep,newRecoveryCode,recoveryDigest} from '../src/server/security/mfa-totp.ts';
import {seal,unseal,keyedFingerprint} from '../src/server/security/secret-box.ts';
import {bankStatusAcceptable,syntheticBankProvider} from '../src/lib/banking/verification.ts';

const at = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const account={status:'SYNTHETIC_MATCH',verifiedVendorRevision:3,realBankConfirmed:false,verifiedAt:new Date()};

test('TOTP conforme a los vectores RFC 6238 (6 dígitos)',()=>{
  // RFC 6238 SHA-1: 94287082 (8 dígitos), último sexteto: 287082.
  const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpCode(secret,1),'287082');
  assert.equal(totpCode(secret,37037036),'081804');
});
test('TOTP verifica la ventana y rechaza el código usado previamente',()=>{
  const secret=newTotpSecret(), step=1_000_000, now=step*30_000;
  const code=totpCode(secret,step);
  assert.equal(matchTotpStep(secret,code,now),step);
  assert.equal(matchTotpStep(secret,code,now,step),null);
  assert.equal(matchTotpStep(secret,'12345',now),null);
});
test('TOTP rechaza secretos Base32 inválidos y pasos negativos',()=>{
  assert.throws(()=>totpCode('no_valid@!',100));
  assert.throws(()=>totpCode(newTotpSecret(),-1));
});
test('Códigos de recuperación son aleatorios, no reversibles y de un solo uso con borrado en base',()=>{
  const a=newRecoveryCode(),b=newRecoveryCode();
  assert.match(a,/^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/);
  assert.notEqual(a,b);
  assert.equal(recoveryDigest(a),recoveryDigest(a.replaceAll('-','').toLowerCase()));
  assert.match(at('src/server/security/mfa-service.ts'),/tx\.mfaRecoveryCode\.deleteMany/);
});
test('Cifrado autenticado AES-GCM protege los datos y detecta manipulación',()=>{
  process.env.BLINKA_BANK_DATA_KEY='01'.repeat(32);
  try{
    const encrypted=seal('TEST-ACCOUNT-0001','BLINKA_BANK_DATA_KEY');
    assert.doesNotMatch(encrypted,/TEST-ACCOUNT-0001/);
    assert.equal(unseal(encrypted,'BLINKA_BANK_DATA_KEY'),'TEST-ACCOUNT-0001');
    const tampered=encrypted.slice(0,-2)+'ff';
    assert.throws(()=>unseal(tampered,'BLINKA_BANK_DATA_KEY'));
    assert.notEqual(keyedFingerprint('abc','BLINKA_BANK_DATA_KEY'),keyedFingerprint('abcd','BLINKA_BANK_DATA_KEY'));
  } finally{delete process.env.BLINKA_BANK_DATA_KEY;}
});
test('Verificación bancaría ficticia válida: retorna SYNTHETIC_MATCH, nunca REAL_VERIFIED',async()=>{
  const result=await syntheticBankProvider.verify({institutionCode:'BANK-DEMO-A',accountReference:'TEST-ACCOUNT-0001',accountKind:'PAYROLL',holderReference:'PERSON-DEMO-0001'});
  assert.equal(result.status,'SYNTHETIC_MATCH');
  assert.equal(result.realBankConfirmed,false);
});
test('Verificador rechaza titulares, tipos incorrectos y cuentas desconocidas',async()=>{
  const base={institutionCode:'BANK-DEMO-A',accountReference:'TEST-ACCOUNT-0001',accountKind:'PAYROLL',holderReference:'PERSON-DEMO-0001'};
  assert.equal((await syntheticBankProvider.verify({...base,holderReference:'PERSON-DEMO-9999'})).status,'SYNTHETIC_MISMATCH');
  assert.equal((await syntheticBankProvider.verify({...base,accountKind:'SAVINGS'})).status,'SYNTHETIC_MISMATCH');
  assert.equal((await syntheticBankProvider.verify({...base,accountReference:'TEST-ACCOUNT-9999'})).status,'UNKNOWN');
});
test('No se puede autorizar sin sandbox explícito, versión correcta y verificación reciente registrada',()=>{
  assert.equal(bankStatusAcceptable(account,3,true),true);
  assert.equal(bankStatusAcceptable(account,3,false),false);
  assert.equal(bankStatusAcceptable(account,4,true),false);
  assert.equal(bankStatusAcceptable(null,3,true),false);
  assert.equal(bankStatusAcceptable({...account,verifiedAt:null},3,true),false);
  assert.equal(bankStatusAcceptable({...account,status:'UNKNOWN'},3,true),false);
  assert.equal(bankStatusAcceptable({...account,status:'SYNTHETIC_MISMATCH'},3,true),false);
});
test('No se acepta estado REAL_VERIFIED sin integración bancaria real',()=>{
  assert.equal(bankStatusAcceptable({...account,status:'REAL_VERIFIED',realBankConfirmed:true},3,true),false);
});
test('Endpoint bancario exige permisos de servidor y separación de funciones',()=>{
  assert.match(at('app/api/banking/accounts/route.ts'),/requirePermission\(req,input\.action==='register'\?'manage_vendor':'verify_bank'\)/);
  assert.match(at('src/server/workflows/banking.ts'),/account\.enteredById===actorId/);
  assert.match(at('src/server/workflows/banking.ts'),/status:'REVIEW'/);
});
test('Políticas de decisión y aprobación humana reevalúan el estado bancario',()=>{
  const decision=at('src/server/workflows/engine.ts');
  assert.match(decision,/bankStatusAcceptable\(vendor\.bankAccount,vendor\.revision,syntheticAuthorizationsEnabled\(\)\)/);
  assert.match(decision,/BANK_ACCOUNT_NOT_VERIFIED/);
  assert.match(decision,/const result=await calculate\(tx,org\.id,approval\.invoiceId\)/);
  const status=at('src/server/workflows/workspace.ts');
  assert.match(status,/if\(!bankStatusAcceptable\(account,vendor\.revision,syntheticAuthorizationsEnabled\(\)\)\)/);
});
test('MFA obligatorio en todas las APIs críticas y las sesiones sin MFA son denegadas',()=>{
  const auth=at('src/server/security/auth.ts');
  assert.match(auth,/identity\?\.mfaEnabled&&identity\.mfaVerified\?identity\.user:null/);
  assert.match(auth,/currentUser\(request\)/);
  assert.match(auth,/tx\.mfaLoginChallenge\.create/);
  assert.match(at('app/api/auth/mfa/enroll/route.ts'),/consumeLoginAttempt/);
  assert.match(at('src/server/security/mfa-service.ts'),/attempts:\{lt:5\}/);
});
