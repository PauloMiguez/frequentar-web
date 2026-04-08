require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuração do MySQL (TiDB Cloud)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER || '2q5LT5zV9doJdyc.root',
    password: process.env.DB_PASSWORD || 'kWglXVhB3uX5GzCO',
    database: process.env.DB_NAME || 'frequentar_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_2024');
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [decoded.id]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
        req.usuario = rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// ============================================
// AUTENTICAÇÃO
// ============================================

app.post('/api/login-multi', async (req, res) => {
    const { email, password, perfil } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND perfil = ?', [email, perfil]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
        const usuario = rows[0];
        const validPassword = await bcrypt.compare(password, usuario.senha_hash);
        if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });
        const token = jwt.sign({ id: usuario.id, email: usuario.email, perfil: usuario.perfil }, process.env.JWT_SECRET || 'secret_key_2024', { expiresIn: '24h' });
        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, matricula: usuario.matricula } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// DASHBOARD STATS
// ============================================

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [total] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno" AND ativo = 1');
        res.json({ total_dispositivos: total[0].total || 0, presentes_hoje: 0, registros_manuais_hoje: 0 });
    } catch (error) { res.json({ total_dispositivos: 0, presentes_hoje: 0, registros_manuais_hoje: 0 }); }
});

// ============================================
// ADMIN - ESTATÍSTICAS
// ============================================

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

// ============================================
// ADMIN - ALUNOS
// ============================================

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

