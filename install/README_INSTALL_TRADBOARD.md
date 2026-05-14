# TradBoard v1 - Mode operatoire d'installation

Ce dossier est le kit d'installation pour deployer TradBoard v1 avec :

- un serveur applicatif : Node.js, Next.js, moteur web, scripts de start/stop ;
- un serveur PostgreSQL dedie : base `tradboard`, utilisateur `tradboard`, schema Prisma.

Les commandes ci-dessous sont prevues pour Debian/Ubuntu Server. Adapter les adresses IP avant execution.

## 1. Contenu du kit

```text
install/
  package/tradboard-v1-source.tar.gz
  package/tradboard-v1-source.zip
  scripts/install_app_server.sh
  scripts/install_postgres_server.sh
  scripts/start_tradboard.sh
  scripts/stop_tradboard.sh
  scripts/restart_tradboard.sh
  scripts/status_tradboard.sh
  sql/01_create_database_and_user.sql
  sql/02_create_tables_from_prisma_migrations.sql
  systemd/tradboard.service
  nginx/tradboard.conf
  env.production.example
```

## 2. Variables a choisir

Remplacer ces valeurs dans les commandes :

```bash
APP_SERVER_IP="10.0.0.10"
DB_SERVER_IP="10.0.0.20"
DB_NAME="tradboard"
DB_USER="tradboard"
DB_PASSWORD="remplacer_par_un_mot_de_passe_fort"
APP_DIR="/opt/tradboard"
APP_PORT="3000"
APP_URL="http://10.0.0.10:3000"
```

`AUTH_SECRET` doit etre une chaine longue et aleatoire. Exemple de generation :

```bash
openssl rand -base64 48
```

## 3. Installation du serveur PostgreSQL

Sur le serveur PostgreSQL dedie :

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

Copier le dossier `install/` sur ce serveur, puis lancer :

```bash
cd /chemin/vers/install
sudo DB_NAME="tradboard" \
  DB_USER="tradboard" \
  DB_PASSWORD="remplacer_par_un_mot_de_passe_fort" \
  APP_SERVER_IP="10.0.0.10" \
  ./scripts/install_postgres_server.sh
```

Le script :

- installe PostgreSQL si necessaire ;
- cree la base et l'utilisateur ;
- autorise l'IP du serveur applicatif dans `pg_hba.conf` ;
- met PostgreSQL en ecoute reseau ;
- recharge le service.

Test depuis le serveur applicatif :

```bash
psql "postgresql://tradboard:remplacer_par_un_mot_de_passe_fort@10.0.0.20:5432/tradboard" -c "select now();"
```

## 4. Installation du serveur applicatif

Sur le serveur applicatif :

```bash
sudo apt update
sudo apt install -y curl ca-certificates postgresql-client
```

Installer Node.js 20 LTS :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Copier le dossier `install/` sur ce serveur, puis lancer :

```bash
cd /chemin/vers/install
sudo APP_DIR="/opt/tradboard" \
  APP_PORT="3000" \
  APP_HOST="0.0.0.0" \
  APP_URL="http://10.0.0.10:3000" \
  DB_HOST="10.0.0.20" \
  DB_PORT="5432" \
  DB_NAME="tradboard" \
  DB_USER="tradboard" \
  DB_PASSWORD="remplacer_par_un_mot_de_passe_fort" \
  AUTH_SECRET="coller_ici_la_valeur_openssl" \
  ./scripts/install_app_server.sh
```

Le script :

- extrait l'archive applicative dans `/opt/tradboard` ;
- cree le fichier `.env.production` ;
- installe les dependances avec `npm ci` ;
- genere le client Prisma ;
- applique les migrations avec `npx prisma migrate deploy` ;
- cree le compte admin initial ;
- compile Next.js ;
- installe le service systemd `tradboard.service` ;
- demarre l'application.

## 5. Compte initial

Le script `prisma/bootstrap-auth.ts` cree :

```text
Identifiant : admin
Mot de passe : IronMan04!!
Role        : ADMIN
```

Changer ce mot de passe apres la premiere connexion ou modifier `prisma/bootstrap-auth.ts` avant installation.

## 6. Commandes start / stop

Avec systemd :

```bash
sudo systemctl start tradboard
sudo systemctl stop tradboard
sudo systemctl restart tradboard
sudo systemctl status tradboard
journalctl -u tradboard -f
```

Avec les scripts fournis :

```bash
APP_DIR="/opt/tradboard" ./scripts/start_tradboard.sh
APP_DIR="/opt/tradboard" ./scripts/stop_tradboard.sh
APP_DIR="/opt/tradboard" ./scripts/restart_tradboard.sh
APP_DIR="/opt/tradboard" ./scripts/status_tradboard.sh
```

## 7. Requetes PostgreSQL

Creation base/utilisateur :

```bash
sudo -u postgres psql -v db_name="tradboard" -v db_user="tradboard" -v db_password="remplacer_par_un_mot_de_passe_fort" -f sql/01_create_database_and_user.sql
```

Creation des tables via SQL Prisma consolide :

```bash
psql "postgresql://tradboard:remplacer_par_un_mot_de_passe_fort@10.0.0.20:5432/tradboard" -f sql/02_create_tables_from_prisma_migrations.sql
```

En installation applicative normale, preferer :

```bash
npx prisma migrate deploy
```

Cela applique les memes migrations et conserve l'historique Prisma dans la table `_prisma_migrations`.

## 8. Pare-feu

Sur le serveur PostgreSQL, ouvrir PostgreSQL uniquement depuis le serveur applicatif :

```bash
sudo ufw allow from 10.0.0.10 to any port 5432 proto tcp
```

Sur le serveur applicatif, ouvrir le port web si l'application est exposee directement :

```bash
sudo ufw allow 3000/tcp
```

Si un reverse proxy Nginx/Apache est utilise, exposer plutot `80/443` et garder `3000` en interne.

## 8.1. Nginx optionnel

Sur le serveur applicatif :

```bash
sudo apt install -y nginx
sudo cp nginx/tradboard.conf /etc/nginx/sites-available/tradboard.conf
sudo ln -s /etc/nginx/sites-available/tradboard.conf /etc/nginx/sites-enabled/tradboard.conf
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80/tcp
```

Dans ce cas, l'application reste lancee en local sur `127.0.0.1:3000` ou `0.0.0.0:3000`, et Nginx publie le site sur le port `80`.

## 9. Mise a jour applicative

Remplacer l'archive dans `install/package/`, puis :

```bash
sudo systemctl stop tradboard
sudo tar -xzf install/package/tradboard-v1-source.tar.gz -C /opt/tradboard --strip-components=1
cd /opt/tradboard
sudo npm ci
sudo npx prisma generate
sudo npx prisma migrate deploy
sudo npm run build
sudo systemctl start tradboard
```

## 10. Verification

```bash
curl -I http://127.0.0.1:3000
curl -I http://10.0.0.10:3000
psql "postgresql://tradboard:remplacer_par_un_mot_de_passe_fort@10.0.0.20:5432/tradboard" -c "\dt"
```

L'application doit repondre sur :

```text
http://10.0.0.10:3000
```
