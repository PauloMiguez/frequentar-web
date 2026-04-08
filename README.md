Sistema completo para registro automático de presença de alunos utilizando rede Wi-Fi, com múltiplos perfis de usuário (Administrador, Professor e Aluno).

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação Local](#instalação-local)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Executando Localmente](#executando-localmente)
- [Deploy na Nuvem](#deploy-na-nuvem)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Credenciais de Acesso](#credenciais-de-acesso)
- [Solução de Problemas](#solução-de-problemas)
- [Licença](#licença)

## 🚀 Sobre o Projeto

O **Frequentar** é um sistema inovador para registro de presença em instituições de ensino que elimina a necessidade de chamada manual. Quando o aluno se conecta à rede Wi-Fi da escola, sua presença é registrada automaticamente com validação por:

- ✅ **SSID e BSSID** (MAC do roteador)
- ✅ **Faixa de IP** (CIDR)
- ✅ **Horário de aula** (por turma)
- ✅ **Ponto de Acesso** (sala específica)

### Diferenciais

- ✅ **Registro Automático**: Detecta conexão Wi-Fi e registra presença
- ✅ **Múltiplos Perfis**: Administrador, Professor e Aluno
- ✅ **Validação Robusta**: Múltiplos fatores para evitar fraudes
- ✅ **Tempo Real**: Dashboard atualiza em tempo real
- ✅ **Relatórios**: Geração de relatórios com filtros
- ✅ **Identificação de Faltas**: Alerta alunos com alta taxa de ausência
- ✅ **Deploy na Nuvem**: Hospedagem gratuita (Render + TiDB Cloud + Netlify)

## ✨ Funcionalidades

### 👑 Administrador
| Funcionalidade | Descrição |
|----------------|-----------|
| Dashboard Geral | Estatísticas completas do sistema |
| Gerenciar Alunos | CRUD completo de alunos |
| Gerenciar Professores | CRUD completo de professores |
| Gerenciar Turmas | CRUD completo de turmas |
| Pontos de Acesso | Cadastrar APs por BSSID/SSID/sala/IP range |
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
| MySQL | 8.x | Banco de dados (TiDB Cloud) |
| JWT | 9.x | Autenticação |
| Bcryptjs | 2.x | Criptografia de senhas |

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-------------|
| HTML5 | - | Estrutura |
| CSS3 | - | Estilização |
| JavaScript | ES6+ | Lógica e interatividade |
| Font Awesome | 6.x | Ícones |

### Hospedagem (Deploy)
| Serviço | Uso | Plano |
|---------|-----|-------|
| **Render** | Backend API | Gratuito |
| **TiDB Cloud** | Banco de dados MySQL | Gratuito (5GB) |
| **Netlify** | Frontend estático | Gratuito |

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- MySQL Server (para desenvolvimento local)
- Navegador web moderno
- Git
- Conta no GitHub (para deploy)

## 🔧 Instalação Local

### 1. Clone o repositório

```bash
git clone https://github.com/PauloMiguez/frequentar-web.git
cd frequentar-web
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

Crie um arquivo `.env` na raiz do projeto:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=frequentar_db
JWT_SECRET=secret_key_2024
PORT=3000
```

### 4. Execute as migrações

```bash
node -e "
const mysql = require('mysql2/promise');
// Script de criação das tabelas...
"
```

## 🚀 Executando Localmente

### Terminal 1 - Backend

```bash
cd frequentar-web
node server.js
```

✅ Servidor iniciará na porta **3000**

### Terminal 2 - Frontend

```bash
cd frequentar-web
python -m http.server 8080
```

✅ Servidor web iniciará na porta **8080**

### Acessar a aplicação

Abra o navegador e acesse: **`http://localhost:8080`**

## ☁️ Deploy na Nuvem

### Backend (Render)

1. Faça push do código para o GitHub
2. No [Render.com](https://render.com), crie um **Web Service**
3. Conecte seu repositório
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Adicione as variáveis de ambiente
6. Clique em **Deploy**

### Banco de Dados (TiDB Cloud)

1. Crie uma conta no [TiDB Cloud](https://tidbcloud.com)
2. Crie um cluster **Serverless (Developer Tier)**
3. Copie a string de conexão
4. Adicione as variáveis no Render

### Frontend (Netlify)

1. No [Netlify](https://netlify.com), clique em **Add new site**
2. Conecte seu repositório do GitHub
3. Configure:
   - **Branch to deploy**: `main`
   - **Publish directory**: `.`
4. Clique em **Deploy**

## 📁 Estrutura do Projeto

```
frequentar-web/
├── server.js              # Servidor principal (backend)
├── package.json           # Dependências
├── .env                   # Variáveis de ambiente
├── index.html             # Página principal
├── css/
│   └── style.css          # Estilos da aplicação
├── js/
│   └── app.js             # Lógica frontend
└── README.md              # Documentação
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
| PUT | `/api/admin/aps/:id` | Atualizar AP |
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
| GET | `/api/professor/stats` | Estatísticas do professor |
| GET | `/api/professor/turmas` | Minhas turmas |
| GET | `/api/professor/turmas/:id/alunos` | Alunos da turma |
| POST | `/api/professor/presenca` | Registrar presença |

### Aluno
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/aluno/stats` | Estatísticas do aluno |
| GET | `/api/aluno/historico` | Histórico de presença |
| GET | `/api/aluno/horario` | Horário da turma |

## 👥 Credenciais de Acesso

| Perfil | E-mail | Senha |
|--------|-------|-------|
| **Administrador** | `admin@escola.com` | `admin123` |
| **Professor** | `professor@escola.com` | `prof123` |
| **Aluno** | `aluno@escola.com` | `aluno123` |

## 🔧 Solução de Problemas

### Erro: "Cannot GET /api/..."

**Solução:** Verifique se o backend está rodando na porta 3000

```bash
curl http://localhost:3000/api/dashboard/stats
```

### Erro: "Access denied for user 'root'"

**Solução:** Verifique a senha do MySQL no arquivo `.env`

### Erro: "Porta 3000 já está em uso"

**Solução:** Finalize o processo na porta 3000

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Erro no Deploy do Render

**Solução:** Verifique os logs no dashboard do Render e confirme as variáveis de ambiente.

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido para facilitar o registro de presença em instituições de ensino** 🎓

## 🎯 Status do Projeto

✅ **Backend**: Funcionando com MySQL (TiDB Cloud)  
✅ **Frontend Web**: Funcionando (Netlify)  
✅ **API**: Todas as rotas implementadas  
✅ **Autenticação**: JWT implementado  
✅ **Multiperfil**: Admin, Professor, Aluno  
✅ **CRUD Completo**: Alunos, Professores, Turmas, APs  
✅ **Relatórios**: Funcionando com filtros  
✅ **Dashboard**: Em tempo real  
✅ **Deploy**: Render (API) + Netlify (Frontend)

## 🌐 Acesse o sistema online

- **Frontend**: [https://poetic-dango-a5c32a.netlify.app](https://poetic-dango-a5c32a.netlify.app)
- **Backend API**: [https://frequentar-web.onrender.com](https://frequentar-web.onrender.com)

---

**🚀 Sistema pronto para produção!**
