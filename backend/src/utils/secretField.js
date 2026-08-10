const crypto = require('crypto');

function obtenerClave() {
  const base = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'backupcode-dev-key';
  return crypto.createHash('sha256').update(String(base)).digest();
}

function cifrarTexto(valor) {
  if (!valor) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', obtenerClave(), iv);
  const contenido = Buffer.concat([cipher.update(String(valor), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:v1:${Buffer.concat([iv, authTag, contenido]).toString('base64')}`;
}

function esTextoCifrado(valor) {
  return typeof valor === 'string' && valor.startsWith('enc:v1:');
}

function descifrarTexto(valor) {
  if (!valor) return null;
  if (!esTextoCifrado(valor)) return valor;

  const payload = Buffer.from(valor.slice(7), 'base64');
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const contenido = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', obtenerClave(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(contenido), decipher.final()]).toString('utf8');
}

module.exports = { cifrarTexto, descifrarTexto, esTextoCifrado };
