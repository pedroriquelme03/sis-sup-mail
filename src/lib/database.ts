import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const TIMEZONE = process.env.TZ || 'America/Sao_Paulo';

if (!DATABASE_URL) {
  console.warn('SUPABASE_DB_URL não definido. Configure as variáveis de ambiente para conectar ao Postgres.');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`SET TIME ZONE '${TIMEZONE}'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        cargo TEXT,
        tipo_usuario TEXT CHECK (tipo_usuario IN ('admin','tecnico')) DEFAULT 'tecnico',
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cnpj TEXT,
        contato_nome TEXT,
        contato_email TEXT,
        contato_telefone TEXT,
        observacoes TEXT,
        valor_mensalidade NUMERIC(10,2),
        url_slug TEXT UNIQUE,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        usuario TEXT,
        cargo TEXT,
        departamento TEXT,
        objetivo TEXT,
        em_uso BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suportes (
        id SERIAL PRIMARY KEY,
        cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        tecnico TEXT,
        tipo TEXT,
        descricao TEXT,
        print_url TEXT,
        data_suporte TIMESTAMPTZ DEFAULT NOW(),
        tempo_gasto INT,
        solicitante_nome TEXT,
        solicitante_email TEXT,
        solicitante_departamento TEXT,
        status TEXT CHECK (status IN ('aberto','em_andamento','resolvido','fechado')) DEFAULT 'aberto'
      )
    `);

    const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM usuarios`);
    if ((countResult.rows[0]?.count ?? 0) === 0) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO usuarios (nome, email, senha_hash, cargo, tipo_usuario)
         VALUES ('Administrador', 'admin@sistema.com', $1, 'Administrador', 'admin')`,
        [senhaHash]
      );
    }
  } finally {
    client.release();
  }
}

export default pool;
