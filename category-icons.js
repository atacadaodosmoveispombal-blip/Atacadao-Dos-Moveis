/* Shared outline icon registry for storefront and admin. SVGs inherit the current text color. */
(() => {
  const shapes = {
    categoria: '<rect x="8" y="8" width="32" height="32" rx="3"/><path d="M8 19h32M19 19v21M25 13h9m-9 11h9m-9 7h9"/>',
    sala: '<rect x="8" y="18" width="32" height="21" rx="5"/><path d="M13 18v-6a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v6M8 30H5a3 3 0 0 1-3-3v-5a4 4 0 0 1 6 0M40 30h3a3 3 0 0 0 3-3v-5a4 4 0 0 0-6 0M10 39v4m28-4v4"/>',
    quarto: '<path d="M5 23V11a5 5 0 0 1 5-5h28a5 5 0 0 1 5 5v12M5 32h38v8H5zM5 40v4m38-4v4M10 22v-5a4 4 0 0 1 4-4h7a4 4 0 0 1 4 4v5m0 0v-5a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v5M5 23h38v9H5z"/>',
    escritorio: '<path d="M4 21h40v5H4zM7 26v17m34-17v17M25 18h14v15H25zM28 33v4m9-4v4M26 38h12m-6 0v5m-9 0h18"/>',
    cozinha: '<rect x="8" y="5" width="32" height="39" rx="2"/><path d="M8 15h32M14 23h20v15H14zM12 10h2m8 0h2m8 0h2M16 5V2m16 3V2"/>',
    infantil: '<path d="M9 17a15 15 0 0 1 30 0 15 15 0 0 1-30 0Z"/><circle cx="10" cy="8" r="5"/><circle cx="38" cy="8" r="5"/><path d="M14 29c-3 3-5 6-5 11m25-11c3 3 5 6 5 11M18 44c-3 1-6-1-6-4s3-5 6-4c3 0 5 3 5 5s-2 3-5 3Zm12 0c3 1 6-1 6-4s-3-5-6-4c-3 0-5 3-5 5s2 3 5 3Z"/><circle cx="19" cy="17" r="1"/><circle cx="29" cy="17" r="1"/><path d="m22 23 2 1 2-1"/>',
    eletros: '<rect x="11" y="4" width="26" height="40" rx="3"/><path d="M11 17h26M16 10v4m0 9v7m0 4v3"/>',
    sofa: '<path d="M7 25V14a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v11M7 27H4a3 3 0 0 0-3 3v7h46v-7a3 3 0 0 0-3-3h-3M7 25h34v12M6 37v5m36-5v5M24 25v12"/>',
    painel: '<path d="M6 7h36v27H6zM10 34v7m28-7v7M6 41h36M14 13h20v14H14zM21 30h6"/>',
    rack: '<path d="M5 17h38v22H5zM9 23h30M24 23v16M9 35h10m10 0h10M9 39v4m30-4v4"/>',
    'mesa-para-sala': '<path d="M5 17h38v6H5zM10 23l-4 19m32-19 4 19M18 17v-4h12v4"/>',
    'home-theater': '<path d="M5 12h27v22H5zM9 17h19v13H9zM36 9h8v28h-8z"/><circle cx="40" cy="17" r="2"/><circle cx="40" cy="29" r="4"/><path d="M11 39h27"/>',
    estante: '<path d="M7 5h34v38H7zM7 17h34M7 30h34M13 10v7m5-6v6m8-7v7m7-5v5M12 22v8m5-5v5m8-8v8m8-5v5M12 35v8m7-7v7m8-8v8m7-6v6"/>',
    poltrona: '<path d="M11 29V12a6 6 0 0 1 6-6h14a6 6 0 0 1 6 6v17M11 22H7a4 4 0 0 0-4 4v10h42V26a4 4 0 0 0-4-4h-4M11 29h26M8 36v7m32-7v7"/>',
    toucador: '<path d="M9 27h30v6H9zM12 33l-3 11m27-11 3 11M18 27V9a6 6 0 0 1 12 0v18M20 11c0 7 8 7 8 0"/>',
    'mesa-telefone': '<path d="M5 21h38v5H5zM10 26l-3 17m31-17 3 17M15 15h18v6H15zM19 12h10v3"/>',
    centro: '<path d="M5 26h38v5H5zM10 31l-3 10m31-10 3 10M16 26v-5m16 5v-5M24 19c4 0 6-4 6-7"/>',
    barzinho: '<path d="M9 17h30l-3 26H12L9 17ZM7 17h34M14 25h20m-18 0 2 13m14-13-2 13M22 17l-2-9m2 2 7-4M22 10l-5-3"/>',
    roupeiro: '<path d="M7 5h34v39H7zM24 5v39M20 21v7m8-7v7M8 40h32"/>',
    'tipo-roupeiro-casal': '<path d="M5 5h38v39H5zM18 5v39M30 5v39M14 22v7m10-7v7m10-7v7M6 40h36"/>',
    'tipo-roupeiro-solteiro': '<path d="M11 5h26v39H11zM24 5v39M20 22v7m8-7v7M12 40h24"/>',
    'tipo-roupeiro-correr': '<path d="M7 5h34v39H7zM22 5v39M26 5v39M17 23h3m8 0h3M11 36h11m4 0h11m-20-3 4 3-4 3m14-6-4 3 4 3"/>',
    'tipo-roupeiro-bater': '<path d="M7 5h34v39H7zM24 5v39M18 23v6m12-6v6M11 38c5 0 9-2 12-6m14 6c-5 0-9-2-12-6M8 40h32"/>',
    'tipo-roupeiro-espelho': '<path d="M7 5h34v39H7zM24 5v39M12 10h8v25h-8zM14 14l4-4m-4 11 6-6m10 7v7M8 40h32"/>',
    'tipo-roupeiro-3-portas': '<path d="M5 5h38v39H5zM18 5v39M30 5v39M14 23v6m10-6v6m10-6v6M6 40h36"/>',
    'tipo-roupeiro-4-portas': '<path d="M3 5h42v39H3zM13 5v39M24 5v39M35 5v39M10 23v6m9-6v6m10-6v6m9-6v6M4 40h40"/>',
    'tipo-roupeiro-6-portas': '<path d="M2 5h44v39H2zM9 5v39M16 5v39M24 5v39M32 5v39M39 5v39M6 23v6m7-6v6m7-6v6m8-6v6m7-6v6m7-6v6"/>',
    'tipo-roupeiro-canto': '<path d="M4 6h21v38H4zM25 6l19-4v42H25zM19 23v7m13-8v7M5 40h38"/>',
    'tipo-roupeiro-modulado': '<path d="M3 5h42v39H3zM3 14h42M16 14v30M32 14v30M8 24v7m14-7v7m16-7v7M4 40h40"/>',
    'tipo-closet': '<path d="M3 5h42v39H3zM16 5v39M32 5v39M4 14h40M21 18l3 4 3-4m-3 4v8m-5 0h10M5 40h40"/>',
    'tipo-sofa': '<path d="M5 28V18a5 5 0 0 1 5-5h28a5 5 0 0 1 5 5v10M5 28H2v10h44V28h-3M5 27h38M17 17v10m14-10v10M7 38v5m34-5v5"/>',
    'tipo-poltrona': '<path d="M14 9h20a5 5 0 0 1 5 5v16H9V14a5 5 0 0 1 5-5ZM5 25v12h38V25M16 30v7m16-7v7M10 37v6m28-6v6"/>',
    'tipo-rack': '<path d="M4 20h40v19H4zM4 26h40M18 26v13m12-13v13M9 31h5m8 0h5m8 0h5M9 39v4m30-4v4"/>',
    'tipo-painel': '<path d="M6 6h36v34H6zM12 12h24v19H12zM18 34h12M24 31v3M10 40v3m28-3v3"/>',
    'tipo-cama': '<path d="M4 19v23m40-23v23M4 25h40v13H4zM8 16h32v9H8zM11 19h11v6H11zm15 0h11v6H26z"/>',
    'tipo-colchao': '<path d="M4 27 29 12l15 9-25 15L4 27Zm0 0v7l15 9 25-15v-7M19 36v7M11 26l4 2m7-7 4 2m6-7 4 2"/>',
    'tipo-comoda': '<path d="M8 7h32v36H8zM8 19h32M8 31h32M19 14h10m-10 12h10m-10 12h10M11 43v2m26-2v2"/>',
    'tipo-mesa': '<path d="M4 18h40v6H4zM9 24 6 43m33-19 3 19M15 18v-5h18v5M18 30h12"/>',
    'tipo-cozinha': '<path d="M7 5h34v39H7zM7 17h34M24 17v27M13 24h7v15h-7zm15 0h7v15h-7zM12 11h6m12 0h6"/>',
    'tipo-escrivaninha': '<path d="M4 18h40v6H4zM8 24v19m32-19v19M14 24v14h12V24m7 6h5m-5 7h5M16 13h15v5H16z"/>',
    'tipo-cadeira': '<path d="M16 5h16a5 5 0 0 1 5 5v17H11V10a5 5 0 0 1 5-5ZM11 27h26l-5 8H16l-5-8Zm13 8v8m-10 1h20M8 21v9m32-9v9"/>',
    'tipo-berco': '<path d="M5 17h38v22H5zM9 17V8m30 9V8M13 17v22m7-22v22m8-22v22m7-22v22M7 39v5m34-5v5"/>',
    'cama-infantil': '<path d="M5 25V13a4 4 0 0 1 4-4h29a4 4 0 0 1 4 4v12M5 25h37v14H5zM5 39v5m37-5v5M11 18h13v7H11zM30 18h7v7h-7z"/>',
    camas: '<path d="M4 25V11h40v14M4 25h40v13H4zM4 38v5m40-5v5M9 18h13v7H9zm17 0h13v7H26z"/>',
    cabeceira: '<path d="M5 27V10a5 5 0 0 1 5-5h28a5 5 0 0 1 5 5v17M5 27h38v12H5zM5 39v5m38-5v5M12 14h3m9 0h3m9 0h1"/>',
    'camas-box': '<path d="M5 24 29 10l15 8-24 14L5 24Zm0 0v8l15 9 24-14v-9M20 32v9M5 32v7m39-12v8M15 20h1m7-4h1m8 2h1"/>',
    colchoes: '<path d="m4 27 25-15 15 9-25 15L4 27Zm0 0v8l15 9 25-15v-8M19 36v8M12 27h1m8-5h1m9 0h1"/>',
    comoda: '<path d="M9 7h30v36H9zM9 18h30M9 30h30M20 13h8m-8 11h8m-8 12h8M9 43v2m30-2v2"/>',
    criado: '<path d="M10 16h28v26H10zM7 13h34v3H7zM10 27h28M20 22h8m-8 12h8M12 42v3m24-3v3M23 13V5m-4 0h8"/>',
    'mesa-de-computador': '<path d="M5 28h38v5H5zM9 33v11m30-11v11M14 7h20v16H14zM20 23h8m-4 0v5M14 44h20"/>',
    escrivaninha: '<path d="M5 16h38v6H5zM8 22v21m32-21v21M12 22v16h11V22M29 28h8m-8 7h8"/>',
    'cadeira-giratoria': '<path d="M17 6h14a5 5 0 0 1 5 5v15H12V11a5 5 0 0 1 5-5ZM12 26h24l-4 8H16l-4-8Zm12 8v8m-10 2h20m-10-2-10 2m10-2 10 2M8 20v9m32-9v9"/>',
    'armario-de-parede': '<path d="M4 9h40v31H4zM17 9v31m14-31v31M10 20v8m13-8v8m14-8v8M6 40v3m36-3v3"/>',
    balcao: '<path d="M5 11h38v32H5zM5 18h38M25 18v25M11 26h8m11 0h8M8 43v2m32-2v2"/>',
    'mesa-granito': '<path d="M5 19h38v5H5zM10 24 7 43m31-19 3 19M8 19l4-5h24l4 5"/>',
    cristaleira: '<path d="M9 4h30v40H9zM9 23h30M24 4v40M14 11h5v7h-5zm15 0h5v7h-5zM15 30h5v9h-5zm14 0h5v9h-5z"/>',
    multiuso: '<path d="M9 4h30v40H9zM24 4v40M19 22v7m10-7v7M10 39h28"/>',
    'mesa-plastica': '<path d="M5 18h38v5H5zM10 23 8 43m30-20 2 20M11 18l3-5h20l3 5"/>',
    'tabua-de-passar': '<path d="M5 17h33l5 5H10l-5-5Zm12 5 19 21M34 22 13 43M37 16l6-3"/>',
    fruteira: '<path d="M6 22h36l-5 17H11L6 22ZM24 22v-8m-6 7c-7-1-9-9-2-10 3 0 5 3 5 6m7 4c0-5 3-8 7-7 5 1 4 6 0 8M20 12c0-6 4-7 8-6"/>',
    cantoneira: '<path d="M9 7h8v32h22v7H9V7ZM17 16h12v9H17m0 9h18"/>',
    berco: '<path d="M7 15h34v24H7zM7 15V8m34 7V8M13 15v24m7-24v24m7-24v24m7-24v24M7 39v5m34-5v5"/>',
    'colchao-berco': '<path d="m5 25 24-14 14 8-24 14L5 25Zm0 0v7l14 8 24-14v-7M19 33v7M12 25h1m9-4h1"/>',
    'roupeiro-infantil': '<path d="M9 5h30v39H9zM24 5v39M19 20v7m10-7v7M14 11h4m17 0h-4M12 40h24"/>',
    ventiladores: '<circle cx="24" cy="21" r="15"/><circle cx="24" cy="21" r="3"/><path d="M24 18c-5-6-3-10 2-10 3 0 4 4 1 10m0 4c8-2 11 1 8 5-2 3-5 2-9-2m-5-3c-3 8-7 8-9 4-1-3 2-5 8-6m4 16v8m-9 0h18"/>',
    'ferro-de-passar': '<path d="M5 34h38l-7-17H19c-6 0-10 6-14 17Zm7 0v5h31M21 17l3-8h9l3 8M14 27h17"/>',
    liquidificador: '<path d="M14 6h20l-3 21H17L14 6ZM12 6h24M19 27v5h10v-5M14 32h20v11H14zM24 35v4M18 43h12"/>',
    fogao: '<path d="M8 6h32v38H8zM8 17h32M13 23h22v16H13z"/><circle cx="14" cy="12" r="1"/><circle cx="22" cy="12" r="1"/><circle cx="30" cy="12" r="1"/><circle cx="37" cy="12" r="1"/>',
    'lavadora-e-tanquinho': '<path d="M8 5h32v39H8zM8 14h32"/><circle cx="24" cy="28" r="10"/><path d="M13 10h2m5 0h2m5 0h2M19 28c3-3 7-3 10 0"/>',
    'cabelo-e-beleza': '<path d="M5 14h21a9 9 0 0 1 0 18H11a7 7 0 0 1-6-7V14Zm17 18-3 12h8l3-12M34 17h10v10H34M9 20h12M6 25h9"/>',
    espremedor: '<path d="M11 26h26l-4 14H15l-4-14Zm13-18c-6 4-9 10-9 18h18c0-8-3-14-9-18ZM10 40h28M16 14l-4-3m20 3 4-3"/>',
    'ar-condicionado-e-climatizador': '<rect x="5" y="11" width="38" height="21" rx="3"/><path d="M11 25h26M13 37c0 3-3 3-3 6m14-6c0 3-3 3-3 6m14-6c0 3-3 3-3 6"/>'
  };
  const aliases = {
    'sofa': 'sofa', 'cama': 'camas', 'cama-box': 'camas-box',
    'eletrodomesticos': 'eletros', 'colchao': 'colchoes',
    'sala-de-jantar': 'mesa-para-sala', 'organizacao': 'estante'
  };
  const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const keyFor = (name, environment = '') => {
    const key = slug(name);
    const scoped = slug(environment) + '-' + key;
    return shapes[scoped] ? scoped : shapes[key] ? key : aliases[key] || 'categoria';
  };
  const icon = (name, options = {}) => {
    const key = shapes[name] ? name : keyFor(name, options.environment);
    const size = Math.max(16, Math.min(64, Number(options.size) || 24));
    return '<svg class="category-icon" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + shapes[key] + '</svg>';
  };
  window.CategoryIcons = Object.freeze({ icon, keyFor, keys: Object.freeze(Object.keys(shapes)) });
})();
