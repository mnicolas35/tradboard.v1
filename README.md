# TradBoard v1

TradBoard v1 est une base d'application web pour suivre des comptes de trading
et prop firms en multi-utilisateur.

## Prerequis

- Node.js 20+
- npm
- PostgreSQL
- Un depot Git configure

## Installation

```bash
npm install
```

## Configuration

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

Configurer la variable PostgreSQL :

```env
DATABASE_URL="postgresql://tradboard:REMPLACER_MDP@localhost:5432/tradboard"
```

Ne jamais committer le fichier `.env`.

## Commandes npm

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed
npm run prisma:studio
```

## Base de donnees

Generer le client Prisma :

```bash
npm run prisma:generate
```

Creer une migration locale :

```bash
npm run prisma:migrate
```

Lancer le seed :

```bash
npm run prisma:seed
```

Le seed cree :

- un utilisateur admin fictif
- un utilisateur standard fictif
- deux prop firms d'exemple
- des regles de prop firm
- des comptes
- des journees de trading
- des depenses
- des payouts

## Lancement en developpement

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Architecture

```text
prisma/
src/app/
src/components/
src/lib/
src/lib/stats/
src/server/
src/types/
```

## Notes securite

- L'application est prevue multi-utilisateur des le schema de donnees.
- Les donnees utilisateur portent un `userId`.
- Un utilisateur normal devra etre filtre sur son propre `userId`.
- Un admin pourra lire toutes les donnees quand l'authentification sera ajoutee.
- Google OAuth est prevu plus tard via le champ optionnel `googleId`.
- Aucun mot de passe en clair ne doit etre stocke.
- Le fichier `.env` est ignore par Git.
- Les prop firms et leurs regles sont globales.
- Les comptes, resultats journaliers, depenses et payouts appartiennent a un utilisateur.

## Etat de la V1

Cette version fournit une base fonctionnelle simple :

- schema Prisma initial
- seed de demonstration
- helpers de calcul
- dashboard serveur avec indicateurs
- liste des comptes
- derniers resultats journaliers

L'authentification, les formulaires CRUD, les graphiques et le calendrier trading
seront ajoutes dans les prochaines iterations.
