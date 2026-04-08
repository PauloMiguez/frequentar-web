// ============================================
// FUNÇÕES CORRIGIDAS PARA EDIÇÃO E EXCLUSÃO
// ============================================

// Editar Aluno - Abre modal com dados
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
                await carregarAdminAlunos(document.getElementById('adminContent'));
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
            await carregarAdminAlunos(document.getElementById('adminContent'));
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

// Editar Professor
window.editarProfessor = async (id) => {
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
                await carregarAdminProfessores(document.getElementById('adminContent'));
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
            await carregarAdminProfessores(document.getElementById('adminContent'));
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

// Editar Turma
window.editarTurma = async (id) => {
    try {
        const turmas = await apiGet('/turmas');
        const turma = turmas.find(t => t.id === id);
        
        if (!turma) {
            showToast('Turma não encontrada', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-school"></i> Editar Turma</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="editTurmaNome" value="${escapeHtml(turma.nome)}" placeholder="Nome da Turma">
                    <input type="text" id="editTurmaCodigo" value="${escapeHtml(turma.codigo)}" placeholder="Código">
                    <input type="text" id="editTurmaPeriodo" value="${escapeHtml(turma.periodo || '')}" placeholder="Período">
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
            
            if (!nome || !codigo) {
                showToast('Preencha nome e código', 'error');
                return;
            }
            
            try {
                await apiPut(`/turmas/${id}`, { nome, codigo, periodo });
                showToast('Turma atualizada com sucesso!', 'success');
                closeModal();
                await carregarAdminTurmas(document.getElementById('adminContent'));
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados da turma', 'error');
    }
};

// Excluir Turma
window.excluirTurma = async (id) => {
    if (confirm('⚠️ Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita!')) {
        try {
            await apiDelete(`/turmas/${id}`);
            showToast('Turma excluída com sucesso!', 'success');
            await carregarAdminTurmas(document.getElementById('adminContent'));
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

console.log('✅ Funções de edição e exclusão corrigidas!');
