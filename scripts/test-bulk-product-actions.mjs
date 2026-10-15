import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const admin = readFileSync(fileURLToPath(new URL('../admin-app.js', import.meta.url)), 'utf8');
const migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/20261020_bulk_product_actions.sql', import.meta.url)), 'utf8');
const start = admin.indexOf('  async function fetchAdminProducts(');
const end = admin.indexOf('  async function renderProducts(', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({});
vm.runInContext(`${admin.slice(start, end)};this.fetchAdminProducts=fetchAdminProducts;this.selectFilteredProductIds=selectFilteredProductIds`, context);

const products = Array.from({ length: 1251 }, (_, index) => ({ id: `product-${index}`, category_id: index % 2 ? 'other' : 'source' }));
const ranges = [];
const client = {
  from(table) {
    assert.equal(table, 'products');
    return {
      select() { return this; },
      is(column, value) { assert.equal(column, 'deleted_at'); assert.equal(value, null); return this; },
      order() { return this; },
      async range(from, to) { ranges.push([from, to]); return { data: products.slice(from, to + 1), error: null }; }
    };
  }
};
const loaded = await context.fetchAdminProducts(client);
assert.equal(loaded.length, 1251, 'A listagem deve carregar além do limite de 1.000 produtos.');
assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);

const selected = new Set(['product-3']);
context.selectFilteredProductIds(selected, loaded.filter(row => row.category_id === 'source'));
assert.equal(selected.size, 627, 'A seleção deve incluir toda a categoria, inclusive outras páginas, sem duplicar IDs.');
assert.ok(selected.has('product-1250'));
assert.ok(selected.has('product-3'));

assert.match(admin, /db\.rpc\('bulk_product_action'/);
assert.match(admin, /notifyStorefront\('products'\)/);
assert.match(migration, /delete from public\.product_category_types[\s\S]*update public\.products[\s\S]*insert into public\.product_category_types/i);
assert.match(migration, /set category_id = destination_category_id, type_id = destination_type_id/i);
assert.match(migration, /set active = false, deleted_at = now\(\)/i);
assert.doesNotMatch(migration, /update public\.product_images|update public\.product_variants|update public\.product_colors/i);
console.log('OK seleção por categoria em todas as páginas, deduplicação, ações transacionais e preservação de dados');
