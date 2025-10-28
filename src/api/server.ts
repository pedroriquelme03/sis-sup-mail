import express from 'express';
import bcrypt from 'bcryptjs';
import pool, { initDatabase } from '../lib/database';
import supabase from '../lib/supabase';

const app = express();
app.use(express.json());

// Inicializar banco apenas uma vez
let dbInitialized = false;
const initializeDb = async () => {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
};

app.post('/api/login', async (req, res) => {
  await initializeDb();
  const { email, senha } = req.body;

  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, senha_hash, tipo_usuario FROM usuarios WHERE email = $1',
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0] as any;
      const senhaValida = await bcrypt.compare(senha, user.senha_hash);
      
      if (senhaValida) {
        res.json({
          id: user.id,
          nome: user.nome,
          email: user.email,
          tipo_usuario: user.tipo_usuario
        });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  await initializeDb();
  const { nome, email, senha } = req.body;

  try {
    const existing = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if ((existing.rows || []).length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id',
      [nome, email, senhaHash, 'tecnico']
    );

    res.json({ id: result.rows[0].id, nome, email, tipo_usuario: 'tecnico' });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  await initializeDb();
  try {
    const totalClientes = await pool.query('SELECT COUNT(*)::int as count FROM clientes');

    const suportesMes = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM suportes
       WHERE date_trunc('month', data_suporte) = date_trunc('month', NOW())`
    );

    const clientesAtivos = await pool.query(
      `SELECT COUNT(DISTINCT cliente_id)::int as count
       FROM suportes
       WHERE date_trunc('month', data_suporte) = date_trunc('month', NOW())`
    );

    const tiposSuporte = await pool.query(
      `SELECT tipo, COUNT(*)::int as total
       FROM suportes
       GROUP BY tipo
       ORDER BY total DESC`
    );

    res.json({
      totalClientes: totalClientes.rows[0].count,
      suportesMes: suportesMes.rows[0].count,
      clientesAtivos: clientesAtivos.rows[0].count,
      tiposSuporte: tiposSuporte.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

app.get('/api/clientes', async (req, res) => {
  await initializeDb();
  try {
    const clientes = await pool.query('SELECT * FROM clientes ORDER BY nome');
    res.json(clientes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar clientes' });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  await initializeDb();
  try {
    const clientes = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (clientes.rows.length > 0) {
      res.json(clientes.rows[0]);
    } else {
      res.status(404).json({ error: 'Cliente não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cliente' });
  }
});

app.get('/api/clientes/slug/:slug', async (req, res) => {
  await initializeDb();
  try {
    const clientes = await pool.query('SELECT * FROM clientes WHERE url_slug = $1', [req.params.slug]);
    if (clientes.rows.length > 0) {
      res.json(clientes.rows[0]);
    } else {
      res.status(404).json({ error: 'Cliente não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cliente' });
  }
});

app.post('/api/clientes', async (req, res) => {
  await initializeDb();
  const { nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug]
    );
    res.json({ id: result.rows[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  await initializeDb();
  const { nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug } = req.body;

  try {
    await pool.query(
      'UPDATE clientes SET nome = $1, cnpj = $2, contato_nome = $3, contato_email = $4, contato_telefone = $5, observacoes = $6, valor_mensalidade = $7, url_slug = $8 WHERE id = $9',
      [nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  await initializeDb();
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

app.get('/api/clientes/:id/emails', async (req, res) => {
  await initializeDb();
  try {
    const emails = await pool.query('SELECT * FROM emails WHERE cliente_id = $1 ORDER BY email', [req.params.id]);
    res.json(emails.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar e-mails' });
  }
});

app.post('/api/emails', async (req, res) => {
  await initializeDb();
  const { cliente_id, email, usuario, cargo, departamento, objetivo, em_uso } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO emails (cliente_id, email, usuario, cargo, departamento, objetivo, em_uso) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [cliente_id, email, usuario, cargo, departamento, objetivo, em_uso]
    );
    res.json({ id: result.rows[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar e-mail' });
  }
});

app.put('/api/emails/:id', async (req, res) => {
  await initializeDb();
  const { email, usuario, cargo, departamento, objetivo, em_uso } = req.body;

  try {
    await pool.query(
      'UPDATE emails SET email = $1, usuario = $2, cargo = $3, departamento = $4, objetivo = $5, em_uso = $6 WHERE id = $7',
      [email, usuario, cargo, departamento, objetivo, em_uso, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar e-mail' });
  }
});

app.delete('/api/emails/:id', async (req, res) => {
  await initializeDb();
  try {
    await pool.query('DELETE FROM emails WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir e-mail' });
  }
});

app.get('/api/suportes', async (req, res) => {
  await initializeDb();
  try {
    const suportes = await pool.query(
      'SELECT s.*, c.nome as cliente_nome FROM suportes s LEFT JOIN clientes c ON s.cliente_id = c.id ORDER BY s.data_suporte DESC'
    );
    res.json(suportes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar suportes' });
  }
});

app.post('/api/suportes', async (req, res) => {
  await initializeDb();
  const { cliente_id, tecnico, tipo, descricao, print_url, status, print_base64 } = req.body;

  try {
    let finalPrintUrl = print_url;
    if (!finalPrintUrl && print_base64 && supabase) {
      const fileBuffer = Buffer.from(print_base64.split(',').pop() || '', 'base64');
      const filePath = `prints/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const upload = await supabase.storage.from('prints').upload(filePath, fileBuffer, {
        contentType: 'image/png',
        upsert: false
      });
      if (upload.error) {
        console.error('Erro upload supabase:', upload.error);
      } else {
        const { data } = supabase.storage.from('prints').getPublicUrl(filePath);
        finalPrintUrl = data.publicUrl;
      }
    }

    const result = await pool.query(
      'INSERT INTO suportes (cliente_id, tecnico, tipo, descricao, print_url, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [cliente_id, tecnico, tipo, descricao, finalPrintUrl, status]
    );
    res.json({ id: result.rows[0].id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar suporte' });
  }
});

app.post('/api/suportes/solicitar', async (req, res) => {
  await initializeDb();
  const { cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url, print_base64 } = req.body;

  try {
    let finalPrintUrl = print_url;
    if (!finalPrintUrl && print_base64 && supabase) {
      const fileBuffer = Buffer.from(print_base64.split(',').pop() || '', 'base64');
      const filePath = `prints/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const upload = await supabase.storage.from('prints').upload(filePath, fileBuffer, {
        contentType: 'image/png',
        upsert: false
      });
      if (upload.error) {
        console.error('Erro upload supabase:', upload.error);
      } else {
        const { data } = supabase.storage.from('prints').getPublicUrl(filePath);
        finalPrintUrl = data.publicUrl;
      }
    }

    const result = await pool.query(
      'INSERT INTO suportes (cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, finalPrintUrl, 'aberto']
    );
    res.json({ id: result.rows[0].id, success: true });
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