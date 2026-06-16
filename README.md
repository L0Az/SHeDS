# SHeDS — Simplified Helpdesk System

A self-hosted helpdesk built with Django (backend) and Next.js (frontend), deployable with a single Docker Compose command.

---

## Running locally (for testing)

No domain, no TLS, no cloud credentials needed. Docker Compose brings up Postgres, Redis, the Django backend, and the Celery worker. You run the Next.js frontend directly with `npm`.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+ with Compose v2
- Node.js 20+ and npm

### 1. Clone the repository

```bash
git clone https://github.com/your-org/sheds.git
cd sheds
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env   # if no .env.example exists, create the file manually
```

Minimal `backend/.env` that works locally (the Docker Compose dev file hard-codes Postgres/Redis so you only need Django settings):

```env
STAGE=development
DJANGO_SETTINGS_MODULE=config.settings.development

SECRET_KEY=local-dev-secret-key-change-me

DB_NAME=sheds_db
DB_USER=sheds_user
DB_PASSWORD=sheds_password
DB_HOST=db
DB_PORT=5432
DB_TIMEOUT=30

CACHE_LOCATION=redis://redis:6379/1

# Leave email/OCI blank — email is disabled in dev and local file storage is used
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@localhost
```

### 3. Configure the frontend

```bash
cp frontend/.env.local.example frontend/.env.local   # create if it doesn't exist
```

Minimal `frontend/.env.local`:

```env
DJANGO_INTERNAL_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SHeDS
```

### 4. Start backend services

```bash
docker compose up -d
```

This starts Postgres, Redis, the Django backend on **port 8000**, and the Celery worker. Migrations run automatically on first boot.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is available at **http://localhost:3000**.

### 6. First-time setup

Open **http://localhost:3000/setup** and follow the wizard to create the administrator account.

### Useful commands

```bash
# View backend logs
docker compose logs -f backend

# Run a Django management command
docker compose exec backend python manage.py <command>

# Stop everything (keeps data)
docker compose down

# Stop and wipe all data
docker compose down -v
```

---

## 🇬🇧 English Setup Guide

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+ with Compose v2
- A domain name pointing to your server (DNS A record → server IP)
- Ports **80** and **443** open on the server firewall

### 1. Clone the repository

```bash
git clone https://github.com/your-org/sheds.git
cd sheds
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in **every** value:

| Variable | Description |
|---|---|
| `DOMAIN` | Your public domain, e.g. `helpdesk.example.com` |
| `SECRET_KEY` | Django secret key — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DB_NAME / DB_USER / DB_PASSWORD` | PostgreSQL credentials (chosen freely, Docker creates the DB) |
| `EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD` | SMTP server credentials |
| `DEFAULT_FROM_EMAIL` | Sender address for notification emails |
| `OCI_*` | Oracle Cloud credentials for file storage (see `.env.example` comments) |

### 3. (Optional) OCI private key file

If you prefer a `.pem` key file over an inline key, place it at the project root and reference it in `.env`:

```bash
# .env
OCI_KEY_FILE=/run/secrets/oci_key.pem
```

Then add it as a volume in `docker-compose.prod.yml` under the `backend` and `celery` services:

```yaml
volumes:
  - ./oci_private_key.pem:/run/secrets/oci_key.pem:ro
```

### 4. Start the stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

This single command:
- Starts **PostgreSQL** and **Redis**
- Builds and starts the **Django backend** (runs `migrate` automatically on first boot)
- Builds and starts the **Next.js frontend**
- Starts a **Celery** worker for email notifications
- Starts **Caddy**, which automatically obtains a TLS certificate for your domain

### 5. First-time setup wizard

Open `https://your-domain.com/setup` in your browser and follow the wizard to:
- Create the administrator account
- Configure the application name, language, and theme

### 6. Upload static assets (if using OCI storage)

After the first boot, upload Django's static files to OCI:

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Useful commands

```bash
# View logs for all services
docker compose -f docker-compose.prod.yml logs -f

# View logs for a specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Restart a service after a code change (requires rebuild)
docker compose -f docker-compose.prod.yml up -d --build backend

# Run a Django management command
docker compose -f docker-compose.prod.yml exec backend python manage.py <command>

# Stop everything
docker compose -f docker-compose.prod.yml down

# Stop and delete all data (irreversible)
docker compose -f docker-compose.prod.yml down -v
```

### Architecture overview

```
Internet → Caddy (443/TLS)
               ├── /v1/*  → Django backend (uvicorn:9000)
               ├── /admin/* → Django backend
               └── /*     → Next.js frontend (node:3000)
                                   └── (server-side) → Django backend (internal)
```

---

## Executar localmente (para testes)

Sem domínio, sem TLS, sem credenciais de nuvem. O Docker Compose sobe o Postgres, Redis, o backend Django e o worker Celery. O frontend Next.js é executado diretamente com `npm`.

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 24+ com Compose v2
- Node.js 20+ e npm

