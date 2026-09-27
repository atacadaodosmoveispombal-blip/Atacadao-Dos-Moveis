-- Medidas numéricas de produtos (compatibilidade não destrutiva).
--
-- A aplicação passa a gravar
-- largura, altura e profundidade como números independentes nesse JSONB,
-- mantendo description para compatibilidade com o catálogo e com registros
-- antigos. Esta migração apenas aproveita valores legíveis no texto legado;
-- não remove nem substitui description.

alter table public.products
  add column if not exists dimensions jsonb not null default '{}'::jsonb;

comment on column public.products.dimensions is
  'Medidas do produto em JSONB: largura, altura e profundidade numéricas; description é mantida para compatibilidade legada.';

with source as (
  select
    id,
    case
      when jsonb_typeof(dimensions) = 'object' then dimensions
      when jsonb_typeof(dimensions) = 'string' then jsonb_build_object('description', dimensions #>> '{}')
      else '{}'::jsonb
    end as current_dimensions,
    concat_ws(
      ' ',
      case
        when jsonb_typeof(dimensions) = 'object' then dimensions ->> 'description'
        when jsonb_typeof(dimensions) = 'string' then dimensions #>> '{}'
        else null
      end,
      description,
      short_description
    ) as legacy_text
  from public.products
), parsed as (
  select
    id,
    current_dimensions,
    coalesce(
      case when current_dimensions ->> 'largura' ~ '^[[:space:]]*[0-9]+([.,][0-9]+)?[[:space:]]*$' then trim(current_dimensions ->> 'largura') end,
      (regexp_match(lower(legacy_text), 'largura[[:space:]]*[:=-]?[[:space:]]*([0-9]+([.,][0-9]+)?)'))[1],
      (regexp_match(lower(legacy_text), '([0-9]+([.,][0-9]+)?)[[:space:]]*(cm[[:space:]]*)?largura'))[1]
    ) as largura_text,
    coalesce(
      case when current_dimensions ->> 'altura' ~ '^[[:space:]]*[0-9]+([.,][0-9]+)?[[:space:]]*$' then trim(current_dimensions ->> 'altura') end,
      (regexp_match(lower(legacy_text), 'altura[[:space:]]*[:=-]?[[:space:]]*([0-9]+([.,][0-9]+)?)'))[1],
      (regexp_match(lower(legacy_text), '([0-9]+([.,][0-9]+)?)[[:space:]]*(cm[[:space:]]*)?altura'))[1]
    ) as altura_text,
    coalesce(
      case when current_dimensions ->> 'profundidade' ~ '^[[:space:]]*[0-9]+([.,][0-9]+)?[[:space:]]*$' then trim(current_dimensions ->> 'profundidade') end,
      (regexp_match(lower(legacy_text), 'profundidade[[:space:]]*[:=-]?[[:space:]]*([0-9]+([.,][0-9]+)?)'))[1],
      (regexp_match(lower(legacy_text), '([0-9]+([.,][0-9]+)?)[[:space:]]*(cm[[:space:]]*)?profundidade'))[1]
    ) as profundidade_text
  from source
), normalized as (
  select
    id,
    current_dimensions
      || jsonb_strip_nulls(jsonb_build_object(
        'largura', case when largura_text is not null then to_jsonb(replace(largura_text, ',', '.')::numeric) end,
        'altura', case when altura_text is not null then to_jsonb(replace(altura_text, ',', '.')::numeric) end,
        'profundidade', case when profundidade_text is not null then to_jsonb(replace(profundidade_text, ',', '.')::numeric) end
      )) as dimensions
  from parsed
)
update public.products as products
set dimensions = normalized.dimensions,
    updated_at = now()
from normalized
where products.id = normalized.id
  and normalized.dimensions is distinct from products.dimensions;
