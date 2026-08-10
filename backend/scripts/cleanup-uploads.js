const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const aplicar = process.argv.includes('--apply');
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  console.log('No existe carpeta de uploads. Nada que limpiar.');
  process.exit(0);
}

const referencias = new Set(
  db.prepare('SELECT ruta_archivo FROM orden_fotos WHERE ruta_archivo IS NOT NULL').all().map((fila) => fila.ruta_archivo)
);

const huerfanos = fs.readdirSync(uploadsDir).filter((archivo) => !referencias.has(archivo));

if (!huerfanos.length) {
  console.log('No se encontraron uploads huerfanos.');
  process.exit(0);
}

console.log(`Uploads huerfanos encontrados: ${huerfanos.length}`);
huerfanos.forEach((archivo) => console.log(` - ${archivo}`));

if (!aplicar) {
  console.log('');
  console.log('Modo simulacion activo. Usa --apply para eliminar los archivos.');
  process.exit(0);
}

huerfanos.forEach((archivo) => {
  fs.unlinkSync(path.join(uploadsDir, archivo));
});

console.log('Archivos huerfanos eliminados correctamente.');
