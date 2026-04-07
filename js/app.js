// ============================================
// FREQUENTAR - SISTEMA DE PRESENÇA POR WI-FI
// Versão 4.0 - Multiperfil
// ============================================

// Configuração da API
let API_URL = 'http://localhost:3000/api';
let token = null;
let usuarioAtual = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAutoLogin();
});

// Configurar event listeners globais
function setupEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.querySelectorAll('#loginEmail, #loginPassword').forEach(input => {
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    });
    
    // Logouts
    document.getElementById('adminLogoutBtn').addEventListener('click', () => handleLogout('admin'));
    document.getElementById('profLogoutBtn').addEventListener('click', () => handleLogout('professor'));
    document.getElementById('alunoLogoutBtn').addEventListener('click', () => handleLogout('aluno'));
    
    // Navegação dinâmica (será configurada após login)
}

// ============================================
// AUTENTICAÇÃO
// ============================================

async function checkAutoLogin() {
    const savedToken = localStorage.getItem('token');
    const savedUsuario = localStorage.getItem('usuario');
    
    if (savedToken && savedUsuario) {
        token = savedToken;
        usuarioAtual = JSON.parse(savedUsuario);
        
        if (usuarioAtual.perfil === 'admin') await carregarPainelAdmin();
        else if (usuarioAtual.perfil === 'professor') await carregarPainelProfessor();
        else if (usuarioAtual.perfil === 'aluno') await carregarPainelAluno();
        
        mostrarTelaPrincipal(usuarioAtual.perfil);
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const perfilSelecionado = document.getElementById('loginPerfil').value;
    
    if (!email || !password) {
        showToast('Preencha e-mail e senha', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/login-multi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, perfil: perfilSelecionado })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            usuarioAtual = data.usuario;
            localStorage.setItem('token', token);
            localStorage.setItem('usuario', JSON.stringify(usuarioAtual));
            
            if (usuarioAtual.perfil === 'admin') await carregarPainelAdmin();
            else if (usuarioAtual.perfil === 'professor') await carregarPainelProfessor();
            else if (usuarioAtual.perfil === 'aluno') await carregarPainelAluno();
            
            mostrarTelaPrincipal(usuarioAtual.perfil);
            showToast(`Bem-vindo, ${usuarioAtual.nome}!`, 'success');
        } else {
            showToast(data.error || 'Credenciais inválidas', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor', 'error');
    }
}

function handleLogout(perfil) {
    token = null;
    usuarioAtual = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('adminScreen').classList.remove('active');
    document.getElementById('professorScreen').classList.remove('active');
    document.getElementById('alunoScreen').classList.remove('active');
    
    // Resetar campos de login
    document.getElementById('loginEmail').value = 'admin@escola.com';
    document.getElementById('loginPassword').value = 'admin123';
    document.getElementById('loginPerfil').value = 'admin';
    
    showToast('Logout realizado', 'info');
}

function mostrarTelaPrincipal(perfil) {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('adminScreen').classList.remove('active');
    document.getElementById('professorScreen').classList.remove('active');
    document.getElementById('alunoScreen').classList.remove('active');
    
    if (perfil === 'admin') document.getElementById('adminScreen').classList.add('active');
    else if (perfil === 'professor') document.getElementById('professorScreen').classList.add('active');
    else if (perfil === 'aluno') document.getElementById('alunoScreen').classList.add('active');
}

// ============================================
// PAINEL DO ADMINISTRADOR
// ============================================

async function carregarPainelAdmin() {
    // Configurar navegação do admin
    document.querySelectorAll('#adminScreen .nav-item').forEach(item => {
        item.removeEventListener('click', () => {});
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('#adminScreen .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            carregarConteudoAdmin(tab);
        });
    });
    
    document.getElementById('adminUserName').textContent = usuarioAtual.nome;
    document.getElementById('adminUserEmail').textContent = usuarioAtual.email;
    
    await carregarConteudoAdmin('admin-dashboard');
}

async function carregarConteudoAdmin(tab) {
    const titles = {
        'admin-dashboard': 'Dashboard',
        'admin-alunos': 'Gerenciar Alunos',
        'admin-professores': 'Gerenciar Professores',
        'admin-turmas': 'Gerenciar Turmas',
        'admin-aps': 'Pontos de Acesso (APs)',
        'admin-presenca': 'Presença',
        'admin-relatorios': 'Relatórios',
        'admin-config': 'Configurações'
    };
    document.getElementById('adminPageTitle').textContent = titles[tab] || 'Dashboard';
    
    const content = document.getElementById('adminContent');
    
    switch(tab) {
        case 'admin-dashboard':
            await carregarAdminDashboard(content);
            break;
        case 'admin-alunos':
            await carregarAdminAlunos(content);
            break;
        case 'admin-professores':
            await carregarAdminProfessores(content);
            break;
        case 'admin-turmas':
            await carregarAdminTurmas(content);
            break;
        case 'admin-aps':
            await carregarAdminAPs(content);
            break;
        case 'admin-presenca':
            await carregarAdminPresenca(content);
            break;
        case 'admin-relatorios':
            await carregarAdminRelatorios(content);
            break;
        case 'admin-config':
            await carregarAdminConfig(content);
            break;
    }
}

