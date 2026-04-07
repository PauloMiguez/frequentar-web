const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuração do MySQL
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
// AUTENTICAÇÃO MULTIPERFIL
// ============================================

app.post('/api/login-multi', async (req, res) => {
    const { email, password, perfil } = req.body;
    
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND perfil = ?', [email, perfil]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const usuario = rows[0];
        const validPassword = await bcrypt.compare(password, usuario.senha_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
            'secret_key_2024',
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                matricula: usuario.matricula
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DO ADMINISTRADOR
// ============================================

app.get('/api/admin/stats', async (req, res) => {
    try {
        const [totalAlunos] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno"');
        const [totalProfessores] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "professor"');
        const [totalTurmas] = await pool.query('SELECT COUNT(*) as total FROM turmas');
        const [totalAPs] = await pool.query('SELECT COUNT(*) as total FROM access_points');
        
        res.json({
            totalAlunos: totalAlunos[0].total,
            totalProfessores: totalProfessores[0].total,
            totalTurmas: totalTurmas[0].total,
            totalAPs: totalAPs[0].total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/alunos/recentes', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, u.nome as nome_aluno, u.matricula 
            FROM presenca p
            JOIN usuarios u ON u.id = p.aluno_id
            ORDER BY p.created_at DESC LIMIT 10
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/alunos/faltas-altas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.nome, u.matricula,
            COUNT(CASE WHEN p.status = 'ausente' THEN 1 END) as faltas,
            COUNT(*) as total_dias,
            ROUND(COUNT(CASE WHEN p.status = 'ausente' THEN 1 END) * 100.0 / COUNT(*), 2) as taxaFalta
            FROM usuarios u
            LEFT JOIN presenca p ON p.aluno_id = u.id AND u.perfil = 'aluno'
            GROUP BY u.id
            HAVING taxaFalta > 25
            ORDER BY taxaFalta DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/alunos', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.*, t.nome as turma_nome 
            FROM usuarios u
            LEFT JOIN alunos_turmas at ON at.aluno_id = u.id
            LEFT JOIN turmas t ON t.id = at.turma_id
            WHERE u.perfil = 'aluno'
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/alunos', async (req, res) => {
    const { nome, matricula, email, turmaId } = req.body;
    
    try {
        const senhaHash = await bcrypt.hash('aluno123', 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, perfil, matricula) VALUES (?, ?, ?, ?, ?)',
            [nome, email, senhaHash, 'aluno', matricula]
        );
        
        if (turmaId) {
            await pool.query('INSERT INTO alunos_turmas (aluno_id, turma_id) VALUES (?, ?)', [result.insertId, turmaId]);
        }
        
        res.json({ id: result.insertId, message: 'Aluno cadastrado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/alunos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Aluno excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/professores', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE perfil = "professor"');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/professores', async (req, res) => {
    const { nome, email, matricula } = req.body;
    
    try {
        const senhaHash = await bcrypt.hash('prof123', 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, perfil, matricula) VALUES (?, ?, ?, ?, ?)',
            [nome, email, senhaHash, 'professor', matricula]
        );
        res.json({ id: result.insertId, message: 'Professor cadastrado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/professores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Professor excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/aps', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM access_points ORDER BY predio, sala');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/aps', async (req, res) => {
    const { bssid, ssid, sala, predio, andar } = req.body;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO access_points (bssid, ssid, sala, predio, andar) VALUES (?, ?, ?, ?, ?)',
            [bssid, ssid, sala, predio, andar]
        );
        res.json({ id: result.insertId, message: 'Ponto de acesso cadastrado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/aps/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM access_points WHERE id = ?', [id]);
        res.json({ message: 'Ponto de acesso excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/presenca/hoje', async (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    try {
        const [rows] = await pool.query(`
            SELECT p.*, u.nome as nome_aluno, u.matricula, t.nome as turma_nome
            FROM presenca p
            JOIN usuarios u ON u.id = p.aluno_id
            LEFT JOIN alunos_turmas at ON at.aluno_id = u.id
            LEFT JOIN turmas t ON t.id = at.turma_id
            WHERE p.data = ?
            ORDER BY p.created_at DESC
        `, [hoje]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/presenca', async (req, res) => {
    const { data, turma_id } = req.query;
    
    let query = `
        SELECT p.*, u.nome as nome_aluno, u.matricula, t.nome as turma_nome
        FROM presenca p
        JOIN usuarios u ON u.id = p.aluno_id
        LEFT JOIN alunos_turmas at ON at.aluno_id = u.id
        LEFT JOIN turmas t ON t.id = at.turma_id
        WHERE 1=1
    `;
    const params = [];
    
    if (data) {
        query += ` AND p.data = ?`;
        params.push(data);
    }
    if (turma_id) {
        query += ` AND at.turma_id = ?`;
        params.push(turma_id);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/relatorios', async (req, res) => {
    const { turma_id, data_inicio, data_fim, periodo } = req.query;
    
    let query = `
        SELECT p.*, u.nome as nome_aluno, u.matricula, t.nome as turma_nome
        FROM presenca p
        JOIN usuarios u ON u.id = p.aluno_id
        LEFT JOIN alunos_turmas at ON at.aluno_id = u.id
        LEFT JOIN turmas t ON t.id = at.turma_id
        WHERE 1=1
    `;
    const params = [];
    
    if (turma_id) {
        query += ` AND at.turma_id = ?`;
        params.push(turma_id);
    }
    if (data_inicio) {
        query += ` AND p.data >= ?`;
        params.push(data_inicio);
    }
    if (data_fim) {
        query += ` AND p.data <= ?`;
        params.push(data_fim);
    }
    if (periodo) {
        query += ` AND t.periodo = ?`;
        params.push(periodo);
    }
    
    query += ` ORDER BY p.data DESC, u.nome`;
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DO PROFESSOR
// ============================================

app.get('/api/professor/stats', async (req, res) => {
    try {
        const [turmas] = await pool.query('SELECT COUNT(*) as total FROM professores_turmas WHERE professor_id = ?', [req.usuario?.id || 1]);
        const [alunos] = await pool.query(`
            SELECT COUNT(DISTINCT at.aluno_id) as total
            FROM professores_turmas pt
            JOIN alunos_turmas at ON at.turma_id = pt.turma_id
            WHERE pt.professor_id = ?
        `, [req.usuario?.id || 1]);
        
        const hoje = new Date().toISOString().split('T')[0];
        const [presentes] = await pool.query(`
            SELECT COUNT(DISTINCT p.aluno_id) as total
            FROM presenca p
            JOIN alunos_turmas at ON at.aluno_id = p.aluno_id
            JOIN professores_turmas pt ON pt.turma_id = at.turma_id
            WHERE pt.professor_id = ? AND p.data = ? AND p.status = 'presente'
        `, [req.usuario?.id || 1, hoje]);
        
        res.json({
            totalTurmas: turmas[0].total,
            totalAlunos: alunos[0].total,
            presentesHoje: presentes[0].total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/professor/turmas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, COUNT(DISTINCT at.aluno_id) as totalAlunos
            FROM turmas t
            JOIN professores_turmas pt ON pt.turma_id = t.id
            LEFT JOIN alunos_turmas at ON at.turma_id = t.id
            WHERE pt.professor_id = ?
            GROUP BY t.id
        `, [req.usuario?.id || 1]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/professor/turmas/:turmaId/alunos', async (req, res) => {
    const { turmaId } = req.params;
    
    try {
        const [rows] = await pool.query(`
            SELECT u.*
            FROM usuarios u
            JOIN alunos_turmas at ON at.aluno_id = u.id
            WHERE at.turma_id = ? AND u.perfil = 'aluno'
            ORDER BY u.nome
        `, [turmaId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/professor/presenca', async (req, res) => {
    const { turma_id, presencas } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().split(' ')[0];
    
    try {
        for (const p of presencas) {
            await pool.query(`
                INSERT INTO presenca (aluno_id, turma_id, professor_id, data, hora, tipo, status, observacao)
                VALUES (?, ?, ?, ?, ?, 'professor', ?, ?)
                ON DUPLICATE KEY UPDATE status = ?, observacao = ?
            `, [p.aluno_id, turma_id, req.usuario?.id || 1, hoje, agora, p.status, p.observacao, p.status, p.observacao]);
        }
        
        res.json({ message: 'Presenças registradas com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/professor/relatorios', async (req, res) => {
    const { turma_id, data_inicio, data_fim } = req.query;
    
    let query = `
        SELECT p.*, u.nome as nome_aluno, u.matricula
        FROM presenca p
        JOIN usuarios u ON u.id = p.aluno_id
        JOIN alunos_turmas at ON at.aluno_id = u.id
        WHERE at.turma_id = ?
    `;
    const params = [turma_id];
    
    if (data_inicio) {
        query += ` AND p.data >= ?`;
        params.push(data_inicio);
    }
    if (data_fim) {
        query += ` AND p.data <= ?`;
        params.push(data_fim);
    }
    
    query += ` ORDER BY p.data DESC, u.nome`;
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DO ALUNO
// ============================================

app.get('/api/aluno/stats', async (req, res) => {
    try {
        const [presencas] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status = 'presente' THEN 1 END) as presentes,
                COUNT(CASE WHEN status = 'ausente' THEN 1 END) as faltas,
                COUNT(*) as totalDias
            FROM presenca
            WHERE aluno_id = ?
        `, [req.usuario?.id || 3]);
        
        res.json(presencas[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/aluno/historico', async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    
    let query = `
        SELECT p.*, t.nome as turma_nome
        FROM presenca p
        LEFT JOIN turmas t ON t.id = p.turma_id
        WHERE p.aluno_id = ?
    `;
    const params = [req.usuario?.id || 3];
    
    if (data_inicio) {
        query += ` AND p.data >= ?`;
        params.push(data_inicio);
    }
    if (data_fim) {
        query += ` AND p.data <= ?`;
        params.push(data_fim);
    }
    
    query += ` ORDER BY p.data DESC`;
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/aluno/presenca/manual', async (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().split(' ')[0];
    
    try {
        const [turmas] = await pool.query('SELECT turma_id FROM alunos_turmas WHERE aluno_id = ? LIMIT 1', [req.usuario?.id || 3]);
        
        await pool.query(`
            INSERT INTO presenca (aluno_id, turma_id, data, hora, tipo, status)
            VALUES (?, ?, ?, ?, 'manual', 'presente')
        `, [req.usuario?.id || 3, turmas[0]?.turma_id || null, hoje, agora]);
        
        res.json({ message: 'Presença registrada manualmente com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/aluno/qrcode', async (req, res) => {
    const token = req.headers['authorization'];
    res.json({ qrData: `${req.protocol}://${req.get('host')}/api/aluno/validar/${req.usuario?.id || 3}?token=${token}` });
});

// ============================================
// ROTAS DE TURMAS (COMPARTILHADAS)
// ============================================

app.get('/api/turmas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, u.nome as professor_nome
            FROM turmas t
            LEFT JOIN professores_turmas pt ON pt.turma_id = t.id
            LEFT JOIN usuarios u ON u.id = pt.professor_id
            WHERE t.ativo = 1
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/turmas', async (req, res) => {
    const { nome, codigo, professorId, periodo } = req.body;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO turmas (nome, codigo, periodo) VALUES (?, ?, ?)',
            [nome, codigo, periodo]
        );
        
        if (professorId) {
            await pool.query('INSERT INTO professores_turmas (professor_id, turma_id) VALUES (?, ?)', [professorId, result.insertId]);
        }
        
        res.json({ id: result.insertId, message: 'Turma cadastrada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/turmas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE turmas SET ativo = 0 WHERE id = ?', [id]);
        res.json({ message: 'Turma excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DE CONFIGURAÇÃO WI-FI
// ============================================

app.get('/api/wifi/config', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM wifi_config ORDER BY id DESC LIMIT 1');
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/wifi/config', async (req, res) => {
    const { ssid, password } = req.body;
    
    try {
        await pool.query('DELETE FROM wifi_config');
        const [result] = await pool.query('INSERT INTO wifi_config (ssid, password) VALUES (?, ?)', [ssid, password]);
        res.json({ id: result.insertId, message: 'Wi-Fi configurado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DE USUÁRIO (PERFIL)
// ============================================

app.put('/api/usuarios/perfil', async (req, res) => {
    const { nome, email, senha } = req.body;
    
    try {
        let query = 'UPDATE usuarios SET nome = ?, email = ?';
        const params = [nome, email];
        
        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            query += ', senha_hash = ?';
            params.push(senhaHash);
        }
        
        query += ' WHERE id = ?';
        params.push(req.usuario?.id || 1);
        
        await pool.query(query, params);
        res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROTAS DE PRESENÇA VIA WI-FI
// ============================================

app.post('/api/presenca/wifi', async (req, res) => {
    const { mac_address, tempo_conectado, ap_bssid } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().split(' ')[0];
    
    try {
        const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE mac_address = ? AND perfil = "aluno" AND ativo = 1', [mac_address]);
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Dispositivo não cadastrado' });
        }
        
        const alunoId = usuarios[0].id;
        
        let apId = null;
        if (ap_bssid) {
            const [aps] = await pool.query('SELECT id FROM access_points WHERE bssid = ?', [ap_bssid]);
            if (aps.length > 0) apId = aps[0].id;
        }
        
        const [turmas] = await pool.query('SELECT turma_id FROM alunos_turmas WHERE aluno_id = ? LIMIT 1', [alunoId]);
        
        const [existentes] = await pool.query(
            'SELECT id, tempo_conectado FROM presenca WHERE aluno_id = ? AND data = ?',
            [alunoId, hoje]
        );
        
        if (existentes.length > 0) {
            const novoTempo = Math.max(existentes[0].tempo_conectado || 0, tempo_conectado || 0);
            await pool.query(
                'UPDATE presenca SET tempo_conectado = ?, hora = ?, ap_id = ? WHERE id = ?',
                [novoTempo, agora, apId, existentes[0].id]
            );
            return res.json({ message: 'Presença já registrada hoje', status: 'duplicado' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO presenca (aluno_id, turma_id, data, hora, tipo, tempo_conectado, ap_id, status)
             VALUES (?, ?, ?, ?, 'wifi', ?, ?, 'presente')`,
            [alunoId, turmas[0]?.turma_id || null, hoje, agora, tempo_conectado || 0, apId]
        );
        
        res.json({ id: result.insertId, message: 'Presença registrada com sucesso', status: 'registrado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/presenca/manual', async (req, res) => {
    const { nome_aluno, matricula, motivo } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toTimeString().split(' ')[0];
    
    try {
        let alunoId = null;
        let turmaId = null;
        
        if (matricula) {
            const [alunos] = await pool.query('SELECT id FROM usuarios WHERE matricula = ? AND perfil = "aluno"', [matricula]);
            if (alunos.length > 0) {
                alunoId = alunos[0].id;
                const [turmas] = await pool.query('SELECT turma_id FROM alunos_turmas WHERE aluno_id = ? LIMIT 1', [alunoId]);
                if (turmas.length > 0) turmaId = turmas[0].turma_id;
            }
        }
        
        const [result] = await pool.query(
            `INSERT INTO presenca (aluno_id, turma_id, data, hora, tipo, status, observacao)
             VALUES (?, ?, ?, ?, 'manual', 'presente', ?)`,
            [alunoId, turmaId, hoje, agora, motivo || 'Registro manual via sistema']
        );
        
        res.json({ id: result.insertId, message: 'Presença registrada manualmente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// RELATÓRIOS GERAIS
// ============================================

app.get('/api/relatorio/presencas', async (req, res) => {
    const { data_inicio, data_fim } = req.query;
    
    let query = `
        SELECT u.nome as nome_aluno, u.matricula, p.data, p.hora, p.tempo_conectado, p.status
        FROM presenca p
        JOIN usuarios u ON u.id = p.aluno_id
        WHERE 1=1
    `;
    const params = [];
    
    if (data_inicio) {
        query += ` AND p.data >= ?`;
        params.push(data_inicio);
    }
    if (data_fim) {
        query += ` AND p.data <= ?`;
        params.push(data_fim);
    }
    
    query += ` ORDER BY p.data DESC, p.hora DESC`;
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/stats', async (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    
    try {
        const [totalDispositivos] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE perfil = "aluno" AND ativo = 1');
        const [presentesHoje] = await pool.query('SELECT COUNT(*) as total FROM presenca WHERE data = ? AND status = "presente"', [hoje]);
        const [manuaisHoje] = await pool.query('SELECT COUNT(*) as total FROM presenca WHERE data = ? AND tipo = "manual"', [hoje]);
        
        res.json({
            total_dispositivos: totalDispositivos[0]?.total || 0,
            presentes_hoje: presentesHoje[0]?.total || 0,
            registros_manuais_hoje: manuaisHoje[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 API disponível em http://localhost:${PORT}/api`);
});
