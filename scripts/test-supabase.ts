import { supabase } from '../src/lib/supabase.js';

async function main() {
  console.log('Testing Supabase connectivity...');

  const results: Record<string, any> = {};

  try {
    const clientes = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });
    if (clientes.error) throw clientes.error;
    results.db = { ok: true, table: 'clientes', count: clientes.count ?? 0 };
  } catch (err: any) {
    results.db = { ok: false, error: err?.message || String(err) };
  }

  try {
    const list = await supabase.storage.from('prints').list('', { limit: 1 });
    if (list.error) throw list.error;
    results.storage = { ok: true, bucket: 'prints', items: list.data?.length ?? 0 };
  } catch (err: any) {
    results.storage = { ok: false, error: err?.message || String(err) };
  }

  console.log(JSON.stringify(results, null, 2));
  if (!results.db?.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


