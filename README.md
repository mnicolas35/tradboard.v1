# TradBoard v1

TradBoard v1 est une application Next.js pour suivre des comptes de trading et prop firm avec donnees persistantes PostgreSQL via Prisma.

## Etat actuel

- Dashboard global avec KPI USD et estimation EUR.
- Gestion manuelle des prop firms, regles, comptes, resultats journaliers, depenses, resets, payouts et taux de change.
- Formulaires principaux en modales avec fermeture automatique apres succes.
- Sidebar avec comptes actifs et vue comptes archives.
- Gestion des prop firms avec acronyme obligatoire.
- Detail compte avec progression, payout brut/net, ROI, calendrier mensuel, depenses, payouts et historique des resultats.
- Calendrier global enrichi avec acronyme prop firm, taille, numero de compte et P/L journalier.
- Archivage, suppression confirmee et validation d'evaluation vers FUNDED.
- Regles effectives via `resolveAccountRule()` avec override par compte.
- Calcul d'eligibilite payout via `calculatePayoutEligibility()`.
- Regles standard visibles par tous et regles custom prefixees `**`.
- Preference theme utilisateur `LIGHT` / `DARK`.
- Donnees utilisateur liees a `userId`.
- Authentification par session applicative, email/mot de passe et Google OAuth.
- Recuperation automatique USD/EUR prevue plus tard.

## Prerequis

- Node.js 20+
- npm
- PostgreSQL

## Installation

```bash
npm install
```

## Configuration `.env`

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

Configurer PostgreSQL :

```env
DATABASE_URL="postgresql://tradboard:REMPLACER_MDP@localhost:5432/tradboard"
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH_SECRET="REMPLACER_PAR_UN_SECRET_LONG_ALEATOIRE"
AUTH_COOKIE_SECURE="false"
GOOGLE_CLIENT_ID="REMPLACER_CLIENT_ID"
GOOGLE_CLIENT_SECRET="REMPLACER_CLIENT_SECRET"
```

Ne jamais committer `.env`.

## Google OAuth

Dans Google Cloud Console, creer un identifiant OAuth 2.0 de type application Web.

Origines JavaScript autorisees :

```text
http://localhost:3000
https://votre-domaine
```

URI de redirection autorises :

```text
http://localhost:3000/api/auth/google/callback
https://votre-domaine/api/auth/google/callback
```

Reporter ensuite `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env`.

## Prisma

Generer le client :

```bash
npx prisma generate
```

Appliquer les migrations :

```bash
npx prisma migrate dev
```

Lancer le seed :

```bash
npm run prisma:seed
```

Le seed cree des utilisateurs demo, prop firms, regles, comptes, resultats journaliers, depenses, payouts et un taux USD/EUR manuel.

## Lancement dev

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Verification

```bash
npx tsc --noEmit
npm run build
```

## Modules

```text
prisma/
src/app/
src/components/layout/
src/components/dashboard/
src/components/accounts/
src/components/forms/
src/components/modals/
src/components/settings/
src/components/ui/
src/lib/currency/
src/lib/payout/
src/lib/rules/
src/lib/stats/
src/server/actions/
src/server/auth/
src/server/
src/types/
```

## Authentification

La connexion utilise une session signee via `src/server/auth/current-user.ts`.

Les utilisateurs peuvent se connecter par email/mot de passe ou via Google OAuth. Les donnees privees restent scopees par `userId`.

## Multi-utilisateur

- `User` conserve `role` avec `ADMIN` et `USER`.
- Comptes, resultats journaliers, depenses, payouts et taux de change portent un `userId`.
- Un utilisateur standard doit rester filtre sur ses donnees.
- L'admin peut charger une vue globale cote lecture; les actions restent centrees sur l'utilisateur courant.

## Regles et payouts

- `PropFirmRule` contient les champs de risque, payout, buffer, consistance, split trader et prix par defaut.
- `AccountRuleOverride` permet de surcharger une regle pour un compte precis.
- `resolveAccountRule()` applique l'override si present, sinon la regle prop firm.
- `calculatePayoutEligibility()` retourne eligibilite, montant brut disponible, montant net apres split, buffer, jours valides, consistance et raisons de blocage.
- Les types de compte sont volontairement limites a `EVALUATION` et `FUNDED`.
- `UserPropFirmOrder` prepare l'ordre personnalise des prop firms dans la sidebar.

## Taux USD/EUR

Les taux sont historises dans `ExchangeRate` avec unicite par `userId`, devise source, devise cible et date.

Le bouton "Mettre a jour taux" recupere USD/EUR via Frankfurter (`https://api.frankfurter.dev/v2/rate/USD/EUR`), sans cle API, puis historise le taux en base.

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
