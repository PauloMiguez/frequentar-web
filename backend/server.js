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

// ============================================
// VALIDAÇÃO DE PRESENÇA DO ALUNO
// ============================================

// Função para verificar se o IP está dentro da faixa
function ipInRange(ip, cidr) {
    const [range, bits] = cidr.split('/');
    const mask = ~((1 << (32 - bits)) - 1);
    const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
    const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
}

// Rota para registrar presença do aluno (com validação)
app.post('/api/presenca/auto', async (req, res) => {
    const { mac_address, ssid, bssid, client_ip } = req.body;
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const horaAtual = agora.toTimeString().split(' ')[0];
    
    try {
        // 1. Verificar se o dispositivo está cadastrado
        const [usuarios] = await pool.query(
            'SELECT id, nome, matricula FROM usuarios WHERE mac_address = ? AND perfil = "aluno" AND ativo = 1',
            [mac_address]
        );
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Dispositivo não cadastrado' });
        }
        
        const aluno = usuarios[0];
        
        // 2. Verificar se o AP está cadastrado (BSSID + SSID)
        const [aps] = await pool.query(
            'SELECT * FROM access_points WHERE bssid = ? AND ssid = ? AND ativo = 1',
            [bssid, ssid]
        );
        
        if (aps.length === 0) {
            return res.status(403).json({ 
                error: 'Ponto de acesso não autorizado',
                message: 'Este ponto de acesso não está cadastrado no sistema'
            });
        }
        
        const ap = aps[0];
        
        // 3. Verificar se o IP do cliente está na faixa permitida
        if (client_ip && ap.ip_range) {
            if (!ipInRange(client_ip, ap.ip_range)) {
                return res.status(403).json({ 
                    error: 'IP fora da faixa permitida',
                    message: `IP ${client_ip} não está na faixa ${ap.ip_range}`
                });
            }
        }
        
        // 4. Buscar turma do aluno
        const [turmasAluno] = await pool.query(`
            SELECT t.id, t.nome, t.horario_inicio, t.horario_fim 
            FROM alunos_turmas at
            JOIN turmas t ON t.id = at.turma_id
            WHERE at.aluno_id = ?
        `, [aluno.id]);
        
        if (turmasAluno.length === 0) {
            return res.status(404).json({ error: 'Aluno não vinculado a nenhuma turma' });
        }
        
        const turma = turmasAluno[0];
        
        // 5. Verificar horário da aula
        const horaNum = parseInt(horaAtual.split(':')[0]);
        const minutoNum = parseInt(horaAtual.split(':')[1]);
        const horaAtualNum = horaNum + minutoNum / 60;
        
        const horaInicio = turma.horario_inicio ? 
            parseFloat(turma.horario_inicio.split(':')[0]) + parseFloat(turma.horario_inicio.split(':')[1]) / 60 : 7;
        const horaFim = turma.horario_fim ? 
            parseFloat(turma.horario_fim.split(':')[0]) + parseFloat(turma.horario_fim.split(':')[1]) / 60 : 12;
        
        if (horaAtualNum < horaInicio || horaAtualNum > horaFim) {
            return res.status(403).json({ 
                error: 'Fora do horário de aula',
                horario_aula: `${turma.horario_inicio || '07:00'} às ${turma.horario_fim || '12:00'}`
            });
        }
        
        // 6. Verificar se já registrou presença hoje
        const [existe] = await pool.query(
            'SELECT id FROM presenca WHERE aluno_id = ? AND data = ?',
            [aluno.id, hoje]
        );
        
        if (existe.length > 0) {
            return res.json({ message: 'Presença já registrada hoje', status: 'duplicado' });
        }
        
        // 7. Registrar presença
        const [result] = await pool.query(
            `INSERT INTO presenca (aluno_id, turma_id, data, hora, tipo, status, ap_id)
             VALUES (?, ?, ?, ?, 'wifi', 'presente', ?)`,
            [aluno.id, turma.id, hoje, horaAtual, ap.id]
        );
        
        console.log(`✅ Presença registrada: ${aluno.nome} - ${turma.nome} - AP: ${ap.sala} - ${horaAtual}`);
        
        res.json({ 
            id: result.insertId, 
            message: 'Presença registrada com sucesso', 
            status: 'registrado',
            aluno: aluno.nome,
            turma: turma.nome,
            sala: ap.sala,
            horario: horaAtual
        });
        
    } catch (error) {
        console.error('Erro no registro automático:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter APs (para uso no frontend)
app.get('/api/aps', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM access_points WHERE ativo = 1');
        res.json(rows);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTAS PARA PONTOS DE ACESSO (APs)
// ============================================

// Listar APs
app.get('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    try {
        const [rows] = await pool.query('SELECT * FROM access_points ORDER BY predio, sala');
        res.json(rows);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// Cadastrar AP
app.post('/api/admin/aps', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { bssid, ssid, sala, predio, andar, ip_range } = req.body;
    
    console.log('📝 Cadastrando AP:', { bssid, ssid, sala, predio, andar, ip_range });
    
    try {
        // Verificar se já existe
        const [existe] = await pool.query('SELECT id FROM access_points WHERE bssid = ?', [bssid]);
        if (existe.length > 0) {
            return res.status(400).json({ error: 'Este BSSID já está cadastrado' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO access_points (bssid, ssid, sala, predio, andar, ip_range, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [bssid, ssid, sala, predio, andar || null, ip_range || '10.0.0.0/8']
        );
        
        res.json({ id: result.insertId, message: 'Ponto de acesso cadastrado com sucesso' });
    } catch (error) { 
        console.error('Erro ao cadastrar AP:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Excluir AP
app.delete('/api/admin/aps/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM access_points WHERE id = ?', [id]);
        res.json({ message: 'Ponto de acesso excluído com sucesso' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTA PARA EDITAR PONTO DE ACESSO
// ============================================

app.put('/api/admin/aps/:id', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    const { bssid, ssid, sala, predio, andar, ip_range, ativo } = req.body;
    
    console.log(`📝 Editando AP ${id}:`, { bssid, ssid, sala, predio, andar, ip_range });
    
    try {
        await pool.query(
            'UPDATE access_points SET bssid = ?, ssid = ?, sala = ?, predio = ?, andar = ?, ip_range = ?, ativo = ? WHERE id = ?',
            [bssid, ssid, sala, predio, andar || null, ip_range || '10.0.0.0/8', ativo !== undefined ? ativo : 1, id]
        );
        res.json({ message: 'Ponto de acesso atualizado com sucesso' });
    } catch (error) { 
        console.error('Erro ao editar AP:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTAS DO PERFIL ALUNO
// ============================================

// Aluno - Estatísticas
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
    } catch (error) { 
        console.error('Erro em /aluno/stats:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Aluno - Histórico
app.get('/api/aluno/historico', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
    const { data_inicio, data_fim } = req.query;
    
    let query = `
        SELECT p.*, t.nome as turma_nome
        FROM presenca p
        LEFT JOIN turmas t ON t.id = p.turma_id
        WHERE p.aluno_id = ?
    `;
    const params = [req.usuario.id];
    
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
        console.error('Erro em /aluno/historico:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Aluno - Horário da turma
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
    } catch (error) { 
        console.error('Erro em /aluno/horario:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTAS DO PERFIL ALUNO
// ============================================

// Aluno - Estatísticas
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
        
        const resultado = presencas[0] || { presentes: 0, faltas: 0, totalDias: 0 };
        console.log(`📊 Aluno ${req.usuario.id}: ${resultado.presentes} presenças, ${resultado.faltas} faltas`);
        res.json(resultado);
    } catch (error) { 
        console.error('Erro em /aluno/stats:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Aluno - Histórico
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
        
        console.log(`📜 Aluno ${req.usuario.id}: ${rows.length} registros encontrados`);
        res.json(rows);
    } catch (error) { 
        console.error('Erro em /aluno/historico:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Aluno - Horário da turma
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
    } catch (error) { 
        console.error('Erro em /aluno/horario:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// ============================================
// ROTAS DO PERFIL PROFESSOR
// ============================================

// Professor - Estatísticas
app.get('/api/professor/stats', authMiddleware, async (req, res) => {
    if (req.usuario.perfil !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
    try {
        // Buscar turmas do professor
        const [turmas] = await pool.query(
            'SELECT COUNT(*) as total FROM professores_turmas WHERE professor_id = ?',
            [req.usuario.id]
        );
        
        // Buscar total de alunos
        const [alunos] = await pool.query(`
            SELECT COUNT(DISTINCT at.aluno_id) as total
            FROM professores_turmas pt
            JOIN alunos_turmas at ON at.turma_id = pt.turma_id
            WHERE pt.professor_id = ?
        `, [req.usuario.id]);
        
        // Buscar presenças de hoje
        const hoje = new Date().toISOString().split('T')[0];
        const [presentes] = await pool.query(`
            SELECT COUNT(DISTINCT p.aluno_id) as total
            FROM presenca p
            JOIN alunos_turmas at ON at.aluno_id = p.aluno_id
            JOIN professores_turmas pt ON pt.turma_id = at.turma_id
            WHERE pt.professor_id = ? AND p.data = ? AND p.status = 'presente'
        `, [req.usuario.id, hoje]);
        
        res.json({
            totalTurmas: turmas[0]?.total || 0,
            totalAlunos: alunos[0]?.total || 0,
            presentesHoje: presentes[0]?.total || 0
        });
    } catch (error) { 
        console.error('Erro em /professor/stats:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Professor - Listar turmas
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
    } catch (error) { 
        console.error('Erro em /professor/turmas:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Professor - Alunos de uma turma
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
    } catch (error) { 
        console.error('Erro em /professor/turmas/:id/alunos:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Professor - Registrar presença
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
    } catch (error) { 
        console.error('Erro em /professor/presenca:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// Professor - Relatórios
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
    } catch (error) { 
        console.error('Erro em /professor/relatorios:', error);
        res.status(500).json({ error: error.message }); 
    }
});
