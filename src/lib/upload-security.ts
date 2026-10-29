/** Verificación determinista de cabeceras. No sustituye un antivirus ni un parser seguro. */
export const MAX_SECURE_FILE_BYTES = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function checkDocumentSignature(
  file: { name: string; type: string; size: number },
  bytes: Uint8Array,
): string | null {
  const mime = file.type.toLowerCase();
  const extension = extensions[mime];
  if (!extension) return 'Tipo de archivo no permitido.';
  if (file.size !== bytes.byteLength || bytes.byteLength < 1 || bytes.byteLength > MAX_SECURE_FILE_BYTES)
    return 'Tamaño de archivo inválido o inconsistente.';
  if (file.name.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(file.name))
    return 'Nombre de archivo inválido.';
  const name = file.name.toLowerCase();
  const validName = mime === 'image/jpeg' ? /\.jpe?g$/.test(name) : name.endsWith(extension);
  if (!validName) return 'La extensión no coincide con el tipo declarado.';
  const b = bytes;
  const begins = (...prefix: number[]) => b.length >= prefix.length && prefix.every((byte, index) => b[index] === byte);
  if (mime === 'application/pdf' && !begins(0x25,0x50,0x44,0x46,0x2d)) return 'El archivo no contiene una cabecera PDF válida.';
  if (mime === 'image/jpeg' && !begins(0xff,0xd8,0xff)) return 'El archivo no contiene una cabecera JPEG válida.';
  if (mime === 'image/png' && !begins(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)) return 'El archivo no contiene una cabecera PNG válida.';
  if (mime === 'image/webp' && !(begins(0x52,0x49,0x46,0x46) && b.length >= 12 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50))
    return 'El archivo no contiene una cabecera WEBP válida.';
  return null;
}
