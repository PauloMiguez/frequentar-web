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
