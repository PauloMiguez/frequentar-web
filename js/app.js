let API_URL = 'http://localhost:3000/api';
let token = null;
let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAutoLogin();
});

function setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('adminLogoutBtn').addEventListener('click', () => handleLogout('admin'));
    document.getElementById('profLogoutBtn').addEventListener('click', () => handleLogout('professor'));
    document.getElementById('alunoLogoutBtn').addEventListener('click', () => handleLogout('aluno'));
}

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
        } else { showToast(data.error || 'Credenciais inválidas', 'error'); }
    } catch (error) { showToast('Erro de conexão', 'error'); }
}

function handleLogout() {
    token = null;
    usuarioAtual = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('adminScreen').classList.remove('active');
    document.getElementById('professorScreen').classList.remove('active');
    document.getElementById('alunoScreen').classList.remove('active');
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
    document.querySelectorAll('#adminScreen .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#adminScreen .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            carregarConteudoAdmin(item.dataset.tab);
        });
    });
    document.getElementById('adminUserName').textContent = usuarioAtual.nome;
    document.getElementById('adminUserEmail').textContent = usuarioAtual.email;
    await carregarConteudoAdmin('admin-dashboard');
}

async function carregarConteudoAdmin(tab) {
    const titles = { 'admin-dashboard': 'Dashboard', 'admin-alunos': 'Gerenciar Alunos', 'admin-professores': 'Gerenciar Professores', 'admin-turmas': 'Gerenciar Turmas', 'admin-aps': 'Pontos de Acesso', 'admin-presenca': 'Presença', 'admin-relatorios': 'Relatórios', 'admin-config': 'Configurações' };
    document.getElementById('adminPageTitle').textContent = titles[tab] || 'Dashboard';
    const content = document.getElementById('adminContent');
    if (tab === 'admin-dashboard') await carregarAdminDashboard(content);
    else if (tab === 'admin-alunos') await carregarAdminAlunos(content);
    else if (tab === 'admin-professores') await carregarAdminProfessores(content);
    else if (tab === 'admin-turmas') await carregarAdminTurmas(content);
    else if (tab === 'admin-aps') await carregarAdminAPs(content);
    else if (tab === 'admin-presenca') await carregarAdminPresenca(content);
    else if (tab === 'admin-relatorios') await carregarAdminRelatorios(content);
    else if (tab === 'admin-config') await carregarAdminConfig(content);
}

async function carregarAdminDashboard(container) {
    try {
        const stats = await apiGet('/admin/stats');
        container.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${stats.totalAlunos || 0}</h3><p>Total de Alunos</p></div></div><div class="stat-card"><div class="stat-icon"><i class="fas fa-chalkboard-user"></i></div><div class="stat-info"><h3>${stats.totalProfessores || 0}</h3><p>Professores</p></div></div><div class="stat-card"><div class="stat-icon"><i class="fas fa-school"></i></div><div class="stat-info"><h3>${stats.totalTurmas || 0}</h3><p>Turmas</p></div></div><div class="stat-card"><div class="stat-icon"><i class="fas fa-wifi"></i></div><div class="stat-info"><h3>${stats.totalAPs || 0}</h3><p>Pontos de Acesso</p></div></div></div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>'; }
}

async function carregarAdminAlunos(container) {
    try {
        const alunos = await apiGet('/admin/alunos');
        const turmas = await apiGet('/turmas');
        container.innerHTML = `<div class="card"><h3>Cadastrar Aluno</h3><div class="form-row"><input type="text" id="novoAlunoNome" placeholder="Nome completo"><input type="text" id="novoAlunoMatricula" placeholder="Matrícula"></div><div class="form-row"><input type="email" id="novoAlunoEmail" placeholder="E-mail"><select id="novoAlunoTurma"><option value="">Selecionar Turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div><button id="salvarAlunoBtn" class="btn btn-primary">Cadastrar Aluno</button></div><div class="card"><h3>Lista de Alunos</h3><input type="text" id="filtroAluno" placeholder="Buscar por nome ou matrícula..." class="filter-input"><div id="listaAlunos">${renderizarTabelaAlunos(alunos)}</div></div>`;
        document.getElementById('salvarAlunoBtn').onclick = async () => {
            const nome = document.getElementById('novoAlunoNome').value.trim(), matricula = document.getElementById('novoAlunoMatricula').value.trim(), email = document.getElementById('novoAlunoEmail').value.trim(), turmaId = document.getElementById('novoAlunoTurma').value;
            if (!nome || !matricula || !email) { showToast('Preencha todos os campos', 'error'); return; }
            try { await apiPost('/admin/alunos', { nome, matricula, email, turmaId: turmaId || null }); showToast('Aluno cadastrado!', 'success'); await carregarAdminAlunos(container);
            } catch (error) { showToast(error.message, 'error'); }
        };
        document.getElementById('filtroAluno').oninput = (e) => { const filtro = e.target.value.toLowerCase(); document.querySelectorAll('#listaAlunos .aluno-row').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(filtro) ? '' : 'none'; }); };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar alunos</div>'; }
}

