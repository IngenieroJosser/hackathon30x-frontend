import 'server-only';
import type { NextRequest } from 'next/server';
import { WorkflowError } from '@/server/workflows/common';

/** Impone límite por bytes realmente recibidos, no sólo Content-Length (falsificable). */
export async function readJsonBounded(request: NextRequest, maxBytes = 10_000): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!/^application\/json(?:\s*;|\s*$)/.test(contentType))
    throw new WorkflowError('Se requiere Content-Type: application/json.', 415);
  const advertised = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(advertised) || advertised > maxBytes)
    throw new WorkflowError('El cuerpo JSON supera el límite permitido.', 413);
  if (!request.body) throw new WorkflowError('Cuerpo JSON obligatorio.', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const {value, done} = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new WorkflowError('El cuerpo JSON supera el límite permitido.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(all)); }
  catch { throw new WorkflowError('JSON inválido.', 400); }
}