async function carregarAdminDashboard(container) {
    try {
        const stats = await apiGet('/admin/stats');
        const alunosRecentes = await apiGet('/admin/alunos/recentes');
        const faltasAltas = await apiGet('/admin/alunos/faltas-altas');
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${stats.totalAlunos || 0}</h3><p>Total de Alunos</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-chalkboard-user"></i></div><div class="stat-info"><h3>${stats.totalProfessores || 0}</h3><p>Professores</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-school"></i></div><div class="stat-info"><h3>${stats.totalTurmas || 0}</h3><p>Turmas</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-wifi"></i></div><div class="stat-info"><h3>${stats.totalAPs || 0}</h3><p>Pontos de Acesso</p></div></div>
            </div>
            
            <div class="card"><h3><i class="fas fa-exclamation-triangle"></i> Alunos com Alta Taxa de Faltas</h3>
                ${faltasAltas.length === 0 ? '<p>Nenhum aluno com alta taxa de faltas</p>' : `
                    <table class="data-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Taxa de Falta</th><th>Ações</th></tr></thead><tbody>
                    ${faltasAltas.map(aluno => `
                        <tr><td>${escapeHtml(aluno.nome)}</td><td>${escapeHtml(aluno.matricula)}</td><td class="status-ausente">${aluno.taxaFalta}%</td>
                        <td><button class="btn-sm btn-outline" onclick="verAlunoFaltas(${aluno.id})">Ver Detalhes</button></td></tr>
                    `).join('')}</tbody></table>
                `}
            </div>
            
            <div class="card"><h3><i class="fas fa-clock"></i> Últimos Registros</h3>
                ${alunosRecentes.length === 0 ? '<p>Nenhum registro recente</p>' : `
                    <table class="data-table"><thead><tr><th>Aluno</th><th>Data/Hora</th><th>Status</th></tr></thead><tbody>
                    ${alunosRecentes.map(reg => `
                        <tr><td>${escapeHtml(reg.nome_aluno)}</td><td>${formatDateTime(reg.data_conexao)}</td><td class="status-presente">Presente</td></tr>
                    `).join('')}</tbody></table>
                `}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>';
    }
}

