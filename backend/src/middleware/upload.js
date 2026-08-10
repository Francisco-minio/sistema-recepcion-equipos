const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const carpetaUploads = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(carpetaUploads)) {
  fs.mkdirSync(carpetaUploads, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, carpetaUploads),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${extension}`);
  }
});

const TIPOS_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/heic',
  'image/heif'
];

function filtroArchivo(req, file, cb) {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imagenes JPG, PNG, WEBP, HEIC o HEIF.'));
  }
}

const upload = multer({
  storage,
  fileFilter: filtroArchivo,
  limits: { fileSize: 8 * 1024 * 1024 } // 8 MB por foto
});

module.exports = { upload, carpetaUploads };
