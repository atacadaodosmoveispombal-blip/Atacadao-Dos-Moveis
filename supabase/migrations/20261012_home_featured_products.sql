-- Four manually selected products are allowed in the Home showcase.
-- Existing rows intentionally remain false: the administrator must choose them.

alter table public.products
  add column if not exists home_featured boolean not null default false;

comment on column public.products.home_featured is
  'Manual Home showcase selection. At most four non-deleted products may be selected.';

create index if not exists products_home_featured_order_idx
  on public.products (sort_order, created_at desc, id)
  where home_featured is true and deleted_at is null;

create or replace function public.enforce_home_featured_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  selected_count integer;
begin
  if new.home_featured is not true or new.deleted_at is not null then
    return new;
  end if;

  -- Serialize concurrent selections so two administrators cannot select a
  -- fifth product at the same time.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.products.home_featured.limit'));

  select count(*)
    into selected_count
    from public.products
   where home_featured is true
     and deleted_at is null
     and id is distinct from new.id;

  if selected_count >= 4 then
    raise exception using
      errcode = '23514',
      message = 'HOME_FEATURED_LIMIT_REACHED',
      detail = 'No máximo 4 produtos podem ser destacados na Home.';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
      from pg_trigger
     where tgname = 'products_home_featured_limit'
       and tgrelid = 'public.products'::regclass
       and not tgisinternal
  ) then
    execute 'create trigger products_home_featured_limit
      before insert or update of home_featured, deleted_at on public.products
      for each row execute function public.enforce_home_featured_limit()';
  end if;
end;
$$;
