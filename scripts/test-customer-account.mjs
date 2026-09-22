import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = file => readFileSync(join(root, file), 'utf8');
const migration = read('supabase/migrations/20260928_customer_accounts.sql');
const account = read('customer-account.js');
const checkout = read('app.js');
const reset = read('reset-password.js');
const admin = read('admin-app.js');

assert.match(migration, /create table if not exists public\.customer_profiles/i);
assert.match(migration, /create table if not exists public\.customer_addresses/i);
assert.match(migration, /create table if not exists public\.customer_favorites/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /id = auth\.uid\(\)/i);
assert.match(migration, /customer_id = auth\.uid\(\)/i);
assert.match(migration, /security definer[\s\S]*create_customer_order|create_customer_order[\s\S]*security definer/i);
assert.match(migration, /current_customer uuid := auth\.uid\(\)/i);
assert.match(migration, /available_product_stock\(product_row\.id\)/i);
assert.match(migration, /revoke all on public\.customer_profiles[\s\S]*from anon/i);
assert.doesNotMatch(migration, /password\s+(text|varchar)/i, 'Passwords must never be stored in public tables.');

assert.match(account, /storageKey:\s*'atacarejo-customer-auth'/);
assert.match(account, /signInWithPassword/);
assert.match(account, /resetPasswordForEmail/);
assert.match(account, /customer_favorites/);
assert.match(account, /create_customer_order/);
assert.doesNotMatch(account, /localStorage\.setItem\([^)]*password/i);
assert.match(reset, /updateUser\(\{password\}\)/);

assert.match(checkout, /guestCheckoutEnabled/);
for (const publicHandler of ['openAccount', 'openAdmin', 'openWhatsApp', 'scrollToTop']) {
  assert.match(checkout, new RegExp(`function ${publicHandler}\\(`), `${publicHandler} must remain available to storefront handlers.`);
}
assert.match(checkout, /resumeCheckoutAfterAuth/);
assert.match(checkout, /saveAddressFromCheckout/);
assert.match(checkout, /window\.dispatchEvent\(new CustomEvent\('atacarejo:favorites-changed'/);
assert.match(admin, /guest_checkout_enabled/);

console.log('Conta do cliente: contratos de autenticação, RLS, favoritos, checkout e recuperação validados.');
