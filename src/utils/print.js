/**
 * Imprime solo el HTML dado usando un iframe silencioso.
 * No depende de mostrarToast ni de cerrarModal.
 */
export function imprimirDocumento(html) {
  let printRoot = document.getElementById('print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    document.body.appendChild(printRoot);
  }
  printRoot.innerHTML = html;

  Array.from(document.body.children).forEach(el => {
    if (el.id !== 'print-root') el.classList.add('hide-for-print');
  });

  window.print();

  document.querySelectorAll('.hide-for-print').forEach(el => {
    el.classList.remove('hide-for-print');
  });
  printRoot.remove();
}

/**
 * Abre un reporte A4 en nueva ventana y lanza el diálogo de impresión.
 */
export function imprimirReporteA4(html) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Activa las ventanas emergentes para imprimir');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <style>
      @page { size: A4; margin: 10mm 12mm; }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 350);
}

