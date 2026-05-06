let API_URL = 'https://frequentar-web.onrender.com/api';
let token = null;
let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('adminLogoutBtn').addEventListener('click', () => handleLogout());
    document.getElementById('profLogoutBtn').addEventListener('click', () => handleLogout());
    document.getElementById('alunoLogoutBtn').addEventListener('click', () => handleLogout());
    checkAutoLogin();
});

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
    const perfil = document.getElementById('loginPerfil').value;
    try {
        const response = await fetch(`${API_URL}/login-multi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, perfil })
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
    const titles = {
        'admin-dashboard': 'Dashboard',
        'admin-alunos': 'Gerenciar Alunos',
        'admin-professores': 'Gerenciar Professores',
        'admin-turmas': 'Gerenciar Turmas',
        'admin-aps': 'Pontos de Acesso',
        'admin-presenca': 'Presença',
        'admin-relatorios': 'Relatórios',
        'admin-config': 'Configurações'
    };
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
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${stats.totalAlunos || 0}</h3><p>Alunos</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-chalkboard-user"></i></div><div class="stat-info"><h3>${stats.totalProfessores || 0}</h3><p>Professores</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-school"></i></div><div class="stat-info"><h3>${stats.totalTurmas || 0}</h3><p>Turmas</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-wifi"></i></div><div class="stat-info"><h3>${stats.totalAPs || 0}</h3><p>APs</p></div></div>
            </div>
        `;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>'; }
}

async function carregarAdminAlunos(container) {
    try {
        const alunos = await apiGet('/admin/alunos');
        const turmas = await apiGet('/turmas');
        container.innerHTML = `
            <div class="card">
                <h3>Cadastrar Aluno</h3>
                <div class="form-row">
                    <input type="text" id="novoAlunoNome" placeholder="Nome">
                    <input type="text" id="novoAlunoMatricula" placeholder="Matrícula">
                </div>
                <div class="form-row">
                    <input type="email" id="novoAlunoEmail" placeholder="E-mail">
                    <select id="novoAlunoTurma">
                        <option value="">Selecionar Turma (opcional)</option>
                        ${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <input type="password" id="novoAlunoSenha" placeholder="Senha (deixe em branco para usar padrão: aluno123)">
                </div>
                <button id="salvarAlunoBtn" class="btn btn-primary">Cadastrar Aluno</button>
            </div>
            <div class="card">
                <h3>Lista de Alunos</h3>
                <div id="listaAlunos">${renderizarTabelaAlunos(alunos)}</div>
            </div>
        `;
        document.getElementById('salvarAlunoBtn').onclick = cadastrarAluno;
    } catch (error) { 
        container.innerHTML = '<div class="error">Erro ao carregar alunos</div>';
        console.error('Erro:', error);
    }
}

async function cadastrarAluno() {
    const nome = document.getElementById('novoAlunoNome')?.value.trim();
    const email = document.getElementById('novoAlunoEmail')?.value.trim();
    const matricula = document.getElementById('novoAlunoMatricula')?.value.trim();
    const turmaId = document.getElementById('novoAlunoTurma')?.value;
    const senha = document.getElementById('novoAlunoSenha')?.value.trim();
    
    if (!nome || !email || !matricula) {
        showToast('Preencha todos os campos', 'error');
        return;
    }
    
    try {
        const response = await apiPost('/admin/alunos', { nome, email, matricula, turmaId: turmaId || null, senha: senha || undefined });
        const senhaMsg = response.message.includes('Senha:') ? ` A senha é: ${response.message.split('Senha:')[1]}` : '';
        showToast(`Aluno cadastrado com sucesso!${senhaMsg}`, 'success');
        
        document.getElementById('novoAlunoNome').value = '';
        document.getElementById('novoAlunoEmail').value = '';
        document.getElementById('novoAlunoMatricula').value = '';
        if (document.getElementById('novoAlunoSenha')) document.getElementById('novoAlunoSenha').value = '';
        
        const content = document.getElementById('adminContent');
        if (content) await carregarAdminAlunos(content);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function carregarAdminProfessores(container) {
    try {
        const professores = await apiGet('/admin/professores');
        container.innerHTML = `
            <div class="card">
                <h3>Cadastrar Professor</h3>
                <div class="form-row">
                    <input type="text" id="novoProfNome" placeholder="Nome">
                    <input type="email" id="novoProfEmail" placeholder="E-mail">
                </div>
                <div class="form-row">
                    <input type="text" id="novoProfMatricula" placeholder="Matrícula">
                    <input type="password" id="novoProfSenha" placeholder="Senha (deixe em branco para usar padrão: prof123)">
                </div>
                <button id="salvarProfBtn" class="btn btn-primary">Cadastrar Professor</button>
            </div>
            <div class="card">
                <h3>Lista de Professores</h3>
                <div id="listaProfessores">${renderizarTabelaProfessores(professores)}</div>
            </div>
        `;
        document.getElementById('salvarProfBtn').onclick = cadastrarProfessor;
    } catch (error) { 
        container.innerHTML = '<div class="error">Erro ao carregar professores</div>';
        console.error('Erro:', error);
    }
}

async function carregarAdminTurmas(container) {
    try {
        const turmas = await apiGet('/turmas');
        const professores = await apiGet('/admin/professores');
        container.innerHTML = `
            <div class="card"><h3>Cadastrar Turma</h3><div class="form-row"><input type="text" id="novaTurmaNome" placeholder="Nome"><input type="text" id="novaTurmaCodigo" placeholder="Código"></div><div class="form-row"><select id="novaTurmaProfessor"><option value="">Selecionar Professor</option>${professores.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}</select><input type="text" id="novaTurmaPeriodo" placeholder="Período"></div><button id="salvarTurmaBtn" class="btn btn-primary">Cadastrar</button></div>
            <div class="card"><h3>Lista de Turmas</h3><div id="listaTurmas">${renderizarTabelaTurmas(turmas)}</div></div>
        `;
        document.getElementById('salvarTurmaBtn').onclick = async () => {
            const nome = document.getElementById('novaTurmaNome').value.trim();
            const codigo = document.getElementById('novaTurmaCodigo').value.trim();
            const professorId = document.getElementById('novaTurmaProfessor').value;
            const periodo = document.getElementById('novaTurmaPeriodo').value.trim();
            if (!nome || !codigo) { showToast('Preencha nome e código', 'error'); return; }
            try {
                await apiPost('/turmas', { nome, codigo, professorId: professorId || null, periodo });
                showToast('Turma cadastrada!', 'success');
                await carregarAdminTurmas(container);
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar turmas</div>'; }
}

async function carregarAdminAPs(container) {
    try {
        const aps = await apiGet('/admin/aps');
        container.innerHTML = `
            <div class="card"><h3>Cadastrar Ponto de Acesso</h3><div class="form-row"><input type="text" id="novoAPBssid" placeholder="BSSID"><input type="text" id="novoAPSsid" placeholder="SSID"></div><div class="form-row"><input type="text" id="novoAPSala" placeholder="Sala"><input type="text" id="novoAPPredio" placeholder="Prédio"></div><input type="number" id="novoAPAndar" placeholder="Andar"><button id="salvarAPBtn" class="btn btn-primary">Cadastrar</button></div>
            <div class="card"><h3>Pontos de Acesso</h3><div id="listaAPs">${renderizarTabelaAPs(aps)}</div></div>
        `;
        document.getElementById('salvarAPBtn').onclick = async () => {
            const bssid = document.getElementById('novoAPBssid').value.trim();
            const ssid = document.getElementById('novoAPSsid').value.trim();
            const sala = document.getElementById('novoAPSala').value.trim();
            const predio = document.getElementById('novoAPPredio').value.trim();
            const andar = document.getElementById('novoAPAndar').value;
            if (!bssid || !ssid || !sala) { showToast('Preencha BSSID, SSID e Sala', 'error'); return; }
            try {
                await apiPost('/admin/aps', { bssid, ssid, sala, predio, andar: andar || null });
                showToast('AP cadastrado!', 'success');
                await carregarAdminAPs(container);
            } catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar APs</div>'; }
}

async function carregarAdminPresenca(container) {
    try {
        const presencas = await apiGet('/admin/relatorios');
        
        let linhas = '';
        for (let i = 0; i < presencas.length; i++) {
            const p = presencas[i];
            const dataHora = p.data_formatada ? `${p.data_formatada} ${p.hora}` : '-';
            linhas += `
                <tr>
                    <td>${escapeHtml(p.nome_aluno)}</td>
                    <td>${escapeHtml(p.matricula)}</td>
                    <td>${dataHora}</td>
                    <td>${escapeHtml(p.turma_nome || '-')}</td>
                    <td class="status-presente">Presente</td>
                </tr>
            `;
        }
        
        const tabelaHTML = '<div class="card"><h3>Registros de Presença</h3><div style="overflow-x: auto;"><table class="data-table" style="width:100%"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Data/Hora</th><th>Turma</th><th>Status</th></tr></thead><tbody>' + linhas + '</tbody></table></div></div>';
        
        container.innerHTML = tabelaHTML;
    } catch (error) { 
        console.error('Erro:', error);
        container.innerHTML = '<div class="error">Erro ao carregar presenças</div>'; 
    }
}
async function carregarAdminRelatorios(container) {
    try {
        const turmas = await apiGet('/turmas');
        container.innerHTML = `
            <div class="card"><h3>Relatórios</h3><select id="relatorioTurma"><option value="">Todas as Turmas</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select><div class="form-row"><input type="date" id="relatorioDataInicio"><input type="date" id="relatorioDataFim"></div><button id="gerarRelatorioBtn" class="btn btn-primary">Gerar</button><div id="relatorioResultado"></div></div>
        `;
        document.getElementById('gerarRelatorioBtn').onclick = async () => {
            try {
                const turmaId = document.getElementById('relatorioTurma').value;
                const dataInicio = document.getElementById('relatorioDataInicio').value;
                const dataFim = document.getElementById('relatorioDataFim').value;
                let url = '/admin/relatorios';
                const params = [];
                if (turmaId) params.push(`turma_id=${turmaId}`);
                if (dataInicio) params.push(`data_inicio=${dataInicio}`);
                if (dataFim) params.push(`data_fim=${dataFim}`);
                if (params.length) url += `?${params.join('&')}`;
                const relatorio = await apiGet(url);
                document.getElementById('relatorioResultado').innerHTML = `
                    <h4>Resultado</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Aluno</th>
                                <th>Matrícula</th>
                                <th>Data/Hora</th>
                                <th>Turma</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${relatorio.map(r => `
                                <tr>
                                    <td>${escapeHtml(r.nome_aluno)}</td>
                                    <td>${escapeHtml(r.matricula)}</td>
                                    <td>${r.data_formatada ? `${r.data_formatada} ${r.hora}` : '-'}</td>
                                    <td>${escapeHtml(r.turma_nome)}</td>
                                    <td>${r.status === 'presente' ? 'Presente' : 'Ausente'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } catch (error) {
                console.error('Erro:', error);
                document.getElementById('relatorioResultado').innerHTML = '<div class="error">Erro ao gerar relatório</div>';
            }
        };
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>';
    }
}

async function carregarAdminConfig(container) {
    try {
        const wifiConfig = await apiGet('/wifi/config');
        container.innerHTML = `
            <div class="card"><h3>Configuração Wi-Fi</h3><input type="text" id="configSsid" value="${escapeHtml(wifiConfig.ssid || '')}" placeholder="SSID"><input type="password" id="configPassword" value="${escapeHtml(wifiConfig.password || '')}" placeholder="Senha"><button id="saveWifiConfigBtn" class="btn btn-primary">Salvar</button></div>
        `;
        document.getElementById('saveWifiConfigBtn').onclick = async () => {
            try {
                await apiPost('/wifi/config', { ssid: document.getElementById('configSsid').value.trim(), password: document.getElementById('configPassword').value || null });
                showToast('Configuração salva!', 'success');
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
    const titles = {
        'prof-dashboard': 'Dashboard',
        'prof-turmas': 'Minhas Turmas',
        'prof-presenca': 'Registrar Presença',
        'prof-relatorios': 'Relatórios',
        'prof-config': 'Configurações'
    };
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
        const totalTurmas = turmas.length;
        const totalAlunos = turmas.reduce((acc, t) => acc + (t.totalAlunos || 0), 0);
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${totalAlunos}</h3><p>Total de Alunos</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-school"></i></div><div class="stat-info"><h3>${totalTurmas}</h3><p>Minhas Turmas</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><h3>${totalAlunos}</h3><p>Presentes (estimado)</p></div></div>
            </div>
            <div class="card"><h3>Minhas Turmas</h3><div class="turmas-grid">${turmas.map(t => `
                <div class="turma-card" onclick="verDetalhesTurma(${t.id})">
                    <h4>${escapeHtml(t.nome)}</h4>
                    <p>Código: ${escapeHtml(t.codigo)}</p>
                    <p>Período: ${t.periodo || 'N/D'}</p>
                    <p>Alunos: ${t.totalAlunos || 0}</p>
                </div>
            `).join('')}</div></div>
            <div class="card"><h3>Ações Rápidas</h3><div style="display:flex;gap:10px"><button class="btn btn-primary" onclick="switchProfessorTab('prof-presenca')">Registrar Presença</button><button class="btn btn-outline" onclick="switchProfessorTab('prof-relatorios')">Relatórios</button></div></div>
        `;
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>';
    }
}

async function carregarProfTurmas(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `<div class="card"><h3>Minhas Turmas</h3><div class="turmas-grid">${turmas.map(t => `
            <div class="turma-card">
                <h4>${escapeHtml(t.nome)}</h4>
                <p>Código: ${escapeHtml(t.codigo)}</p>
                <p>Período: ${t.periodo || 'N/D'}</p>
                <p>Alunos: ${t.totalAlunos || 0}</p>
                <div style="margin-top:10px"><button class="btn btn-sm btn-outline" onclick="verAlunosTurma(${t.id})">Ver Alunos</button></div>
            </div>
        `).join('')}</div></div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar turmas</div>'; }
}

async function carregarProfPresenca(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `
            <div class="card"><h3>Registrar Presença</h3><select id="presencaTurmaSelect"><option value="">Selecione uma turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select></div>
            <div id="presencaAlunosContainer" style="display:none"><div class="card"><h3>Alunos</h3><div id="presencaAlunosLista"></div><button id="salvarPresencasBtn" class="btn btn-primary">Salvar Presenças</button></div></div>
        `;
        document.getElementById('presencaTurmaSelect').onchange = async (e) => {
            const turmaId = e.target.value;
            if (!turmaId) return;
            const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
            document.getElementById('presencaAlunosLista').innerHTML = `<table class="data-table"><thead><tr><th>Nome</th><th>Matrícula</th><th>Status</th></tr></thead><tbody>${alunos.map(a => `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.matricula)}</td><td><select class="status-select" data-aluno="${a.id}"><option value="presente">Presente</option><option value="ausente">Ausente</option></select></td></tr>`).join('')}</tbody></table>`;
            document.getElementById('presencaAlunosContainer').style.display = 'block';
        };
        document.getElementById('salvarPresencasBtn').onclick = async () => {
            const turmaId = document.getElementById('presencaTurmaSelect').value;
            const presencas = Array.from(document.querySelectorAll('.status-select')).map(s => ({ aluno_id: parseInt(s.dataset.aluno), status: s.value }));
            try { await apiPost('/professor/presenca', { turma_id: parseInt(turmaId), presencas }); showToast('Presenças registradas!', 'success'); }
            catch (error) { showToast(error.message, 'error'); }
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar registro</div>'; }
}

async function carregarProfRelatorios(container) {
    try {
        const turmas = await apiGet('/professor/turmas');
        container.innerHTML = `
            <div class="card"><h3>Relatórios</h3><select id="relatorioTurmaProf"><option value="">Selecione uma turma</option>${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}</select><div class="form-row"><input type="date" id="relatorioProfDataInicio"><input type="date" id="relatorioProfDataFim"></div><button id="gerarRelatorioProfBtn" class="btn btn-primary">Gerar</button><div id="relatorioProfResultado"></div></div>
        `;
        document.getElementById('gerarRelatorioProfBtn').onclick = async () => {
            const turmaId = document.getElementById('relatorioTurmaProf').value;
            if (!turmaId) { showToast('Selecione uma turma', 'error'); return; }
            const relatorio = await apiGet(`/professor/relatorios?turma_id=${turmaId}`);
            document.getElementById('relatorioProfResultado').innerHTML = `<h4>Resultado</h4><table class="data-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Data</th></tr></thead><tbody>${relatorio.map(r => `<tr><td>${escapeHtml(r.nome_aluno)}</td><td>${escapeHtml(r.matricula)}</td><td>${new Date(r.created_at).toLocaleDateString('pt-BR')}</td></tr>`).join('')}</tbody></table>`;
        };
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>'; }
}

async function carregarProfConfig(container) {
    container.innerHTML = `<div class="card"><h3>Meus Dados</h3><input type="text" id="profNome" value="${escapeHtml(usuarioAtual.nome)}"><input type="email" id="profEmail" value="${escapeHtml(usuarioAtual.email)}"><input type="password" id="profNovaSenha" placeholder="Nova senha"><button id="salvarProfConfigBtn" class="btn btn-primary">Salvar</button></div>`;
    document.getElementById('salvarProfConfigBtn').onclick = async () => {
        const nome = document.getElementById('profNome').value.trim();
        const email = document.getElementById('profEmail').value.trim();
        const senha = document.getElementById('profNovaSenha').value;
        try { await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined }); showToast('Dados atualizados!', 'success'); }
        catch (error) { showToast(error.message, 'error'); }
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
    const titles = {
        'aluno-dashboard': 'Minha Frequência',
        'aluno-presenca': 'Registrar Presença',
        'aluno-relatorios': 'Meus Relatórios',
        'aluno-config': 'Configurações'
    };
    document.getElementById('alunoPageTitle').textContent = titles[tab] || 'Dashboard';
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
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><h3>${stats.presentes || 0}</h3><p>Presenças</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-calendar-times"></i></div><div class="stat-info"><h3>${stats.faltas || 0}</h3><p>Faltas</p></div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-info"><h3>${percentual}%</h3><p>Frequência</p></div></div>
            </div>
            <div class="card"><h3>Seu Desempenho</h3><div class="progress-bar"><div class="progress-fill" style="width:${percentual}%"></div></div><p>Frequência: ${percentual}% (Mínimo: 75%)</p></div>
            <div class="card"><h3>Últimos Registros</h3><table class="data-table"><thead><tr><th>Data</th><th>Horário</th><th>Status</th></tr></thead><tbody>${historico.slice(0,5).map(r => `<tr><td>${new Date(r.data).toLocaleDateString('pt-BR')}</td><td>${r.hora || '-'}</td><td class="status-presente">Presente</td></tr>`).join('')}</tbody></table></div>
        `;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar dashboard</div>'; }
}

async function carregarAlunoPresenca(container) {
    container.innerHTML = `
        <div class="card"><h3>Registrar Presença</h3><p>Conecte-se à rede Wi-Fi da escola para registro automático.</p><button id="registrarManualAlunoBtn" class="btn btn-warning">Registrar Manualmente</button></div>
        <div class="card"><h3>QR Code</h3><div id="qrcode" style="text-align:center;padding:20px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${API_URL}/aluno/qrcode?token=${token}`)}" alt="QR Code"></div><p>Mostre ao professor para registro manual</p></div>
    `;
    document.getElementById('registrarManualAlunoBtn').onclick = async () => {
        try { await apiPost('/aluno/presenca/manual', {}); showToast('Presença registrada!', 'success'); await carregarAlunoDashboard(document.getElementById('alunoContent')); }
        catch (error) { showToast(error.message, 'error'); }
    };
}

async function carregarAlunoRelatorios(container) {
    try {
        const historico = await apiGet('/aluno/historico');
        container.innerHTML = `<div class="card"><h3>Meu Histórico</h3><table class="data-table"><thead><tr><th>Data</th><th>Horário</th><th>Status</th></tr></thead><tbody>${historico.map(r => `<tr><td>${new Date(r.data).toLocaleDateString('pt-BR')}</td><td>${r.hora || '-'}</td><td class="status-presente">Presente</td></tr>`).join('')}</tbody></table></div>`;
    } catch (error) { container.innerHTML = '<div class="error">Erro ao carregar relatórios</div>'; }
}

async function carregarAlunoConfig(container) {
    container.innerHTML = `<div class="card"><h3>Meus Dados</h3><input type="text" id="alunoNome" value="${escapeHtml(usuarioAtual.nome)}"><input type="email" id="alunoEmail" value="${escapeHtml(usuarioAtual.email)}"><input type="password" id="alunoNovaSenha" placeholder="Nova senha"><button id="salvarAlunoConfigBtn" class="btn btn-primary">Salvar</button></div><div class="card"><h3>Dispositivo</h3><p>Device ID: <code id="deviceIdDisplay">${localStorage.getItem('deviceId') || 'Não configurado'}</code></p><button id="gerarNovoDeviceId" class="btn btn-sm btn-outline">Gerar Novo ID</button></div>`;
    document.getElementById('salvarAlunoConfigBtn').onclick = async () => {
        const nome = document.getElementById('alunoNome').value.trim();
        const email = document.getElementById('alunoEmail').value.trim();
        const senha = document.getElementById('alunoNovaSenha').value;
        try { await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined }); showToast('Dados atualizados!', 'success'); }
        catch (error) { showToast(error.message, 'error'); }
    };
    document.getElementById('gerarNovoDeviceId').onclick = () => {
        const novoId = 'device-' + Date.now() + '-' + Math.random().toString(36).substring(7);
        localStorage.setItem('deviceId', novoId);
        document.getElementById('deviceIdDisplay').textContent = novoId;
        showToast('Novo Device ID gerado!', 'success');
    };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function renderizarTabelaAlunos(alunos) {
    if (!alunos.length) return '<p>Nenhum aluno cadastrado</p>';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Matrícula</th>
                    <th>E-mail</th>
                    <th>Turma</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${alunos.map(a => `
                    <tr>
                        <td>${escapeHtml(a.nome)}</td
                        <td>${escapeHtml(a.matricula)}</td
                        <td>${escapeHtml(a.email)}</td
                        <td>${escapeHtml(a.turma_nome || '-')}</td
                        <td>
                            <button class="btn-sm btn-outline" onclick="editarAluno(${a.id})">✏️ Editar</button>
                            <button class="btn-sm btn-danger" onclick="excluirAluno(${a.id})">🗑️ Excluir</button>
                         </td
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
function renderizarTabelaProfessores(professores) {
    if (!professores.length) return '<p>Nenhum professor cadastrado</p>';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Matrícula</th>
                    <th>E-mail</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${professores.map(p => `
                    <tr>
                        <td>${escapeHtml(p.nome)}</td
                        <td>${escapeHtml(p.matricula)}</td
                        <td>${escapeHtml(p.email)}</td
                        <td>
                            <button class="btn-sm btn-outline" onclick="editarProfessor(${p.id})">✏️ Editar</button>
                            <button class="btn-sm btn-danger" onclick="excluirProfessor(${p.id})">🗑️ Excluir</button>
                         </td
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
function renderizarTabelaTurmas(turmas) {
    if (!turmas.length) return '<p>Nenhuma turma</p>';
    return `<table class="data-table"><thead><tr><th>Nome</th><th>Código</th><th>Professor</th><th>Período</th><th>Ações</th></tr></thead><tbody>${turmas.map(t => `<tr><td>${escapeHtml(t.nome)}</td><td>${escapeHtml(t.codigo)}</td><td>${escapeHtml(t.professor_nome || '-')}</td><td>${escapeHtml(t.periodo || '-')}</td><td><button class="btn-sm btn-outline" onclick="editarTurma(${t.id})">Editar</button> <button class="btn-sm btn-danger" onclick="excluirTurma(${t.id})">Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

function renderizarTabelaAPs(aps) {
    if (!aps.length) return '<p>Nenhum AP</p>';
    return `<table class="data-table"><thead><tr><th>BSSID</th><th>SSID</th><th>Sala</th><th>Prédio</th><th>Andar</th><th>Ações</th></tr></thead><tbody>${aps.map(ap => `<tr><td><code>${escapeHtml(ap.bssid)}</code></td><td>${escapeHtml(ap.ssid)}</td><td>${escapeHtml(ap.sala)}</td><td>${escapeHtml(ap.predio || '-')}</td><td>${ap.andar || '-'}</td><td><button class="btn-sm btn-danger" onclick="excluirAP(${ap.id})">Excluir</button></td></tr>`).join('')}</tbody></table>`;
}

// Funções globais
window.editarTurma = (id) => showToast(`Editar turma ${id}`, 'info');
window.excluirTurma = async (id) => { if (confirm('Tem certeza?')) { try { await apiDelete(`/turmas/${id}`); showToast('Turma excluída!', 'success'); location.reload(); } catch(e) { showToast(e.message, 'error'); } } };
window.excluirAP = async (id) => { if (confirm('Tem certeza?')) { try { await apiDelete(`/admin/aps/${id}`); showToast('AP excluído!', 'success'); location.reload(); } catch(e) { showToast(e.message, 'error'); } } };
window.verDetalhesTurma = (id) => showToast(`Detalhes da turma ${id}`, 'info');
window.verAlunosTurma = (id) => showToast(`Alunos da turma ${id}`, 'info');
window.switchProfessorTab = (tab) => { document.querySelector(`#professorScreen .nav-item[data-tab="${tab}"]`).click(); };

function formatDate(dateStr) { if (!dateStr) return '-'; try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch { return dateStr; } }
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'); }
function showToast(message, type) { const toast = document.createElement('div'); toast.className = `toast toast-${type}`; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 3000); }
async function apiGet(endpoint) { const response = await fetch(`${API_URL}${endpoint}`, { headers: token ? { 'Authorization': token } : {} }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function apiPost(endpoint, data) { const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': token }) }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function apiPut(endpoint, data) { const response = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': token }) }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function apiDelete(endpoint) { const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: token ? { 'Authorization': token } : {} }); if (!response.ok) throw new Error(await getErrorMessage(response)); return response.json(); }
async function getErrorMessage(response) { try { const data = await response.json(); return data.error || data.message || 'Erro na requisição'; } catch { return 'Erro na requisição'; } }

// ============================================
// FUNÇÕES DE DETALHES DA TURMA PARA PROFESSOR
// ============================================

// Função para ver detalhes da turma (chamada pelo card do dashboard)
window.verDetalhesTurma = async (turmaId) => {
    try {
        // Buscar dados da turma
        const turmas = await apiGet('/professor/turmas');
        const turma = turmas.find(t => t.id === turmaId);
        
        if (!turma) {
            showToast('Turma não encontrada', 'error');
            return;
        }
        
        // Buscar alunos da turma
        const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
        
        // Criar modal com os detalhes
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-school"></i> ${escapeHtml(turma.nome)}</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong><i class="fas fa-code"></i> Código:</strong> ${escapeHtml(turma.codigo)}</p>
                    <p><strong><i class="fas fa-clock"></i> Período:</strong> ${turma.periodo || 'Não definido'}</p>
                    <p><strong><i class="fas fa-users"></i> Total de alunos:</strong> ${alunos.length}</p>
                    <hr style="margin: 15px 0;">
                    <h4><i class="fas fa-list"></i> Lista de Alunos</h4>
                    <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                        <table class="data-table" style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f5f5f5; position: sticky; top: 0;">
                                    <th style="padding:10px; text-align:left;">Nome</th>
                                    <th style="padding:10px; text-align:left;">Matrícula</th>
                                 </tr>
                            </thead>
                            <tbody>
                                ${alunos.map(a => `
                                    <tr style="border-bottom:1px solid #eee;">
                                        <td style="padding:10px;">${escapeHtml(a.nome)}</td>
                                        <td style="padding:10px;">${escapeHtml(a.matricula)}</td>
                                     </tr>
                                `).join('')}
                                ${alunos.length === 0 ? '<tr><td colspan="2" style="padding:20px; text-align:center;">Nenhum aluno vinculado a esta turma</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="irParaRegistrarPresenca(${turmaId})">
                        <i class="fas fa-check-circle"></i> Registrar Presença
                    </button>
                    <button class="btn btn-outline" onclick="gerarRelatorioTurma(${turmaId})">
                        <i class="fas fa-file-alt"></i> Gerar Relatório
                    </button>
                    <button class="btn btn-outline modal-close-btn">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar detalhes da turma', 'error');
    }
};

// Função para ver alunos da turma (botão "Ver Alunos")
window.verAlunosTurma = async (turmaId) => {
    try {
        const turmas = await apiGet('/professor/turmas');
        const turma = turmas.find(t => t.id === turmaId);
        const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-users"></i> Alunos - ${escapeHtml(turma?.nome || 'Turma')}</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">
                        <table class="data-table" style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f5f5f5; position: sticky; top: 0;">
                                    <th style="padding:10px; text-align:left;">Nome</th>
                                    <th style="padding:10px; text-align:left;">Matrícula</th>
                                 </tr>
                            </thead>
                            <tbody>
                                ${alunos.map(a => `
                                    <tr style="border-bottom:1px solid #eee;">
                                        <td style="padding:10px;">${escapeHtml(a.nome)}</td>
                                        <td style="padding:10px;">${escapeHtml(a.matricula)}</td>
                                     </tr>
                                `).join('')}
                                ${alunos.length === 0 ? '<tr><td colspan="2" style="padding:20px; text-align:center;">Nenhum aluno vinculado</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="irParaRegistrarPresenca(${turmaId})">
                        <i class="fas fa-check-circle"></i> Registrar Presença
                    </button>
                    <button class="btn btn-outline modal-close-btn">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar alunos', 'error');
    }
};

// Função para ir para a aba de registrar presença
window.irParaRegistrarPresenca = (turmaId) => {
    // Fechar modal
    const modal = document.querySelector('.modal.active');
    if (modal) modal.remove();
    
    // Mudar para a aba de registrar presença
    const tabPresenca = document.querySelector('#professorScreen .nav-item[data-tab="prof-presenca"]');
    if (tabPresenca) {
        tabPresenca.click();
        
        // Aguardar um pouco e selecionar a turma
        setTimeout(() => {
            const selectTurma = document.getElementById('presencaTurmaSelect');
            if (selectTurma) {
                selectTurma.value = turmaId;
                // Disparar o evento change
                const event = new Event('change', { bubbles: true });
                selectTurma.dispatchEvent(event);
            }
        }, 500);
    }
};

// Função para gerar relatório da turma
window.gerarRelatorioTurma = async (turmaId) => {
    try {
        const turmas = await apiGet('/professor/turmas');
        const turma = turmas.find(t => t.id === turmaId);
        const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-file-alt"></i> Relatório - ${escapeHtml(turma?.nome || 'Turma')}</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong><i class="fas fa-users"></i> Total de alunos:</strong> ${alunos.length}</p>
                    <p><strong><i class="fas fa-calendar"></i> Data de geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    <hr style="margin: 15px 0;">
                    <h4><i class="fas fa-list"></i> Lista de Alunos</h4>
                    <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                        <table class="data-table" style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f5f5f5; position: sticky; top: 0;">
                                    <th style="padding:10px; text-align:left;">Nome</th>
                                    <th style="padding:10px; text-align:left;">Matrícula</th>
                                    <th style="padding:10px; text-align:left;">Status</th>
                                 </tr>
                            </thead>
                            <tbody>
                                ${alunos.map(a => `
                                    <tr style="border-bottom:1px solid #eee;">
                                        <td style="padding:10px;">${escapeHtml(a.nome)}</td>
                                        <td style="padding:10px;">${escapeHtml(a.matricula)}</td>
                                        <td style="padding:10px; color:#10b981;">Ativo</td>
                                     </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <button class="btn btn-outline" style="margin-top:15px; width:100%;" onclick="exportarRelatorioTurma(${turmaId})">
                        <i class="fas fa-download"></i> Exportar para CSV
                    </button>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline modal-close-btn">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao gerar relatório', 'error');
    }
};

// Função para exportar relatório da turma
window.exportarRelatorioTurma = async (turmaId) => {
    try {
        const alunos = await apiGet(`/professor/turmas/${turmaId}/alunos`);
        let csv = 'Nome,Matrícula,Status\n';
        alunos.forEach(a => {
            csv += `"${escapeCsv(a.nome)}","${escapeCsv(a.matricula)}","Ativo"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `relatorio_turma_${turmaId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Relatório exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao exportar relatório', 'error');
    }
};

function escapeCsv(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
}

console.log('✅ Funções de detalhes da turma adicionadas!');

// ============================================
// MONITORAMENTO DE WI-FI PARA ALUNO
// ============================================

let monitoramentoAtivo = false;
let intervaloMonitoramento = null;
let ultimaVerificacao = 0;

// Iniciar monitoramento de Wi-Fi (simulado - em produção usaria API do navegador)
function iniciarMonitoramentoWifi() {
    if (monitoramentoAtivo) return;
    monitoramentoAtivo = true;
    
    console.log('🔍 Iniciando monitoramento de rede Wi-Fi...');
    
    // Simular verificação periódica (em produção, isso seria feito com API real)
    intervaloMonitoramento = setInterval(async () => {
        // Simular verificação de conexão Wi-Fi
        // Em produção, isso seria substituído por uma API real do navegador
        const wifiSimulado = {
            conectado: true,
            ssid: 'ESCOLA_WIFI' // Seria obtido da API real
        };
        
        if (wifiSimulado.conectado) {
            await registrarPresencaAutomatica(wifiSimulado.ssid);
        }
    }, 30000); // Verificar a cada 30 segundos
}

// Registrar presença automática via Wi-Fi
async function registrarPresencaAutomatica(ssid) {
    try {
        const deviceId = localStorage.getItem('deviceId');
        if (!deviceId) return;
        
        const response = await fetch(`${API_URL}/presenca/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mac_address: deviceId, ssid })
        });
        
        const data = await response.json();
        
        if (data.status === 'registrado') {
            showToast(`✅ Presença registrada! ${data.aluno} - ${data.turma} às ${data.horario}`, 'success');
            await carregarAlunoDashboard(document.getElementById('alunoContent'));
        } else if (data.error === 'Fora do horário de aula') {
            console.log('⏰ Fora do horário de aula:', data.horario_aula);
        } else if (data.error === 'Rede Wi-Fi não autorizada') {
            console.log('⚠️ Conecte-se à rede Wi-Fi da escola');
        }
    } catch (error) {
        console.error('Erro no registro automático:', error);
    }
}

// Parar monitoramento
function pararMonitoramentoWifi() {
    if (intervaloMonitoramento) {
        clearInterval(intervaloMonitoramento);
        intervaloMonitoramento = null;
    }
    monitoramentoAtivo = false;
    console.log('🛑 Monitoramento de Wi-Fi parado');
}

// Atualizar a função carregarAlunoPresenca (remover botão manual)
async function carregarAlunoPresenca(container) {
    // Buscar horário da turma do aluno
    let horarioInfo = '';
    try {
        const horario = await apiGet('/aluno/horario');
        if (horario.horario_inicio && horario.horario_fim) {
            horarioInfo = `<p><strong>Horário da sua turma:</strong> ${horario.horario_inicio.substring(0,5)} às ${horario.horario_fim.substring(0,5)}</p>`;
        }
    } catch(e) {}
    
    container.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-wifi"></i> Registro Automático de Presença</h3>
            <p>Conecte-se à rede Wi-Fi da escola dentro do horário de aula para ter sua presença registrada automaticamente.</p>
            ${horarioInfo}
            <div class="wifi-status" id="wifiStatus">
                <i class="fas fa-spinner fa-pulse"></i> Monitorando conexão...
            </div>
            <div class="info-box" style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 8px;">
                <small><i class="fas fa-info-circle"></i> O registro é automático quando você estiver conectado à rede Wi-Fi da escola no horário da aula.</small>
            </div>
        </div>
        <div class="card">
            <h3><i class="fas fa-qrcode"></i> Seu QR Code de Identificação</h3>
            <div id="qrcode" style="text-align:center; padding:20px">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${API_URL}/aluno/qrcode?token=${token}`)}" alt="QR Code">
            </div>
            <p style="text-align:center; margin-top:10px">Mostre este QR Code ao professor para registro manual em caso de problemas técnicos.</p>
        </div>
    `;
    
    // Simular verificação de Wi-Fi
    const wifiStatus = document.getElementById('wifiStatus');
    setTimeout(() => {
        wifiStatus.innerHTML = '<i class="fas fa-check-circle"></i> Monitoramento ativo. Conecte-se à rede Wi-Fi da escola.';
        wifiStatus.style.background = '#d1fae5';
        wifiStatus.style.color = '#065f46';
        wifiStatus.style.padding = '10px';
        wifiStatus.style.borderRadius = '8px';
    }, 2000);
    
    // Iniciar monitoramento
    iniciarMonitoramentoWifi();
}

// Parar monitoramento ao sair do perfil aluno
window.addEventListener('beforeunload', () => {
    pararMonitoramentoWifi();
});

// Função para editar turma com horários (Admin)
window.editarTurma = async (id) => {
    try {
        const turmas = await apiGet('/turmas');
        const turma = turmas.find(t => t.id === id);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Turma - ${escapeHtml(turma.nome)}</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editTurmaNome" value="${escapeHtml(turma.nome)}" placeholder="Nome da Turma">
                    <input type="text" id="editTurmaCodigo" value="${escapeHtml(turma.codigo)}" placeholder="Código">
                    <input type="text" id="editTurmaPeriodo" value="${escapeHtml(turma.periodo || '')}" placeholder="Período (Matutino/Vespertino/Noturno)">
                    <div class="form-row">
                        <div>
                            <label>Horário de Início</label>
                            <input type="time" id="editTurmaInicio" value="${turma.horario_inicio || '07:00'}">
                        </div>
                        <div>
                            <label>Horário de Término</label>
                            <input type="time" id="editTurmaFim" value="${turma.horario_fim || '12:00'}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditTurmaBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditTurmaBtn').onclick = async () => {
            const nome = document.getElementById('editTurmaNome').value.trim();
            const codigo = document.getElementById('editTurmaCodigo').value.trim();
            const periodo = document.getElementById('editTurmaPeriodo').value.trim();
            const horarioInicio = document.getElementById('editTurmaInicio').value;
            const horarioFim = document.getElementById('editTurmaFim').value;
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código', 'error');
                return;
            }
            
            try {
                await apiPut(`/turmas/${id}`, { nome, codigo, periodo, horario_inicio: horarioInicio, horario_fim: horarioFim });
                showToast('Turma atualizada com sucesso!', 'success');
                closeModal();
                await carregarAdminTurmas(document.getElementById('adminContent'));
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        showToast('Erro ao carregar dados da turma', 'error');
    }
};

// Atualizar renderização da tabela de turmas para mostrar horários
function renderizarTabelaTurmas(turmas) {
    if (!turmas.length) return '<p>Nenhuma turma cadastrada</p>';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Código</th>
                    <th>Professor</th>
                    <th>Período</th>
                    <th>Horário</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${turmas.map(t => `
                    <tr>
                        <td>${escapeHtml(t.nome)}</td
                        <td>${escapeHtml(t.codigo)}</td
                        <td>${escapeHtml(t.professor_nome || '-')}</td
                        <td>${escapeHtml(t.periodo || '-')}</td
                        <td>${t.horario_inicio ? t.horario_inicio.substring(0,5) : '07:00'} - ${t.horario_fim ? t.horario_fim.substring(0,5) : '12:00'}</td
                        <td>
                            <button class="btn-sm btn-outline" onclick="editarTurma(${t.id})">✏️ Editar</button>
                            <button class="btn-sm btn-danger" onclick="excluirTurma(${t.id})">🗑️ Excluir</button>
                         </td
                     </tr>
                `).join('')}
            </tbody>
        </tabla>
    `;
}
// ============================================
// FUNÇÃO CORRIGIDA PARA ALUNO - SEM QR CODE
// ============================================

async function carregarAlunoPresenca(container) {
    // Buscar horário da turma do aluno
    let horarioInfo = '';
    try {
        const horario = await apiGet('/aluno/horario');
        if (horario.horario_inicio && horario.horario_fim) {
            horarioInfo = `<p><strong>Horário da sua turma:</strong> ${horario.horario_inicio.substring(0,5)} às ${horario.horario_fim.substring(0,5)}</p>`;
        }
    } catch(e) {}
    
    container.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-wifi"></i> Registro Automático de Presença</h3>
            <p>Conecte-se à rede Wi-Fi da escola dentro do horário de aula para ter sua presença registrada automaticamente.</p>
            ${horarioInfo}
            <div class="wifi-status" id="wifiStatus">
                <i class="fas fa-spinner fa-pulse"></i> Monitorando conexão...
            </div>
            <div class="info-box" style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 8px;">
                <small><i class="fas fa-info-circle"></i> O registro é automático quando você estiver conectado à rede Wi-Fi da escola no horário da aula.</small>
            </div>
        </div>
    `;
    
    // Simular verificação de Wi-Fi
    const wifiStatus = document.getElementById('wifiStatus');
    setTimeout(() => {
        wifiStatus.innerHTML = '<i class="fas fa-check-circle"></i> Monitoramento ativo. Conecte-se à rede Wi-Fi da escola.';
        wifiStatus.style.background = '#d1fae5';
        wifiStatus.style.color = '#065f46';
        wifiStatus.style.padding = '10px';
        wifiStatus.style.borderRadius = '8px';
    }, 2000);
    
    // Iniciar monitoramento
    iniciarMonitoramentoWifi();
}

// Substituir a função antiga
window.carregarAlunoPresenca = carregarAlunoPresenca;

console.log('✅ QR Code removido do perfil aluno!');
// ============================================
// FUNÇÕES CORRIGIDAS PARA ADMIN
// ============================================

// Editar Aluno - Modal completo
window.editarAluno = async (id) => {
    console.log('✏️ Editando aluno ID:', id);
    try {
        const alunos = await apiGet('/admin/alunos');
        const aluno = alunos.find(a => a.id === id);
        
        if (!aluno) {
            showToast('Aluno não encontrado', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-edit"></i> Editar Aluno</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editAlunoNome" value="${escapeHtml(aluno.nome)}" placeholder="Nome completo">
                    <input type="text" id="editAlunoMatricula" value="${escapeHtml(aluno.matricula)}" placeholder="Matrícula">
                    <input type="email" id="editAlunoEmail" value="${escapeHtml(aluno.email)}" placeholder="E-mail">
                </div>
                <div class="modal-footer">
                    <button id="saveEditAlunoBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditAlunoBtn').onclick = async () => {
            const nome = document.getElementById('editAlunoNome').value.trim();
            const matricula = document.getElementById('editAlunoMatricula').value.trim();
            const email = document.getElementById('editAlunoEmail').value.trim();
            
            if (!nome || !matricula || !email) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPut(`/admin/alunos/${id}`, { nome, matricula, email });
                showToast('Aluno atualizado com sucesso!', 'success');
                closeModal();
                const content = document.getElementById('adminContent');
                if (content) await carregarAdminAlunos(content);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados do aluno', 'error');
    }
};

// Excluir Aluno
window.excluirAluno = async (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita!')) {
        try {
            await apiDelete(`/admin/alunos/${id}`);
            showToast('Aluno excluído com sucesso!', 'success');
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminAlunos(content);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

// Editar Professor
window.editarProfessor = async (id) => {
    console.log('✏️ Editando professor ID:', id);
    try {
        const professores = await apiGet('/admin/professores');
        const professor = professores.find(p => p.id === id);
        
        if (!professor) {
            showToast('Professor não encontrado', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-edit"></i> Editar Professor</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editProfNome" value="${escapeHtml(professor.nome)}" placeholder="Nome completo">
                    <input type="email" id="editProfEmail" value="${escapeHtml(professor.email)}" placeholder="E-mail">
                    <input type="text" id="editProfMatricula" value="${escapeHtml(professor.matricula)}" placeholder="Matrícula">
                </div>
                <div class="modal-footer">
                    <button id="saveEditProfBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditProfBtn').onclick = async () => {
            const nome = document.getElementById('editProfNome').value.trim();
            const email = document.getElementById('editProfEmail').value.trim();
            const matricula = document.getElementById('editProfMatricula').value.trim();
            
            if (!nome || !email || !matricula) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPut(`/admin/professores/${id}`, { nome, email, matricula });
                showToast('Professor atualizado com sucesso!', 'success');
                closeModal();
                const content = document.getElementById('adminContent');
                if (content) await carregarAdminProfessores(content);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados do professor', 'error');
    }
};

// Excluir Professor
window.excluirProfessor = async (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir este professor? Esta ação não pode ser desfeita!')) {
        try {
            await apiDelete(`/admin/professores/${id}`);
            showToast('Professor excluído com sucesso!', 'success');
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminProfessores(content);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

console.log('✅ Funções de edição/exclusão corrigidas!');

// ============================================
// FUNÇÃO DE EXCLUSÃO CORRIGIDA (remove vínculos)
// ============================================

// Excluir Aluno - Remove vínculos primeiro
window.excluirAluno = async (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir este aluno? Todas as matrículas do aluno serão removidas.')) {
        try {
            // Primeiro, remover vínculo do aluno com turma (alunos_turmas)
            await apiDelete(`/admin/alunos/${id}/vincular`);
            
            // Depois, excluir o aluno
            await apiDelete(`/admin/alunos/${id}`);
            
            showToast('Aluno excluído com sucesso!', 'success');
            
            // Recarregar a lista
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminAlunos(content);
            
        } catch (error) {
            console.error('Erro na exclusão:', error);
            showToast(error.message, 'error');
        }
    }
};

// Excluir Professor - Remove vínculos primeiro
window.excluirProfessor = async (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir este professor? Todas as turmas vinculadas serão removidas.')) {
        try {
            // Primeiro, remover vínculo do professor com turmas (professores_turmas)
            await apiDelete(`/admin/professores/${id}/vincular`);
            
            // Depois, excluir o professor
            await apiDelete(`/admin/professores/${id}`);
            
            showToast('Professor excluído com sucesso!', 'success');
            
            // Recarregar a lista
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminProfessores(content);
            
        } catch (error) {
            console.error('Erro na exclusão:', error);
            showToast(error.message, 'error');
        }
    }
};

console.log('✅ Funções de exclusão com remoção de vínculos adicionadas!');

// ============================================
// FUNÇÃO DE EXCLUSÃO CORRIGIDA
// ============================================

window.excluirAluno = async (id) => {
    if (!confirm('⚠️ Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita!')) {
        return;
    }
    
    console.log('🗑️ Excluindo aluno ID:', id);
    
    try {
        // Primeiro, remover vínculo com turma
        const responseVinculo = await fetch(`${API_URL}/admin/alunos/${id}/vincular`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        if (!responseVinculo.ok) {
            console.log('Aviso: Não foi possível remover vínculo ou aluno não tem vínculo');
        }
        
        // Depois, excluir o aluno
        const response = await fetch(`${API_URL}/admin/alunos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Aluno excluído com sucesso!', 'success');
            // Recarregar a lista
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminAlunos(content);
        } else {
            showToast(data.error || 'Erro ao excluir aluno', 'error');
        }
    } catch (error) {
        console.error('Erro na exclusão:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    }
};

window.excluirProfessor = async (id) => {
    if (!confirm('⚠️ Tem certeza que deseja excluir este professor? Esta ação não pode ser desfeita!')) {
        return;
    }
    
    console.log('🗑️ Excluindo professor ID:', id);
    
    try {
        // Primeiro, remover vínculo com turmas
        const responseVinculo = await fetch(`${API_URL}/admin/professores/${id}/vincular`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        if (!responseVinculo.ok) {
            console.log('Aviso: Não foi possível remover vínculo ou professor não tem vínculo');
        }
        
        // Depois, excluir o professor
        const response = await fetch(`${API_URL}/admin/professores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Professor excluído com sucesso!', 'success');
            // Recarregar a lista
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminProfessores(content);
        } else {
            showToast(data.error || 'Erro ao excluir professor', 'error');
        }
    } catch (error) {
        console.error('Erro na exclusão:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    }
};

console.log('✅ Funções de exclusão corrigidas!');

// ============================================
// FUNÇÃO CORRIGIDA - DESATIVAR ALUNO (NÃO EXCLUIR)
// ============================================

window.excluirAluno = async (id) => {
    if (!confirm('⚠️ Tem certeza que deseja desativar este aluno? Ele não poderá mais registrar presença, mas os registros anteriores serão mantidos.')) {
        return;
    }
    
    console.log('🔴 Desativando aluno ID:', id);
    
    try {
        // 1. Remover vínculo com turma
        await fetch(`${API_URL}/admin/alunos/${id}/vincular`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        // 2. Desativar o aluno (não excluir)
        const response = await fetch(`${API_URL}/admin/alunos/${id}/desativar`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Aluno desativado com sucesso!', 'success');
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminAlunos(content);
        } else {
            showToast(data.error || 'Erro ao desativar aluno', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    }
};

// Função para desativar professor
window.excluirProfessor = async (id) => {
    if (!confirm('⚠️ Tem certeza que deseja desativar este professor? Ele não poderá mais acessar o sistema, mas os registros anteriores serão mantidos.')) {
        return;
    }
    
    console.log('🔴 Desativando professor ID:', id);
    
    try {
        // 1. Remover vínculo com turmas
        await fetch(`${API_URL}/admin/professores/${id}/vincular`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        // 2. Desativar o professor
        const response = await fetch(`${API_URL}/admin/professores/${id}/desativar`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Professor desativado com sucesso!', 'success');
            const content = document.getElementById('adminContent');
            if (content) await carregarAdminProfessores(content);
        } else {
            showToast(data.error || 'Erro ao desativar professor', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    }
};

console.log('✅ Funções de desativação corrigidas!');

// ============================================
// FUNÇÕES ATUALIZADAS - APENAS USUÁRIOS ATIVOS
// ============================================

// Recarregar lista de alunos (apenas ativos)
window.carregarAdminAlunos = async (container) => {
    try {
        const alunos = await apiGet('/admin/alunos');
        const turmas = await apiGet('/turmas');
        
        container.innerHTML = `
            <div class="card">
                <h3><i class="fas fa-user-plus"></i> Cadastrar Aluno</h3>
                <div class="form-row">
                    <input type="text" id="novoAlunoNome" placeholder="Nome completo">
                    <input type="text" id="novoAlunoMatricula" placeholder="Matrícula">
                </div>
                <div class="form-row">
                    <input type="email" id="novoAlunoEmail" placeholder="E-mail">
                    <select id="novoAlunoTurma">
                        <option value="">Selecionar Turma</option>
                        ${turmas.map(t => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('')}
                    </select>
                </div>
                <button id="salvarAlunoBtn" class="btn btn-primary">Cadastrar</button>
            </div>
            <div class="card">
                <h3><i class="fas fa-list"></i> Lista de Alunos Ativos</h3>
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
                showToast('Aluno cadastrado!', 'success');
                await window.carregarAdminAlunos(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        container.innerHTML = '<div class="error">Erro ao carregar alunos</div>';
    }
};

// Função para desativar aluno (exclusão lógica)
window.excluirAluno = async (id) => {
    if (!confirm('⚠️ Tem certeza que deseja desativar este aluno? Ele não aparecerá mais na lista, mas seus registros de presença serão mantidos para relatórios.')) {
        return;
    }
    
    console.log('🔴 Desativando aluno ID:', id);
    
    try {
        // 1. Remover vínculo com turma
        await fetch(`${API_URL}/admin/alunos/${id}/vincular`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        // 2. Desativar aluno (ativo = 0)
        const response = await fetch(`${API_URL}/admin/alunos/${id}/desativar`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            }
        });
        
        if (response.ok) {
            showToast('Aluno desativado com sucesso!', 'success');
            const content = document.getElementById('adminContent');
            if (content) await window.carregarAdminAlunos(content);
        } else {
            const data = await response.json();
            showToast(data.error || 'Erro ao desativar aluno', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    }
};

// Editar Aluno
window.editarAluno = async (id) => {
    try {
        const alunos = await apiGet('/admin/alunos');
        const aluno = alunos.find(a => a.id === id);
        
        if (!aluno) {
            showToast('Aluno não encontrado', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-edit"></i> Editar Aluno</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editAlunoNome" value="${escapeHtml(aluno.nome)}" placeholder="Nome">
                    <input type="text" id="editAlunoMatricula" value="${escapeHtml(aluno.matricula)}" placeholder="Matrícula">
                    <input type="email" id="editAlunoEmail" value="${escapeHtml(aluno.email)}" placeholder="E-mail">
                </div>
                <div class="modal-footer">
                    <button id="saveEditAlunoBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        
        document.getElementById('saveEditAlunoBtn').onclick = async () => {
            const nome = document.getElementById('editAlunoNome').value.trim();
            const matricula = document.getElementById('editAlunoMatricula').value.trim();
            const email = document.getElementById('editAlunoEmail').value.trim();
            
            if (!nome || !matricula || !email) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPut(`/admin/alunos/${id}`, { nome, matricula, email });
                showToast('Aluno atualizado!', 'success');
                closeModal();
                const content = document.getElementById('adminContent');
                if (content) await window.carregarAdminAlunos(content);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        showToast('Erro ao carregar dados do aluno', 'error');
    }
};

// Renderizar tabela de alunos
function renderizarTabelaAlunos(alunos) {
    if (!alunos.length) return '<p>Nenhum aluno ativo cadastrado</p>';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Turma</th><th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${alunos.map(a => `
                    <tr>
                        <td>${escapeHtml(a.nome)}</td>
                        <td>${escapeHtml(a.matricula)}</td>
                        <td>${escapeHtml(a.email)}</td>
                        <td>${escapeHtml(a.turma_nome || '-')}</td>
                        <td>
                            <button class="btn-sm btn-outline" onclick="editarAluno(${a.id})">✏️ Editar</button>
                            <button class="btn-sm btn-danger" onclick="excluirAluno(${a.id})">🗑️ Excluir</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

console.log('✅ Funções atualizadas - exclusão lógica implementada!');

// ============================================
// FUNÇÃO MELHORADA PARA RENDERIZAR TABELA DE TURMAS
// ============================================

function renderizarTabelaTurmas(turmas) {
    if (!turmas || turmas.length === 0) {
        return '<div class="empty-state">Nenhuma turma cadastrada</div>';
    }
    
    return `
        <div style="overflow-x: auto;">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:14px 12px; text-align:left;">Nome</th>
                        <th style="padding:14px 12px; text-align:left;">Código</th>
                        <th style="padding:14px 12px; text-align:left;">Professor</th>
                        <th style="padding:14px 12px; text-align:left;">Período</th>
                        <th style="padding:14px 12px; text-align:left;">Horário</th>
                        <th style="padding:14px 12px; text-align:center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${turmas.map(t => `
                        <tr style="border-bottom:1px solid #eef2f6;">
                            <td style="padding:14px 12px;">${escapeHtml(t.nome)}</td>
                            <td style="padding:14px 12px;">${escapeHtml(t.codigo)}</td>
                            <td style="padding:14px 12px;">${escapeHtml(t.professor_nome || '-')}</td>
                            <td style="padding:14px 12px;">${escapeHtml(t.periodo || '-')}</td>
                            <td style="padding:14px 12px;">${t.horario_inicio ? t.horario_inicio.substring(0,5) : '07:00'} - ${t.horario_fim ? t.horario_fim.substring(0,5) : '12:00'}</td>
                            <td style="padding:14px 12px; text-align:center;">
                                <div style="display:flex; gap:8px; justify-content:center;">
                                    <button class="btn-sm btn-outline" onclick="editarTurma(${t.id})" style="padding:6px 14px; cursor:pointer;">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button class="btn-sm btn-danger" onclick="excluirTurma(${t.id})" style="padding:6px 14px; cursor:pointer;">
                                        <i class="fas fa-trash"></i> Excluir
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Substituir a função antiga
window.renderizarTabelaTurmas = renderizarTabelaTurmas;

console.log('✅ Tabela de turmas com espaçamento melhorado!');

// ============================================
// FUNÇÃO EDITAR TURMA COM SELEÇÃO DE PROFESSOR
// ============================================

window.editarTurma = async (id) => {
    try {
        // Buscar dados da turma
        const turmas = await apiGet('/turmas');
        const turma = turmas.find(t => t.id === id);
        
        if (!turma) {
            showToast('Turma não encontrada', 'error');
            return;
        }
        
        // Buscar lista de professores ativos
        const professores = await apiGet('/admin/professores');
        
        // Buscar professor atual da turma
        let professorAtualId = null;
        try {
            const [vinculo] = await apiGet(`/turmas/${id}/professor`);
            professorAtualId = vinculo?.professor_id || null;
        } catch(e) {}
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Turma</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nome da Turma</label>
                        <input type="text" id="editTurmaNome" value="${escapeHtml(turma.nome)}" placeholder="Nome da Turma">
                    </div>
                    <div class="form-group">
                        <label>Código</label>
                        <input type="text" id="editTurmaCodigo" value="${escapeHtml(turma.codigo)}" placeholder="Código">
                    </div>
                    <div class="form-group">
                        <label>Professor Responsável</label>
                        <select id="editTurmaProfessor" class="form-control">
                            <option value="">Selecione um professor</option>
                            ${professores.map(p => `
                                <option value="${p.id}" ${professorAtualId === p.id ? 'selected' : ''}>
                                    ${escapeHtml(p.nome)} (${escapeHtml(p.matricula)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Período</label>
                        <select id="editTurmaPeriodo" class="form-control">
                            <option value="Matutino" ${turma.periodo === 'Matutino' ? 'selected' : ''}>Matutino (07:00 - 12:00)</option>
                            <option value="Vespertino" ${turma.periodo === 'Vespertino' ? 'selected' : ''}>Vespertino (13:00 - 18:00)</option>
                            <option value="Noturno" ${turma.periodo === 'Noturno' ? 'selected' : ''}>Noturno (19:00 - 22:00)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Horário de Início</label>
                            <input type="time" id="editTurmaInicio" value="${turma.horario_inicio || '07:00'}">
                        </div>
                        <div class="form-group">
                            <label>Horário de Término</label>
                            <input type="time" id="editTurmaFim" value="${turma.horario_fim || '12:00'}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditTurmaBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditTurmaBtn').onclick = async () => {
            const nome = document.getElementById('editTurmaNome').value.trim();
            const codigo = document.getElementById('editTurmaCodigo').value.trim();
            const professorId = document.getElementById('editTurmaProfessor').value;
            const periodo = document.getElementById('editTurmaPeriodo').value;
            const horarioInicio = document.getElementById('editTurmaInicio').value;
            const horarioFim = document.getElementById('editTurmaFim').value;
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código da turma', 'error');
                return;
            }
            
            try {
                // Atualizar dados da turma
                await apiPut(`/turmas/${id}`, { 
                    nome, 
                    codigo, 
                    periodo, 
                    horario_inicio: horarioInicio, 
                    horario_fim: horarioFim 
                });
                
                // Atualizar vínculo com professor
                if (professorId) {
                    await apiPost(`/turmas/${id}/professor`, { professor_id: parseInt(professorId) });
                }
                
                showToast('Turma atualizada com sucesso!', 'success');
                closeModal();
                
                // Recarregar a lista de turmas
                const content = document.getElementById('adminContent');
                if (content) await carregarAdminTurmas(content);
                
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados da turma', 'error');
    }
};

console.log('✅ Função editarTurma atualizada com seleção de professor!');
// ============================================
// FUNÇÃO EDITAR TURMA COMPLETA
// ============================================

window.editarTurma = async (id) => {
    try {
        const turmas = await apiGet('/turmas');
        const turma = turmas.find(t => t.id === id);
        
        if (!turma) {
            showToast('Turma não encontrada', 'error');
            return;
        }
        
        const professores = await apiGet('/admin/professores');
        
        // Buscar professor atual da turma
        let professorAtualId = null;
        try {
            const response = await fetch(`${API_URL}/turmas/${id}/professor`, {
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                const data = await response.json();
                professorAtualId = data.professor_id;
            }
        } catch(e) {
            console.log('Nenhum professor vinculado');
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Turma</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nome da Turma</label>
                        <input type="text" id="editTurmaNome" value="${escapeHtml(turma.nome)}" placeholder="Nome da Turma">
                    </div>
                    <div class="form-group">
                        <label>Código</label>
                        <input type="text" id="editTurmaCodigo" value="${escapeHtml(turma.codigo)}" placeholder="Código">
                    </div>
                    <div class="form-group">
                        <label>Professor Responsável</label>
                        <select id="editTurmaProfessor" class="form-control">
                            <option value="">Selecione um professor</option>
                            ${professores.map(p => `
                                <option value="${p.id}" ${professorAtualId === p.id ? 'selected' : ''}>
                                    ${escapeHtml(p.nome)} (${escapeHtml(p.matricula)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Período</label>
                        <select id="editTurmaPeriodo" class="form-control">
                            <option value="Matutino" ${turma.periodo === 'Matutino' ? 'selected' : ''}>Matutino (07:00 - 12:00)</option>
                            <option value="Vespertino" ${turma.periodo === 'Vespertino' ? 'selected' : ''}>Vespertino (13:00 - 18:00)</option>
                            <option value="Noturno" ${turma.periodo === 'Noturno' ? 'selected' : ''}>Noturno (19:00 - 22:00)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Horário de Início</label>
                            <input type="time" id="editTurmaInicio" value="${turma.horario_inicio || '07:00'}">
                        </div>
                        <div class="form-group">
                            <label>Horário de Término</label>
                            <input type="time" id="editTurmaFim" value="${turma.horario_fim || '12:00'}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditTurmaBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditTurmaBtn').onclick = async () => {
            const nome = document.getElementById('editTurmaNome').value.trim();
            const codigo = document.getElementById('editTurmaCodigo').value.trim();
            const professorId = document.getElementById('editTurmaProfessor').value;
            const periodo = document.getElementById('editTurmaPeriodo').value;
            const horarioInicio = document.getElementById('editTurmaInicio').value;
            const horarioFim = document.getElementById('editTurmaFim').value;
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código da turma', 'error');
                return;
            }
            
            try {
                // Atualizar dados da turma
                await apiPut(`/turmas/${id}`, { 
                    nome, 
                    codigo, 
                    periodo, 
                    horario_inicio: horarioInicio, 
                    horario_fim: horarioFim 
                });
                
                // Atualizar vínculo com professor
                if (professorId) {
                    await fetch(`${API_URL}/turmas/${id}/professor`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': token 
                        },
                        body: JSON.stringify({ professor_id: parseInt(professorId) })
                    });
                }
                
                showToast('Turma atualizada com sucesso!', 'success');
                closeModal();
                
                // Recarregar a lista de turmas
                const content = document.getElementById('adminContent');
                if (content) await carregarAdminTurmas(content);
                
            } catch (error) {
                console.error('Erro:', error);
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados da turma', 'error');
    }
};

console.log('✅ Função editarTurma corrigida!');

// ============================================
// FUNÇÃO CORRIGIDA PARA CARREGAR TURMAS
// ============================================

window.carregarAdminTurmas = async (container) => {
    try {
        // Buscar turmas atualizadas
        const turmas = await apiGet('/turmas');
        console.log('Turmas carregadas:', turmas);
        
        container.innerHTML = `
            <div class="card">
                <h3><i class="fas fa-plus-circle"></i> Cadastrar Turma</h3>
                <div class="form-row">
                    <input type="text" id="novaTurmaNome" placeholder="Nome da Turma">
                    <input type="text" id="novaTurmaCodigo" placeholder="Código">
                </div>
                <div class="form-row">
                    <select id="novaTurmaProfessor">
                        <option value="">Selecionar Professor</option>
                        ${await carregarOpcoesProfessores()}
                    </select>
                    <select id="novaTurmaPeriodo">
                        <option value="Matutino">Matutino (07:00 - 12:00)</option>
                        <option value="Vespertino">Vespertino (13:00 - 18:00)</option>
                        <option value="Noturno">Noturno (19:00 - 22:00)</option>
                    </select>
                </div>
                <div class="form-row">
                    <input type="time" id="novaTurmaInicio" value="07:00">
                    <input type="time" id="novaTurmaFim" value="12:00">
                </div>
                <button id="salvarTurmaBtn" class="btn btn-primary">Cadastrar Turma</button>
            </div>
            <div class="card">
                <h3><i class="fas fa-list"></i> Lista de Turmas</h3>
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th><th>Código</th><th>Professor</th><th>Período</th><th>Horário</th><th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${turmas.map(t => `
                                <tr>
                                    <td>${escapeHtml(t.nome)}</td>
                                    <td>${escapeHtml(t.codigo)}</td>
                                    <td>${escapeHtml(t.professor_nome || '-')}</td>
                                    <td>${escapeHtml(t.periodo || '-')}</td>
                                    <td>${t.horario_inicio ? t.horario_inicio.substring(0,5) : '07:00'} - ${t.horario_fim ? t.horario_fim.substring(0,5) : '12:00'}</td>
                                    <td>
                                        <div style="display:flex; gap:8px;">
                                            <button class="btn-sm btn-outline" onclick="editarTurma(${t.id})">✏️ Editar</button>
                                            <button class="btn-sm btn-danger" onclick="excluirTurma(${t.id})">🗑️ Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Evento para cadastrar nova turma
        document.getElementById('salvarTurmaBtn').onclick = async () => {
            const nome = document.getElementById('novaTurmaNome').value.trim();
            const codigo = document.getElementById('novaTurmaCodigo').value.trim();
            const professorId = document.getElementById('novaTurmaProfessor').value;
            const periodo = document.getElementById('novaTurmaPeriodo').value;
            const horarioInicio = document.getElementById('novaTurmaInicio').value;
            const horarioFim = document.getElementById('novaTurmaFim').value;
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código', 'error');
                return;
            }
            
            try {
                const result = await apiPost('/turmas', { nome, codigo, periodo, horario_inicio: horarioInicio, horario_fim: horarioFim });
                
                if (professorId) {
                    await fetch(`${API_URL}/turmas/${result.id}/professor`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': token },
                        body: JSON.stringify({ professor_id: parseInt(professorId) })
                    });
                }
                
                showToast('Turma cadastrada com sucesso!', 'success');
                await window.carregarAdminTurmas(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error">Erro ao carregar turmas</div>';
    }
};

// Função auxiliar para carregar opções de professores
async function carregarOpcoesProfessores() {
    try {
        const professores = await apiGet('/admin/professores');
        return professores.map(p => `<option value="${p.id}">${escapeHtml(p.nome)} (${escapeHtml(p.matricula)})</option>`).join('');
    } catch (error) {
        return '';
    }
}

// Garantir que a função de editarTurma recarregue a lista
window.editarTurma = async (id) => {
    try {
        const turmas = await apiGet('/turmas');
        const turma = turmas.find(t => t.id === id);
        
        if (!turma) {
            showToast('Turma não encontrada', 'error');
            return;
        }
        
        const professores = await apiGet('/admin/professores');
        
        let professorAtualId = null;
        try {
            const response = await fetch(`${API_URL}/turmas/${id}/professor`, {
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                const data = await response.json();
                professorAtualId = data.professor_id;
            }
        } catch(e) {}
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Turma</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nome da Turma</label>
                        <input type="text" id="editTurmaNome" value="${escapeHtml(turma.nome)}" placeholder="Nome da Turma">
                    </div>
                    <div class="form-group">
                        <label>Código</label>
                        <input type="text" id="editTurmaCodigo" value="${escapeHtml(turma.codigo)}" placeholder="Código">
                    </div>
                    <div class="form-group">
                        <label>Professor Responsável</label>
                        <select id="editTurmaProfessor" class="form-control">
                            <option value="">Selecione um professor</option>
                            ${professores.map(p => `
                                <option value="${p.id}" ${professorAtualId === p.id ? 'selected' : ''}>
                                    ${escapeHtml(p.nome)} (${escapeHtml(p.matricula)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Período</label>
                        <select id="editTurmaPeriodo" class="form-control">
                            <option value="Matutino" ${turma.periodo === 'Matutino' ? 'selected' : ''}>Matutino (07:00 - 12:00)</option>
                            <option value="Vespertino" ${turma.periodo === 'Vespertino' ? 'selected' : ''}>Vespertino (13:00 - 18:00)</option>
                            <option value="Noturno" ${turma.periodo === 'Noturno' ? 'selected' : ''}>Noturno (19:00 - 22:00)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Horário de Início</label>
                            <input type="time" id="editTurmaInicio" value="${turma.horario_inicio || '07:00'}">
                        </div>
                        <div class="form-group">
                            <label>Horário de Término</label>
                            <input type="time" id="editTurmaFim" value="${turma.horario_fim || '12:00'}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditTurmaBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditTurmaBtn').onclick = async () => {
            const nome = document.getElementById('editTurmaNome').value.trim();
            const codigo = document.getElementById('editTurmaCodigo').value.trim();
            const professorId = document.getElementById('editTurmaProfessor').value;
            const periodo = document.getElementById('editTurmaPeriodo').value;
            const horarioInicio = document.getElementById('editTurmaInicio').value;
            const horarioFim = document.getElementById('editTurmaFim').value;
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código', 'error');
                return;
            }
            
            try {
                await apiPut(`/turmas/${id}`, { nome, codigo, periodo, horario_inicio: horarioInicio, horario_fim: horarioFim });
                
                if (professorId) {
                    await fetch(`${API_URL}/turmas/${id}/professor`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': token },
                        body: JSON.stringify({ professor_id: parseInt(professorId) })
                    });
                }
                
                showToast('Turma atualizada com sucesso!', 'success');
                closeModal();
                
                // Recarregar a lista de turmas
                const content = document.getElementById('adminContent');
                if (content) await window.carregarAdminTurmas(content);
                
            } catch (error) {
                console.error('Erro:', error);
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados da turma', 'error');
    }
};

console.log('✅ Função carregarAdminTurmas corrigida!');

// ============================================
// FUNÇÃO ATUALIZADA PARA CADASTRAR APs
// ============================================

window.carregarAdminAPs = async (container) => {
    try {
        const aps = await apiGet('/admin/aps');
        
        container.innerHTML = `
            <div class="card">
                <h3><i class="fas fa-plus-circle"></i> Cadastrar Ponto de Acesso</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label>BSSID (MAC do AP) *</label>
                        <input type="text" id="novoAPBssid" placeholder="Ex: AA:BB:CC:DD:EE:FF" class="form-control">
                        <small>Identificador único do roteador</small>
                    </div>
                    <div class="form-group">
                        <label>SSID *</label>
                        <input type="text" id="novoAPSsid" placeholder="Nome da rede Wi-Fi" class="form-control">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Sala *</label>
                        <input type="text" id="novoAPSala" placeholder="Ex: Sala 101, Laboratório 2" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Prédio</label>
                        <input type="text" id="novoAPPredio" placeholder="Ex: Bloco A, Prédio Central" class="form-control">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Andar</label>
                        <input type="number" id="novoAPAndar" placeholder="Ex: 1, 2, 3" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Faixa de IP</label>
                        <input type="text" id="novoAPIpRange" value="10.0.0.0/8" placeholder="Ex: 192.168.0.0/16" class="form-control">
                        <small>Rede da escola (ex: 10.0.0.0/8, 172.16.0.0/12)</small>
                    </div>
                </div>
                <button id="salvarAPBtn" class="btn btn-primary">Cadastrar Ponto de Acesso</button>
            </div>
            <div class="card">
                <h3><i class="fas fa-list"></i> Pontos de Acesso Cadastrados</h3>
                <div id="listaAPs">${renderizarTabelaAPs(aps)}</div>
            </div>
        `;
        
        document.getElementById('salvarAPBtn').onclick = async () => {
            const bssid = document.getElementById('novoAPBssid').value.trim().toUpperCase();
            const ssid = document.getElementById('novoAPSsid').value.trim();
            const sala = document.getElementById('novoAPSala').value.trim();
            const predio = document.getElementById('novoAPPredio').value.trim();
            const andar = document.getElementById('novoAPAndar').value;
            const ip_range = document.getElementById('novoAPIpRange').value.trim();
            
            if (!bssid || !ssid || !sala) {
                showToast('Preencha BSSID, SSID e Sala', 'error');
                return;
            }
            
            // Validar formato do BSSID
            const bssidRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
            if (!bssidRegex.test(bssid)) {
                showToast('Formato de BSSID inválido. Use AA:BB:CC:DD:EE:FF', 'error');
                return;
            }
            
            try {
                await apiPost('/admin/aps', { 
                    bssid, 
                    ssid, 
                    sala, 
                    predio, 
                    andar: andar || null,
                    ip_range: ip_range || '10.0.0.0/8'
                });
                showToast('Ponto de acesso cadastrado com sucesso!', 'success');
                await window.carregarAdminAPs(container);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="error">Erro ao carregar APs</div>';
    }
};

function renderizarTabelaAPs(aps) {
    if (!aps.length) return '<p>Nenhum ponto de acesso cadastrado</p>';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>BSSID</th>
                    <th>SSID</th>
                    <th>Sala</th>
                    <th>Prédio</th>
                    <th>Andar</th>
                    <th>IP Range</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${aps.map(ap => `
                    <tr>
                        <td><code>${escapeHtml(ap.bssid)}</code></td>
                        <td>${escapeHtml(ap.ssid)}</td>
                        <td>${escapeHtml(ap.sala)}</td>
                        <td>${escapeHtml(ap.predio || '-')}</td>
                        <td>${ap.andar || '-'}</td>
                        <td>${ap.ip_range || '10.0.0.0/8'}</td>
                        <td>
                            <button class="btn-sm btn-danger" onclick="excluirAP(${ap.id})">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

console.log('✅ Função de cadastro de APs atualizada!');

// ============================================
// MONITORAMENTO DE PRESENÇA DO ALUNO
// ============================================

// Variáveis para monitoramento

// Função para obter informações da rede (simulada - em produção usaria API real)
async function obterInfoRede() {
    // Em produção, isso seria obtido via API do navegador ou plugin
    // Por enquanto, simulamos com dados de exemplo
    return {
        ssid: 'ESCOLA_WIFI',
        bssid: 'AA:BB:CC:DD:EE:FF',
        ip: '10.0.0.100'
    };
}

// Registrar presença automática
async function registrarPresencaAutomatica() {
    // Evitar múltiplas verificações em curto intervalo
    const agora = Date.now();
    if (agora - ultimaVerificacao < 30000) {
        return;
    }
    ultimaVerificacao = agora;
    
    try {
        const deviceId = localStorage.getItem('deviceId');
        if (!deviceId) return;
        
        const redeInfo = await obterInfoRede();
        
        const response = await fetch(`${API_URL}/presenca/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mac_address: deviceId,
                ssid: redeInfo.ssid,
                bssid: redeInfo.bssid,
                client_ip: redeInfo.ip
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'registrado') {
            showToast(`✅ Presença registrada! Sala: ${data.sala} às ${data.horario}`, 'success');
            await carregarAlunoDashboard(document.getElementById('alunoContent'));
        } else if (data.error === 'Fora do horário de aula') {
            console.log(`⏰ Fora do horário de aula: ${data.horario_aula}`);
        } else if (data.error === 'Ponto de acesso não autorizado') {
            showToast('⚠️ Você não está em um ponto de acesso autorizado', 'warning');
        } else if (data.error === 'IP fora da faixa permitida') {
            showToast('⚠️ Rede não autorizada', 'warning');
        }
    } catch (error) {
        console.error('Erro no registro automático:', error);
    }
}

// Iniciar monitoramento
function iniciarMonitoramentoPresenca() {
    if (intervaloMonitoramento) return;
    
    console.log('🔍 Iniciando monitoramento de presença...');
    intervaloMonitoramento = setInterval(() => {
        registrarPresencaAutomatica();
    }, 60000); // Verificar a cada minuto
}

// Parar monitoramento
function pararMonitoramentoPresenca() {
    if (intervaloMonitoramento) {
        clearInterval(intervaloMonitoramento);
        intervaloMonitoramento = null;
        console.log('🛑 Monitoramento de presença parado');
    }
}

// Atualizar função carregarAlunoDashboard
const carregarAlunoDashboardOriginal = carregarAlunoDashboard;
window.carregarAlunoDashboard = async (container) => {
    await carregarAlunoDashboardOriginal(container);
    iniciarMonitoramentoPresenca();
};

console.log('✅ Sistema de validação de presença implementado!');

// ============================================
// FUNÇÃO ATUALIZADA PARA RENDERIZAR TABELA DE APs
// ============================================

function renderizarTabelaAPs(aps) {
    if (!aps.length) return '<p>Nenhum ponto de acesso cadastrado</p>';
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>BSSID</th>
                    <th>SSID</th>
                    <th>Sala</th>
                    <th>Prédio</th>
                    <th>Andar</th>
                    <th>IP Range</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${aps.map(ap => `
                    <tr>
                        <td><code>${escapeHtml(ap.bssid)}</code></td
                        <td>${escapeHtml(ap.ssid)}</td
                        <td>${escapeHtml(ap.sala)}</td
                        <td>${escapeHtml(ap.predio || '-')}</td
                        <td>${ap.andar || '-'}</td
                        <td>${ap.ip_range || '10.0.0.0/8'}</td
                        <td>
                            <div style="display:flex; gap:8px;">
                                <button class="btn-sm btn-outline" onclick="editarAP(${ap.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-sm btn-danger" onclick="excluirAP(${ap.id})">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </div>
                         </td
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// FUNÇÃO PARA EDITAR AP
// ============================================

window.editarAP = async (id) => {
    try {
        const aps = await apiGet('/admin/aps');
        const ap = aps.find(a => a.id === id);
        
        if (!ap) {
            showToast('Ponto de acesso não encontrado', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Editar Ponto de Acesso</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>BSSID (MAC do AP) *</label>
                        <input type="text" id="editAPBssid" value="${escapeHtml(ap.bssid)}" placeholder="AA:BB:CC:DD:EE:FF" class="form-control">
                        <small>Identificador único do roteador</small>
                    </div>
                    <div class="form-group">
                        <label>SSID *</label>
                        <input type="text" id="editAPSsid" value="${escapeHtml(ap.ssid)}" placeholder="Nome da rede Wi-Fi" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Sala *</label>
                        <input type="text" id="editAPSala" value="${escapeHtml(ap.sala)}" placeholder="Ex: Sala 101" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Prédio</label>
                        <input type="text" id="editAPPredio" value="${escapeHtml(ap.predio || '')}" placeholder="Ex: Bloco A" class="form-control">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Andar</label>
                            <input type="number" id="editAPAndar" value="${ap.andar || ''}" placeholder="Andar" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>IP Range</label>
                            <input type="text" id="editAPIpRange" value="${ap.ip_range || '10.0.0.0/8'}" placeholder="Ex: 192.168.0.0/16" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="editAPAtivo" class="form-control">
                            <option value="1" ${ap.ativo === 1 ? 'selected' : ''}>Ativo</option>
                            <option value="0" ${ap.ativo === 0 ? 'selected' : ''}>Inativo</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditAPBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.getElementById('saveEditAPBtn').onclick = async () => {
            const bssid = document.getElementById('editAPBssid').value.trim().toUpperCase();
            const ssid = document.getElementById('editAPSsid').value.trim();
            const sala = document.getElementById('editAPSala').value.trim();
            const predio = document.getElementById('editAPPredio').value.trim();
            const andar = document.getElementById('editAPAndar').value;
            const ip_range = document.getElementById('editAPIpRange').value.trim();
            const ativo = document.getElementById('editAPAtivo').value;
            
            if (!bssid || !ssid || !sala) {
                showToast('Preencha BSSID, SSID e Sala', 'error');
                return;
            }
            
            // Validar formato do BSSID
            const bssidRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
            if (!bssidRegex.test(bssid)) {
                showToast('Formato de BSSID inválido. Use AA:BB:CC:DD:EE:FF', 'error');
                return;
            }
            
            try {
                await apiPut(`/admin/aps/${id}`, { 
                    bssid, 
                    ssid, 
                    sala, 
                    predio, 
                    andar: andar || null,
                    ip_range: ip_range || '10.0.0.0/8',
                    ativo: parseInt(ativo)
                });
                showToast('Ponto de acesso atualizado com sucesso!', 'success');
                closeModal();
                // Recarregar a lista
                const content = document.getElementById('adminContent');
                if (content) await window.carregarAdminAPs(content);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados do AP', 'error');
    }
};

// Função para excluir AP
window.excluirAP = async (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir este ponto de acesso? Esta ação não pode ser desfeita!')) {
        try {
            await apiDelete(`/admin/aps/${id}`);
            showToast('Ponto de acesso excluído com sucesso!', 'success');
            // Recarregar a lista
            const content = document.getElementById('adminContent');
            if (content) await window.carregarAdminAPs(content);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

console.log('✅ Funções de edição de APs adicionadas!');

// ============================================
// FUNÇÃO RENDERIZAR TABELA DE APs (com CSS consistente)
// ============================================

function renderizarTabelaAPs(aps) {
    if (!aps.length) {
        return '<div class="empty-state">Nenhum ponto de acesso cadastrado</div>';
    }
    
    return `
        <div style="overflow-x: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>BSSID</th>
                        <th>SSID</th>
                        <th>Sala</th>
                        <th>Prédio</th>
                        <th>Andar</th>
                        <th>IP Range</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${aps.map(ap => `
                        <tr>
                            <td><code>${escapeHtml(ap.bssid)}</code></td>
                            <td>${escapeHtml(ap.ssid)}</td>
                            <td>${escapeHtml(ap.sala)}</td>
                            <td>${escapeHtml(ap.predio || '-')}</td>
                            <td>${ap.andar || '-'}</td>
                            <td>${ap.ip_range || '10.0.0.0/8'}</td>
                            <td>
                                <span class="status-badge ${ap.ativo === 1 ? 'status-ativo' : 'status-inativo'}">
                                    ${ap.ativo === 1 ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td class="acoes">
                                <button class="btn-sm btn-outline" onclick="editarAP(${ap.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-sm btn-danger" onclick="excluirAP(${ap.id})">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

console.log('✅ Tabela de APs com CSS consistente!');

// ============================================
// FUNÇÃO CORRIGIDA PARA EDITAR PERFIL DO ALUNO
// ============================================

// Substituir a função carregarAlunoConfig existente
window.carregarAlunoConfig = async (container) => {
    container.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-user-edit"></i> Meus Dados</h3>
            <div class="form-group">
                <label>Nome completo</label>
                <input type="text" id="alunoNome" value="${escapeHtml(usuarioAtual.nome)}" class="form-control">
            </div>
            <div class="form-group">
                <label>E-mail</label>
                <input type="email" id="alunoEmail" value="${escapeHtml(usuarioAtual.email)}" class="form-control">
            </div>
            <div class="form-group">
                <label>Matrícula</label>
                <input type="text" id="alunoMatricula" value="${escapeHtml(usuarioAtual.matricula || '')}" class="form-control" disabled>
                <small>Matrícula não pode ser alterada</small>
            </div>
            <div class="form-group">
                <label>Nova Senha</label>
                <input type="password" id="alunoNovaSenha" placeholder="Deixe em branco para manter a atual" class="form-control">
            </div>
            <button id="salvarAlunoConfigBtn" class="btn btn-primary">Salvar Alterações</button>
        </div>
        <div class="card">
            <h3><i class="fas fa-mobile-alt"></i> Dispositivo</h3>
            <p><strong>Device ID:</strong> <code id="deviceIdDisplay">${localStorage.getItem('deviceId') || 'Não configurado'}</code></p>
            <button id="gerarNovoDeviceId" class="btn btn-sm btn-outline">Gerar Novo ID</button>
        </div>
    `;
    
    document.getElementById('salvarAlunoConfigBtn').onclick = async () => {
        const nome = document.getElementById('alunoNome').value.trim();
        const email = document.getElementById('alunoEmail').value.trim();
        const senha = document.getElementById('alunoNovaSenha').value;
        
        if (!nome || !email) {
            showToast('Preencha nome e e-mail', 'error');
            return;
        }
        
        try {
            await apiPut('/usuarios/perfil', { nome, email, senha: senha || undefined });
            showToast('Dados atualizados com sucesso!', 'success');
            
            // Atualizar dados locais
            usuarioAtual.nome = nome;
            usuarioAtual.email = email;
            localStorage.setItem('usuario', JSON.stringify(usuarioAtual));
            
            // Atualizar nome na sidebar
            document.getElementById('alunoUserName').textContent = nome;
            
        } catch (error) {
            console.error('Erro:', error);
            showToast(error.message || 'Erro ao atualizar dados', 'error');
        }
    };
    
    document.getElementById('gerarNovoDeviceId').onclick = () => {
        const novoId = 'device-' + Date.now() + '-' + Math.random().toString(36).substring(7);
        localStorage.setItem('deviceId', novoId);
        document.getElementById('deviceIdDisplay').textContent = novoId;
        showToast('Novo Device ID gerado!', 'success');
    };
};

console.log('✅ Função carregarAlunoConfig corrigida!');

// Adicione estas funções no final do arquivo, antes do console.log

// ============================================
// CADASTRO DE ALUNO
// ============================================
async function cadastrarAluno() {
    const nome = document.getElementById('novoAlunoNome')?.value.trim();
    const email = document.getElementById('novoAlunoEmail')?.value.trim();
    const matricula = document.getElementById('novoAlunoMatricula')?.value.trim();
    const turmaId = document.getElementById('novoAlunoTurma')?.value;
    
    if (!nome || !email || !matricula) {
        showToast('Preencha todos os campos', 'error');
        return;
    }
    
    try {
        await apiPost('/admin/alunos', { nome, email, matricula, turmaId: turmaId || null });
        showToast('Aluno cadastrado com sucesso!', 'success');
        
        // Limpar formulário
        document.getElementById('novoAlunoNome').value = '';
        document.getElementById('novoAlunoEmail').value = '';
        document.getElementById('novoAlunoMatricula').value = '';
        
        // Recarregar lista
        const content = document.getElementById('adminContent');
        if (content) await carregarAdminAlunos(content);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// CADASTRO DE PROFESSOR
// ============================================
async function cadastrarProfessor() {
    const nome = document.getElementById('novoProfNome')?.value.trim();
    const email = document.getElementById('novoProfEmail')?.value.trim();
    const matricula = document.getElementById('novoProfMatricula')?.value.trim();
    
    if (!nome || !email || !matricula) {
        showToast('Preencha todos os campos', 'error');
        return;
    }
    
    try {
        await apiPost('/admin/professores', { nome, email, matricula });
        showToast('Professor cadastrado com sucesso!', 'success');
        
        // Limpar formulário
        document.getElementById('novoProfNome').value = '';
        document.getElementById('novoProfEmail').value = '';
        document.getElementById('novoProfMatricula').value = '';
        
        // Recarregar lista
        const content = document.getElementById('adminContent');
        if (content) await carregarAdminProfessores(content);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// EDIÇÃO DE ALUNO
// ============================================
window.editarAluno = async (id) => {
    try {
        const alunos = await apiGet('/admin/alunos');
        const aluno = alunos.find(a => a.id === id);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Aluno - ${escapeHtml(aluno.nome)}</h3>
                    <span class="modal-close">×</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editAlunoNome" value="${escapeHtml(aluno.nome)}" placeholder="Nome">
                    <input type="email" id="editAlunoEmail" value="${escapeHtml(aluno.email)}" placeholder="E-mail">
                    <input type="text" id="editAlunoMatricula" value="${escapeHtml(aluno.matricula)}" placeholder="Matrícula">
                    <div class="form-row">
                        <input type="password" id="editAlunoSenha" placeholder="Nova senha (opcional)">
                        <small>Deixe em branco para manter a senha atual</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditAlunoBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        document.getElementById('saveEditAlunoBtn').onclick = async () => {
            const nome = document.getElementById('editAlunoNome').value.trim();
            const email = document.getElementById('editAlunoEmail').value.trim();
            const matricula = document.getElementById('editAlunoMatricula').value.trim();
            const novaSenha = document.getElementById('editAlunoSenha').value.trim();
            
            if (!nome || !email || !matricula) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPut(`/admin/alunos/${id}`, { nome, email, matricula });
                
                if (novaSenha) {
                    await apiPut(`/admin/usuarios/${id}/senha`, { senha: novaSenha });
                    showToast(`Aluno atualizado! Nova senha: ${novaSenha}`, 'success');
                } else {
                    showToast('Aluno atualizado com sucesso!', 'success');
                }
                
                closeModal();
                const content = document.getElementById('adminContent');
                if (content) await carregarAdminAlunos(content);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        showToast('Erro ao carregar dados do aluno', 'error');
    }
};

// ============================================
// EDIÇÃO DE PROFESSOR
// ============================================
window.editarProfessor = async (id) => {
    try {
        const professores = await apiGet('/admin/professores');
        const professor = professores.find(p => p.id === id);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Professor - ${escapeHtml(professor.nome)}</h3>
                    <span class="modal-close">×</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editProfNome" value="${escapeHtml(professor.nome)}" placeholder="Nome">
                    <input type="email" id="editProfEmail" value="${escapeHtml(professor.email)}" placeholder="E-mail">
                    <input type="text" id="editProfMatricula" value="${escapeHtml(professor.matricula)}" placeholder="Matrícula">
                    <div class="form-row">
                        <input type="password" id="editProfSenha" placeholder="Nova senha (opcional)">
                        <small>Deixe em branco para manter a senha atual</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveEditProfBtn" class="btn btn-primary">Salvar</button>
                    <button class="btn btn-outline modal-close-btn">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        document.getElementById('saveEditProfBtn').onclick = async () => {
            const nome = document.getElementById('editProfNome').value.trim();
            const email = document.getElementById('editProfEmail').value.trim();
            const matricula = document.getElementById('editProfMatricula').value.trim();
            const novaSenha = document.getElementById('editProfSenha').value.trim();
            
            if (!nome || !email || !matricula) {
                showToast('Preencha todos os campos', 'error');
                return;
            }
            
            try {
                await apiPut(`/admin/professores/${id}`, { nome, email, matricula });
                
                if (novaSenha) {
                    await apiPut(`/admin/usuarios/${id}/senha`, { senha: novaSenha });
                    showToast(`Professor atualizado! Nova senha: ${novaSenha}`, 'success');
                } else {
                    showToast('Professor atualizado com sucesso!', 'success');
                }
                
                closeModal();
                const content = document.getElementById('adminContent');
                if (content) await carregarAdminProfessores(content);
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    } catch (error) {
        showToast('Erro ao carregar dados do professor', 'error');
    }
};
