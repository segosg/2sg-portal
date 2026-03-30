# 2sg.io — Documentation Projet

> Documentation technique et fonctionnelle du site personnel 2sg.io.
> Mise à jour au fil des itérations — dernière révision : 2025

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Structure du repo](#3-structure-du-repo)
4. [Design system](#4-design-system)
5. [Pages & routing](#5-pages--routing)
6. [Composants](#6-composants)
7. [Lab — Prompt Library](#7-lab--prompt-library)
8. [Base de données Supabase](#8-base-de-données-supabase)
9. [Variables d'environnement](#9-variables-denvironnement)
10. [Déploiement](#10-déploiement)
11. [Workflow de développement](#11-workflow-de-développement)
12. [Roadmap](#12-roadmap)

---

## 1. Vue d'ensemble

**2sg.io** est un site portfolio personnel avec l'identité :
> *Analytics & AI Engineering Feat Product Management*
> Tagline : **Forge de solutions data**

Le site sert de vitrine professionnelle et d'espace d'expérimentation (Lab). Il est construit pour être minimaliste, rapide, et extensible.

**URL de production :** https://2sg.io
**Repo GitHub :** https://github.com/segosg/2sg-portal
**Branch principale :** `main`

---

## 2. Stack technique

| Couche | Technologie | Version | Notes |
|---|---|---|---|
| Framework | Astro | ^4.5.0 | Mode static par défaut |
| UI dynamique | React | via `@astrojs/react` | `client:only="react"` pour les composants interactifs |
| Styling | Tailwind CSS | ^3.4.1 | Palette custom `forge-*` |
| Backend / BDD | Supabase | `@supabase/supabase-js` | Client JS direct, pas d'edge functions |
| Hosting | Vercel | — | Déploiement automatique depuis GitHub |
| Dev | GitHub Codespaces | Node.js v20 via `nvm` | Pas d'installation locale requise |
| DNS | — | — | Domaine 2sg.io pointant vers Vercel |

### Dépendances `package.json`

```json
{
  "dependencies": {
    "astro": "^4.5.0",
    "@astrojs/tailwind": "^5.1.0",
    "@astrojs/react": "latest",
    "@supabase/supabase-js": "latest",
    "lucide-react": "latest",
    "tailwindcss": "^3.4.1"
  }
}
```

---

## 3. Structure du repo

```
2sg-portal/
├── public/
│   └── logo.svg                  ← logo vectoriel (optionnel, remplacé par inline)
├── src/
│   ├── components/
│   │   ├── Logo.astro            ← SVG logo inline, palette Terminal Vert
│   │   ├── Nav.astro             ← navigation fixe (backdrop blur)
│   │   ├── Footer.astro          ← liens GitHub, LinkedIn, email
│   │   └── PromptLibrary.jsx     ← app React complète (CRUD, filtres, modal)
│   ├── layouts/
│   │   └── BaseLayout.astro      ← layout HTML de base (head, fonts, slots)
│   ├── lib/
│   │   └── supabase.js           ← client Supabase (createClient)
│   └── pages/
│       ├── index.astro           ← homepage /
│       ├── cv.astro              ← /cv
│       ├── about.astro           ← /about
│       ├── blog/
│       │   └── index.astro       ← /blog
│       └── lab/
│           ├── index.astro       ← /lab (grille de projets)
│           └── prompts.astro     ← /lab/prompts (monte PromptLibrary)
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## 4. Design system

### Palette — Terminal Vert

Thème dark, inspiré du terminal. Défini dans `tailwind.config.mjs` sous le namespace `forge`.

| Token Tailwind | Hex | Usage |
|---|---|---|
| `forge-bg` | `#080C0A` | Background principal |
| `forge-surface` | `#0C140E` | Cards, surfaces élevées |
| `forge-border` | `#1A2A1E` | Bordures, séparateurs |
| `forge-muted` | `#2A4A32` | Texte désactivé, labels |
| `forge-body` | `#6A9A7A` | Corps de texte courant |
| `forge-heading` | `#C8F0D8` | Titres, texte principal |
| `forge-primary` | `#3DFF9A` | CTA, liens, accents |
| `forge-secondary` | `#00C8D4` | Accents secondaires |

### Typographie

| Famille | Font | Usage |
|---|---|---|
| `font-mono` | JetBrains Mono | Titres, labels, nav, code |
| `font-sans` | DM Sans | Corps de texte, descriptions |

Chargées via Google Fonts dans `BaseLayout.astro`.

### Animations Tailwind

| Classe | Effet | Durée |
|---|---|---|
| `animate-fade-up` | Montée + apparition | 0.6s |
| `animate-blink` | Clignotement curseur | 1s |
| `animate-glow-pulse` | Halo vert pulsant | 3s |

### Logo

SVG vectoriel intégré **inline** dans `src/components/Logo.astro`.
Palette remappée sur les tons verts du thème (6 nuances du plus sombre `#080C0A` au plus vif `#3DFF9A`).
Fond du canvas transparent (rectangle de base supprimé, liseré de contour neutralisé).

---

## 5. Pages & routing

| URL | Fichier | Statut |
|---|---|---|
| `/` | `pages/index.astro` | ✅ Production |
| `/cv` | `pages/cv.astro` | 🔧 Stub |
| `/about` | `pages/about.astro` | 🔧 Stub |
| `/blog` | `pages/blog/index.astro` | 🔧 Stub |
| `/lab` | `pages/lab/index.astro` | ✅ Production |
| `/lab/prompts` | `pages/lab/prompts.astro` | ✅ Production |

### Homepage (`/`)

Structure de la page :

```
Nav (fixe, backdrop blur)
└── Hero section
    ├── Logo (inline SVG, ~160px)
    ├── Prompt terminal (➜ 2sg.io git:(main) ✦)
    ├── H1 : "Analytics & AI Engineering Feat Product Management"
    ├── Tagline : "// Forge de solutions data ▌"
    ├── CTA buttons : [./explorer-le-lab] [./à-propos]
    └── Cards section : Blog · Lab · CV
Footer
```

**Effets visuels :**
- Scanlines en overlay opacity 3% (repeating-linear-gradient)
- Glow blob radial derrière le hero (opacity 10%, blur 60px)
- Cards avec hover : border phosphore + shadow verte + translateY(-4px)

---

## 6. Composants

### `Nav.astro`

Navigation fixe en haut. Comportement :
- Background `forge-bg/80` + `backdrop-blur-md`
- Lien actif détecté via `Astro.url.pathname.startsWith(href)`
- Lien actif → `text-forge-primary`, inactif → `text-forge-body` + hover `text-forge-heading`

Liens : `~/blog` · `~/lab` · `~/cv` · `~/about`

### `Footer.astro`

Bande basse avec copyright + liens externes.
Liens : GitHub · LinkedIn · Email (`hello@2sg.io`)

### `BaseLayout.astro`

Layout HTML de base. Props : `title`, `description` (optionnel).
Slots : `nav`, `default`, `footer`.
Charge JetBrains Mono + DM Sans via Google Fonts.

### `Logo.astro`

SVG inline dans un `<div>` dimensionné via Tailwind.
Taille actuelle : `w-28 sm:w-40`.
Pas de dépendance fichier externe — le SVG est directement dans le composant.

---

## 7. Lab — Prompt Library

### Vue d'ensemble

Application React montée dans `/lab/prompts` via `client:only="react"`.
Permet de gérer une bibliothèque de prompts stockés dans Supabase.

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/pages/lab/prompts.astro` | Page Astro — monte `<PromptLibrary>` |
| `src/components/PromptLibrary.jsx` | Composant React — toute la logique |
| `src/lib/supabase.js` | Client Supabase partagé |

### Modes d'accès

| Mode | URL | Accès |
|---|---|---|
| Public | `/lab/prompts` | Prompts `is_public = true` uniquement |
| Admin | `/lab/prompts?admin=1` | Tous les prompts + CRUD complet |

> ⚠️ Le mode admin est protégé uniquement par le paramètre URL — **non sécurisé**. À remplacer par Supabase Auth (voir Roadmap).

### Fonctionnalités — Vue publique

- Liste des prompts filtrés sur `is_public = true`
- Recherche full-text sur titre, contenu, et tags
- Filtre par catégorie (sidebar)
- Affichage automatique des variables `{{placeholder}}` détectées dans le contenu
- Affichage des tags

### Fonctionnalités — Vue admin (`?admin=1`)

Tout ce qui est en vue publique, plus :

- Visibilité de tous les prompts (publics + privés)
- Filtre par statut : Brouillon / Validé / Archivé
- Compteurs en sidebar : total · validés · brouillons · archivés
- Icône 🔒 / 🌐 sur chaque carte (visibilité)
- Changement de statut rapide depuis la carte
- CRUD complet via modal : créer · modifier · supprimer
- Toggle public/privé dans le formulaire

### `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)
```

---

## 8. Base de données Supabase

### Table `prompts`

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | `uuid` | PK, auto | Identifiant unique |
| `title` | `text` | NOT NULL | Titre du prompt |
| `content` | `text` | NOT NULL | Corps du prompt, supporte `{{variables}}` |
| `category` | `text` | — | Valeur parmi la liste ci-dessous |
| `status` | `text` | — | `draft` · `valid` · `archived` |
| `tags` | `text[]` | — | Tableau de strings |
| `is_public` | `boolean` | default `false` | Visible dans la vue publique si `true` |
| `created_at` | `timestamptz` | auto | Date de création |
| `updated_at` | `timestamptz` | — | Mis à jour à chaque modification |

**Catégories disponibles :** Général · Rédaction · Code · Analyse · Créatif · Résumé · Autre

### Row Level Security (RLS)

RLS activée sur la table `prompts`.

| Policy | Opération | Condition |
|---|---|---|
| `Public read` | `SELECT` | `is_public = true` |
| `Owner full access` | Toutes | Toutes les lignes |

> ⚠️ La policy `Owner full access` n'est pas encore liée à un utilisateur authentifié. À sécuriser avec Supabase Auth (voir Roadmap).

### Triggers recommandés (à implémenter)

```sql
-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON prompts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 9. Variables d'environnement

### Fichier `.env` (développement local / Codespaces)

```env
PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxx
```

### Vercel (production)

Configurées dans **Vercel Dashboard → Project → Settings → Environment Variables**.

| Variable | Environnements |
|---|---|
| `PUBLIC_SUPABASE_URL` | Production · Preview · Development |
| `PUBLIC_SUPABASE_ANON_KEY` | Production · Preview · Development |

> Les variables préfixées `PUBLIC_` sont exposées côté client — utiliser uniquement la clé `anon` (jamais la `service_role`).

---

## 10. Déploiement

### Pipeline

```
Push sur main (GitHub)
  → Vercel détecte le changement
  → npm install
  → astro build
  → dist/ déployé sur CDN
  → 2sg.io mis à jour (~1 min)
```

### Configuration Vercel

| Paramètre | Valeur |
|---|---|
| Framework Preset | Astro |
| Build Command | `astro build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### DNS

| Type | Nom | Valeur |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

### `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://2sg.io',
  integrations: [
    tailwind(),
    react(),
  ],
});
```

---

## 11. Workflow de développement

### Édition en ligne (sans installation locale)

| Outil | Usage | URL |
|---|---|---|
| **GitHub.dev** | Édition de fichiers | Appuyer sur `.` dans le repo GitHub |
| **Stackblitz** | Preview live + édition | `stackblitz.com/github/segosg/2sg-portal` |
| **GitHub Codespaces** | Terminal complet + Node.js v20 | Via GitHub → Code → Codespaces |

### Boucle de travail recommandée

```
Stackblitz (édition + preview immédiat)
  → Satisfait du résultat
  → Commit & Push depuis Stackblitz
  → Vercel déploie automatiquement
```

### Convention de commits

Format : `type: description courte`

| Type | Usage |
|---|---|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug ou ajustement |
| `style:` | Changement visuel / CSS uniquement |
| `docs:` | Documentation |
| `refactor:` | Restructuration sans changement fonctionnel |

Exemples :
```
feat: add prompt library with supabase
fix: hero title layout
style: logo size adjust
fix: remove logo border stroke
```

---

## 12. Roadmap

### Court terme

- [ ] **Auth admin** — Supabase Auth pour sécuriser `/lab/prompts?admin=1`
  - Remplacer le paramètre URL par une vraie session utilisateur
  - Policy RLS `Owner full access` liée à `auth.uid()`

- [ ] **Template engine** — substitution dynamique des `{{variables}}`
  - Formulaire de saisie des variables détectées
  - Prévisualisation du prompt avec les valeurs remplies

- [ ] **Test runner** — appel API Claude depuis une fiche prompt
  - Intégration de l'API Anthropic
  - Affichage de la réponse dans la modal

### Moyen terme

- [ ] **Section `/cv`** — layout timeline avec expériences et stack technique
- [ ] **Section `/blog`** — système de contenu Markdown avec `getCollection()` d'Astro Content Collections
- [ ] **Section `/about`** — page de présentation
- [ ] **SEO** — meta tags dynamiques par page, Open Graph

### Long terme

- [ ] **Lab — nouveaux projets** — chaque projet dans `src/pages/lab/[slug].astro`
- [ ] **Recherche globale** — full-text sur le blog et le lab
- [ ] **Mode sombre/clair** — toggle thème (Terminal Vert / Craie & Encre)

---

*Documentation générée et maintenue avec le projet — à mettre à jour à chaque itération significative.*
