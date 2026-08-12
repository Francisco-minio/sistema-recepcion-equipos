function normalizarFila(linea) {
  return linea.replace(/\r$/, '');
}

function detectarSeparador(linea) {
  const coma = (linea.match(/,/g) || []).length;
  const puntoComa = (linea.match(/;/g) || []).length;
  return puntoComa > coma ? ';' : ',';
}

function parseLinea(linea, separador) {
  const valores = [];
  let actual = '';
  let enComillas = false;

  for (let i = 0; i < linea.length; i += 1) {
    const char = linea[i];
    const siguiente = linea[i + 1];

    if (char === '"') {
      if (enComillas && siguiente === '"') {
        actual += '"';
        i += 1;
      } else {
        enComillas = !enComillas;
      }
      continue;
    }

    if (char === separador && !enComillas) {
      valores.push(actual.trim());
      actual = '';
      continue;
    }

    actual += char;
  }

  valores.push(actual.trim());
  return valores;
}

function limpiarValor(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim().replace(/^\uFEFF/, '');
}

function parseDelimitedText(texto) {
  const lineas = String(texto || '')
    .split('\n')
    .map(normalizarFila)
    .filter((linea) => linea.trim());

  if (!lineas.length) {
    return { headers: [], rows: [] };
  }

  const separador = detectarSeparador(lineas[0]);
  const headers = parseLinea(lineas[0], separador).map((header) => limpiarValor(header).toLowerCase());
  const rows = lineas.slice(1).map((linea, index) => {
    const valores = parseLinea(linea, separador);
    const fila = {};
    headers.forEach((header, idx) => {
      fila[header] = limpiarValor(valores[idx] || '');
    });
    fila.__linea = index + 2;
    return fila;
  });

  return { headers, rows };
}

module.exports = { parseDelimitedText };