### 1. Clonar o repositório

```bash
git clone https://github.com/your-org/sheds.git
cd sheds
```

### 2. Configurar o backend

```bash
cp backend/.env.example backend/.env   # se não houver .env.example, crie o arquivo manualmente
```

`backend/.env` mínimo para desenvolvimento local (o Docker Compose já define Postgres/Redis, só precisas das variáveis do Django):

```env
STAGE=development
DJANGO_SETTINGS_MODULE=config.settings.development

SECRET_KEY=local-dev-secret-key-change-me

DB_NAME=sheds_db
DB_USER=sheds_user
DB_PASSWORD=sheds_password
DB_HOST=db
DB_PORT=5432
DB_TIMEOUT=30

CACHE_LOCATION=redis://redis:6379/1

# Deixa e-mail e OCI em branco — e-mail está desativado em dev e o armazenamento local é usado
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@localhost
```

### 3. Configurar o frontend

```bash
cp frontend/.env.local.example frontend/.env.local   # criar se não existir
```

`frontend/.env.local` mínimo:

```env
DJANGO_INTERNAL_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=SHeDS
```

### 4. Iniciar os serviços do backend

```bash
docker compose up -d
```

Sobe o Postgres, Redis, o backend Django na **porta 8000** e o worker Celery. As migrações são executadas automaticamente na primeira inicialização.

### 5. Iniciar o frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em **http://localhost:3000**.

### 6. Configuração inicial

Aceda a **http://localhost:3000/setup** e siga o assistente para criar a conta de administrador.

### Comandos úteis

```bash
# Ver logs do backend
docker compose logs -f backend

# Executar um comando de gestão do Django
docker compose exec backend python manage.py <comando>

# Parar tudo (mantém os dados)
docker compose down

# Parar e apagar todos os dados
docker compose down -v
```

---

## 🇧🇷 Guia de Configuração em Português

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 24+ com Compose v2
- Um domínio apontando para o servidor (registro DNS A → IP do servidor)
- Portas **80** e **443** abertas no firewall do servidor

### 1. Clonar o repositório

```bash
git clone https://github.com/your-org/sheds.git
cd sheds
```

### 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Abra o arquivo `.env` e preencha **todos** os valores:

| Variável | Descrição |
|---|---|
| `DOMAIN` | Seu domínio público, ex: `helpdesk.example.com` |
| `SECRET_KEY` | Chave secreta do Django — gere com `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DB_NAME / DB_USER / DB_PASSWORD` | Credenciais do PostgreSQL (escolha livremente, o Docker cria o banco) |
| `EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD` | Credenciais do servidor SMTP |
| `DEFAULT_FROM_EMAIL` | Endereço remetente para e-mails de notificação |
| `OCI_*` | Credenciais da Oracle Cloud para armazenamento de arquivos (ver comentários no `.env.example`) |

### 3. (Opcional) Arquivo de chave privada OCI

Se preferir um arquivo `.pem` em vez de uma chave inline, coloque-o na raiz do projeto e referencie no `.env`:

```bash
# .env
OCI_KEY_FILE=/run/secrets/oci_key.pem
```

Em seguida, adicione-o como volume no `docker-compose.prod.yml` nos serviços `backend` e `celery`:

```yaml
volumes:
  - ./oci_private_key.pem:/run/secrets/oci_key.pem:ro
```

### 4. Iniciar a stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

Esse único comando:
- Inicia **PostgreSQL** e **Redis**
- Compila e inicia o **backend Django** (executa `migrate` automaticamente na primeira inicialização)
- Compila e inicia o **frontend Next.js**
- Inicia um worker **Celery** para notificações por e-mail
- Inicia o **Caddy**, que obtém automaticamente um certificado TLS para o seu domínio

### 5. Assistente de configuração inicial

Acesse `https://seu-dominio.com/setup` no navegador e siga o assistente para:
- Criar a conta de administrador
- Configurar o nome da aplicação, idioma e tema

### 6. Enviar arquivos estáticos (se usar OCI)

Após o primeiro boot, faça o upload dos arquivos estáticos do Django para o OCI:

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Comandos úteis

```bash
# Ver logs de todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar um serviço após alteração no código (exige rebuild)
docker compose -f docker-compose.prod.yml up -d --build backend

# Executar um comando de gerenciamento do Django
docker compose -f docker-compose.prod.yml exec backend python manage.py <comando>

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Parar e apagar todos os dados (irreversível)
docker compose -f docker-compose.prod.yml down -v
```

### Visão geral da arquitetura

```
Internet → Caddy (443/TLS)
               ├── /v1/*    → Backend Django (uvicorn:9000)
               ├── /admin/* → Backend Django
               └── /*       → Frontend Next.js (node:3000)
                                   └── (server-side) → Backend Django (interno)
```
