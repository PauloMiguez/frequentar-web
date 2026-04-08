const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '7501',
    database: 'frequentar_web',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});

const authMiddleware = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    try {
        const decoded = jwt.verify(token, 'secret_key_2024');
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [decoded.id]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
        req.usuario = rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Login
app.post('/api/login-multi', async (req, res) => {
    const { email, password, perfil } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND perfil = ?', [email, perfil]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
        const usuario = rows[0];
        const validPassword = await bcrypt.compare(password, usuario.senha_hash);
        if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });
        const token = jwt.sign({ id: usuario.id, email: usuario.email, perfil: usuario.perfil }, 'secret_key_2024', { expiresIn: '24h' });
        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, matricula: usuario.matricula } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [total] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno" AND ativo = 1');
        res.json({ total_dispositivos: total[0].total || 0, presentes_hoje: 0, registros_manuais_hoje: 0 });
    } catch (error) { res.json({ total_dispositivos: 0, presentes_hoje: 0, registros_manuais_hoje: 0 }); }
});

// Admin stats
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [totalAlunos] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno" AND ativo = 1');
        const [totalProfessores] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "professor" AND ativo = 1');
        const [totalTurmas] = await pool.query('SELECT COUNT(*) as total FROM turmas WHERE ativo = 1');
        const [totalAPs] = await pool.query('SELECT COUNT(*) as total FROM access_points');
        res.json({ totalAlunos: totalAlunos[0].total, totalProfessores: totalProfessores[0].total, totalTurmas: totalTurmas[0].total, totalAPs: totalAPs[0].total });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ROTA DE TURMAS - CORRETA (com professor)
app.get('/api/turmas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                t.id, t.nome, t.codigo, t.periodo, t.horario_inicio, t.horario_fim, t.ativo,
                u.id as professor_id, u.nome as professor_nome
            FROM turmas t
            LEFT JOIN professores_turmas pt ON pt.turma_id = t.id
            LEFT JOIN usuarios u ON u.id = pt.professor_id
            WHERE t.ativo = 1
            ORDER BY t.id
        `);
        res.json(rows);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Admin - Alunos
app.get('/api/admin/alunos', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.nome, u.email, u.matricula, u.ativo, t.nome as turma_nome 
            FROM usuarios u
            LEFT JOIN alunos_turmas at ON at.aluno_id = u.id
            LEFT JOIN turmas t ON t.id = at.turma_id
            WHERE u.perfil = 'aluno' AND u.ativo = 1
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin - Professores
app.get('/api/admin/professores', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE perfil = "professor" AND ativo = 1');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin - APs
app.get('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query('SELECT * FROM access_points');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin - Relatórios
app.get('/api/admin/relatorios', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query(`
            SELECT p.*, u.nome as nome_aluno, u.matricula, t.nome as turma_nome
            FROM presenca p
            JOIN usuarios u ON u.id = p.aluno_id
            LEFT JOIN turmas t ON t.id = p.turma_id
            ORDER BY p.created_at DESC
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Wifi config
app.get('/api/wifi/config', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM wifi_config ORDER BY id DESC LIMIT 1');
        res.json(rows[0] || {});
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/wifi/config', authMiddleware, async (req, res) => {
    const { ssid, password } = req.body;
    try {
        await pool.query('DELETE FROM wifi_config');
        await pool.query('INSERT INTO wifi_config (ssid, password) VALUES (?, ?)', [ssid, password]);
        res.json({ message: 'Wi-Fi configurado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// ============================================
// ROTAS PARA TURMAS (CRUD COMPLETO)
// ============================================

// Listar turmas (GET)
app.get('/api/turmas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                t.id, t.nome, t.codigo, t.periodo, t.horario_inicio, t.horario_fim, t.ativo,
                u.id as professor_id, u.nome as professor_nome
            FROM turmas t
            LEFT JOIN professores_turmas pt ON pt.turma_id = t.id
            LEFT JOIN usuarios u ON u.id = pt.professor_id
            WHERE t.ativo = 1
            ORDER BY t.id
        `);
        res.json(rows);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Cadastrar turma (POST)
app.post('/api/turmas', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { nome, codigo, periodo, horario_inicio, horario_fim } = req.body;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO turmas (nome, codigo, periodo, horario_inicio, horario_fim, ativo) VALUES (?, ?, ?, ?, ?, 1)',
            [nome, codigo, periodo || null, horario_inicio || '07:00', horario_fim || '12:00']
        );
        res.json({ id: result.insertId, message: 'Turma cadastrada com sucesso' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Atualizar turma (PUT)
app.put('/api/turmas/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, codigo, periodo, horario_inicio, horario_fim } = req.body;
    
    try {
        await pool.query(
            'UPDATE turmas SET nome = ?, codigo = ?, periodo = ?, horario_inicio = ?, horario_fim = ? WHERE id = ?',
            [nome, codigo, periodo || null, horario_inicio || '07:00', horario_fim || '12:00', id]
        );
        res.json({ message: 'Turma atualizada com sucesso' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Excluir turma (DELETE)
app.delete('/api/turmas/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    
    try {
        await pool.query('UPDATE turmas SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Turma excluída com sucesso' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Buscar professor da turma (GET)
app.get('/api/turmas/:id/professor', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT professor_id FROM professores_turmas WHERE turma_id = ? LIMIT 1',
            [id]
        );
        res.json(rows[0] || {});
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Vincular professor à turma (POST)
app.post('/api/turmas/:id/professor', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { professor_id } = req.body;
    
    try {
        await pool.query('DELETE FROM professores_turmas WHERE turma_id = ?', [id]);
        if (professor_id) {
            await pool.query('INSERT INTO professores_turmas (professor_id, turma_id) VALUES (?, ?)', [professor_id, id]);
        }
        res.json({ message: 'Professor vinculado com sucesso' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTA PARA ATUALIZAR ALUNO
// ============================================

app.put('/api/admin/alunos/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, matricula, email } = req.body;
    
    console.log(`📝 Atualizando aluno ${id}:`, { nome, matricula, email });
    
    try {
        await pool.query(
            'UPDATE usuarios SET nome = ?, matricula = ?, email = ? WHERE id = ? AND perfil = "aluno"',
            [nome, matricula, email, id]
        );
        res.json({ message: 'Aluno atualizado com sucesso' });
    } catch (error) { 
        console.error('Erro:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTA PARA ATUALIZAR ALUNO
// ============================================

app.put('/api/admin/alunos/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, matricula, email } = req.body;
    
    console.log(`📝 Atualizando aluno ${id}:`, { nome, matricula, email });
    
    try {
        const [result] = await pool.query(
            'UPDATE usuarios SET nome = ?, matricula = ?, email = ? WHERE id = ? AND perfil = "aluno"',
            [nome, matricula, email, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }
        
        res.json({ message: 'Aluno atualizado com sucesso' });
    } catch (error) { 
        console.error('Erro ao atualizar aluno:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTA PARA ATUALIZAR PROFESSOR
// ============================================

app.put('/api/admin/professores/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, email, matricula } = req.body;
    
    console.log(`📝 Atualizando professor ${id}:`, { nome, email, matricula });
    
    try {
        const [result] = await pool.query(
            'UPDATE usuarios SET nome = ?, email = ?, matricula = ? WHERE id = ? AND perfil = "professor"',
            [nome, email, matricula, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }
        
        res.json({ message: 'Professor atualizado com sucesso' });
    } catch (error) { 
        console.error('Erro ao atualizar professor:', error);
        res.status(500).json({ error: error.message }); 
    }
});
