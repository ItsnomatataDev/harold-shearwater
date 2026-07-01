alter table public.product_variants
  add column if not exists external_id text;

create unique index if not exists product_variants_external_ref_idx
  on public.product_variants (product_id, external_id)
  where external_id is not null;


with ranked_items as (
  select
    id,
    row_number() over (
      partition by rate_plan_id, product_id, variant_id
      order by updated_at desc, created_at desc, id
    ) as row_number
  from public.rate_plan_items
)
delete from public.rate_plan_items item
using ranked_items ranked
where item.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists rate_plan_items_unique_product_no_variant_idx
  on public.rate_plan_items (rate_plan_id, product_id)
  where variant_id is null;

create unique index if not exists rate_plan_items_unique_product_variant_idx
  on public.rate_plan_items (rate_plan_id, product_id, variant_id)
  where variant_id is not null;
