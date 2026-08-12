# Business Plan — Maresi

**Plateforme digitale de mise en relation pour la location de résidences**  
Marché cible : Côte d’Ivoire (Abidjan et environs)  
Document de travail 

---

## 1. Synthèse exécutive

**Maresi** est une plateforme digitale (web + mobile) qui connecte les **propriétaires** de résidences (appartements, villas, studios) et les **locataires** à la recherche d’un bien à louer.

Contrairement aux annonces dispersées sur les réseaux sociaux ou aux intermédiaires traditionnels peu traçables, Maresi centralise :

- la **publication** d’annonces riches (photos obligatoires, prix, localisation, type) ;
- la **découverte** des biens (recherche, favoris, fiche détaillée) ;
- la **demande de visite / pré-réservation** avec validation par le propriétaire ;
- le **suivi** des demandes et des notifications.

**Proposition de valeur :** réduire le temps, le risque et le flou dans la recherche de logement locatif à Abidjan, en apportant transparence, photos vérifiables et parcours de visite structuré.

**Ambition 3 ans :** devenir la référence digitale locale pour la location résidentielle longue durée / moyenne durée à Abidjan, puis s’étendre aux autres grandes villes ivoiriennes.

---

## 2. Problème

Sur le marché locatif abidjanais :

| Problème | Conséquence |
|----------|-------------|
| Annonces éparpillées (WhatsApp, Facebook, agents) | Perte de temps, doublons, informations incomplètes |
| Photos peu nombreuses ou trompeuses | Déplacements inutiles, déception à la visite |
| Contact non structuré | Appels sans suite, absence de traçabilité |
| Manque de confiance | Crainte d’arnaques, doutes sur la disponibilité réelle |
| Gestion difficile pour les propriétaires | Demandes non organisées, oubli de suivi |

Les locataires veulent **voir avant de se déplacer**. Les propriétaires veulent **des demandes qualifiées** et un canal clair.

---

## 3. Solution produit

### 3.1 Pour les locataires (clients)

- Parcourir les résidences (localisation, prix en FCFA, type)
- Consulter une galerie photo riche (exigence d’au moins **12 photos** à la publication)
- Sauvegarder des favoris
- Lancer une **demande de visite / réservation** (dates, créneau, contact, pièce d’identité)
- Suivre l’état de la demande (en attente / acceptée / refusée)
- Noter et commenter un bien après expérience

### 3.2 Pour les propriétaires

- S’inscrire et publier une résidence en quelques étapes
- Fixer le loyer et décrire le bien
- Recevoir et traiter les demandes de visite
- Gérer son portefeuille d’annonces

### 3.3 Stack déjà en place

| Couche | Technologie |
|--------|-------------|
| API | Java Spring Boot + PostgreSQL |
| Web | React + Vite + TypeScript |
| Mobile | Flutter (Android / iOS) |
| Auth | Compte + JWT (OTP SMS prévu) + notification push|

---

## 4. Marché et opportunité

### 4.1 Marché adressable

- **Zone prioritaire :** Abidjan (Cocody, Plateau, Marcory, Riviera, Yopougon, etc.)
- **Population urbaine** en croissance, forte mobilité professionnelle et étudiante
- Marché locatif encore **peu digitalisé** de bout en bout (visite + validation + suivi)

### 4.2 Segments cibles

1. **Locataires urbains** (25–45 ans) : actifs, étudiants, couples cherchant un bien fiable  
2. **Propriétaires individuels** : 1 à 5 biens à louer  
3. **Petits gestionnaires / agences** (phase 2) : portefeuilles multi-biens  

### 4.3 Positionnement

> « La plateforme ivoirienne pour trouver et louer une résidence en confiance — avec photos réelles et visite planifiée. »

Différenciation vs Facebook / WhatsApp : **structure, traçabilité, qualité visuelle minimale, parcours mobile-first**.

---

## 5. Modèle économique

### 5.1 Sources de revenus (progressives)

| Phase | Modèle | Description |
|-------|--------|-------------|
| **Lancement** | Freemium | Publication gratuite pour attirer l’offre |
| **Croissance** | Commission / lead | Frais sur demande de visite qualifiée ou sur location conclue |
| **Maturité** | Abonnements B2B | Packs agences / multi-propriétaires (mise en avant, stats, outils) |
| **Compléments** | Options payantes | Boost d’annonce, badge vérifié, visite virtuelle premium |

### 5.2 Hypothèses illustratives (à valider)

