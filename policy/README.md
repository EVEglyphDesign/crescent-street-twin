# The Crescent Street Twin — Consent and Policy Pack / Trousse de consentement et de politiques

> **DRAFT FOR REVIEW BY QUÉBEC COUNSEL — NOT LEGAL ADVICE — DESCRIBES A WIREFRAME, NOT A LIVE SERVICE.**
>
> **BROUILLON À FAIRE RÉVISER PAR UN CONSEILLER JURIDIQUE DU QUÉBEC — CE N’EST PAS UN AVIS JURIDIQUE — IL DÉCRIT UNE MAQUETTE, ET NON UN SERVICE ACTIF.**

---

# EN — Index

This pack sets out the planned consent, data-use, removal, venue, and assessment rules for The Crescent Street Twin, a consent-first digital twin of six bars on rue Crescent in downtown Montréal. It is for review, not for launch without completing its placeholders and obtaining legal review.

| File | Description |
|---|---|
| [Consent Notice](consent-notice.md) | The short notice a person reads before choosing any optional share. |
| [Media Sharing Terms](media-sharing-terms.md) | Limited licence, face-removal rule, no-training rule, removal, and what cannot be recalled after display. |
| [Location Notice](location-notice.md) | The difference between app-open location and prohibited “always” location, with retention limits. |
| [Venue Notice](venue-notice.md) | A plain one-page handout for a bar owner about the planned nightly public-page check, corrections, and removal. |
| [Removal and Access Requests](removal-and-access-requests.md) | How a person or venue can ask to see, correct, or remove information. |
| [Québec Law 25 PIA Skeleton](law25-pia-skeleton.md) | A working privacy impact assessment record with required evidence, controls, risks, and counsel checkpoints. |

## Design commitments

- Default deny: every optional grant names one audience, one purpose, and one surface; it expires in no more than 12 months without a new choice.
- Consent is never a condition of the basic service, and revocation is one action recorded in an append-only ledger. Any subscriber-readable audit view is limited to that subscriber’s own grants and redacts other people.
- No biometric characteristic is measured or templated. The system does not identify people, and no surface returns a person.
- Minors are outside scope. Location is rounded and app-open only. No track, path, address-level stay duration, or background location history is retained.
- No personal information is sold at any margin. Data residency is intended to be in a Canadian Azure tenant, subject to final architecture and legal review.

## Do not launch until

1. The legal operator, Québec contact address, privacy responsible person, verified request channels, and identity-verification method are filled in.
2. Québec counsel confirms the final notices, response and retention timelines, outside-Québec transfer analysis, vendor arrangements, and the biometric analysis for the actual media-processing implementation.
3. The PIA contains completed evidence for every data flow, control, risk, deletion path, and residual-risk sign-off.
4. The app demonstrates that consent is default-deny, optional, bounded, expiring, revocable, and never necessary for the basic service.

---

# FR — Index

Cette trousse présente les règles projetées de consentement, d’utilisation des données, de retrait, d’avis aux établissements et d’évaluation pour le Jumeau de la rue Crescent, un jumeau numérique de six bars de la rue Crescent, au centre-ville de Montréal. Elle est rédigée pour révision; elle ne doit pas servir au lancement sans que ses champs réservés soient complétés et qu’une révision juridique soit faite.

| Fichier | Description |
|---|---|
| [Avis de consentement](consent-notice.md) | L’avis court qu’une personne lit avant de choisir un partage facultatif. |
| [Conditions de partage de médias](media-sharing-terms.md) | Licence limitée, règle de retrait des visages, interdiction d’entraînement, retrait et limites après affichage. |
| [Avis sur la localisation](location-notice.md) | La différence entre la localisation lorsque l’app est ouverte et la localisation « en tout temps » refusée, avec les limites de conservation. |
| [Avis aux établissements](venue-notice.md) | Une fiche simple d’une page pour le propriétaire d’un bar sur la consultation projetée de pages publiques, les corrections et le retrait. |
| [Retrait et demandes d’accès](removal-and-access-requests.md) | La façon dont une personne ou un établissement peut demander l’accès, une correction ou un retrait. |
| [Squelette d’EFVP — Loi 25](law25-pia-skeleton.md) | Un dossier de travail d’évaluation des facteurs relatifs à la vie privée avec les preuves, contrôles, risques et points de contrôle juridique requis. |

## Engagements de conception

- Refus par défaut : chaque autorisation facultative nomme un public, une fin et un écran; elle expire après au plus 12 mois sans nouveau choix.
- Le consentement n’est jamais une condition du service de base, et le retrait se fait en une action inscrite dans un registre auquel on ajoute des entrées sans modifier les précédentes. Toute vue de vérification lisible par un abonné est limitée à ses propres autorisations et masque les autres personnes.
- Aucune caractéristique biométrique n’est mesurée ni gabaritée. Le système n’identifie pas les personnes et aucun écran ne retourne une personne.
- Les mineurs sont hors périmètre. La localisation est arrondie et seulement lorsque l’app est ouverte. Aucun trajet, parcours, temps passé à une adresse ou historique en arrière-plan n’est conservé.
- Aucun renseignement personnel n’est vendu, peu importe la marge. La résidence des données est prévue dans un environnement Azure canadien, sous réserve de l’architecture finale et de la révision juridique.

## Ne pas lancer avant

1. L’exploitant légal, l’adresse de contact au Québec, la personne responsable de la protection des renseignements personnels, les voies de demande vérifiées et la méthode de vérification d’identité sont inscrits.
2. Un conseiller juridique du Québec confirme les avis finaux, les délais de réponse et de conservation, l’analyse des communications hors Québec, les ententes fournisseurs et l’analyse biométrique de l’implantation réelle du traitement de médias.
3. L’évaluation contient les preuves complètes pour chaque flux de données, contrôle, risque, voie de suppression et approbation du risque résiduel.
4. L’app démontre que le consentement est refusé par défaut, facultatif, limité, expirant, révocable et jamais nécessaire pour le service de base.
