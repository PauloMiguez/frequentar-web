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

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================

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

// ============================================
// AUTENTICAÇÃO MULTIPERFIL
// ============================================

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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DO ADMINISTRADOR
// ============================================

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [totalAlunos] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno"');
        const [totalProfessores] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "professor"');
        const [totalTurmas] = await pool.query('SELECT COUNT(*) as total FROM turmas');
        const [totalAPs] = await pool.query('SELECT COUNT(*) as total FROM access_points');
        res.json({ totalAlunos: totalAlunos[0].total, totalProfessores: totalProfessores[0].total, totalTurmas: totalTurmas[0].total, totalAPs: totalAPs[0].total });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/alunos', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query(`SELECT u.*, t.nome as turma_nome FROM usuarios u LEFT JOIN alunos_turmas at ON at.aluno_id = u.id LEFT JOIN turmas t ON t.id = at.turma_id WHERE u.perfil = 'aluno'`);
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
        await pool.query('UPDATE usuarios SET nome = ?, matricula = ?, email = ? WHERE id = ? AND perfil = "aluno"', [nome, matricula, email, id]);
        res.json({ message: 'Aluno atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/alunos/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try { await pool.query('DELETE FROM usuarios WHERE id = ?', [id]); res.json({ message: 'Aluno excluído com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/professores', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try { const [rows] = await pool.query('SELECT * FROM usuarios WHERE perfil = "professor"'); res.json(rows);
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
        await pool.query('UPDATE usuarios SET nome = ?, email = ?, matricula = ? WHERE id = ? AND perfil = "professor"', [nome, email, matricula, id]);
        res.json({ message: 'Professor atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/professores/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try { await pool.query('DELETE FROM usuarios WHERE id = ?', [id]); res.json({ message: 'Professor excluído com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try { const [rows] = await pool.query('SELECT * FROM access_points ORDER BY predio, sala'); res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { bssid, ssid, sala, predio, andar } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO access_points (bssid, ssid, sala, predio, andar) VALUES (?, ?, ?, ?, ?)', [bssid, ssid, sala, predio, andar]);
        res.json({ id: result.insertId, message: 'Ponto de acesso cadastrado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/aps/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try { await pool.query('DELETE FROM access_points WHERE id = ?', [id]); res.json({ message: 'Ponto de acesso excluído com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/relatorios', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { turma_id, data_inicio, data_fim } = req.query;
    let query = `SELECT p.*, u.nome as nome_aluno, u.matricula, t.nome as turma_nome FROM presenca p JOIN usuarios u ON u.id = p.aluno_id LEFT JOIN alunos_turmas at ON at.aluno_id = u.id LEFT JOIN turmas t ON t.id = at.turma_id WHERE 1=1`;
    const params = [];
    if (turma_id) { query += ` AND at.turma_id = ?`; params.push(turma_id); }
    if (data_inicio) { query += ` AND p.data >= ?`; params.push(data_inicio); }
    if (data_fim) { query += ` AND p.data <= ?`; params.push(data_fim); }
    query += ` ORDER BY p.data DESC, u.nome`;
    try { const [rows] = await pool.query(query, params); res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/turmas', authMiddleware, async (req, res) => {
    try { const [rows] = await pool.query(`SELECT t.*, u.nome as professor_nome FROM turmas t LEFT JOIN professores_turmas pt ON pt.turma_id = t.id LEFT JOIN usuarios u ON u.id = pt.professor_id WHERE t.ativo = 1`); res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/turmas', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { nome, codigo, professorId, periodo } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO turmas (nome, codigo, periodo) VALUES (?, ?, ?)', [nome, codigo, periodo]);
        if (professorId) await pool.query('INSERT INTO professores_turmas (professor_id, turma_id) VALUES (?, ?)', [professorId, result.insertId]);
        res.json({ id: result.insertId, message: 'Turma cadastrada com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/turmas/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { nome, codigo, periodo } = req.body;
    try {
        await pool.query('UPDATE turmas SET nome = ?, codigo = ?, periodo = ? WHERE id = ?', [nome, codigo, periodo, id]);
        res.json({ message: 'Turma atualizada com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/turmas/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    try { await pool.query('DELETE FROM turmas WHERE id = ?', [id]); res.json({ message: 'Turma excluída com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ROTAS DO PROFESSOR
// ============================================

app.get('/api/professor/turmas', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query(`SELECT t.*, COUNT(DISTINCT at.aluno_id) as totalAlunos FROM turmas t JOIN professores_turmas pt ON pt.turma_id = t.id LEFT JOIN alunos_turmas at ON at.turma_id = t.id WHERE pt.professor_id = ? GROUP BY t.id`, [req.usuario.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/professor/turmas/:turmaId/alunos', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    const { turmaId } = req.params;
    try {
        const [rows] = await pool.query(`SELECT u.* FROM usuarios u JOIN alunos_turmas at ON at.aluno_id = u.id WHERE at.turma_id = ? AND u.perfil = 'aluno' ORDER BY u.nome`, [turmaId]);
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
            await pool.query(`INSERT INTO presenca (aluno_id, turma_id, professor_id, data, hora, tipo, status, observacao) VALUES (?, ?, ?, ?, ?, 'professor', ?, ?) ON DUPLICATE KEY UPDATE status = ?, observacao = ?`, [p.aluno_id, turma_id, req.usuario.id, hoje, agora, p.status, p.observacao, p.status, p.observacao]);
        }
        res.json({ message: 'Presenças registradas com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/professor/relatorios', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    const { turma_id, data_inicio, data_fim } = req.query;
    let query = `SELECT p.*, u.nome as nome_aluno, u.matricula FROM presenca p JOIN usuarios u ON u.id = p.aluno_id JOIN alunos_turmas at ON at.aluno_id = u.id WHERE at.turma_id = ?`;
    const params = [turma_id];
    if (data_inicio) { query += ` AND p.data >= ?`; params.push(data_inicio); }
    if (data_fim) { query += ` AND p.data <= ?`; params.push(data_fim); }
    query += ` ORDER BY p.data DESC, u.nome`;
    try { const [rows] = await pool.query(query, params); res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ROTAS DO ALUNO
// ============================================

app.get('/api/aluno/stats', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [presencas] = await pool.query(`SELECT COUNT(CASE WHEN status = 'presente' THEN 1 END) as presentes, COUNT(CASE WHEN status = 'ausente' THEN 1 END) as faltas, COUNT(*) as totalDias FROM presenca WHERE aluno_id = ?`, [req.usuario.id]);
        res.json(presencas[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/aluno/historico', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    const { data_inicio, data_fim } = req.query;
    let query = `SELECT p.*, t.nome as turma_nome FROM presenca p LEFT JOIN turmas t ON t.id = p.turma_id WHERE p.aluno_id = ?`;
    const params = [req.usuario.id];
    if (data_inicio) { query += ` AND p.data >= ?`; params.push(data_inicio); }
    if (data_fim) { query += ` AND p.data <= ?`; params.push(data_fim); }
    query += ` ORDER BY p.data DESC`;
    try { const [rows] = await pool.query(query, params); res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/aluno/presenca/manual', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().split(' ')[0];
    try {
        const [turmas] = await pool.query('SELECT turma_id FROM alunos_turmas WHERE aluno_id = ? LIMIT 1', [req.usuario.id]);
        await pool.query(`INSERT INTO presenca (aluno_id, turma_id, data, hora, tipo, status) VALUES (?, ?, ?, ?, 'manual', 'presente')`, [req.usuario.id, turmas[0]?.turma_id || null, hoje, agora]);
        res.json({ message: 'Presença registrada manualmente com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/aluno/qrcode', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    res.json({ qrData: `${req.protocol}://${req.get('host')}/api/aluno/validar/${req.usuario.id}?token=${req.headers['authorization']}` });
});

// ============================================
// ROTAS DE CONFIGURAÇÃO WI-FI
// ============================================

app.get('/api/wifi/config', async (req, res) => {
    try { const [rows] = await pool.query('SELECT * FROM wifi_config ORDER BY id DESC LIMIT 1'); res.json(rows[0] || {});
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/wifi/config', authMiddleware, async (req, res) => {
    const { ssid, password } = req.body;
    try {
        await pool.query('DELETE FROM wifi_config');
        const [result] = await pool.query('INSERT INTO wifi_config (ssid, password) VALUES (?, ?)', [ssid, password]);
        res.json({ id: result.insertId, message: 'Wi-Fi configurado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/usuarios/perfil', authMiddleware, async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        let query = 'UPDATE usuarios SET nome = ?, email = ?';
        const params = [nome, email];
        if (senha) { const senhaHash = await bcrypt.hash(senha, 10); query += ', senha_hash = ?'; params.push(senhaHash); }
        query += ' WHERE id = ?';
        params.push(req.usuario.id);
        await pool.query(query, params);
        res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/dashboard/stats', async (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    try {
        const [totalDispositivos] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno" AND ativo = 1');
        const [presentesHoje] = await pool.query('SELECT COUNT(*) as total FROM presenca WHERE data = ? AND status = "presente"', [hoje]);
        const [manuaisHoje] = await pool.query('SELECT COUNT(*) as total FROM presenca WHERE data = ? AND tipo = "manual"', [hoje]);
        res.json({ total_dispositivos: totalDispositivos[0]?.total || 0, presentes_hoje: presentesHoje[0]?.total || 0, registros_manuais_hoje: manuaisHoje[0]?.total || 0 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 API disponível em http://localhost:${PORT}/api`);
});
