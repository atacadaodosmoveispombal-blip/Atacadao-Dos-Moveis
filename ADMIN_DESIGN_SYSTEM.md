# Design system do painel administrativo

A interface mantém o azul e o amarelo da marca. Os componentes compartilhados estão em `admin-design-system.css`, carregado depois de `admin.css`. As telas continuam usando seus layouts próprios; este arquivo centraliza a aparência e o comportamento dos elementos comuns.

## Hierarquia

- **Cabeçalho da página:** `page-context` informa localização, título e subtítulo. Uma única ação principal aparece em `#pageAction` quando a tela oferece criação. Em Configurações, a ação principal fica no rodapé do formulário.
- **Primário:** `primary-action` para criar, publicar ou salvar. Amarelo da marca. Use uma ação principal por contexto.
- **Secundário:** `secondary` para cancelar, limpar, visualizar, tentar novamente e ações complementares. Fundo branco com borda azul clara.
- **Perigo:** `danger` e `confirm-accept is-danger` apenas para exclusão ou ação destrutiva. Requer confirmação no `confirmDialog`.
- **Ações por registro:** `ActionMenu` agrupa editar e operações menos frequentes, mantendo tabelas legíveis.

## Componentes

| Componente | Classe ou estrutura | Regra de uso |
| --- | --- | --- |
| Card | `card` | Superfície branca, borda e sombra leves. |
| Título de seção | `admin-section-header` | Título curto e apoio opcional. |
| Tabela | `data-table` em `table-wrap` | Cabeçalho neutro e linhas com hover discreto. |
| Filtros | `category-toolbar`, `product-controls`, `banner-toolbar`, `admin-list-toolbar` | Busca primeiro, depois filtros e modo de visualização. |
| Campos | `input`, `select`, `textarea` na área administrativa | Altura de toque confortável, borda e foco consistentes. |
| Switch | `toggle` | Somente para valores binários com rótulo visível. |
| Badge | `badge` | Cor comunica estado real, como ativo, inativo ou atenção. |
| Paginação | `category-pagination`, `product-pagination` | Botões funcionais, página e total legíveis. |
| Estado vazio | `admin-empty` | Explica a situação e oferece uma próxima ação quando aplicável. |
| Carregamento | `admin-loading` e `admin-skeleton` | Mantém o espaço ocupado sem mudança brusca de layout; respeita movimento reduzido. |
| Mensagem | `#toast` | Sucesso, erro ou informação após uma ação. |
| Modal | `#editorDialog`, `#confirmDialog` | Título, formulário ou mensagem, cancelar e ação final. |

## Cores e medidas

Os tokens `--admin-*` ficam no início de `admin-design-system.css`. Azul e amarelo definem a marca; vermelho fica reservado para perigo/erro. Os cartões de métricas têm superfície neutra. Verde, laranja ou vermelho devem aparecer apenas quando o significado do status justificar.

Em tablet e celular, o menu lateral já existente permanece recolhível. Campos e ações ocupam a largura disponível, as tabelas usam a adaptação móvel do painel, e os rodapés de modal respeitam a área segura do aparelho.

## Telas cobertas

Visão geral, Produtos, Subcategorias, Campanhas e Banners, Promoções e Configurações. A estrutura compartilhada também melhora listas genéricas que usam `renderSimple`.