async function carregarAdminProfessores(container) {
    try {
        const professores = await apiGet('/admin/professores');
        container.innerHTML = `<div class="card"><h3>Cadastrar Professor</h3><div class="form-row"><input type="text" id="novoProfNome" placeholder="Nome completo"><input type="email" id="novoProfEmail" placeholder="E-mail"></div><div class="form-row"><input type="text" id="novoProfMatricula" placeholder="Matrícula"></div><button id="salvarProfBtn" class="btn btn-primary">Cadastrar Professor</button></div><div class="card"><h3>Lista de Professores</h3><div id="listaProfessores">${renderizarTabelaProfessores(professores)}</div></div>`;
        document.getElementById('salvarProfBtn').onclick = async () => {
            const nome = document.getElementById('novoProfNome').value.trim(), email = document.getElementById('novoProfEmail').value.trim(), matricula = document.getElementById('novoProfMatricula').value.trim();
            if (!nome || !email || !matricula) { showToast('Preencha todos os campos', 'error'); return; }
            try { await apiPost('/admin/professores', { nome, email, matricula }); showToast('Professor cadastrado!', 'success'); await carregarAdminProfessores(container);
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar professores</div>'; }
}

async function carregarAdminTurmas(container) {
    try {
        const turmas = await apiGet('/turmas');
        const professores = await apiGet('/admin/professores');
        container.innerHTML = `<div class="card"><h3>Cadastrar Turma</h3><div class="form-row"><input type="text" id="novaTurmaNome" placeholder="Nome da Turma"><input type="text" id="novaTurmaCodigo" placeholder="Código"></div><div class="form-row"><select id="novaTurmaProfessor"><option value="">Selecionar Professor</option>${professores.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}</select><input type="text" id="novaTurmaPeriodo" placeholder="Período"></div><button id="salvarTurmaBtn" class="btn btn-primary">Cadastrar Turma</button></div><div class="card"><h3>Lista de Turmas</h3><div id="listaTurmas">${renderizarTabelaTurmas(turmas)}</div></div>`;
        document.getElementById('salvarTurmaBtn').onclick = async () => {
            const nome = document.getElementById('novaTurmaNome').value.trim(), codigo = document.getElementById('novaTurmaCodigo').value.trim(), professorId = document.getElementById('novaTurmaProfessor').value, periodo = document.getElementById('novaTurmaPeriodo').value.trim();
            if (!nome || !codigo) { showToast('Preencha nome e código', 'error'); return; }
            try { await apiPost('/turmas', { nome, codigo, professorId: professorId || null, periodo }); showToast('Turma cadastrada!', 'success'); await carregarAdminTurmas(container);
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar turmas</div>'; }
}

async function carregarAdminAPs(container) {
    try {
        const aps = await apiGet('/admin/aps');
        container.innerHTML = `<div class="card"><h3>Cadastrar Ponto de Acesso</h3><div class="form-row"><input type="text" id="novoAPBssid" placeholder="BSSID (MAC do AP)"><input type="text" id="novoAPSsid" placeholder="SSID"></div><div class="form-row"><input type="text" id="novoAPSala" placeholder="Sala"><input type="text" id="novoAPPredio" placeholder="Prédio"></div><input type="number" id="novoAPAndar" placeholder="Andar"><button id="salvarAPBtn" class="btn btn-primary">Cadastrar AP</button></div><div class="card"><h3>Pontos de Acesso Cadastrados</h3><div id="listaAPs">${renderizarTabelaAPs(aps)}</div></div>`;
        document.getElementById('salvarAPBtn').onclick = async () => {
            const bssid = document.getElementById('novoAPBssid').value.trim(), ssid = document.getElementById('novoAPSsid').value.trim(), sala = document.getElementById('novoAPSala').value.trim(), predio = document.getElementById('novoAPPredio').value.trim(), andar = document.getElementById('novoAPAndar').value;
            if (!bssid || !ssid || !sala) { showToast('Preencha BSSID, SSID e Sala', 'error'); return; }
            try { await apiPost('/admin/aps', { bssid, ssid, sala, predio, andar: andar || null }); showToast('AP cadastrado!', 'success'); await carregarAdminAPs(container);
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar APs</div>'; }
}

async function carregarAdminPresenca(container) {
    try {
        const presencas = await apiGet('/admin/relatorios');
        container.innerHTML = `<div class="card"><h3>Registros de Presença</h3><div id="listaPresencas">${renderizarTabelaPresencas(presencas)}</div></div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar presenças</div>'; }
}

async function carregarAdminRelatorios(container) {
    try {
        const turmas = await apiGet('/turmas');
        container.innerHTML = `<div class="card"><h3>Gerar Relatório</h3><select id="relatorioTurma"><option value="">Todas as Turmas</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select><div class="form-row"><input type="date" id="relatorioDataInicio" placeholder="Data Início"><input type="date" id="relatorioDataFim" placeholder="Data Fim"></div><button id="gerarRelatorioBtn" class="btn btn-primary">Gerar Relatório</button><div id="relatorioResultado"></div></div>`;
        document.getElementById('gerarRelatorioBtn').onclick = async () => {
            const turmaId = document.getElementById('relatorioTurma').value, dataInicio = document.getElementById('relatorioDataInicio').value, dataFim = document.getElementById('relatorioDataFim').value;
            let url = '/admin/relatorios';
            const params = [];
            if (turmaId) params.push(`turma_id=${turmaId}`);
            if (dataInicio) params.push(`data_inicio=${dataInicio}`);
            if (dataFim) params.push(`data_fim=${dataFim}`);
            if (params.length) url += `?${params.join('&')}`;
            const relatorio = await apiGet(url);
            document.getElementById('relatorioResultado').innerHTML = renderizarTabelaPresencas(relatorio);
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>'; }
}

async function carregarAdminConfig(container) {
    try {
        const wifiConfig = await apiGet('/wifi/config');
        container.innerHTML = `<div class="card"><h3>Configuração da Rede Wi-Fi</h3><input type="text" id="configSsid" value="${escapeHtml(wifiConfig.ssid || '')}" placeholder="SSID"><input type="password" id="configPassword" value="${escapeHtml(wifiConfig.password || '')}" placeholder="Senha"><button id="saveWifiConfigBtn" class="btn btn-primary">Salvar Configuração</button></div>`;
        document.getElementById('saveWifiConfigBtn').onclick = async () => {
            try { await apiPost('/wifi/config', { ssid: document.getElementById('configSsid').value.trim(), password: document.getElementById('configPassword').value || null }); showToast('Configuração salva!', 'success');
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar configurações</div>'; }
}

// ============================================
// PAINEL DO PROFESSOR
// ============================================

async function carregarPainelProfessor() {
    document.querySelectorAll('#professorScreen .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#professorScreen .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            carregarConteudoProfessor(item.dataset.tab);
        });
    });
    document.getElementById('profUserName').textContent = usuarioAtual.nome;
    document.getElementById('profUserEmail').textContent = usuarioAtual.email;
    await carregarConteudoProfessor('prof-dashboard');
}

async function carregarConteudoProfessor(tab) {
    const titles = { 'prof-dashboard': 'Dashboard', 'prof-turmas': 'Minhas Turmas', 'prof-presenca': 'Registrar Presença', 'prof-relatorios': 'Relatórios', 'prof-config': 'Configurações' };
    document.getElementById('profPageTitle').textContent = titles[tab] || 'Dashboard';
    const content = document.getElementById('profContent');
    if (tab === 'prof-dashboard') await carregarProfDashboard(content);
    else if (tab === 'prof-turmas') await carregarProfTurmas(content);
    else if (tab === 'prof-presenca') await carregarProfPresenca(content);
    else if (tab === 'prof-relatorios') await carregarProfRelatorios(content);
    else if (tab === 'prof-config') await carregarProfConfig(content);
}

async function carregarProfDashboard(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `<div class="card"><h3>Minhas Turmas</h3><div id="profTurmasList">${turmas.length === 0 ? '<p>Nenhuma turma atribuída</p>' : `<div class="turmas-grid">${turmas.map(t => `<div class="turma-card" onclick="verDetalhesTurmaProfessor(${t.id})"><h4>${escapeHtml(t.nome)}</h4><p>Código: ${escapeHtml(t.codigo)}</p><p>Período: ${t.periodo || 'Não definido'}</p><p>Alunos: ${t.totalAlunos || 0}</p><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();verAlunosTurmaProfessor(${t.id})">Ver Alunos</button></div>`).join('')}</div>`}</div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>'; }
}

async function carregarProfTurmas(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `<div class="card"><h3>Minhas Turmas</h3>${turmas.length === 0 ? '<p>Nenhuma turma atribuída</p>' : `<div class="turmas-grid">${turmas.map(t => `<div class="turma-card"><h4>${escapeHtml(t.nome)}</h4><p>Código: ${escapeHtml(t.codigo)}</p><p>Período: ${t.periodo || 'Não definido'}</p><p>Alunos: ${t.totalAlunos || 0}</p><button class="btn btn-sm btn-outline" onclick="verAlunosTurmaProfessor(${t.id})">Ver Alunos</button></div>`).join('')}</div>`}</div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar turmas</div>'; }
}

async function carregarProfPresenca(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `<div class="card"><h3>Selecionar Turma</h3><select id="presencaTurmaSelect" class="form-control"><option value="">Selecione uma turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div><div id="presencaAlunosContainer" style="display:none"><div class="card"><h3>Registrar Presença</h3><div id="presencaAlunosLista"></div><button id="salvarPresencasBtn" class="btn btn-primary">Salvar Presenças</button></div></div>`;
        document.getElementById('presencaTurmaSelect').onchange = async (e) => {
            const turmaId = e.target.value;
            if (!turmaId) return;
            const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
            document.getElementById('presencaAlunosLista').innerHTML = `<table class="data-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Status</th><th>Observação</th></tr></thead><tbody>${alunos.map(aluno => `<tr><td>${escapeHtml(aluno.nome)}</td><td>${escapeHtml(aluno.matricula)}</td><td><select class="status-select" data-aluno="${aluno.id}"><option value="presente">Presente</option><option value="ausente">Ausente</option><option value="justificado">Justificado</option></select></td><td><input type="text" class="obs-input" data-aluno="${aluno.id}" placeholder="Observação"></td></tr>`).join('')}</tbody></table>`;
            document.getElementById('presencaAlunosContainer').style.display = 'block';
        };
        document.getElementById('salvarPresencasBtn').onclick = async () => {
            const turmaId = document.getElementById('presencaTurmaSelect').value;
            const presencas = Array.from(document.querySelectorAll('.status-select')).map(select => ({ aluno_id: parseInt(select.dataset.aluno), status: select.value, observacao: document.querySelector(`.obs-input[data-aluno="${select.dataset.aluno}"]`).value }));
            try { await apiPost('/professor/presenca', { turma_id: parseInt(turmaId), presencas }); showToast('Presenças registradas!', 'success');
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar registro de presença</div>'; }
}

async function carregarProfRelatorios(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `<div class="card"><h3>Relatórios de Frequência</h3><select id="relatorioTurmaProf"><option value="">Selecione uma turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select><div class="form-row"><input type="date" id="relatorioProfDataInicio"><input type="date" id="relatorioProfDataFim"></div><button id="gerarRelatorioProfBtn" class="btn btn-primary">Gerar Relatório</button><div id="relatorioProfResultado"></div></div>`;
        document.getElementById('gerarRelatorioProfBtn').onclick = async () => {
            const turmaId = document.getElementById('relatorioTurmaProf').value, dataInicio = document.getElementById('relatorioProfDataInicio').value, dataFim = document.getElementById('relatorioProfDataFim').value;
            if (!turmaId) { showToast('Selecione uma turma', 'error'); return; }
            let url = `/professor/relatorios?turma_id=${turmaId}`;
            if (dataInicio) url += `&data_inicio=${dataInicio}`;
            if (dataFim) url += `&data_fim=${dataFim}`;
            const relatorio = await apiGet(url);
            document.getElementById('relatorioProfResultado').innerHTML = renderizarTabelaPresencas(relatorio);
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>'; }
}

async function carregarProfConfig(container) {
    container.innerHTML = `<div class="card"><h3>Meus Dados</h3><input type="text" id="profNome" value="${escapeHtml(usuarioAtual.nome)}" placeholder="Nome"><input type="email" id="profEmail" value="${escapeHtml(usuarioAtual.email)}" placeholder="E-mail"><input type="password" id="profNovaSenha" placeholder="Nova Senha"><button id="salvarProfConfigBtn" class="btn btn-primary">Salvar Alterações</button></div>`;
    document.getElementById('salvarProfConfigBtn').onclick = async () => {
        const nome = document.getElementById('profNome').value.trim(), email = document.getElementById('profEmail').value.trim(), senha = document.getElementById('profNovaSenha').value;
        try { await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined }); usuarioAtual.nome = nome; usuarioAtual.email = email; localStorage.setItem('usuario', JSON.stringify(usuarioAtual)); document.getElementById('profUserName').textContent = nome; showToast('Dados atualizados!', 'success');
        } catch (error) { showToast(error.message, 'error'); }
    };
}

// ============================================
// PAINEL DO ALUNO
// ============================================

async function carregarPainelAluno() {
    document.querySelectorAll('#alunoScreen .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#alunoScreen .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            carregarConteudoAluno(item.dataset.tab);
        });
    });
    document.getElementById('alunoUserName').textContent = usuarioAtual.nome;
    document.getElementById('alunoUserEmail').textContent = usuarioAtual.email;
    await carregarConteudoAluno('aluno-dashboard');
}

async function carregarConteudoAluno(tab) {
    const titles = { 'aluno-dashboard': 'Minha Frequência', 'aluno-presenca': 'Registrar Presença', 'aluno-relatorios': 'Meus Relatórios', 'aluno-config': 'Configurações' };
    document.getElementById('alunoPageTitle').textContent = titles[tab] || 'Minha Frequência';
    const content = document.getElementById('alunoContent');
    if (tab === 'aluno-dashboard') await carregarAlunoDashboard(content);
    else if (tab === 'aluno-presenca') await carregarAlunoPresenca(content);
    else if (tab === 'aluno-relatorios') await carregarAlunoRelatorios(content);
    else if (tab === 'aluno-config') await carregarAlunoConfig(content);
}

async function carregarAlunoDashboard(container) {
    try {
        const stats = await apiGet('/aluno/stats');
        const historico = await apiGet('/aluno/historico');
        const percentual = stats.totalDias > 0 ? Math.round((stats.presentes / stats.totalDias) * 100) : 0;
        let statusTexto = percentual >= 75 ? 'Boa frequência! Continue assim!' : percentual >= 50 ? 'Atenção! Sua frequência está baixa.' : 'Risco de reprovação por falta! Procure a coordenação.';
        container.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><h3>${stats.presentes || 0}</h3><p>Presenças</p></div></div><div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-times"></i></div><div class="stat-info"><h3>${stats.faltas || 0}</h3><p>Faltas</p></div></div><div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-info"><h3>${percentual}%</h3><p>Frequência</p></div></div></div><div class="card"><h3>Seu Desempenho</h3><p>${statusTexto}</p><div class="progress-bar"><div class="progress-fill" style="width: ${percentual}%"></div></div><p class="progress-label">Frequência: ${percentual}% (Mínimo: 75%)</p></div><div class="card"><h3>Últimos Registros</h3>${historico.length === 0 ? '<p>Nenhum registro encontrado</p>' : `<table class="data-table"><thead><tr><th>Data</th><th>Horário</th><th>Status</th><th>Turma</th></tr></thead><tbody>${historico.map(reg => `<tr><td>${formatDate(reg.data_conexao)}</td><td>${reg.hora_conexao || '-'}</td><td class="status-presente">Presente</td><td>${escapeHtml(reg.turma_nome || '-')}</td></tr>`).join('')}</tbody>}</table>`}</div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>'; }
}

async function carregarAlunoPresenca(container) {
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    if (!localStorage.getItem('deviceId')) localStorage.setItem('deviceId', deviceId);
    container.innerHTML = `<div class="card"><h3>Registrar Presença Automática</h3><p>Conecte-se à rede Wi-Fi da escola para ter sua presença registrada automaticamente.</p><div class="wifi-status" id="wifiStatus"><i class="fas fa-spinner fa-pulse"></i> Verificando conexão...</div><button id="registrarManualAlunoBtn" class="btn btn-warning">Registrar Presença Manualmente</button></div><div class="card"><h3>Seu QR Code de Identificação</h3><div id="qrcode" style="text-align:center; padding:20px"></div><p>Mostre este QR Code ao professor para registro manual</p></div>`;
    setTimeout(() => { document.getElementById('wifiStatus').innerHTML = '<i class="fas fa-wifi"></i> Conectado à rede escolar! Presença registrada automaticamente.'; }, 2000);
    document.getElementById('registrarManualAlunoBtn').onclick = async () => { try { await apiPost('/aluno/presenca/manual', {}); showToast('Presença registrada manualmente!', 'success'); await carregarAlunoDashboard(document.getElementById('alunoContent')); } catch (error) { showToast(error.message, 'error'); } };
    document.getElementById('qrcode').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${API_URL}/aluno/qrcode?token=${token}`)}" alt="QR Code">`;
}

async function carregarAlunoRelatorios(container) {
    try {
        const historico = await apiGet('/aluno/historico');
        container.innerHTML = `<div class="card"><h3>Meu Histórico Completo</h3><div class="filter-bar"><input type="date" id="alunoFiltroDataInicio"><input type="date" id="alunoFiltroDataFim"><button id="alunoFiltrarBtn" class="btn btn-primary">Filtrar</button></div><div id="alunoHistoricoLista">${renderizarTabelaPresencas(historico)}</div><button id="exportarAlunoCSV" class="btn btn-outline">Exportar CSV</button></div>`;
        document.getElementById('alunoFiltrarBtn').onclick = async () => {
            const dataInicio = document.getElementById('alunoFiltroDataInicio').value, dataFim = document.getElementById('alunoFiltroDataFim').value;
            let url = '/aluno/historico';
            if (dataInicio || dataFim) url += `?${dataInicio ? `data_inicio=${dataInicio}` : ''}${dataInicio && dataFim ? '&' : ''}${dataFim ? `data_fim=${dataFim}` : ''}`;
            const filtrado = await apiGet(url);
            document.getElementById('alunoHistoricoLista').innerHTML = renderizarTabelaPresencas(filtrado);
        };
        document.getElementById('exportarAlunoCSV').onclick = () => exportarRelatorio(historico);
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>'; }
}

async function carregarAlunoConfig(container) {
    container.innerHTML = `<div class="card"><h3>Meus Dados</h3><input type="text" id="alunoNome" value="${escapeHtml(usuarioAtual.nome)}" placeholder="Nome"><input type="email" id="alunoEmail" value="${escapeHtml(usuarioAtual.email)}" placeholder="E-mail"><input type="password" id="alunoNovaSenha" placeholder="Nova Senha"><button id="salvarAlunoConfigBtn" class="btn btn-primary">Salvar Alterações</button></div><div class="card"><h3>Dispositivo</h3><p><strong>Device ID:</strong> <code id="deviceIdDisplay">${localStorage.getItem('deviceId') || 'Não configurado'}</code></p><button id="gerarNovoDeviceId" class="btn btn-sm btn-outline">Gerar Novo ID</button></div>`;
    document.getElementById('salvarAlunoConfigBtn').onclick = async () => {
        const nome = document.getElementById('alunoNome').value.trim(), email = document.getElementById('alunoEmail').value.trim(), senha = document.getElementById('alunoNovaSenha').value;
        try { await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined }); usuarioAtual.nome = nome; usuarioAtual.email = email; localStorage.setItem('usuario', JSON.stringify(usuarioAtual)); document.getElementById('alunoUserName').textContent = nome; showToast('Dados atualizados!', 'success');
        } catch (error) { showToast(error.message, 'error'); }
    };
    document.getElementById('gerarNovoDeviceId').onclick = () => { const novoId = 'device-' + Date.now() + '-' + Math.random().toString(36).substring(7); localStorage.setItem('deviceId', novoId); document.getElementById('deviceIdDisplay').textContent = novoId; showToast('Novo Device ID gerado!', 'success'); };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function renderizarTabelaAlunos(alunos) {
    if (!alunos.length) return '<p>Nenhum aluno cadastrado</p>';
    return `<table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Turma</th><th>Ações</th></tr></thead><tbody>${alunos.map(aluno => `<tr class="aluno-row"><td>${escapeHtml(aluno.nome)}</td><td>${escapeHtml(aluno.matricula)}</td><td>${escapeHtml(aluno.email)}</td><td>${escapeHtml(aluno.turma_nome || '-')}</td><td><button class="btn-sm btn-outline" onclick="editarAluno(${aluno.id})">✏️ Editar</button> <button class="btn-sm btn-danger" onclick="excluirAluno(${aluno.id})">🗑️ Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function renderizarTabelaProfessores(professores) {
    if (!professores.length) return '<p>Nenhum professor cadastrado</p>';
    return `<table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>${professores.map(prof => `<tr><td>${escapeHtml(prof.nome)}</td><td>${escapeHtml(prof.matricula)}</td><td>${escapeHtml(prof.email)}</td><td><button class="btn-sm btn-outline" onclick="editarProfessor(${prof.id})">✏️ Editar</button> <button class="btn-sm btn-danger" onclick="excluirProfessor(${prof.id})">🗑️ Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function renderizarTabelaTurmas(turmas) {
    if (!turmas.length) return '<p>Nenhuma turma cadastrada</p>';
    return `<table class="data-table"><thead><tr><th>Nome</th><th>Código</th><th>Professor</th><th>Período</th><th>Ações</th></tr></thead><tbody>${turmas.map(turma => `<tr><td>${escapeHtml(turma.nome)}</td><td>${escapeHtml(turma.codigo)}</td><td>${escapeHtml(turma.professor_nome || '-')}</td><td>${escapeHtml(turma.periodo || '-')}</td><td><button class="btn-sm btn-outline" onclick="editarTurma(${turma.id})">✏️ Editar</button> <button class="btn-sm btn-danger" onclick="excluirTurma(${turma.id})">🗑️ Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function renderizarTabelaAPs(aps) {
    if (!aps.length) return '<p>Nenhum ponto de acesso cadastrado</p>';
    return `<table class="data-table"><thead><tr><th>BSSID</th><th>SSID</th><th>Sala</th><th>Prédio</th><th>Andar</th><th>Ações</th></tr></thead><tbody>${aps.map(ap => `<tr><td><code>${escapeHtml(ap.bssid)}</code></td><td>${escapeHtml(ap.ssid)}</td><td>${escapeHtml(ap.sala)}</td><td>${escapeHtml(ap.predio || '-')}</td><td>${ap.andar || '-'}</td><td><button class="btn-sm btn-danger" onclick="excluirAP(${ap.id})">🗑️ Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function renderizarTabelaPresencas(presencas) {
    if (!presencas.length) return '<p>Nenhum registro encontrado</p>';
    return `<table class="data-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Data/Hora</th><th>Turma</th><th>Status</th></tr></thead><tbody>${presencas.map(p => `<tr><td>${escapeHtml(p.nome_aluno)}</td><td>${escapeHtml(p.matricula)}</td><td>${formatDateTime(p.data_conexao)}</td><td>${escapeHtml(p.turma_nome || '-')}</td><td class="status-presente">Presente</td></tr>`).join('')}</tbody></table>`;
}

window.editarAluno = async (id) => {
    try {
        const alunos = await apiGet('/admin/alunos');
        const aluno = alunos.find(a => a.id === id);
        const modal = document.createElement('div'); modal.className = 'modal active';
        modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Editar Aluno</h3><span class="modal-close">&times;</span></div><div class="modal-body"><input type="text" id="editNome" value="${escapeHtml(aluno.nome)}" placeholder="Nome"><input type="text" id="editMatricula" value="${escapeHtml(aluno.matricula)}" placeholder="Matrícula"><input type="email" id="editEmail" value="${escapeHtml(aluno.email)}" placeholder="E-mail"></div><div class="modal-footer"><button id="saveEditBtn" class="btn btn-primary">Salvar</button><button class="btn btn-outline modal-close-btn">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('saveEditBtn').onclick = async () => {
            const nome = document.getElementById('editNome').value.trim(), matricula = document.getElementById('editMatricula').value.trim(), email = document.getElementById('editEmail').value.trim();
            if (!nome || !matricula || !email) { showToast('Preencha todos os campos', 'error'); return; }
            try { await apiPut(`/admin/alunos/${id}`, { nome, matricula, email }); showToast('Aluno atualizado!', 'success'); close(); await carregarAdminAlunos(document.getElementById('adminContent'));
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { showToast('Erro ao carregar dados do aluno', 'error'); }
};

window.editarProfessor = async (id) => {
    try {
        const professores = await apiGet('/admin/professores');
        const professor = professores.find(p => p.id === id);
        const modal = document.createElement('div'); modal.className = 'modal active';
        modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Editar Professor</h3><span class="modal-close">&times;</span></div><div class="modal-body"><input type="text" id="editProfNome" value="${escapeHtml(professor.nome)}" placeholder="Nome"><input type="email" id="editProfEmail" value="${escapeHtml(professor.email)}" placeholder="E-mail"><input type="text" id="editProfMatricula" value="${escapeHtml(professor.matricula)}" placeholder="Matrícula"></div><div class="modal-footer"><button id="saveEditProfBtn" class="btn btn-primary">Salvar</button><button class="btn btn-outline modal-close-btn">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('saveEditProfBtn').onclick = async () => {
            const nome = document.getElementById('editProfNome').value.trim(), email = document.getElementById('editProfEmail').value.trim(), matricula = document.getElementById('editProfMatricula').value.trim();
            if (!nome || !email || !matricula) { showToast('Preencha todos os campos', 'error'); return; }
            try { await apiPut(`/admin/professores/${id}`, { nome, email, matricula }); showToast('Professor atualizado!', 'success'); close(); await carregarAdminProfessores(document.getElementById('adminContent'));
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { showToast('Erro ao carregar dados do professor', 'error'); }
};

window.editarTurma = async (id) => {
    try {
        const turmas = await apiGet('/turmas');
        const turma = turmas.find(t => t.id === id);
        const modal = document.createElement('div'); modal.className = 'modal active';
        modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Editar Turma</h3><span class="modal-close">&times;</span></div><div class="modal-body"><input type="text" id="editTurmaNome" value="${escapeHtml(turma.nome)}" placeholder="Nome"><input type="text" id="editTurmaCodigo" value="${escapeHtml(turma.codigo)}" placeholder="Código"><input type="text" id="editTurmaPeriodo" value="${escapeHtml(turma.periodo || '')}" placeholder="Período"></div><div class="modal-footer"><button id="saveEditTurmaBtn" class="btn btn-primary">Salvar</button><button class="btn btn-outline modal-close-btn">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('saveEditTurmaBtn').onclick = async () => {
            const nome = document.getElementById('editTurmaNome').value.trim(), codigo = document.getElementById('editTurmaCodigo').value.trim(), periodo = document.getElementById('editTurmaPeriodo').value.trim();
            if (!nome || !codigo) { showToast('Preencha nome e código', 'error'); return; }
            try { await apiPut(`/turmas/${id}`, { nome, codigo, periodo }); showToast('Turma atualizada!', 'success'); close(); await carregarAdminTurmas(document.getElementById('adminContent'));
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { showToast('Erro ao carregar dados da turma', 'error'); }
};

window.excluirAluno = async (id) => { if (confirm('Tem certeza?')) { try { await apiDelete(`/admin/alunos/${id}`); showToast('Aluno excluído!', 'success'); await carregarAdminAlunos(document.getElementById('adminContent')); } catch (error) { showToast(error.message, 'error'); } } };
window.excluirProfessor = async (id) => { if (confirm('Tem certeza?')) { try { await apiDelete(`/admin/professores/${id}`); showToast('Professor excluído!', 'success'); await carregarAdminProfessores(document.getElementById('adminContent')); } catch (error) { showToast(error.message, 'error'); } } };
window.excluirTurma = async (id) => { if (confirm('Tem certeza?')) { try { await apiDelete(`/turmas/${id}`); showToast('Turma excluída!', 'success'); await carregarAdminTurmas(document.getElementById('adminContent')); } catch (error) { showToast(error.message, 'error'); } } };
window.excluirAP = async (id) => { if (confirm('Tem certeza?')) { try { await apiDelete(`/admin/aps/${id}`); showToast('AP excluído!', 'success'); await carregarAdminAPs(document.getElementById('adminContent')); } catch (error) { showToast(error.message, 'error'); } } };
window.verDetalhesTurmaProfessor = async (id) => { try { const turma = await apiGet(`/professor/turmas/${id}`); const alunos = await apiGet(`/professor/turmas/${id}/alunos`); const modal = document.createElement('div'); modal.className = 'modal active'; modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>${escapeHtml(turma.nome)}</h3><span class="modal-close">&times;</span></div><div class="modal-body"><p><strong>Código:</strong> ${escapeHtml(turma.codigo)}</p><p><strong>Período:</strong> ${turma.periodo || 'Não definido'}</p><p><strong>Total de alunos:</strong> ${alunos.length}</p><h4>Lista de Alunos</h4><table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th></tr></thead><tbody>${alunos.map(a => `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.matricula)}</td></tr>`).join('')}</tbody></table></div><div class="modal-footer"><button class="btn btn-outline modal-close-btn">Fechar</button></div></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    } catch (error) { showToast('Erro ao carregar detalhes', 'error'); } };
window.verAlunosTurmaProfessor = async (id) => { try { const turma = await apiGet(`/professor/turmas/${id}`); const alunos = await apiGet(`/professor/turmas/${id}/alunos`); const modal = document.createElement('div'); modal.className = 'modal active'; modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Alunos - ${escapeHtml(turma.nome)}</h3><span class="modal-close">&times;</span></div><div class="modal-body"><table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th></tr></thead><tbody>${alunos.map(a => `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.matricula)}</td></tr>`).join('')}</tbody></table></div><div class="modal-footer"><button class="btn btn-outline modal-close-btn">Fechar</button></div></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    } catch (error) { showToast('Erro ao carregar alunos', 'error'); } };

function exportarRelatorio(dados) {
    if (!dados?.length) { showToast('Nenhum dado para exportar', 'error'); return; }
    let csv = 'Aluno,Matrícula,Data,Hora,Status,Tempo\n';
    dados.forEach(item => { csv += `"${escapeCsv(item.nome_aluno || item.nome)}","${escapeCsv(item.matricula)}","${formatDate(item.data_conexao)}","${item.hora_conexao || ''}","${item.status || 'Presente'}","${item.tempo_conectado || 0}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.setAttribute('download', `relatorio_presenca_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

function escapeCsv(str) { if (!str) return ''; return String(str).replace(/"/g, '""'); }
function formatDate(dateStr) { if (!dateStr) return '-'; try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch { return dateStr; } }
function formatDateTime(dateStr) { if (!dateStr) return '-'; try { return new Date(dateStr).toLocaleString('pt-BR'); } catch { return dateStr; } }
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'); }
function showToast(message, type) { const toast = document.createElement('div'); toast.className = `toast toast-${type}`; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 3000); }
async function apiGet(endpoint) { const response = await fetch(`${API_URL}${endpoint}`, { headers: token ? { 'Authorization': token } : {} }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function apiPost(endpoint, data) { const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': token }) }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function apiPut(endpoint, data) { const response = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': token }) }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function apiDelete(endpoint) { const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: token ? { 'Authorization': token } : {} }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function getErrorMessage(response) { try { const data = await response.json(); return data.error || data.message || 'Erro na requisição'; } catch { return 'Erro na requisição'; } }
