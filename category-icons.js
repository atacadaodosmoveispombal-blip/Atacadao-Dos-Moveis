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
  // Extra line drawings based on the catalog sheet supplied by the store.
  // Each entry is SVG geometry, so the same asset stays sharp in the menu and editor.
  Object.assign(shapes, {
    'tipo-roupeiro-2-portas': '<path d="M9 5h30v38H9zM24 5v38M20 21v7m8-7v7M10 40h28"/>',
    'comoda-espelho': '<path d="M8 26h32v17H8zM8 34h32M21 30h6m-6 9h6M14 26v-5h20v5M24 5a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm3 5-6 6"/>',
    penteadeira: '<path d="M7 27h34v16H7zM7 34h34M23 38h4M15 27v-5h18v5M24 4a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm4 5-6 6"/>',
    'penteadeira-camarim': '<path d="M7 27h34v16H7zM7 34h34M22 39h4M12 4h24v23H12zM16 8h16v15H16z"/><circle cx="10" cy="9" r="1"/><circle cx="38" cy="9" r="1"/><circle cx="10" cy="21" r="1"/><circle cx="38" cy="21" r="1"/>',
    sapateira: '<path d="M6 5h36v38H6zM6 18h36M6 30h36M13 13c2 0 4-2 5-2s2 2 4 2m5 0c2 0 4-2 5-2s2 2 4 2M13 25c2 0 4-2 5-2s2 2 4 2m5 0c2 0 4-2 5-2s2 2 4 2M13 37c2 0 4-2 5-2s2 2 4 2m5 0c2 0 4-2 5-2s2 2 4 2"/>',
    'cama-solteiro': '<path d="M4 26h40v13H4zM7 20h34v6H7zM10 15h17v5H10zM4 24v19m40-19v19M8 39v4m32-4v4"/>',
    'cama-casal': '<path d="M3 25h42v14H3zM7 19h34v6H7zM9 14h13v5H9zm17 0h13v5H26zM3 23v20m42-20v20M8 39v4m32-4v4"/>',
    'cama-queen': '<path d="M2 24h44v15H2zM5 18h38v6H5zM8 13h14v5H8zm18 0h14v5H26zM2 22v21m44-21v21M7 39v4m34-4v4M4 34h40"/>',
    'cama-king': '<path d="M2 23h44v16H2zM4 17h40v6H4zM7 12h15v5H7zm19 0h15v5H26zM2 21v22m44-22v22M6 39v4m36-4v4M3 34h42"/>',
    'cama-montessori': '<path d="m4 22 20-17 20 17v21H4V22Zm6 2 14-12 14 12v19H10V24ZM4 37h40M14 40h20"/>',
    'cama-auxiliar': '<path d="M6 12h36v15H6zM8 18h12v5H8zM6 27h36v11H6zM8 38v5m32-5v5M10 31h28"/>',
    beliche: '<path d="M6 6h32v14H6zM6 26h32v13H6zM6 6v38m32-38v38M10 12h13v5H10zm0 20h13v4H10zM41 6v38M38 12h6m-6 8h6m-6 8h6m-6 8h6"/>',
    'mini-cama': '<path d="M4 24h40v15H4zM4 17v26m40-32v32M8 20h12v5H8zm24-3h9v8h-9zM8 39v4m32-4v4"/>',
    'colchao-solteiro': '<path d="M8 17h32l5 18H3l5-18ZM3 35v7h42v-7M14 23h2m8-2h2m8 2h2M18 29h2m9 0h2"/>',
    'colchao-casal': '<path d="M6 16h36l4 19H2l4-19ZM2 35v8h44v-8M12 22h2m8 0h2m8 0h2M16 29h2m12 0h2"/>',
    'colchao-queen': '<path d="M5 15h38l4 20H1l4-20ZM1 35v8h46v-8M11 21h2m9 0h2m10 0h2M15 29h2m14 0h2"/>',
    'colchao-king': '<path d="M4 14h40l4 21H0l4-21ZM1 35v8h46v-8M9 21h2m10 0h2m12 0h2M14 29h2m16 0h2"/>',
    'colchao-ortopedico': '<path d="M6 15h36l5 19H1l5-19ZM1 34v9h46v-9M11 23h2m10-2h2m11 2h2M4 38h40m-15 0 8-9"/>',
    'colchao-espuma': '<path d="M6 15h36l5 19H1l5-19ZM1 34v9h46v-9M11 22h2m10-2h2m11 2h2M3 37c5-4 9 4 14 0s9 4 14 0 9 4 14 0"/>',
    'colchao-molas': '<path d="M6 15h36l5 19H1l5-19ZM1 34v9h46v-9M11 22h2m10-2h2m11 2h2M3 38c4-6 8 6 12 0s8 6 12 0 8 6 12 0 6 0 6 0"/>',
    travesseiro: '<path d="M8 12c-4-4-7 1-4 5 3 4 2 10 0 14-2 5 1 8 5 5 7-5 23-5 30 0 4 3 7 0 5-5-2-4-3-10 0-14 3-4 0-9-4-5-8 4-24 4-32 0Z"/>',
    bicama: '<path d="M4 18h40v12H4zM4 30h40v9H4zM4 18v25m40-25v25M10 39v4m28-4v4M10 23h10m7 0h10"/>',
    'cama-com-bau': '<path d="M4 28h40v12H4zM4 28 34 8l10 7-29 20M34 8l4 3M15 35l29-20M8 40v4m32-4v4M10 22h14"/>',
    'sofa-2-lugares': '<path d="M7 24V13h34v11M7 24H4v14h40V24h-3M7 27h34M24 13v14M8 38v5m32-5v5"/>',
    'sofa-3-lugares': '<path d="M5 24V13h38v11M5 24H2v14h44V24h-3M5 27h38M18 13v14m12-14v14M7 38v5m34-5v5"/>',
    'sofa-retratil': '<path d="M5 24V12h38v12M5 24H2v12h44V24h-3M5 27h38M18 12v15m12-15v15M7 36v6m34-6v6M9 36v5h30v-5"/>',
    'sofa-reclinavel': '<path d="M7 25 5 12h30l6 13M7 25H3v12h41V25h-3M7 29h34M20 13v16m15-12 8-6M9 37v6m30-6v6"/>',
    'sofa-chaise': '<path d="M5 24V12h34v12M5 24H2v12h44V25h-7M5 28h34M18 12v16M7 36v6m34-6v6M28 29h16v8H28z"/>',
    'sofa-canto': '<path d="M4 24V12h33v12M4 24H2v13h44V27h-9M4 28h33M16 12v16m11-16v16M7 37v6m34-6v6M37 12v15h9"/>',
    'sofa-cama': '<path d="M5 20V10h38v10M5 20H2v10h44V20h-3M5 24h38M2 30v9h44v-9M7 39v5m34-5v5M24 10v14"/>',
    'poltrona-reclinavel': '<path d="m13 8 17-3 7 20H13L9 13c-1-3 0-4 4-5ZM9 25H5v12h37V25h-5M12 30h24M10 37v6m29-6v6"/>',
    puff: '<ellipse cx="24" cy="16" rx="17" ry="7"/><path d="M7 16v19c0 10 34 10 34 0V16M10 39v4m28-4v4"/>',
    namoradeira: '<path d="M7 26V14a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v12M7 26H4v12h40V26h-3M7 29h34M24 9v20M8 38v5m32-5v5"/>',
    'mesa-jantar-4': '<path d="M7 20h34v5H7zM11 25v18m26-18v18M15 13h7v7m4-7h7v7M3 22v17m42-17v17M2 39h5m34 0h5"/>',
    'mesa-jantar-6': '<path d="M6 20h36v5H6zM10 25v18m28-18v18M11 13h7v7m6-7h7v7m6-7h7v7M2 22v17m44-17v17"/>',
    'mesa-jantar-8': '<path d="M5 20h38v5H5zM9 25v18m30-18v18M7 13h7v7m6-7h7v7m6-7h7v7M1 22v17m46-17v17"/>',
    'mesa-redonda': '<ellipse cx="24" cy="16" rx="20" ry="8"/><path d="M10 22 6 42m11-18-2 18m16-18 2 18m5-20 4 20"/>',
    'cadeira-jantar': '<path d="M16 5h16v26H16zM12 31h24v6H12zM16 37l-2 7m18-7 2 7M14 21h20"/>',
    banqueta: '<ellipse cx="24" cy="9" rx="12" ry="5"/><path d="M16 14 9 43m23-29 7 29M16 34h17M12 43h25"/>',
    aparador: '<path d="M5 15h38v24H5zM5 21h38M24 21v18M20 28v5m8-5v5M8 39v4m32-4v4"/>',
    'mesa-lateral': '<ellipse cx="24" cy="13" rx="15" ry="6"/><path d="M12 17 7 42m29-25 5 25M24 19v22"/>',
    'carrinho-cha': '<path d="M9 13h30v5H9zM10 18v20m28-20v20M8 27h32M6 38h36M13 8l5 5m17-5-5 5"/><circle cx="12" cy="42" r="3"/><circle cx="36" cy="42" r="3"/>',
    'cozinha-completa': '<path d="M3 8h42v34H3zM3 21h42M15 8v34m18-34v34M8 14v4m12 10h8m-8 6h8M38 27h4v10h-4M6 42h38"/>',
    'cozinha-compacta': '<path d="M7 8h34v34H7zM7 20h34M23 8v34M13 27v8m16-8v8M10 42h28"/>',
    'cozinha-modulada': '<path d="M3 7h42v35H3zM3 17h42M15 7v35m18-35v35M8 12h4m9 0h5m13 0h3M8 27h4m9 0h5m13 0h3"/>',
    'armario-cozinha': '<path d="M5 9h38v31H5zM19 9v31m14-31v31M14 21v7m10-7v7m15-7v7M6 40h36"/>',
    'balcao-cozinha': '<path d="M4 15h40v27H4zM4 20h40M24 20v22M18 27v7m12-7v7M7 42v3m34-3v3"/>',
    'aereo-cozinha': '<path d="M4 8h40v29H4zM24 8v29M18 19v7m12-7v7M6 37h36"/>',
    paneleiro: '<path d="M13 4h22v40H13zM24 4v40M20 20v8m8-8v8M14 41h20"/>',
    'torre-quente': '<path d="M12 4h24v40H12zM16 9h16v10H16zM16 24h16v15H16zM19 28h10M18 15h1m5 0h1m5 0h1"/>',
    'geladeira-planejada': '<path d="M13 4h22v40H13zM13 25h22M19 13v8m0 9v8M14 41h20"/>',
    'ilha-cozinha': '<path d="M4 15h40v6H4zM9 21v18m30-18v18M19 21v18m10-18v18M6 39h36M13 26h4m15 0h4"/>',
    bancada: '<path d="M4 19h40v6H4zM9 25v18m30-18v18M8 33h32M27 19v-7h10v7M31 12V7h9"/>',
    despensa: '<path d="M5 5h38v38H5zM24 5v38M5 24h38M10 11h5v9h-5zm9 0h3v9h-3zm9 0h5v9h-5zm8 0h4v9h-4zM10 29h5v9h-5zm9 0h3v9h-3zm9 0h5v9h-5zm8 0h4v9h-4z"/>',
    'mesa-escritorio': '<path d="M4 15h40v5H4zM8 20v24m32-24v24M9 25h15v15H9zM9 32h15M14 28h5m-5 8h5"/>',
    'mesa-em-l': '<path d="M4 16h32v6H4zM36 16h8v21h-8zM7 22v22m27-22v22M40 37v7M14 28h13"/>',
    'mesa-gamer': '<path d="M3 17h42v5H3zM8 22v22m32-22v22M17 7h15v10H17zM24 17v5M12 29h8m9 0h7"/>',
    'cadeira-escritorio': '<path d="M16 5h16v24H16zM12 29h24v7H12zM24 36v7m-12 2h24M9 19v10m30-10v10"/>',
    'cadeira-diretor': '<path d="M14 5h20v25H14zM10 30h28v7H10zM24 37v6m-14 2h28M7 21v10m34-10v10M18 12h12"/>',
    'cadeira-presidente': '<path d="M13 3h22v28H13zM9 31h30v7H9zM24 38v5m-14 2h28M6 21v11m36-11v11M18 10h12m-12 7h12"/>',
    'cadeira-gamer': '<path d="m18 4 6 4 6-4 6 5-3 22H15L12 9l6-5ZM10 31h28v7H10zM24 38v5m-13 2h26M7 23v10m34-10v10"/>',
    'estante-escritorio': '<path d="M7 5h34v38H7zM7 18h34M7 31h34M15 9v9m13-9v9M13 22h7v9h-7zm14 0h8v9h-8zM12 35h8m8 0h8"/>',
    'armario-escritorio': '<path d="M10 5h28v38H10zM24 5v38M20 21v7m8-7v7M11 40h26"/>',
    arquivo: '<path d="M11 6h26v37H11zM11 18h26M11 30h26M20 12h8m-8 12h8m-8 12h8M13 43v2m22-2v2"/>',
    'estacao-trabalho': '<path d="M3 18h42v5H3zM7 23v20m34-20v20M18 7h12v11H18zM12 30h8m8 0h8M15 43h18"/>',
    nicho: '<path d="M6 7h36v35H6zM24 7v35M6 25h36M12 13h5v8h-5zm17 0h6v8h-6zM12 30h5v8h-5zm17 0h6v8h-6z"/>',
    'painel-tv': '<path d="M5 8h38v31H5zM11 13h26v19H11zM19 35h10M24 32v3M9 39v4m30-4v4"/>',
    'painel-led': '<path d="M5 8h38v31H5zM11 13h26v19H11zM19 35h10M24 32v3M8 12v23m32-23v23M9 39v4m30-4v4"/>',
    'rack-painel': '<path d="M7 5h34v25H7zM12 10h24v15H12zM17 26h14M5 31h38v10H5zM23 31v10M9 41v3m30-3v3"/>',
    'armario-banho': '<path d="M7 11h34v31H7zM7 17h34M24 17v25M15 25v8m18-8v8M10 42h28"/>',
    gabinete: '<path d="M8 17h32v26H8zM24 17v26M19 27v7m10-7v7M15 11h18M24 5v6"/>',
    espelho: '<path d="M11 5h26v38H11zM16 18l9-9m-7 18 14-14M23 40h9"/>',
    'armario-lavanderia': '<path d="M5 10h38v32H5zM24 10v32M19 24v6m10-6v6M8 40h32"/>',
    tanque: '<path d="M9 16h30l-4 18H13L9 16ZM7 16h34M14 34v10m20-10v10M24 16v-7m0 0h10"/>',
    varal: '<path d="M6 14v28m36-28v28M6 17h36M9 27c6 5 24 5 30 0M10 42h4m24 0h4"/>',
    'casa-maquina': '<path d="M10 5h28v38H10zM10 15h28"/><circle cx="24" cy="29" r="10"/><path d="M15 10h2m6 0h2m6 0h2M19 29c3-3 7-3 10 0"/>',
    floreira: '<path d="M8 22h32v19H8zM13 22V9m0 8c-5 0-7-4-5-7 3-3 5 0 5 3m0-2c1-6 6-7 8-3 1 3-2 6-8 6m14 8V7m0 8c-5 0-7-4-5-7 3-3 5 0 5 3m0-2c1-6 6-7 8-3 1 3-2 6-8 6M12 41v3m24-3v3"/>',
    'jardim-vertical': '<path d="M7 5h34v39H7zM7 18h34M7 31h34M12 13c2-5 5-5 7 0m7 0c2-5 5-5 7 0M12 26c2-5 5-5 7 0m7 0c2-5 5-5 7 0M12 39c2-5 5-5 7 0m7 0c2-5 5-5 7 0"/>',
    'area-externa': '<path d="M11 7 6 37h31L31 7H11ZM10 14h23M8 22h27M19 7l-4 30M27 7l4 30M5 37l-2 7m35-7 3 7"/>',
    churrasqueira: '<path d="M8 18h32l-5 11H13L8 18ZM24 18V8m-5 3c3-5 8-5 10 0M15 29l-4 14m22-14 4 14M13 43h22"/>'
  });
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
  const typeKeys = {
    sofa: { '2-lugares':'sofa-2-lugares', '3-lugares':'sofa-3-lugares', 'retratil-e-reclinavel':'sofa-retratil', 'sofa-cama':'sofa-cama', 'sofa-de-canto':'sofa-canto' },
    poltrona: { decorativa:'poltrona', reclinavel:'poltrona-reclinavel', namoradeira:'namoradeira' },
    rack: { 'rack-para-tv':'rack', 'rack-com-painel':'rack-painel' },
    painel: { 'painel-para-tv':'painel-tv', 'painel-com-led':'painel-led' },
    roupeiro: { casal:'tipo-roupeiro-casal', solteiro:'tipo-roupeiro-solteiro', 'porta-de-correr':'tipo-roupeiro-correr', 'porta-de-bater':'tipo-roupeiro-bater', 'com-espelho':'tipo-roupeiro-espelho' },
    camas: { solteiro:'cama-solteiro', casal:'cama-casal', queen:'cama-queen', king:'cama-king', bicama:'bicama', beliche:'beliche' },
    'camas-box': { solteiro:'cama-solteiro', casal:'camas-box', queen:'cama-queen', king:'cama-king', 'box-bau':'cama-com-bau' },
    colchoes: { solteiro:'colchao-solteiro', casal:'colchao-casal', queen:'colchao-queen', king:'colchao-king' },
    cabeceira: { solteiro:'cabeceira', casal:'cabeceira', queen:'cabeceira', king:'cabeceira' },
    comoda: { 'com-gavetas':'comoda', 'com-porta':'armario-banho', infantil:'comoda' },
    criado: { tradicional:'criado', suspensa:'nicho' },
    toucador: { tradicional:'penteadeira', camarim:'penteadeira-camarim' },
    'mesa-para-sala': { '4-lugares':'mesa-jantar-4', '6-lugares':'mesa-jantar-6', '8-lugares':'mesa-jantar-8' },
    cozinha: { compacta:'cozinha-compacta', completa:'cozinha-completa', modulada:'cozinha-modulada' },
    'armario-de-parede': { aereo:'aereo-cozinha', balcao:'balcao-cozinha', paneleiro:'paneleiro' },
    escrivaninha: { tradicional:'mesa-escritorio', 'para-computador':'mesa-de-computador', 'em-l':'mesa-em-l', gamer:'mesa-gamer' },
    'cadeira-giratoria': { secretaria:'cadeira-escritorio', diretor:'cadeira-diretor', presidente:'cadeira-presidente', gamer:'cadeira-gamer' },
    berco: { tradicional:'berco', 'mini-berco':'berco', '3-em-1':'berco' },
    'cama-infantil': { infantil:'mini-cama', bicama:'bicama', beliche:'beliche' }
  };
  const typeKeyFor = (name, subcategory) => typeKeys[slug(subcategory)]?.[slug(name)] || '';
  const gallery = [
    { title:'Roupeiros', items:[
      ['tipo-roupeiro-2-portas','Guarda-roupa 2 portas'],['tipo-roupeiro-3-portas','Guarda-roupa 3 portas'],['tipo-roupeiro-4-portas','Guarda-roupa 4 portas'],['tipo-roupeiro-6-portas','Guarda-roupa 6 portas'],['tipo-roupeiro-correr','Roupeiro de correr'],['tipo-roupeiro-espelho','Roupeiro com espelho'],['tipo-roupeiro-canto','Roupeiro de canto'],['tipo-roupeiro-modulado','Roupeiro modulado'],['tipo-closet','Closet'],['tipo-roupeiro-solteiro','Roupeiro solteiro'],['tipo-roupeiro-bater','Roupeiro de bater'],['tipo-roupeiro-casal','Roupeiro casal']
    ] },
    { title:'Quarto e camas', items:[
      ['comoda','Cômoda'],['comoda-espelho','Cômoda com espelho'],['penteadeira','Penteadeira'],['penteadeira-camarim','Penteadeira camarim'],['criado','Criado-mudo'],['cabeceira','Cabeceira'],['estante','Estante'],['sapateira','Sapateira'],['cama-solteiro','Cama de solteiro'],['cama-casal','Cama de casal'],['cama-queen','Cama Queen'],['cama-king','Cama King'],['cama-montessori','Cama Montessori'],['cama-auxiliar','Cama auxiliar'],['beliche','Beliche'],['berco','Berço'],['mini-cama','Mini cama'],['camas-box','Cama Box'],['bicama','Bicama'],['cama-com-bau','Cama com baú']
    ] },
    { title:'Colchões', items:[
      ['colchao-solteiro','Colchão de solteiro'],['colchao-casal','Colchão de casal'],['colchao-queen','Colchão Queen'],['colchao-king','Colchão King'],['colchao-ortopedico','Colchão ortopédico'],['colchao-espuma','Colchão de espuma'],['colchao-molas','Colchão de molas'],['travesseiro','Travesseiro']
    ] },
    { title:'Sala e estofados', items:[
      ['sofa-2-lugares','Sofá 2 lugares'],['sofa-3-lugares','Sofá 3 lugares'],['sofa-retratil','Sofá retrátil'],['sofa-reclinavel','Sofá reclinável'],['sofa-cama','Sofá-cama'],['sofa-chaise','Sofá com chaise'],['sofa-canto','Sofá de canto'],['poltrona','Poltrona'],['poltrona-reclinavel','Poltrona reclinável'],['puff','Puff'],['namoradeira','Namoradeira'],['painel-tv','Painel de TV'],['painel-led','Painel com LED'],['rack','Rack'],['rack-painel','Rack com painel']
    ] },
    { title:'Sala de jantar', items:[
      ['mesa-jantar-4','Mesa de jantar 4 lugares'],['mesa-jantar-6','Mesa de jantar 6 lugares'],['mesa-jantar-8','Mesa de jantar 8 lugares'],['mesa-redonda','Mesa redonda'],['cadeira-jantar','Cadeira de jantar'],['banqueta','Banqueta'],['aparador','Aparador'],['cristaleira','Cristaleira'],['mesa-lateral','Mesa lateral'],['carrinho-cha','Carrinho de chá']
    ] },
    { title:'Cozinha', items:[
      ['cozinha-compacta','Cozinha compacta'],['cozinha-completa','Cozinha completa'],['cozinha-modulada','Cozinha modulada'],['armario-cozinha','Armário de cozinha'],['balcao-cozinha','Balcão de cozinha'],['aereo-cozinha','Aéreo de cozinha'],['paneleiro','Paneleiro'],['torre-quente','Torre quente'],['geladeira-planejada','Geladeira planejada'],['ilha-cozinha','Ilha de cozinha'],['bancada','Bancada'],['despensa','Despensa']
    ] },
    { title:'Escritório', items:[
      ['mesa-escritorio','Mesa de escritório'],['mesa-de-computador','Mesa para computador'],['mesa-em-l','Mesa em L'],['mesa-gamer','Mesa gamer'],['cadeira-escritorio','Cadeira de escritório'],['cadeira-diretor','Cadeira diretor'],['cadeira-presidente','Cadeira presidente'],['cadeira-gamer','Cadeira gamer'],['estante-escritorio','Estante de escritório'],['armario-escritorio','Armário de escritório'],['arquivo','Arquivo'],['estacao-trabalho','Estação de trabalho'],['nicho','Nicho']
    ] },
    { title:'Outros ambientes', items:[
      ['multiuso','Armário multiuso'],['armario-banho','Armário de banheiro'],['gabinete','Gabinete'],['espelho','Espelho'],['armario-lavanderia','Armário de lavanderia'],['tanque','Tanque'],['varal','Varal'],['casa-maquina','Casa de máquina'],['floreira','Floreira'],['jardim-vertical','Jardim vertical'],['area-externa','Móveis para área externa'],['churrasqueira','Churrasqueira']
    ] }
  ];
  const galleryKeys = new Set(gallery.flatMap(group => group.items.map(([key]) => key)));
  const extraKeys = Object.keys(shapes).filter(key => !galleryKeys.has(key));
  gallery.push({ title:'Mais desenhos', items:extraKeys.map(key => [key, key.replaceAll('-', ' ')]) });
  const labels = new Map(gallery.flatMap(group => group.items));
  const labelFor = key => labels.get(key) || String(key || '').replaceAll('-', ' ');
  const icon = (name, options = {}) => {
    const key = shapes[name] ? name : keyFor(name, options.environment);
    const size = Math.max(16, Math.min(64, Number(options.size) || 24));
    return '<svg class="category-icon" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + shapes[key] + '</svg>';
  };
  window.CategoryIcons = Object.freeze({ icon, keyFor, typeKeyFor, labelFor, gallery: Object.freeze(gallery), keys: Object.freeze(Object.keys(shapes)) });
})();
