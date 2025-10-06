import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: '186.209.113.99',
  user: 'pedroriq_sissuporte',
  password: '$6OQyScs6yxUVEkw',
  database: 'pedroriq_sissuporte',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function initDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        cargo VARCHAR(100),
        tipo_usuario ENUM('admin', 'tecnico') DEFAULT 'tecnico',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18),
        contato_nome VARCHAR(255),
        contato_email VARCHAR(255),
        contato_telefone VARCHAR(20),
        observacoes TEXT,
        valor_mensalidade DECIMAL(10,2),
        url_slug VARCHAR(100) UNIQUE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        usuario VARCHAR(255),
        cargo VARCHAR(100),
        departamento VARCHAR(100),
        objetivo TEXT,
        em_uso BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS suportes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        tecnico VARCHAR(255),
        tipo VARCHAR(100),
        descricao TEXT,
        print_url VARCHAR(500),
        data_suporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tempo_gasto INT,
        solicitante_nome VARCHAR(255),
        solicitante_email VARCHAR(255),
        solicitante_departamento VARCHAR(100),
        status ENUM('aberto', 'em_andamento', 'resolvido', 'fechado') DEFAULT 'aberto',
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      )
    `);

    const [users] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
    if ((users as any)[0].count === 0) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await connection.query(`
        INSERT INTO usuarios (nome, email, senha_hash, cargo, tipo_usuario)
        VALUES ('Administrador', 'admin@sistema.com', ?, 'Administrador', 'admin')
      `, [senhaHash]);
    }

  } finally {
    connection.release();
  }
}

export default pool;
