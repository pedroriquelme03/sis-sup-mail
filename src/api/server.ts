import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase as sb } from '../lib/supabase';

const app = express();
app.use(express.json());

// Inicializar banco apenas uma vez
const initializeDb = async () => {};

app.post('/api/login', async (req, res) => {
  await initializeDb();
  const { email, senha } = req.body;

  try {
    const { data: user, error } = await sb
      .from('usuarios')
      .select('id, nome, email, senha_hash, tipo_usuario')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas' });

    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  await initializeDb();
  const { nome, email, senha } = req.body;

  try {
    const { data: existing, error: exErr } = await sb
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const { data, error } = await sb
      .from('usuarios')
      .insert([{ nome, email, senha_hash: senhaHash, tipo_usuario: 'tecnico' }])
      .select('id')
      .single();
    if (error) throw error;

    res.json({ id: data.id, nome, email, tipo_usuario: 'tecnico' });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.get('/api/dashboard/stats', async (_req, res) => {
  await initializeDb();
  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const totalClientesQ = sb.from('clientes').select('*', { count: 'exact', head: true });
    const suportesMesQ = sb
      .from('suportes')
      .select('*', { count: 'exact', head: true })
      .gte('data_suporte', startIso)
      .lt('data_suporte', endIso);
    const clientesAtivosQ = sb
      .from('suportes')
      .select('cliente_id')
      .gte('data_suporte', startIso)
      .lt('data_suporte', endIso);
    const tiposSuporteQ = sb.from('suportes').select('tipo');

    const [totalClientesR, suportesMesR, clientesAtivosR, tiposSuporteR] = await Promise.all([
      totalClientesQ,
      suportesMesQ,
      clientesAtivosQ,
      tiposSuporteQ
    ]);

    if (totalClientesR.error) throw totalClientesR.error;
    if (suportesMesR.error) throw suportesMesR.error;
    if (clientesAtivosR.error) throw clientesAtivosR.error;
    if (tiposSuporteR.error) throw tiposSuporteR.error;

    const clientesAtivosCount = new Set((clientesAtivosR.data || []).map((r: any) => r.cliente_id)).size;
    const tiposCountMap = new Map<string, number>();
    (tiposSuporteR.data || []).forEach((r: any) => {
      const t = r.tipo || 'não_especificado';
      tiposCountMap.set(t, (tiposCountMap.get(t) || 0) + 1);
    });
    const tiposSuporte = Array.from(tiposCountMap.entries())
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);

    res.json({
      totalClientes: totalClientesR.count || 0,
      suportesMes: suportesMesR.count || 0,
      clientesAtivos: clientesAtivosCount,
      tiposSuporte
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

app.get('/api/clientes', async (_req, res) => {
  await initializeDb();
  try {
    const { data, error } = await sb.from('clientes').select('*').order('nome', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar clientes' });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  await initializeDb();
  try {
    const { data, error } = await sb.from('clientes').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cliente' });
  }
});

app.get('/api/clientes/slug/:slug', async (req, res) => {
  await initializeDb();
  try {
    const { data, error } = await sb.from('clientes').select('*').eq('url_slug', req.params.slug).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cliente' });
  }
});

app.post('/api/clientes', async (req, res) => {
  await initializeDb();
  const { nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug } = req.body;

  try {
    const { data, error } = await sb
      .from('clientes')
      .insert([{ nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug }])
      .select('id')
      .single();
    if (error) throw error;
    res.json({ id: data.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  await initializeDb();
  const { nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug } = req.body;

  try {
    const { error } = await sb
      .from('clientes')
      .update({ nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  await initializeDb();
  try {
    const { error } = await sb.from('clientes').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

app.get('/api/clientes/:id/emails', async (req, res) => {
  await initializeDb();
  try {
    const { data, error } = await sb.from('emails').select('*').eq('cliente_id', req.params.id).order('email');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar e-mails' });
  }
});

app.post('/api/emails', async (req, res) => {
  await initializeDb();
  const { cliente_id, email, usuario, cargo, departamento, objetivo, em_uso } = req.body;

  try {
    const { data, error } = await sb
      .from('emails')
      .insert([{ cliente_id, email, usuario, cargo, departamento, objetivo, em_uso }])
      .select('id')
      .single();
    if (error) throw error;
    res.json({ id: data.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar e-mail' });
  }
});

app.put('/api/emails/:id', async (req, res) => {
  await initializeDb();
  const { email, usuario, cargo, departamento, objetivo, em_uso } = req.body;

  try {
    const { error } = await sb
      .from('emails')
      .update({ email, usuario, cargo, departamento, objetivo, em_uso })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar e-mail' });
  }
});

app.delete('/api/emails/:id', async (req, res) => {
  await initializeDb();
  try {
    const { error } = await sb.from('emails').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir e-mail' });
  }
});

app.get('/api/suportes', async (_req, res) => {
  await initializeDb();
  try {
    const { data, error } = await sb
      .from('suportes')
      .select('*, clientes:cliente_id (nome)')
      .order('data_suporte', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((s: any) => ({ ...s, cliente_nome: s.clientes?.nome }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar suportes' });
  }
});

app.get('/api/health/supabase', async (_req, res) => {
  try {
    const resp = await sb.from('clientes').select('*', { count: 'exact', head: true });
    if (resp.error) throw resp.error;
    return res.json({ ok: true, table: 'clientes', count: resp.count ?? 0 });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
});

app.post('/api/suportes', async (req, res) => {
  await initializeDb();
  const { cliente_id, tecnico, tipo, descricao, print_url, status, print_base64 } = req.body;

  try {
    let finalPrintUrl = print_url;
    if (!finalPrintUrl && print_base64) {
      const fileBuffer = Buffer.from(print_base64.split(',').pop() || '', 'base64');
      const filePath = `prints/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const upload = await sb.storage.from('prints').upload(filePath, fileBuffer, {
        contentType: 'image/png',
        upsert: false
      });
      if (upload.error) {
        console.error('Erro upload supabase:', upload.error);
      } else {
        const { data } = sb.storage.from('prints').getPublicUrl(filePath);
        finalPrintUrl = data.publicUrl;
      }
    }

    const { data, error } = await sb
      .from('suportes')
      .insert([{ cliente_id, tecnico, tipo, descricao, print_url: finalPrintUrl, status }])
      .select('id')
      .single();
    if (error) throw error;
    res.json({ id: data.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar suporte' });
  }
});

app.post('/api/suportes/solicitar', async (req, res) => {
  await initializeDb();
  const { cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url, print_base64 } = req.body;

  try {
    let finalPrintUrl = print_url;
    if (!finalPrintUrl && print_base64) {
      const fileBuffer = Buffer.from(print_base64.split(',').pop() || '', 'base64');
      const filePath = `prints/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const upload = await sb.storage.from('prints').upload(filePath, fileBuffer, {
        contentType: 'image/png',
        upsert: false
      });
      if (upload.error) {
        console.error('Erro upload supabase:', upload.error);
      } else {
        const { data } = sb.storage.from('prints').getPublicUrl(filePath);
        finalPrintUrl = data.publicUrl;
      }
    }

    const { data, error } = await sb
      .from('suportes')
      .insert([{ cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url: finalPrintUrl, status: 'aberto' }])
      .select('id')
      .single();
    if (error) throw error;
    res.json({ id: data.id, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar solicitação' });
  }
});

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
}

export default app;