app.post('/api/admin/alunos', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { nome, matricula, email, turmaId } = req.body;
    try {
        const senhaHash = await bcrypt.hash('aluno123', 10);
        const [result] = await pool.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, matricula) VALUES (?, ?, ?, ?, ?)', [nome, email, senhaHash, 'aluno', matricula]);
        if (turmaId) await pool.query('INSERT INTO alunos_turmas (aluno_id, turma_id) VALUES (?, ?)', [result.insertId, turmaId]);
        res.json({ id: result.insertId, message: 'Aluno cadastrado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/alunos/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, matricula, email } = req.body;
    try {
        await pool.query('UPDATE usuarios SET nome = ?, matricula = ?, email = ? WHERE id = ?', [nome, matricula, email, id]);
        res.json({ message: 'Aluno atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/alunos/:id/desativar', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try {
        await pool.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Aluno desativado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/alunos/:id/vincular', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM alunos_turmas WHERE aluno_id = ?', [id]);
        res.json({ message: 'Vínculo removido' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ADMIN - PROFESSORES
// ============================================

app.get('/api/admin/professores', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE perfil = "professor" AND ativo = 1');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/professores', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { nome, email, matricula } = req.body;
    try {
        const senhaHash = await bcrypt.hash('prof123', 10);
        const [result] = await pool.query('INSERT INTO usuarios (nome, email, senha_hash, perfil, matricula) VALUES (?, ?, ?, ?, ?)', [nome, email, senhaHash, 'professor', matricula]);
        res.json({ id: result.insertId, message: 'Professor cadastrado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/professores/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, email, matricula } = req.body;
    try {
        await pool.query('UPDATE usuarios SET nome = ?, email = ?, matricula = ? WHERE id = ?', [nome, email, matricula, id]);
        res.json({ message: 'Professor atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/professores/:id/desativar', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try {
        await pool.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Professor desativado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/professores/:id/vincular', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM professores_turmas WHERE professor_id = ?', [id]);
        res.json({ message: 'Vínculo removido' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ADMIN - TURMAS
// ============================================

app.get('/api/turmas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, u.nome as professor_nome, u.id as professor_id
            FROM turmas t
            LEFT JOIN professores_turmas pt ON pt.turma_id = t.id
            LEFT JOIN usuarios u ON u.id = pt.professor_id
            WHERE t.ativo = 1
            ORDER BY t.id
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/turmas', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { nome, codigo, periodo, horario_inicio, horario_fim } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO turmas (nome, codigo, periodo, horario_inicio, horario_fim, ativo) VALUES (?, ?, ?, ?, ?, 1)',
            [nome, codigo, periodo || null, horario_inicio || '07:00', horario_fim || '12:00']
        );
        res.json({ id: result.insertId, message: 'Turma cadastrada com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

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
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/turmas/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try {
        await pool.query('UPDATE turmas SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Turma excluída com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/turmas/:id/professor', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT professor_id FROM professores_turmas WHERE turma_id = ? LIMIT 1', [id]);
        res.json(rows[0] || {});
    } catch (error) { res.status(500).json({ error: error.message }); }
});

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
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ADMIN - PONTOS DE ACESSO
// ============================================

app.get('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query('SELECT * FROM access_points ORDER BY predio, sala');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { bssid, ssid, sala, predio, andar, ip_range } = req.body;
    try {
        const [existe] = await pool.query('SELECT id FROM access_points WHERE bssid = ?', [bssid]);
        if (existe.length > 0) {
            return res.status(400).json({ error: 'Este BSSID já está cadastrado' });
        }
        const [result] = await pool.query(
            'INSERT INTO access_points (bssid, ssid, sala, predio, andar, ip_range, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [bssid, ssid, sala, predio, andar || null, ip_range || '10.0.0.0/8']
        );
        res.json({ id: result.insertId, message: 'Ponto de acesso cadastrado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/aps/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { bssid, ssid, sala, predio, andar, ip_range, ativo } = req.body;
    try {
        await pool.query(
            'UPDATE access_points SET bssid = ?, ssid = ?, sala = ?, predio = ?, andar = ?, ip_range = ?, ativo = ? WHERE id = ?',
            [bssid, ssid, sala, predio, andar || null, ip_range || '10.0.0.0/8', ativo !== undefined ? ativo : 1, id]
        );
        res.json({ message: 'Ponto de acesso atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/aps/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM access_points WHERE id = ?', [id]);
        res.json({ message: 'Ponto de acesso excluído com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ADMIN - RELATÓRIOS
// ============================================

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

// ============================================
// PROFESSOR
// ============================================

app.get('/api/professor/stats', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [turmas] = await pool.query('SELECT COUNT(*) as total FROM professores_turmas WHERE professor_id = ?', [req.usuario.id]);
        const [alunos] = await pool.query(`
            SELECT COUNT(DISTINCT at.aluno_id) as total
            FROM professores_turmas pt
            JOIN alunos_turmas at ON at.turma_id = pt.turma_id
            WHERE pt.professor_id = ?
        `, [req.usuario.id]);
        const hoje = new Date().toISOString().split('T')[0];
        const [presentes] = await pool.query(`
            SELECT COUNT(DISTINCT p.aluno_id) as total
            FROM presenca p
            JOIN alunos_turmas at ON at.aluno_id = p.aluno_id
            JOIN professores_turmas pt ON pt.turma_id = at.turma_id
            WHERE pt.professor_id = ? AND p.data = ? AND p.status = 'presente'
        `, [req.usuario.id, hoje]);
        res.json({ totalTurmas: turmas[0]?.total || 0, totalAlunos: alunos[0]?.total || 0, presentesHoje: presentes[0]?.total || 0 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/professor/turmas', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query(`
            SELECT t.*, COUNT(DISTINCT at.aluno_id) as totalAlunos
            FROM turmas t
            JOIN professores_turmas pt ON pt.turma_id = t.id
            LEFT JOIN alunos_turmas at ON at.turma_id = t.id
            WHERE pt.professor_id = ?
            GROUP BY t.id
        `, [req.usuario.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/professor/turmas/:turmaId/alunos', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    const { turmaId } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.nome, u.matricula
            FROM usuarios u
            JOIN alunos_turmas at ON at.aluno_id = u.id
            WHERE at.turma_id = ? AND u.perfil = 'aluno' AND u.ativo = 1
            ORDER BY u.nome
        `, [turmaId]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/professor/presenca', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    const { turma_id, presencas } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().split(' ')[0];
    try {
        for (const p of presencas) {
            await pool.query(`
                INSERT INTO presenca (aluno_id, turma_id, professor_id, data, hora, tipo, status, observacao)
                VALUES (?, ?, ?, ?, ?, 'professor', ?, ?)
                ON DUPLICATE KEY UPDATE status = ?, observacao = ?
            `, [p.aluno_id, turma_id, req.usuario.id, hoje, agora, p.status, p.observacao, p.status, p.observacao]);
        }
        res.json({ message: 'Presenças registradas com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/professor/relatorios', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    const { turma_id, data_inicio, data_fim } = req.query;
    let query = `
        SELECT p.*, u.nome as nome_aluno, u.matricula
        FROM presenca p
        JOIN usuarios u ON u.id = p.aluno_id
        JOIN alunos_turmas at ON at.aluno_id = u.id
        WHERE at.turma_id = ?
    `;
    const params = [turma_id];
    if (data_inicio) { query += ` AND p.data >= ?`; params.push(data_inicio); }
    if (data_fim) { query += ` AND p.data <= ?`; params.push(data_fim); }
    query += ` ORDER BY p.data DESC, u.nome`;
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ALUNO
// ============================================

app.get('/api/aluno/stats', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [presencas] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'presente' THEN 1 END) as presentes,
                COUNT(CASE WHEN status = 'ausente' THEN 1 END) as faltas,
                COUNT(*) as totalDias
            FROM presenca
            WHERE aluno_id = ?
        `, [req.usuario.id]);
        res.json(presencas[0] || { presentes: 0, faltas: 0, totalDias: 0 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/aluno/historico', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query(`
            SELECT p.*, t.nome as turma_nome
            FROM presenca p
            LEFT JOIN turmas t ON t.id = p.turma_id
            WHERE p.aluno_id = ?
            ORDER BY p.data DESC
        `, [req.usuario.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/aluno/horario', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [turmas] = await pool.query(`
            SELECT t.nome, t.horario_inicio, t.horario_fim
            FROM alunos_turmas at
            JOIN turmas t ON t.id = at.turma_id
            WHERE at.aluno_id = ?
        `, [req.usuario.id]);
        res.json(turmas[0] || {});
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// PERFIL
// ============================================

app.put('/api/usuarios/perfil', authMiddleware, async (req, res) => {
    const { nome, email, senha } = req.body;
    const usuarioId = req.usuario.id;
    try {
        let query = 'UPDATE usuarios SET nome = ?, email = ?';
        const params = [nome, email];
        if (senha && senha.trim() !== '') {
            const senhaHash = await bcrypt.hash(senha, 10);
            query += ', senha_hash = ?';
            params.push(senhaHash);
        }
        query += ' WHERE id = ?';
        params.push(usuarioId);
        await pool.query(query, params);
        res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// WI-FI CONFIG
// ============================================

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

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 API disponível em http://localhost:${PORT}/api`);
});