async function carregarAdminAlunos(container) {
    try {
        const alunos = await apiGet('/admin/alunos');
        const turmas = await apiGet('/turmas');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-user-plus"></i> Cadastrar Aluno</h3>
                <div class="form-row"><input type="text" id="novoAlunoNome" placeholder="Nome completo"><input type="text" id="novoAlunoMatricula" placeholder="Matrícula"></div>
                <div class="form-row"><input type="email" id="novoAlunoEmail" placeholder="E-mail"><select id="novoAlunoTurma"><option value="">Selecionar Turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div>
                <button id="salvarAlunoBtn" class="btn btn-primary">Cadastrar Aluno</button>
            </div>
            <div class="card"><h3><i class="fas fa-list"></i> Lista de Alunos</h3>
                <input type="text" id="filtroAluno" placeholder="Buscar por nome ou matrícula..." class="filter-input" style="margin-bottom:15px">
                <div id="listaAlunos">${renderizarTabelaAlunos(alunos)}</div>
            </div>
        `;
        
        document.getElementById('salvarAlunoBtn').onclick = async () => {
            const nome = document.getElementById('novoAlunoNome').value.trim();
            const matricula = document.getElementById('novoAlunoMatricula').value.trim();
            const email = document.getElementById('novoAlunoEmail').value.trim();
            const turmaId = document.getElementById('novoAlunoTurma').value;
            
            if (!nome || !matricula || !email) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPost('/admin/alunos', { nome, matricula, email, turmaId: turmaId || null });
                showToast('Aluno cadastrado com sucesso!', 'success');
                await carregarAdminAlunos(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
        document.getElementById('filtroAluno').oninput = (e) => {
            const filtro = e.target.value.toLowerCase();
            const linhas = document.querySelectorAll('#listaAlunos .aluno-row');
            linhas.forEach(linha => {
                const text = linha.textContent.toLowerCase();
                linha.style.display = text.includes(filtro) ? '' : 'none';
            });
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar alunos</div>';
    }
}

function renderizarTabelaAlunos(alunos) {
    if (!alunos.length) return '<p>Nenhum aluno cadastrado</p>';
    return `
        <table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Turma</th><th>Ações</th></tr></thead><tbody>
        ${alunos.map(aluno => `
            <tr class="aluno-row" data-id="${aluno.id}">
                <td>${escapeHtml(aluno.nome)}</td><td>${escapeHtml(aluno.matricula)}</td><td>${escapeHtml(aluno.email)}</td>
                <td>${escapeHtml(aluno.turma_nome || '-')}</td>
                <td><button class="btn-sm btn-outline" onclick="editarAluno(${aluno.id})">Editar</button> <button class="btn-sm btn-danger" onclick="excluirAluno(${aluno.id})">Excluir</button></td>
            </tr>
        `).join('')}</tbody></table>
    `;
}

async function carregarAdminProfessores(container) {
    try {
        const professores = await apiGet('/admin/professores');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-user-plus"></i> Cadastrar Professor</h3>
                <div class="form-row"><input type="text" id="novoProfNome" placeholder="Nome completo"><input type="email" id="novoProfEmail" placeholder="E-mail"></div>
                <div class="form-row"><input type="text" id="novoProfMatricula" placeholder="Matrícula"><input type="text" id="novoProfDisciplina" placeholder="Disciplina"></div>
                <button id="salvarProfBtn" class="btn btn-primary">Cadastrar Professor</button>
            </div>
            <div class="card"><h3><i class="fas fa-list"></i> Lista de Professores</h3>
                <div id="listaProfessores">${renderizarTabelaProfessores(professores)}</div>
            </div>
        `;
        
        document.getElementById('salvarProfBtn').onclick = async () => {
            const nome = document.getElementById('novoProfNome').value.trim();
            const email = document.getElementById('novoProfEmail').value.trim();
            const matricula = document.getElementById('novoProfMatricula').value.trim();
            
            if (!nome || !email || !matricula) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPost('/admin/professores', { nome, email, matricula });
                showToast('Professor cadastrado com sucesso!', 'success');
                await carregarAdminProfessores(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar professores</div>';
    }
}

function renderizarTabelaProfessores(professores) {
    if (!professores.length) return '<p>Nenhum professor cadastrado</p>';
    return `
        <table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>
        ${professores.map(prof => `
            <tr><td>${escapeHtml(prof.nome)}</td><td>${escapeHtml(prof.matricula)}</td><td>${escapeHtml(prof.email)}</td>
            <td><button class="btn-sm btn-outline" onclick="editarProfessor(${prof.id})">Editar</button> <button class="btn-sm btn-danger" onclick="excluirProfessor(${prof.id})">Excluir</button></td></tr>
        `).join('')}</tbody></table>
    `;
}

async function carregarAdminTurmas(container) {
    try {
        const turmas = await apiGet('/turmas');
        const professores = await apiGet('/admin/professores');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-plus-circle"></i> Cadastrar Turma</h3>
                <div class="form-row"><input type="text" id="novaTurmaNome" placeholder="Nome da Turma"><input type="text" id="novaTurmaCodigo" placeholder="Código"></div>
                <div class="form-row"><select id="novaTurmaProfessor"><option value="">Selecionar Professor</option>${professores.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}</select>
                <input type="text" id="novaTurmaPeriodo" placeholder="Período (Matutino/Vespertino/Noturno)"></div>
                <button id="salvarTurmaBtn" class="btn btn-primary">Cadastrar Turma</button>
            </div>
            <div class="card"><h3><i class="fas fa-list"></i> Lista de Turmas</h3>
                <div id="listaTurmas">${renderizarTabelaTurmas(turmas)}</div>
            </div>
        `;
        
        document.getElementById('salvarTurmaBtn').onclick = async () => {
            const nome = document.getElementById('novaTurmaNome').value.trim();
            const codigo = document.getElementById('novaTurmaCodigo').value.trim();
            const professorId = document.getElementById('novaTurmaProfessor').value;
            const periodo = document.getElementById('novaTurmaPeriodo').value.trim();
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código da turma', 'error');
                return;
            }
            
            try {
                await apiPost('/turmas', { nome, codigo, professorId: professorId || null, periodo });
                showToast('Turma cadastrada com sucesso!', 'success');
                await carregarAdminTurmas(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar turmas</div>';
    }
}

function renderizarTabelaTurmas(turmas) {
    if (!turmas.length) return '<p>Nenhuma turma cadastrada</p>';
    return `
        <table class="data-table"><thead><tr><th>Nome</th><th>Código</th><th>Professor</th><th>Período</th><th>Ações</th></tr></thead><tbody>
        ${turmas.map(turma => `
            <tr><td>${escapeHtml(turma.nome)}</td><td>${escapeHtml(turma.codigo)}</td><td>${escapeHtml(turma.professor_nome || '-')}</td>
            <td>${escapeHtml(turma.periodo || '-')}</td>
            <td><button class="btn-sm btn-outline" onclick="editarTurma(${turma.id})">Editar</button> <button class="btn-sm btn-danger" onclick="excluirTurma(${turma.id})">Excluir</button></td></tr>
        `).join('')}</tbody></table>
    `;
}

async function carregarAdminAPs(container) {
    try {
        const aps = await apiGet('/admin/aps');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-plus-circle"></i> Cadastrar Ponto de Acesso (AP)</h3>
                <div class="form-row"><input type="text" id="novoAPBssid" placeholder="BSSID (MAC do AP)"><input type="text" id="novoAPSsid" placeholder="SSID"></div>
                <div class="form-row"><input type="text" id="novoAPSala" placeholder="Sala"><input type="text" id="novoAPPredio" placeholder="Prédio"></div>
                <div class="form-row"><input type="number" id="novoAPAndar" placeholder="Andar"></div>
                <button id="salvarAPBtn" class="btn btn-primary">Cadastrar AP</button>
            </div>
            <div class="card"><h3><i class="fas fa-list"></i> Pontos de Acesso Cadastrados</h3>
                <div id="listaAPs">${renderizarTabelaAPs(aps)}</div>
            </div>
        `;
        
        document.getElementById('salvarAPBtn').onclick = async () => {
            const bssid = document.getElementById('novoAPBssid').value.trim();
            const ssid = document.getElementById('novoAPSsid').value.trim();
            const sala = document.getElementById('novoAPSala').value.trim();
            const predio = document.getElementById('novoAPPredio').value.trim();
            const andar = document.getElementById('novoAPAndar').value;
            
            if (!bssid || !ssid || !sala) {
                showToast('Preencha BSSID, SSID e Sala', 'error');
                return;
            }
            
            try {
                await apiPost('/admin/aps', { bssid, ssid, sala, predio, andar: andar || null });
                showToast('AP cadastrado com sucesso!', 'success');
                await carregarAdminAPs(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar APs</div>';
    }
}

function renderizarTabelaAPs(aps) {
    if (!aps.length) return '<p>Nenhum ponto de acesso cadastrado</p>';
    return `
        <table class="data-table"><thead><tr><th>BSSID</th><th>SSID</th><th>Sala</th><th>Prédio</th><th>Andar</th><th>Ações</th></tr></thead><tbody>
        ${aps.map(ap => `
            <tr><td><code>${escapeHtml(ap.bssid)}</code></td><td>${escapeHtml(ap.ssid)}</td><td>${escapeHtml(ap.sala)}</td>
            <td>${escapeHtml(ap.predio || '-')}</td><td>${ap.andar || '-'}</td>
            <td><button class="btn-sm btn-danger" onclick="excluirAP(${ap.id})">Excluir</button></td></tr>
        `).join('')}</tbody></table>
    `;
}

async function carregarAdminPresenca(container) {
    try {
        const presencas = await apiGet('/admin/presenca/hoje');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-filter"></i> Filtros</h3>
                <div class="filter-bar">
                    <input type="date" id="filtroPresencaData" placeholder="Data">
                    <select id="filtroPresencaTurma"><option value="">Todas as Turmas</option></select>
                    <button id="aplicarFiltroPresenca" class="btn btn-primary">Filtrar</button>
                </div>
            </div>
            <div class="card"><h3><i class="fas fa-calendar-check"></i> Registros de Presença</h3>
                <div id="listaPresencas">${renderizarTabelaPresencas(presencas)}</div>
            </div>
        `;
        
        // Carregar turmas para o filtro
        const turmas = await apiGet('/turmas');
        const selectTurma = document.getElementById('filtroPresencaTurma');
        turmas.forEach(turma => {
            selectTurma.innerHTML += `<option value="${turma.id}">${escapeHtml(turma.nome)}</option>`;
        });
        
        document.getElementById('aplicarFiltroPresenca').onclick = async () => {
            const data = document.getElementById('filtroPresencaData').value;
            const turmaId = document.getElementById('filtroPresencaTurma').value;
            let url = '/admin/presenca';
            const params = [];
            if (data) params.push(`data=${data}`);
            if (turmaId) params.push(`turma_id=${turmaId}`);
            if (params.length) url += `?${params.join('&')}`;
            
            const presencasFiltradas = await apiGet(url);
            document.getElementById('listaPresencas').innerHTML = renderizarTabelaPresencas(presencasFiltradas);
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar presenças</div>';
    }
}

function renderizarTabelaPresencas(presencas) {
    if (!presencas.length) return '<p>Nenhum registro de presença encontrado</p>';
    return `
        <table class="data-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Data/Hora</th><th>Turma</th><th>Tipo</th><th>Tempo</th></tr></thead><tbody>
        ${presencas.map(p => `
            <tr><td>${escapeHtml(p.nome_aluno)}</td><td>${escapeHtml(p.matricula)}</td><td>${formatDateTime(p.data_conexao)}</td>
            <td>${escapeHtml(p.turma_nome || '-')}</td><td>${p.tipo === 'wifi' ? 'Wi-Fi' : 'Manual'}</td><td>${p.tempo_conectado || 0} min</td></tr>
        `).join('')}</tbody></table>
    `;
}

async function carregarAdminRelatorios(container) {
    try {
        const turmas = await apiGet('/turmas');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-file-pdf"></i> Gerar Relatório</h3>
                <div class="form-group"><label>Turma</label><select id="relatorioTurma"><option value="">Todas as Turmas</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div>
                <div class="form-row"><div class="form-group"><label>Data Início</label><input type="date" id="relatorioDataInicio"></div>
                <div class="form-group"><label>Data Fim</label><input type="date" id="relatorioDataFim"></div></div>
                <div class="form-group"><label>Período</label><select id="relatorioPeriodo"><option value="">Todos</option><option value="Matutino">Matutino</option><option value="Vespertino">Vespertino</option><option value="Noturno">Noturno</option></select></div>
                <button id="gerarRelatorioBtn" class="btn btn-primary"><i class="fas fa-download"></i> Gerar Relatório</button>
            </div>
            <div id="relatorioResultado" class="card" style="display:none"></div>
        `;
        
        document.getElementById('gerarRelatorioBtn').onclick = async () => {
            const turmaId = document.getElementById('relatorioTurma').value;
            const dataInicio = document.getElementById('relatorioDataInicio').value;
            const dataFim = document.getElementById('relatorioDataFim').value;
            const periodo = document.getElementById('relatorioPeriodo').value;
            
            let url = '/admin/relatorios';
            const params = [];
            if (turmaId) params.push(`turma_id=${turmaId}`);
            if (dataInicio) params.push(`data_inicio=${dataInicio}`);
            if (dataFim) params.push(`data_fim=${dataFim}`);
            if (periodo) params.push(`periodo=${periodo}`);
            if (params.length) url += `?${params.join('&')}`;
            
            const relatorio = await apiGet(url);
            const resultadoDiv = document.getElementById('relatorioResultado');
            
            resultadoDiv.innerHTML = `
                <h3>Resultado do Relatório</h3>
                <p><strong>Total de registros:</strong> ${relatorio.length}</p>
                ${renderizarTabelaPresencas(relatorio)}
                <button class="btn btn-outline" onclick="exportarRelatorio(${JSON.stringify(relatorio).replace(/"/g, '&quot;')})"><i class="fas fa-file-excel"></i> Exportar para CSV</button>
            `;
            resultadoDiv.style.display = 'block';
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>';
    }
}

async function carregarAdminConfig(container) {
    try {
        const wifiConfig = await apiGet('/wifi/config');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-network-wired"></i> Configuração da Rede Wi-Fi</h3>
                <div class="form-group"><label>SSID</label><input type="text" id="configSsid" value="${escapeHtml(wifiConfig.ssid || '')}" placeholder="Nome da rede Wi-Fi"></div>
                <div class="form-group"><label>Senha</label><input type="password" id="configPassword" value="${escapeHtml(wifiConfig.password || '')}" placeholder="Senha (opcional)"></div>
                <button id="saveWifiConfigBtn" class="btn btn-primary">Salvar Configuração</button>
            </div>
            <div class="card"><h3><i class="fas fa-database"></i> Backup do Banco de Dados</h3>
                <button id="backupBtn" class="btn btn-outline"><i class="fas fa-download"></i> Exportar Backup</button>
            </div>
        `;
        
        document.getElementById('saveWifiConfigBtn').onclick = async () => {
            const ssid = document.getElementById('configSsid').value.trim();
            const password = document.getElementById('configPassword').value;
            
            try {
                await apiPost('/wifi/config', { ssid, password: password || null });
                showToast('Configuração salva!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
        document.getElementById('backupBtn').onclick = () => {
            window.location.href = `${API_URL}/admin/backup`;
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar configurações</div>';
    }
}

// ============================================
// PAINEL DO PROFESSOR
// ============================================

async function carregarPainelProfessor() {
    document.querySelectorAll('#professorScreen .nav-item').forEach(item => {
        item.removeEventListener('click', () => {});
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('#professorScreen .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            carregarConteudoProfessor(tab);
        });
    });
    
    document.getElementById('profUserName').textContent = usuarioAtual.nome;
    document.getElementById('profUserEmail').textContent = usuarioAtual.email;
    
    await carregarConteudoProfessor('prof-dashboard');
}

async function carregarConteudoProfessor(tab) {
    const titles = {
        'prof-dashboard': 'Dashboard',
        'prof-turmas': 'Minhas Turmas',
        'prof-presenca': 'Registrar Presença',
        'prof-relatorios': 'Relatórios',
        'prof-config': 'Configurações'
    };
    document.getElementById('profPageTitle').textContent = titles[tab] || 'Dashboard';
    
    const content = document.getElementById('profContent');
    
    switch(tab) {
        case 'prof-dashboard':
            await carregarProfDashboard(content);
            break;
        case 'prof-turmas':
            await carregarProfTurmas(content);
            break;
        case 'prof-presenca':
            await carregarProfPresenca(content);
            break;
        case 'prof-relatorios':
            await carregarProfRelatorios(content);
            break;
        case 'prof-config':
            await carregarProfConfig(content);
            break;
    }
}

async function carregarProfDashboard(container) {
    try {
        const stats = await apiGet('/professor/stats');
        const turmas = await apiGet('/professor/turmas');
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${stats.totalAlunos || 0}</h3><p>Total de Alunos</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-school"></i></div><div class="stat-info"><h3>${turmas.length}</h3><p>Minhas Turmas</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><h3>${stats.presentesHoje || 0}</h3><p>Presentes Hoje</p></div></div>
            </div>
            <div class="card"><h3><i class="fas fa-school"></i> Minhas Turmas</h3>
                <div class="turmas-grid">${turmas.map(turma => `
                    <div class="turma-card" onclick="verTurmaProfessor(${turma.id})">
                        <h4>${escapeHtml(turma.nome)}</h4>
                        <p><i class="fas fa-code"></i> Código: ${escapeHtml(turma.codigo)}</p>
                        <p><i class="fas fa-clock"></i> Período: ${turma.periodo || 'Não definido'}</p>
                        <p><i class="fas fa-users"></i> Alunos: ${turma.totalAlunos || 0}</p>
                    </div>
                `).join('')}</div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>';
    }
}

async function carregarProfTurmas(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-list"></i> Minhas Turmas</h3>
                ${turmas.length === 0 ? '<p>Nenhuma turma atribuída</p>' : `
                    <div class="turmas-grid">${turmas.map(turma => `
                        <div class="turma-card" onclick="verDetalhesTurmaProfessor(${turma.id})">
                            <h4>${escapeHtml(turma.nome)}</h4>
                            <p><i class="fas fa-code"></i> Código: ${escapeHtml(turma.codigo)}</p>
                            <p><i class="fas fa-clock"></i> Período: ${turma.periodo || 'Não definido'}</p>
                            <p><i class="fas fa-users"></i> Alunos: ${turma.totalAlunos || 0}</p>
                            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();verAlunosTurmaProfessor(${turma.id})">Ver Alunos</button>
                        </div>
                    `).join('')}</div>
                `}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar turmas</div>';
    }
}

async function carregarProfPresenca(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-chalkboard-user"></i> Selecionar Turma</h3>
                <select id="presencaTurmaSelect" class="form-control">
                    <option value="">Selecione uma turma</option>
                    ${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}
                </select>
            </div>
            <div id="presencaAlunosContainer" style="display:none">
                <div class="card"><h3><i class="fas fa-users"></i> Registrar Presença</h3>
                    <div id="presencaAlunosLista"></div>
                    <button id="salvarPresencasBtn" class="btn btn-primary">Salvar Presenças</button>
                </div>
            </div>
        `;
        
        document.getElementById('presencaTurmaSelect').onchange = async (e) => {
            const turmaId = e.target.value;
            if (!turmaId) return;
            
            const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
            const containerAlunos = document.getElementById('presencaAlunosContainer');
            const listaAlunos = document.getElementById('presencaAlunosLista');
            
            listaAlunos.innerHTML = `
                <table class="data-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Status</th><th>Observação</th></tr></thead><tbody>
                ${alunos.map(aluno => `
                    <tr>
                        <td>${escapeHtml(aluno.nome)}</td>
                        <td>${escapeHtml(aluno.matricula)}</td>
                        <td><select class="status-select" data-aluno="${aluno.id}"><option value="presente">Presente</option><option value="ausente">Ausente</option><option value="justificado">Justificado</option></select></td>
                        <td><input type="text" class="obs-input" data-aluno="${aluno.id}" placeholder="Observação (opcional)"></td>
                    </tr>
                `).join('')}</tbody></table>
            `;
            
            containerAlunos.style.display = 'block';
        };
        
        document.getElementById('salvarPresencasBtn').onclick = async () => {
            const turmaId = document.getElementById('presencaTurmaSelect').value;
            const statusSelecionados = document.querySelectorAll('.status-select');
            const observacoes = document.querySelectorAll('.obs-input');
            
            const presencas = [];
            statusSelecionados.forEach(select => {
                const alunoId = select.dataset.aluno;
                const obs = Array.from(observacoes).find(o => o.dataset.aluno === alunoId)?.value || '';
                presencas.push({
                    aluno_id: parseInt(alunoId),
                    status: select.value,
                    observacao: obs
                });
            });
            
            try {
                await apiPost('/professor/presenca', { turma_id: parseInt(turmaId), presencas });
                showToast('Presenças registradas com sucesso!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar registro de presença</div>';
    }
}

async function carregarProfRelatorios(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-file-alt"></i> Relatórios de Frequência</h3>
                <div class="form-group"><label>Turma</label><select id="relatorioTurmaProf"><option value="">Selecione uma turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div>
                <div class="form-row"><div class="form-group"><label>Data Início</label><input type="date" id="relatorioProfDataInicio"></div>
                <div class="form-group"><label>Data Fim</label><input type="date" id="relatorioProfDataFim"></div></div>
                <button id="gerarRelatorioProfBtn" class="btn btn-primary">Gerar Relatório</button>
            </div>
            <div id="relatorioProfResultado" class="card" style="display:none"></div>
        `;
        
        document.getElementById('gerarRelatorioProfBtn').onclick = async () => {
            const turmaId = document.getElementById('relatorioTurmaProf').value;
            const dataInicio = document.getElementById('relatorioProfDataInicio').value;
            const dataFim = document.getElementById('relatorioProfDataFim').value;
            
            if (!turmaId) {
                showToast('Selecione uma turma', 'error');
                return;
            }
            
            let url = `/professor/relatorios?turma_id=${turmaId}`;
            if (dataInicio) url += `&data_inicio=${dataInicio}`;
            if (dataFim) url += `&data_fim=${dataFim}`;
            
            const relatorio = await apiGet(url);
            const resultadoDiv = document.getElementById('relatorioProfResultado');
            
            resultadoDiv.innerHTML = `
                <h3>Relatório de Frequência</h3>
                <p><strong>Total de registros:</strong> ${relatorio.length}</p>
                ${renderizarTabelaPresencas(relatorio)}
                <button class="btn btn-outline" onclick="exportarRelatorio(${JSON.stringify(relatorio).replace(/"/g, '&quot;')})">Exportar para CSV</button>
            `;
            resultadoDiv.style.display = 'block';
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>';
    }
}

async function carregarProfConfig(container) {
    container.innerHTML = `
        <div class="card"><h3><i class="fas fa-user-edit"></i> Meus Dados</h3>
            <div class="form-group"><label>Nome</label><input type="text" id="profNome" value="${escapeHtml(usuarioAtual.nome)}"></div>
            <div class="form-group"><label>E-mail</label><input type="email" id="profEmail" value="${escapeHtml(usuarioAtual.email)}"></div>
            <div class="form-group"><label>Nova Senha</label><input type="password" id="profNovaSenha" placeholder="Deixe em branco para manter a atual"></div>
            <button id="salvarProfConfigBtn" class="btn btn-primary">Salvar Alterações</button>
        </div>
    `;
    
    document.getElementById('salvarProfConfigBtn').onclick = async () => {
        const nome = document.getElementById('profNome').value.trim();
        const email = document.getElementById('profEmail').value.trim();
        const senha = document.getElementById('profNovaSenha').value;
        
        try {
            await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined });
            usuarioAtual.nome = nome;
            usuarioAtual.email = email;
            localStorage.setItem('usuario', JSON.stringify(usuarioAtual));
            document.getElementById('profUserName').textContent = nome;
            showToast('Dados atualizados!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
}

// ============================================
// PAINEL DO ALUNO
// ============================================

async function carregarPainelAluno() {
    document.querySelectorAll('#alunoScreen .nav-item').forEach(item => {
        item.removeEventListener('click', () => {});
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('#alunoScreen .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            carregarConteudoAluno(tab);
        });
    });
    
    document.getElementById('alunoUserName').textContent = usuarioAtual.nome;
    document.getElementById('alunoUserEmail').textContent = usuarioAtual.email;
    
    await carregarConteudoAluno('aluno-dashboard');
}

async function carregarConteudoAluno(tab) {
    const titles = {
        'aluno-dashboard': 'Minha Frequência',
        'aluno-presenca': 'Registrar Presença',
        'aluno-relatorios': 'Meus Relatórios',
        'aluno-config': 'Configurações'
    };
    document.getElementById('alunoPageTitle').textContent = titles[tab] || 'Minha Frequência';
    
    const content = document.getElementById('alunoContent');
    
    switch(tab) {
        case 'aluno-dashboard':
            await carregarAlunoDashboard(content);
            break;
        case 'aluno-presenca':
            await carregarAlunoPresenca(content);
            break;
        case 'aluno-relatorios':
            await carregarAlunoRelatorios(content);
            break;
        case 'aluno-config':
            await carregarAlunoConfig(content);
            break;
    }
}

async function carregarAlunoDashboard(container) {
    try {
        const stats = await apiGet('/aluno/stats');
        const historico = await apiGet('/aluno/historico');
        
        const percentualFrequencia = stats.totalDias > 0 ? Math.round((stats.presentes / stats.totalDias) * 100) : 0;
        let statusClasse = '';
        let statusTexto = '';
        
        if (percentualFrequencia >= 75) {
            statusClasse = 'status-presente';
            statusTexto = 'Boa frequência! Continue assim!';
        } else if (percentualFrequencia >= 50) {
            statusClasse = 'status-justificado';
            statusTexto = 'Atenção! Sua frequência está baixa.';
        } else {
            statusClasse = 'status-ausente';
            statusTexto = 'Risco de reprovação por falta! Procure a coordenação.';
        }
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><h3>${stats.presentes || 0}</h3><p>Presenças</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-times"></i></div><div class="stat-info"><h3>${stats.faltas || 0}</h3><p>Faltas</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-info"><h3>${percentualFrequencia}%</h3><p>Frequência</p></div></div>
            </div>
            
            <div class="card ${statusClasse}">
                <h3><i class="fas fa-chart-simple"></i> Seu Desempenho</h3>
                <p>${statusTexto}</p>
                <div class="progress-bar"><div class="progress-fill" style="width: ${percentualFrequencia}%"></div></div>
                <p class="progress-label">Frequência: ${percentualFrequencia}% (Mínimo necessário: 75%)</p>
            </div>
            
            <div class="card"><h3><i class="fas fa-history"></i> Últimos Registros</h3>
                ${historico.length === 0 ? '<p>Nenhum registro encontrado</p>' : `
                    <table class="data-table"><thead><tr><th>Data</th><th>Horário</th><th>Status</th><th>Turma</th></tr></thead><tbody>
                    ${historico.map(reg => `
                        <tr><td>${formatDate(reg.data_conexao)}</td><td>${reg.hora_conexao || '-'}</td><td class="status-presente">Presente</td><td>${escapeHtml(reg.turma_nome || '-')}</td></tr>
                    `).join('')}</tbody></table>
                `}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>';
    }
}

async function carregarAlunoPresenca(container) {
    try {
        const deviceId = localStorage.getItem('deviceId') || 'dispositivo-' + Date.now();
        if (!localStorage.getItem('deviceId')) localStorage.setItem('deviceId', deviceId);
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-wifi"></i> Registrar Presença Automática</h3>
                <p>Conecte-se à rede Wi-Fi da escola para ter sua presença registrada automaticamente.</p>
                <div class="wifi-status" id="wifiStatus"><i class="fas fa-spinner fa-pulse"></i> Verificando conexão...</div>
                <button id="registrarManualAlunoBtn" class="btn btn-warning">Registrar Presença Manualmente</button>
            </div>
            <div class="card"><h3><i class="fas fa-qrcode"></i> Seu QR Code de Identificação</h3>
                <div id="qrcode" style="text-align:center; padding:20px"></div>
                <p style="text-align:center; margin-top:10px">Mostre este QR Code ao professor para registro manual</p>
            </div>
        `;
        
        // Simular verificação de Wi-Fi
        const wifiStatus = document.getElementById('wifiStatus');
        setTimeout(() => {
            wifiStatus.innerHTML = '<i class="fas fa-wifi"></i> Conectado à rede escolar! Presença registrada automaticamente.';
            wifiStatus.style.background = '#d1fae5';
            wifiStatus.style.color = '#065f46';
        }, 2000);
        
        document.getElementById('registrarManualAlunoBtn').onclick = async () => {
            try {
                await apiPost('/aluno/presenca/manual', {});
                showToast('Presença registrada manualmente!', 'success');
                await carregarAlunoDashboard(document.getElementById('alunoContent'));
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
        // Gerar QR Code (usando API externa)
        const qrDiv = document.getElementById('qrcode');
        const qrUrl = `${API_URL}/aluno/qrcode?token=${token}`;
        qrDiv.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" alt="QR Code">`;
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar registro de presença</div>';
    }
}

async function carregarAlunoRelatorios(container) {
    try {
        const historico = await apiGet('/aluno/historico');
        
        container.innerHTML = `
            <div class="card"><h3><i class="fas fa-file-alt"></i> Meu Histórico Completo</h3>
                <div class="filter-bar"><input type="date" id="alunoFiltroDataInicio" placeholder="Data Início"><input type="date" id="alunoFiltroDataFim" placeholder="Data Fim"><button id="alunoFiltrarBtn" class="btn btn-primary">Filtrar</button></div>
                <div id="alunoHistoricoLista">${renderizarTabelaPresencas(historico)}</div>
                <button id="exportarAlunoCSV" class="btn btn-outline"><i class="fas fa-file-excel"></i> Exportar CSV</button>
            </div>
        `;
        
        document.getElementById('alunoFiltrarBtn').onclick = async () => {
            const dataInicio = document.getElementById('alunoFiltroDataInicio').value;
            const dataFim = document.getElementById('alunoFiltroDataFim').value;
            let url = '/aluno/historico';
            const params = [];
            if (dataInicio) params.push(`data_inicio=${dataInicio}`);
            if (dataFim) params.push(`data_fim=${dataFim}`);
            if (params.length) url += `?${params.join('&')}`;
            
            const filtrado = await apiGet(url);
            document.getElementById('alunoHistoricoLista').innerHTML = renderizarTabelaPresencas(filtrado);
        };
        
        document.getElementById('exportarAlunoCSV').onclick = () => {
            exportarRelatorio(historico);
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>';
    }
}

async function carregarAlunoConfig(container) {
    container.innerHTML = `
        <div class="card"><h3><i class="fas fa-user-edit"></i> Meus Dados</h3>
            <div class="form-group"><label>Nome</label><input type="text" id="alunoNome" value="${escapeHtml(usuarioAtual.nome)}"></div>
            <div class="form-group"><label>E-mail</label><input type="email" id="alunoEmail" value="${escapeHtml(usuarioAtual.email)}"></div>
            <div class="form-group"><label>Matrícula</label><input type="text" id="alunoMatricula" value="${escapeHtml(usuarioAtual.matricula || '')}" disabled></div>
            <div class="form-group"><label>Nova Senha</label><input type="password" id="alunoNovaSenha" placeholder="Deixe em branco para manter a atual"></div>
            <button id="salvarAlunoConfigBtn" class="btn btn-primary">Salvar Alterações</button>
        </div>
        <div class="card"><h3><i class="fas fa-mobile-alt"></i> Dispositivo</h3>
            <p><strong>Device ID:</strong> <code id="deviceIdDisplay">${localStorage.getItem('deviceId') || 'Não configurado'}</code></p>
            <button id="gerarNovoDeviceId" class="btn btn-sm btn-outline">Gerar Novo ID</button>
        </div>
    `;
    
    document.getElementById('salvarAlunoConfigBtn').onclick = async () => {
        const nome = document.getElementById('alunoNome').value.trim();
        const email = document.getElementById('alunoEmail').value.trim();
        const senha = document.getElementById('alunoNovaSenha').value;
        
        try {
            await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined });
            usuarioAtual.nome = nome;
            usuarioAtual.email = email;
            localStorage.setItem('usuario', JSON.stringify(usuarioAtual));
            document.getElementById('alunoUserName').textContent = nome;
            showToast('Dados atualizados!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
    
    document.getElementById('gerarNovoDeviceId').onclick = () => {
        const novoId = 'device-' + Date.now() + '-' + Math.random().toString(36).substring(7);
        localStorage.setItem('deviceId', novoId);
        document.getElementById('deviceIdDisplay').textContent = novoId;
        showToast('Novo Device ID gerado!', 'success');
    };
}

// ============================================
// FUNÇÕES AUXILIARES GLOBAIS
// ============================================

function exportarRelatorio(dados) {
    if (!dados || !dados.length) {
        showToast('Nenhum dado para exportar', 'error');
        return;
    }
    
    let csv = 'Aluno,Matrícula,Data,Hora,Status,Tempo\n';
    dados.forEach(item => {
        csv += `"${escapeCsv(item.nome_aluno || item.nome)}","${escapeCsv(item.matricula)}","${formatDate(item.data_conexao)}","${item.hora_conexao || ''}","${item.status || 'Presente'}","${item.tempo_conectado || 0}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `relatorio_presenca_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCsv(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
}

window.verAlunoFaltas = (id) => {
    showToast(`Ver detalhes do aluno ${id}`, 'info');
};

window.editarAluno = (id) => {
    showToast(`Editar aluno ${id}`, 'info');
};

window.excluirAluno = async (id) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
        try {
            await apiDelete(`/admin/alunos/${id}`);
            showToast('Aluno excluído!', 'success');
            location.reload();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.editarProfessor = (id) => {
    showToast(`Editar professor ${id}`, 'info');
};

window.excluirProfessor = async (id) => {
    if (confirm('Tem certeza que deseja excluir este professor?')) {
        try {
            await apiDelete(`/admin/professores/${id}`);
            showToast('Professor excluído!', 'success');
            location.reload();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.editarTurma = (id) => {
    showToast(`Editar turma ${id}`, 'info');
};

window.excluirTurma = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta turma?')) {
        try {
            await apiDelete(`/turmas/${id}`);
            showToast('Turma excluída!', 'success');
            location.reload();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.excluirAP = async (id) => {
    if (confirm('Tem certeza que deseja excluir este ponto de acesso?')) {
        try {
            await apiDelete(`/admin/aps/${id}`);
            showToast('AP excluído!', 'success');
            location.reload();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.verTurmaProfessor = (id) => {
    showToast(`Ver detalhes da turma ${id}`, 'info');
};

window.verDetalhesTurmaProfessor = (id) => {
    showToast(`Detalhes da turma ${id}`, 'info');
};

window.verAlunosTurmaProfessor = (id) => {
    showToast(`Ver alunos da turma ${id}`, 'info');
};

// ============================================
// FUNÇÕES DE FORMATAÇÃO E UTILITÁRIOS
// ============================================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR');
    } catch {
        return dateStr;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// API Helpers
async function apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: token ? { 'Authorization': token } : {}
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    return response.json();
}

async function apiPost(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': token })
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    return response.json();
}

async function apiPut(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': token })
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    return response.json();
}

async function apiDelete(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': token } : {}
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    return response.json();
}

async function getErrorMessage(response) {
    try {
        const data = await response.json();
        return data.error || data.message || 'Erro na requisição';
    } catch {
        return 'Erro na requisição';
    }
}
