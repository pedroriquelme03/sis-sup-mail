import express from 'express';
import bcrypt from 'bcryptjs';
import pool, { initDatabase } from '../lib/database';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const app = express();
app.use(express.json());

await initDatabase();

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, nome, email, senha_hash, tipo_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      const user = users[0];
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
  const { nome, email, senha } = req.body;

  try {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, 'tecnico']
    );

    res.json({ id: result.insertId, nome, email, tipo_usuario: 'tecnico' });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [totalClientes] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM clientes');

    const [suportesMes] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM suportes WHERE MONTH(data_suporte) = MONTH(CURRENT_DATE()) AND YEAR(data_suporte) = YEAR(CURRENT_DATE())'
    );

    const [clientesAtivos] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(DISTINCT cliente_id) as count FROM suportes WHERE MONTH(data_suporte) = MONTH(CURRENT_DATE())'
    );

    const [tiposSuporte] = await pool.query<RowDataPacket[]>(
      'SELECT tipo, COUNT(*) as total FROM suportes GROUP BY tipo ORDER BY total DESC'
    );

    res.json({
      totalClientes: totalClientes[0].count,
      suportesMes: suportesMes[0].count,
      clientesAtivos: clientesAtivos[0].count,
      tiposSuporte
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const [clientes] = await pool.query<RowDataPacket[]>('SELECT * FROM clientes ORDER BY nome');
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar clientes' });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const [clientes] = await pool.query<RowDataPacket[]>('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (clientes.length > 0) {
      res.json(clientes[0]);
    } else {
      res.status(404).json({ error: 'Cliente não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cliente' });
  }
});

app.get('/api/clientes/slug/:slug', async (req, res) => {
  try {
    const [clientes] = await pool.query<RowDataPacket[]>('SELECT * FROM clientes WHERE url_slug = ?', [req.params.slug]);
    if (clientes.length > 0) {
      res.json(clientes[0]);
    } else {
      res.status(404).json({ error: 'Cliente não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cliente' });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO clientes (nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug } = req.body;

  try {
    await pool.query(
      'UPDATE clientes SET nome = ?, cnpj = ?, contato_nome = ?, contato_email = ?, contato_telefone = ?, observacoes = ?, valor_mensalidade = ?, url_slug = ? WHERE id = ?',
      [nome, cnpj, contato_nome, contato_email, contato_telefone, observacoes, valor_mensalidade, url_slug, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

app.get('/api/clientes/:id/emails', async (req, res) => {
  try {
    const [emails] = await pool.query<RowDataPacket[]>('SELECT * FROM emails WHERE cliente_id = ? ORDER BY email', [req.params.id]);
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar e-mails' });
  }
});

app.post('/api/emails', async (req, res) => {
  const { cliente_id, email, usuario, cargo, departamento, objetivo, em_uso } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO emails (cliente_id, email, usuario, cargo, departamento, objetivo, em_uso) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, email, usuario, cargo, departamento, objetivo, em_uso]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar e-mail' });
  }
});

app.put('/api/emails/:id', async (req, res) => {
  const { email, usuario, cargo, departamento, objetivo, em_uso } = req.body;

  try {
    await pool.query(
      'UPDATE emails SET email = ?, usuario = ?, cargo = ?, departamento = ?, objetivo = ?, em_uso = ? WHERE id = ?',
      [email, usuario, cargo, departamento, objetivo, em_uso, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar e-mail' });
  }
});

app.delete('/api/emails/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM emails WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir e-mail' });
  }
});

app.get('/api/suportes', async (req, res) => {
  try {
    const [suportes] = await pool.query<RowDataPacket[]>(
      'SELECT s.*, c.nome as cliente_nome FROM suportes s LEFT JOIN clientes c ON s.cliente_id = c.id ORDER BY s.data_suporte DESC'
    );
    res.json(suportes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar suportes' });
  }
});

app.post('/api/suportes', async (req, res) => {
  const { cliente_id, tecnico, tipo, descricao, print_url, status } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO suportes (cliente_id, tecnico, tipo, descricao, print_url, status) VALUES (?, ?, ?, ?, ?, ?)',
      [cliente_id, tecnico, tipo, descricao, print_url, status]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar suporte' });
  }
});

app.post('/api/suportes/solicitar', async (req, res) => {
  const { cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO suportes (cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, solicitante_nome, solicitante_email, solicitante_departamento, tipo, descricao, print_url, 'aberto']
    );
    res.json({ id: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar solicitação' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});

export default app;
