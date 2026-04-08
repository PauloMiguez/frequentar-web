const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const config = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2q5LT5zV9doJdyc.root',
    password: 'kWglXVhB3uX5GzCO',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
};

async function setup() {
    console.log('🔌 Conectando ao TiDB Cloud...');
    
    try {
        const conn = await mysql.createConnection(config);
        console.log('✅ Conectado!');
        
        // Criar banco de dados
        await conn.query('CREATE DATABASE IF NOT EXISTS frequentar_db');
        console.log('✅ Banco de dados frequentar_db criado/verificado');
        
        await conn.query('USE frequentar_db');
        
        // Criar tabelas
        console.log('📋 Criando tabelas...');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL,
                perfil ENUM('admin', 'professor', 'aluno') NOT NULL,
                matricula VARCHAR(50),
                mac_address VARCHAR(100),
                ativo BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela usuarios criada');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS turmas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(100) NOT NULL,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                periodo VARCHAR(50),
                horario_inicio TIME DEFAULT '07:00:00',
                horario_fim TIME DEFAULT '12:00:00',
                ano_letivo INT,
                ativo BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela turmas criada');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS professores_turmas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                professor_id INT NOT NULL,
                turma_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(professor_id) REFERENCES usuarios(id),
                FOREIGN KEY(turma_id) REFERENCES turmas(id),
                UNIQUE KEY(professor_id, turma_id)
            )
        `);
        console.log('✅ Tabela professores_turmas criada');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS alunos_turmas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                aluno_id INT NOT NULL,
                turma_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(aluno_id) REFERENCES usuarios(id),
                FOREIGN KEY(turma_id) REFERENCES turmas(id),
                UNIQUE KEY(aluno_id, turma_id)
            )
        `);
        console.log('✅ Tabela alunos_turmas criada');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS access_points (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bssid VARCHAR(50) NOT NULL UNIQUE,
                ssid VARCHAR(100) NOT NULL,
                sala VARCHAR(100) NOT NULL,
                predio VARCHAR(100),
                andar INT,
                ip_range VARCHAR(50) DEFAULT '10.0.0.0/8',
                ativo BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela access_points criada');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS presenca (
                id INT PRIMARY KEY AUTO_INCREMENT,
                aluno_id INT NOT NULL,
                turma_id INT,
                professor_id INT,
                data DATE,
                hora TIME,
                tipo VARCHAR(20) DEFAULT 'wifi',
                status VARCHAR(20) DEFAULT 'presente',
                tempo_conectado INT DEFAULT 0,
                ap_id INT,
                observacao TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(aluno_id) REFERENCES usuarios(id),
                FOREIGN KEY(turma_id) REFERENCES turmas(id),
                FOREIGN KEY(professor_id) REFERENCES usuarios(id),
                FOREIGN KEY(ap_id) REFERENCES access_points(id),
                UNIQUE KEY unique_presenca_dia (aluno_id, data)
            )
        `);
        console.log('✅ Tabela presenca criada');
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS wifi_config (
                id INT PRIMARY KEY AUTO_INCREMENT,
                ssid VARCHAR(100) NOT NULL,
                password VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela wifi_config criada');
        
        // Inserir dados padrão
        console.log('👥 Inserindo dados padrão...');
        
        const adminHash = await bcrypt.hash('admin123', 10);
        const professorHash = await bcrypt.hash('prof123', 10);
        const alunoHash = await bcrypt.hash('aluno123', 10);
        
        await conn.query(`
            INSERT IGNORE INTO usuarios (nome, email, senha_hash, perfil, matricula)
            VALUES 
            ('Administrador Master', 'admin@escola.com', ?, 'admin', 'ADM001'),
            ('Professor João Silva', 'professor@escola.com', ?, 'professor', 'PROF001'),
            ('Aluno Teste', 'aluno@escola.com', ?, 'aluno', 'ALU001')
        `, [adminHash, professorHash, alunoHash]);
        console.log('✅ Usuários padrão inseridos');
        
        // Verificar se a turma já existe
        const [turmas] = await conn.query('SELECT id FROM turmas WHERE codigo = "INFO1"');
        if (turmas.length === 0) {
            await conn.query(`
                INSERT INTO turmas (nome, codigo, periodo, horario_inicio, horario_fim)
                VALUES ('Informática - 1º Ano', 'INFO1', 'Matutino', '07:00:00', '12:00:00')
            `);
            console.log('✅ Turma padrão inserida');
        } else {
            console.log('⚠️ Turma já existe, pulando inserção');
        }
        
        console.log('\n🎉 Configuração do TiDB Cloud concluída!');
        console.log('📝 Credenciais:');
        console.log('   Admin: admin@escola.com / admin123');
        console.log('   Professor: professor@escola.com / prof123');
        console.log('   Aluno: aluno@escola.com / aluno123');
        
        await conn.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

setup();
