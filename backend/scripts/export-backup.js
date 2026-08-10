const fs = require('fs');
const path = require('path');
require('dotenv').config();

const raiz = path.join(__dirname, '..');
const dbPath = path.resolve(raiz, process.env.DB_PATH || './database/soporte.db');
const uploadsDir = path.join(raiz, 'uploads');
const backupsDir = path.join(raiz, 'backups');

function selloTiempo() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
}

function copiarDirectorio(origen, destino) {
  if (!fs.existsSync(origen)) return 0;
  fs.mkdirSync(destino, { recursive: true });
  let total = 0;

  for (const entrada of fs.readdirSync(origen, { withFileTypes: true })) {
    const origenPath = path.join(origen, entrada.name);
    const destinoPath = path.join(destino, entrada.name);
    if (entrada.isDirectory()) {
      total += copiarDirectorio(origenPath, destinoPath);
    } else {
      fs.copyFileSync(origenPath, destinoPath);
      total += 1;
    }
  }

  return total;
}

fs.mkdirSync(backupsDir, { recursive: true });
const carpeta = path.join(backupsDir, `backup-${selloTiempo()}`);
fs.mkdirSync(carpeta, { recursive: true });

const destinoDb = path.join(carpeta, path.basename(dbPath));
if (!fs.existsSync(dbPath)) {
  throw new Error(`No se encontro la base de datos en ${dbPath}`);
}

fs.copyFileSync(dbPath, destinoDb);
const totalUploads = copiarDirectorio(uploadsDir, path.join(carpeta, 'uploads'));

const manifest = {
  creado_en: new Date().toISOString(),
  base_datos: path.basename(destinoDb),
  uploads_copiados: totalUploads
};
fs.writeFileSync(path.join(carpeta, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`Respaldo generado en: ${carpeta}`);
console.log(`Base de datos: ${destinoDb}`);
console.log(`Archivos de upload copiados: ${totalUploads}`);