- Objectif an 1 : **500 annonces actives**, **500 a 1000 utilisateurs** inscrits  
- Taux de conversion visite → contact utile : 15–25 %  
- Revenu moyen par transaction / lead : **5 000 – 15 000 FCFA** (selon formule retenue)

> Les montants ci-dessus sont des ordres de grandeur pour le pilotage ; ils doivent être recalibrés après tests payants.

---

## 6. Stratégie go-to-market

### Phase 1 — Acquisition de l’offre (priorité)

Sans annonces, pas de plateforme. Actions :

- Recruter des propriétaires via réseaux, agents de quartier, groupes Facebook
- Onboarding assisté (aide à la prise de 12+ photos)
- Premières zones : Cocody, Plateau, Riviera, Marcory

### Phase 2 — Acquisition de la demande

- Contenu local (TikTok / Instagram / WhatsApp Status)
- SEO local (« appartement à louer Cocody », etc.)
- Partenariats universités / entreprises (relocation)

### Phase 3 — Confiance et rétention

- Vérification propriétaire (badge)
- Avis et notes publics
- Notifications et « Mes visites »

---

## 7. Concurrentiel

| Alternative | Limite | Avantage Maresi |
|-------------|--------|-----------------|
| Facebook / WhatsApp | Chaos, arnaques, pas de suivi | Parcours guidé + statut des demandes |
| Agences traditionnelles | Coût, opacité, horaires | Self-service 24/7 + mobile |
| Sites immobiliers généraux | Moins focus location résidentielle locale / UX mobile | Spécialisation Abidjan + visite intégrée |

---

## 8. Organisation et équipe

Rôles clés au démarrage :

| Rôle | Responsabilité |
|------|----------------|
| Fondateur / produit | Vision, priorisation, relations propriétaires |
| Tech (full-stack / mobile) | API, apps, stabilité |
| Ops terrain | Acquisition annonces, qualité photos |
| Marketing growth | Contenu, acquisition users |

Structure légère au lancement, renforcement dès que le volume de demandes le justifie.

---

## 9. Feuille de route produit

| Horizon | Priorités |
|---------|-----------|
| **0–3 mois** | Stabiliser le produit, publication (12 photos), demandes de visite |
| **3–6 mois** | Avis, vérification des annonces, premières monétisations |
| **6–12 mois** | Expansion hors Abidjan, outils agences, confiance renforcée |

---

## 10. Plan financier (cadre)

### 10.1 Principaux postes de coûts

- Développement & maintenance
- Hébergement (API, base, stockage photos)
- SMS OTP / notifications
- Marketing d’acquisition
- Ops terrain (qualité des annonces)

### 10.2 Indicateurs de suivi (KPIs)

- Nombre d’annonces actives
- Taux d’annonces avec ≥ 12 photos
- Demandes de visite / mois
- Taux d’acceptation propriétaire
- Utilisateurs actifs mensuels (MAU)
- Coût d’acquisition (CAC) vs valeur (LTV)

### 10.3 Besoin de financement (indicatif)

Usage typique d’une levée / apport initial :

1. Finaliser le produit et la qualité photo  
2. Recruter 300–500 premières annonces  
3. Campagnes d’acquisition ciblées Abidjan  
4. Renforcer la confiance (vérification, support)

---

## 11. Risques et mitigation

| Risque | Mitigation |
|--------|------------|
| Peu d’annonces au lancement | Focus ops terrain + onboarding photo |
| Annonces de mauvaise qualité | Minimum 12 photos + modération |
| Faible confiance utilisateurs | Identité sur les demandes, avis, badges |
| Concurrence des réseaux sociaux | UX supérieure + suivi des visites |
| Monétisation trop tôt | Freemium jusqu’à masse critique |

---

## 12. Vision

Faire de **Maresi** le standard digital de la location résidentielle en Côte d’Ivoire :  
un lieu où **chaque résidence se présente avec sérieux**, et où **chaque visite se planifie sans friction**.

---

## Annexes

### A. Canaux digitaux

- Application mobile Flutter  
- Application web responsive  
- API REST sécurisée (JWT)

### B. Zones géographiques prioritaires (Abidjan)

Cocody · Plateau · Riviera · Marcory · Yopougon · puis extension

### C. Prochaine étape recommandée

1. Valider le pricing (commission vs abonnement) avec 10–20 propriétaires pilotes  
2. Lancer un pilote sur 2–3 quartiers  
3. Mesurer demandes de visite et taux d’acceptation pendant 8 semaines  

---

*Document confidentiel — usage interne / partenaires. Les projections financières sont indicatives et doivent être affinées avec des données terrain.*
