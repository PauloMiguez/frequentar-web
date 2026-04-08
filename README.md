Sistema completo para registro automático de presença de alunos utilizando rede Wi-Fi, com múltiplos perfis de usuário (Administrador, Professor e Aluno).

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Executando o Projeto](#executando-o-projeto)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Credenciais de Acesso](#credenciais-de-acesso)
- [Solução de Problemas](#solução-de-problemas)
- [Licença](#licença)

## 🚀 Sobre o Projeto

O **Frequentar** é um sistema inovador para registro de presença em instituições de ensino que elimina a necessidade de chamada manual. Quando o aluno se conecta à rede Wi-Fi da escola, sua presença é registrada automaticamente.

### Diferenciais

- ✅ **Registro Automático**: Detecta conexão Wi-Fi e registra presença
- ✅ **Múltiplos Perfis**: Administrador, Professor e Aluno
- ✅ **Tempo Real**: Dashboard atualiza em tempo real
- ✅ **Relatórios**: Geração de relatórios com filtros
- ✅ **Identificação de Faltas**: Alerta alunos com alta taxa de ausência

## ✨ Funcionalidades

### 👑 Administrador
| Funcionalidade | Descrição |
|----------------|-----------|
| Dashboard Geral | Estatísticas completas do sistema |
| Gerenciar Alunos | CRUD completo de alunos |
| Gerenciar Professores | CRUD completo de professores |
| Gerenciar Turmas | CRUD completo de turmas |
| Pontos de Acesso | Cadastrar APs por sala/andar/prédio |
| Presença Geral | Visualizar presença por data/turma |
| Identificação de Faltas | Alunos com alta taxa de ausência |
| Relatórios | Gerar relatórios com múltiplos filtros |

### 👨‍🏫 Professor
| Funcionalidade | Descrição |
|----------------|-----------|
| Dashboard | Visão geral das suas turmas |
| Minhas Turmas | Visualizar alunos por turma |
| Registrar Presença | Registro manual em sala de aula |
| Relatórios | Relatórios de frequência das turmas |

### 👨‍🎓 Aluno
| Funcionalidade | Descrição |
|----------------|-----------|
| Minha Frequência | Dashboard com percentual de presença |
| Histórico Completo | Visualização de todo histórico |
| Relatórios | Exportar seu histórico |

## 🛠️ Tecnologias Utilizadas

### Backend
| Tecnologia | Versão | Descrição |
|------------|--------|-------------|
| Node.js | 14+ | Runtime JavaScript |
| Express.js | 4.x | Framework web |
| MySQL | 8.x | Banco de dados |
| JWT | 9.x | Autenticação |
| Bcryptjs | 2.x | Criptografia de senhas |

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-------------|
| HTML5 | - | Estrutura |
| CSS3 | - | Estilização |
| JavaScript | ES6+ | Lógica e interatividade |
| Font Awesome | 6.x | Ícones |

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- MySQL Server (versão 8 ou superior)
- Navegador web moderno
- Git

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/PauloMiguez/frequentar-web.git
cd frequentar-web
```

### 2. Instale as dependências do backend

```bash
cd backend
npm install
```

### 3. Configure o banco de dados

O sistema criará automaticamente as tabelas necessárias na primeira execução. Certifique-se de que o MySQL está rodando.

## ⚙️ Configuração do Banco de Dados

### Criar o banco manualmente

```sql
CREATE DATABASE frequentar_web;
USE frequentar_web;
```

### Configurar credenciais

No arquivo `backend/server.js`, ajuste as configurações:

```javascript
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'sua_senha',
    database: 'frequentar_web',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});
```

## 🚀 Executando o Projeto

### Terminal 1 - Backend

```bash
cd backend
node server.js
```

✅ Servidor iniciará na porta **3000**

### Terminal 2 - Frontend Web

```bash
cd frequentar-web
python -m http.server 8080
```

✅ Servidor web iniciará na porta **8080**

### Acessar a aplicação

Abra o navegador e acesse: **`http://localhost:8080`**

## 📁 Estrutura do Projeto

```
frequentar-web/
├── backend/
│   ├── server.js              # Servidor principal
│   ├── package.json
│   └── node_modules/
├── css/
│   └── style.css              # Estilos da aplicação
├── js/
│   └── app.js                 # Lógica frontend
├── index.html                 # Página principal
└── README.md
```

## 🔌 API Endpoints

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/login-multi` | Login multiperfil |

### Administrador
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/stats` | Estatísticas |
| GET | `/api/admin/alunos` | Listar alunos |
| POST | `/api/admin/alunos` | Criar aluno |
| PUT | `/api/admin/alunos/:id` | Atualizar aluno |
| DELETE | `/api/admin/alunos/:id` | Excluir aluno |
| GET | `/api/admin/professores` | Listar professores |
| POST | `/api/admin/professores` | Criar professor |
| PUT | `/api/admin/professores/:id` | Atualizar professor |
| DELETE | `/api/admin/professores/:id` | Excluir professor |
| GET | `/api/admin/aps` | Listar APs |
| POST | `/api/admin/aps` | Criar AP |
| DELETE | `/api/admin/aps/:id` | Excluir AP |
| GET | `/api/admin/relatorios` | Relatórios |
| GET | `/api/turmas` | Listar turmas |
| POST | `/api/turmas` | Criar turma |
| PUT | `/api/turmas/:id` | Atualizar turma |
| DELETE | `/api/turmas/:id` | Excluir turma |
| POST | `/api/turmas/:id/professor` | Vincular professor |

### Professor
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/professor/turmas` | Minhas turmas |
| GET | `/api/professor/turmas/:id/alunos` | Alunos da turma |
| POST | `/api/professor/presenca` | Registrar presença |

### Aluno
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/aluno/stats` | Estatísticas do aluno |
| GET | `/api/aluno/historico` | Histórico de presença |

## 👥 Credenciais de Acesso

| Perfil | E-mail | Senha |
|--------|--------|-------|
| **Administrador** | `admin@escola.com` | `admin123` |
| **Professor** | `professor@escola.com` | `prof123` |
| **Aluno** | `aluno@escola.com` | `aluno123` |

## 🔧 Solução de Problemas

### Erro: "Access denied for user 'root'"

**Solução:** Verifique a senha do MySQL no arquivo `server.js`

### Erro: "Porta 3000 já está em uso"

**Solução:** Finalize o processo na porta 3000:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Erro: "Cannot find module"

**Solução:** Instale as dependências:

```bash
cd backend
npm install
```

### Erro: "Cannot DELETE /api/admin/alunos/:id"

**Solução:** O sistema usa exclusão lógica (desativação). O aluno é desativado, não removido do banco.

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido para facilitar o registro de presença em instituições de ensino** 🎓

## 🎯 Status do Projeto

✅ **Backend**: Funcionando com MySQL  
✅ **Frontend Web**: Funcionando  
✅ **API**: Todas as rotas implementadas  
✅ **Autenticação**: JWT implementado  
✅ **Multiperfil**: Admin, Professor, Aluno  
✅ **CRUD Completo**: Alunos, Professores, Turmas, APs  
✅ **Relatórios**: Funcionando com filtros  
✅ **Dashboard**: Em tempo real  

---

**🚀 Sistema pronto para produção!**
