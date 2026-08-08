# Québec Law 25 Privacy Impact Assessment Skeleton / Squelette d’évaluation des facteurs relatifs à la vie privée — Loi 25

> **Draft working skeleton, not legal advice.** It describes a wireframe, not a live service. Bracketed fields require evidence and counsel review. Do not treat any statement below as a settled legal conclusion.
>
> **Squelette de travail, et non un avis juridique.** Il décrit une maquette, et non un service actif. Les champs entre crochets exigent des preuves et une révision juridique. Aucune affirmation ci-dessous ne doit être considérée comme une conclusion juridique définitive.

---

# EN — Working assessment record

## 0. Control record

| Field | Record |
|---|---|
| Project | The Crescent Street Twin — consent-first digital twin of six rue Crescent venues |
| Status | Wireframe; no live collection approved by this document |
| Assessment owner | `[name / role]` |
| Person responsible for the protection of personal information | `[name / title / Québec contact]` |
| Legal operator | `[legal entity]` |
| Version and review date | `[version / date]` |
| Counsel review | **Required.** `[counsel name / date / open advice]` |
| Decision | `[approve / approve with conditions / do not launch]` |

**Counsel checkpoint:** Confirm which Québec privacy-law obligations apply to the final legal operator, each processing activity, communications outside Québec, and the planned public-page review. Confirm whether this assessment is sufficient for each planned technology and data flow.

## 1. Purpose and necessity

**Purpose.** Offer a non-personal, consent-first view of six Crescent Street venues: The Brass Door Pub, Hurley’s Irish Pub, Sir Winston Churchill Pub Complexe, Brutopia, Ziggy’s Pub, and Wienstein & Gavino’s. The product may also display public venue information gathered overnight from pages already published by venues.

**Optional functions.** Rounded-area location while the app is open; photo/video sharing per room and audience after removal of other people’s faces; and an anonymous “+1” added to a rounded street presence count.

**Necessity test.** For each element, record the specific user-facing benefit, the least intrusive alternative considered, why the feature cannot work without the element, and why aggregate/non-personal output is insufficient if personal information is involved. The basic service must work without optional consent.

| Activity | Claimed need | Less intrusive design | Decision and evidence |
|---|---|---|---|
| Public venue information | Keep guide facts current | Public pages only, nightly; no account access | `[complete]` |
| Rounded-area location | Optional local view | App-open only; coarse rounding; no path | `[complete]` |
| Photo/video | Optional room/activity share | Process faces before storage; narrow audience | `[complete]` |
| Presence “+1” | Broad activity signal | Anonymous, rounded aggregate; no visit history | `[complete]` |

**Counsel checkpoint:** Confirm the stated purpose, necessity, consent design, and whether public information handling creates a separate obligation or notice requirement.

## 2. Proportionality

Document why benefits outweigh privacy impact after controls. Test the design against these limits:

- default deny; each grant names one audience, one purpose, and one surface;
- expiry no later than 12 months without a new choice;
- one-action revocation recorded in an append-only ledger;
- no consent as a condition of service;
- no query returns a person;
- no minors in scope;
- no sale of personal information at any margin;
- “always”/background location refused; and
- no biometric template or biometric measurement.

Record testing evidence: `[consent-flow screenshots]`, `[API tests proving no person-level response]`, `[data minimization review]`, `[access-control test]`.

**Counsel checkpoint:** Confirm the proportionality standard and whether any optional use should be removed, narrowed, or subject to another lawful basis or disclosure.

## 3. Data inventory and classification

| Data element | Source | Classification / sensitivity | Purpose | Audience / access | Personal information? | Owner |
|---|---|---|---|---|---|---|
| Consent grant and revocation record | User action | Governance/audit record | Demonstrate and enforce choice | Privacy staff, limited operators | `[counsel confirm]` | `[role]` |
| Rounded area + coarse time bucket | App-open optional location | Location-related; treat as sensitive by design | Named local-view purpose | Named audience through aggregate controls | `[counsel confirm]` | `[role]` |
| Submitted photo/video before acceptance | User action | High handling risk; may depict people | Face-removal check then stated share | Restricted processing path | `[counsel confirm]` | `[role]` |
| Processed photo/video | Face-processed submitted media | User content; residual re-identification risk | Named audience and purpose | Named audience | `[counsel confirm]` | `[role]` |
| Anonymous “+1” presence count | User action | Aggregate signal | Rounded street activity | Aggregate viewers | `[counsel confirm non-personal status]` | `[role]` |
| Public venue facts | Already-public venue pages | Business/public information | Venue guide | Guide viewers | Usually not personal; assess exceptions | `[role]` |
| Security/audit logs | System operation | Security and accountability | Detect misuse, prove action | Security/privacy staff | `[counsel confirm]` | `[role]` |

Do not add any field without updating this table, retention schedule, consent flow, threat model, and counsel review.

## 4. Retention and destruction

| Record | Proposed schedule | Destruction / de-identification method | Evidence |
|---|---|---|---|
| Rounded-area event | Delete within 24 hours | Automated deletion job; verify in logs | `[job ID / report]` |
| Photo/video | Expiry, user removal, or displayed end time; active surfaces within 24 hours and ordinary copies within 30 days after removal | Remove object and CDN/cache references; verify removal receipt | `[test]` |
| Presence input | Convert promptly to rounded aggregate; no visit history | Drop source event after aggregation | `[test]` |
| Consent/revocation ledger | Minimum period needed for accountability | Cryptographically controlled ledger that preserves earlier entries; restricted access | `[counsel-approved schedule]` |
| Venue public-page facts | Refresh/delete when source changes, venue requests removal, or guide ends | Delete guide record and stop scheduled reading | `[test]` |
| Security logs | `[short, defined period]` | Automated secure deletion | `[schedule]` |

Backups, legal holds, recovery media, and forensic copies require a separate documented schedule. Counsel must confirm whether and how an exception can apply and what notice is required.

## 5. Transfer and residency

**Target architecture:** data in a Canadian Azure tenant, using Azure Canada Central and/or Canada East. Customer-managed keys are planned. Record the exact tenant, regions, support access paths, subprocessors, telemetry destinations, backup locations, and any remote administrative access.

**No assumed conclusion:** Canadian hosting alone does not settle all transfer, access, contract, or notice questions. Do not enable a service provider, analytics SDK, content-delivery network, support tool, or model service until its locations and access paths are recorded and counsel has reviewed the arrangement.

**Counsel checkpoint:** Confirm any assessment and contractual steps for communications outside Québec, including remote access and subprocessors, under the final facts and governing statute.

## 6. Security measures

Minimum planned controls:

- customer-managed encryption keys, with key access separated from routine operations;
- encryption in transit and at rest;
- role-based, least-privilege access; no shared administrator accounts;
- multi-factor authentication for privileged access;
- Canadian-region configuration controls and alerting on region change;
- consent and revocation ledger that preserves earlier entries, with integrity monitoring;
- face-removal gate before media storage; fail closed if uncertain;
- no biometric feature extraction, template, or identification service;
- aggregation controls that prevent person-level query output;
- secure development review, code review, dependency review, vulnerability remediation, and penetration testing before launch;
- access logging readable to subscribers where the product represents it as available, with redaction so the log does not reveal another person;
- incident response, vendor incident notification, and tested recovery procedures; and
- deletion-job monitoring and removal receipts.

**Counsel and security checkpoint:** Convert every control into an owner, implementation ticket, test, evidence item, failure alert, and review date. Confirm incident obligations and notification thresholds under final facts.

## 7. Biometric question

**Design answer:** No biometric characteristic is measured or templated. The service does not create facial templates, identify faces, compare faces, or retain biometric measurements. Other people’s faces in submitted media are removed before storage; face removal must not produce a retained biometric template.

**Working implication:** On this design, the Commission d’accès à l’information declaration obligation is not engaged because no biometric characteristic is measured or templated.

**Counsel checkpoint — mandatory:** Confirm that the actual media-processing implementation does not measure, generate, transmit, temporarily retain, or allow a vendor to retain a biometric characteristic or template. Confirm the legal wording above against the final technology, vendor terms, and [Québec privacy-law text](https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1). If implementation changes, stop and reassess before testing or launch.

## 8. Roles and accountability

| Role | Named person / organization | Responsibilities | Independence / conflict notes |
|---|---|---|---|
| Legal operator | `[entity]` | Decides purposes and means; funds compliance | `[complete]` |
| Person responsible for personal information protection | `[name]` | Approves disclosures, handles escalation, reports to leadership | Must have authority and published contact |
| Product owner | `[name]` | Keeps product within approved purpose | Cannot silently expand scope |
| Security owner | `[name]` | Access, keys, logging, incident response | `[complete]` |
| Data steward | `[name]` | Inventory, retention, deletion evidence | `[complete]` |
| Independent Québec counsel | `[firm / lawyer]` | Legal review and documented advice | Independent of feature delivery |
| Small oversight council | `[members / charter]` | Reviews high-risk changes and unresolved complaints | No commercial veto over privacy lead |

Define escalation to the responsible person and council, decision rights, meeting cadence, conflicts, and a procedure for product changes.

## 9. Risk register

| Risk | Scenario | Initial risk | Mitigations | Residual risk | Owner | Evidence / trigger |
|---|---|---:|---|---:|---|---|
| Person is identified from an output | Search or UI exposes a person | High | No person-returning query; rounded aggregates; test suite | `[rate]` | Product | `[test]` |
| Background tracking | App or SDK collects beyond app-open use | High | Refuse “always”; permission controls; SDK review | `[rate]` | Engineering | `[test]` |
| Face processing becomes biometric | Vendor retains templates or measurements | High | No biometric service; contract ban; technical review; fail closed | `[rate]` | Security | `[vendor evidence]` |
| Media shows a bystander | Face removal misses a face | High | Pre-storage gate; human/automated QA rules; removal path | `[rate]` | Operations | `[test]` |
| Consent scope widens | UI or backend reuses an old grant | High | Purpose/audience/surface binding; 12-month expiry; ledger checks | `[rate]` | Product | `[test]` |
| Removal does not propagate | CDN, backup, or vendor copy remains | High | Removal orchestration; receipts; backup schedule; exception log | `[rate]` | Engineering | `[drill]` |
| Foreign access or transfer | Support, telemetry, or vendor processing occurs outside intended scope | High | Data-flow inventory; regional controls; vendor review | `[rate]` | Security | `[review]` |
| Venue misinformation | Public page is stale or attributed wrongly | Medium | Source link, correction route, nightly refresh, removal right | `[rate]` | Content | `[sample]` |
| Minor appears in media | User submits media including a minor | High | Out-of-scope rule, removal/review queue, reporting flow | `[rate]` | Operations | `[test]` |
| Audit log reveals information | Subscriber-readable log exposes another user | Medium | Per-subscriber view, redaction, access testing | `[rate]` | Security | `[test]` |

Use a documented risk scale. A “high” residual risk, an untested mitigation, or any new personal-data element blocks launch until the responsible person and counsel approve a written decision.

## 10. Residual-risk sign-off

**No launch until every required field is complete.**

| Sign-off | Name | Decision | Date | Conditions / open risks |
|---|---|---|---|---|
| Person responsible for personal information protection | `[name]` | `[approve / reject]` | `[date]` | `[text]` |
| Security owner | `[name]` | `[approve / reject]` | `[date]` | `[text]` |
| Product owner | `[name]` | `[approve / reject]` | `[date]` | `[text]` |
| Independent Québec counsel | `[name]` | `[advice / conditions]` | `[date]` | `[text]` |
| Oversight council | `[chair]` | `[approve / reject]` | `[date]` | `[text]` |

---

# FR — Dossier de travail d’évaluation

## 0. Fiche de contrôle

| Champ | Dossier |
|---|---|
| Projet | Le Jumeau de la rue Crescent — jumeau numérique de six établissements de la rue Crescent, fondé sur le consentement |
| État | Maquette; aucune collecte réelle n’est autorisée par ce document |
| Responsable de l’évaluation | `[nom / rôle]` |
| Personne responsable de la protection des renseignements personnels | `[nom / titre / contact au Québec]` |
| Exploitant légal | `[entité légale]` |
| Version et date de révision | `[version / date]` |
| Révision juridique | **Obligatoire.** `[nom du conseiller / date / avis non réglé]` |
| Décision | `[approuver / approuver avec conditions / ne pas lancer]` |

**Point de contrôle juridique :** Confirmer quelles obligations québécoises de protection des renseignements personnels s’appliquent à l’exploitant final, à chaque activité de traitement, aux communications hors Québec et à la consultation projetée de pages publiques. Confirmer si cette évaluation suffit pour chaque technologie et chaque flux de données projetés.

## 1. Fins et nécessité

**Fin.** Offrir une vue non personnelle, fondée sur le consentement, de six établissements de la rue Crescent : The Brass Door Pub, Hurley’s Irish Pub, Sir Winston Churchill Pub Complexe, Brutopia, Ziggy’s Pub et Wienstein & Gavino’s. Le produit peut aussi afficher des renseignements publics d’établissements recueillis de nuit à partir de pages déjà publiées par ces établissements.

**Fonctions facultatives.** Localisation par zone arrondie lorsque l’app est ouverte; partage de photo ou vidéo par salle et par public après le retrait des visages des autres personnes; et ajout d’un « +1 » anonyme à un compte arrondi de présence dans la rue.

**Test de nécessité.** Pour chaque élément, consigner l’avantage précis pour l’utilisateur, l’option moins intrusive étudiée, la raison pour laquelle la fonction ne peut pas fonctionner sans cet élément et la raison pour laquelle une sortie globale et non personnelle ne suffit pas lorsqu’un renseignement personnel est en cause. Le service de base doit fonctionner sans consentement facultatif.

| Activité | Besoin invoqué | Solution moins intrusive | Décision et preuves |
|---|---|---|---|
| Renseignements publics d’établissement | Garder à jour les faits du guide | Pages publiques seulement, la nuit; aucun accès à un compte | `[à compléter]` |
| Localisation par zone arrondie | Vue locale facultative | Seulement app ouverte; arrondi grossier; aucun parcours | `[à compléter]` |
| Photo/vidéo | Partage facultatif d’ambiance ou d’activité | Traitement des visages avant l’enregistrement; public restreint | `[à compléter]` |
| Présence « +1 » | Signal général d’activité | Total anonyme et arrondi; aucun historique de visite | `[à compléter]` |

**Point de contrôle juridique :** Confirmer la fin annoncée, la nécessité, la conception du consentement et si le traitement d’informations publiques exige un avis ou une obligation distincte.

## 2. Proportionnalité

Documenter pourquoi les avantages l’emportent sur l’atteinte à la vie privée après les contrôles. Vérifier la conception selon ces limites :

- refus par défaut; chaque autorisation nomme un public, une fin et un écran;
- expiration au plus tard 12 mois sans nouveau choix;
- retrait en une action inscrit dans un registre auquel on ajoute des entrées sans modifier les précédentes;
- aucun consentement comme condition de service;
- aucune requête ne retourne une personne;
- aucun mineur dans le périmètre;
- aucune vente de renseignements personnels, peu importe la marge;
- refus de la localisation « en tout temps » ou en arrière-plan; et
- aucune mesure ni aucun gabarit biométrique.

Consigner les preuves de test : `[captures du parcours de consentement]`, `[tests d’API démontrant l’absence de réponse au niveau d’une personne]`, `[révision de minimisation]`, `[test des contrôles d’accès]`.

**Point de contrôle juridique :** Confirmer le critère de proportionnalité et si un usage facultatif doit être retiré, resserré ou soumis à un autre fondement ou avis.

## 3. Inventaire et classification des données

| Élément de données | Source | Classification / sensibilité | Fin | Public / accès | Renseignement personnel? | Responsable |
|---|---|---|---|---|---|---|
| Preuve d’autorisation et de retrait | Action de l’utilisateur | Preuve de gouvernance et de vérification | Démontrer et appliquer le choix | Équipe vie privée, exploitants limités | `[à confirmer par le conseiller]` | `[rôle]` |
| Zone arrondie + période approximative | Localisation facultative, app ouverte | Lié à la localisation; traiter comme sensible par conception | Fin de vue locale nommée | Public nommé, au moyen de contrôles globaux | `[à confirmer par le conseiller]` | `[rôle]` |
| Photo/vidéo soumise avant acceptation | Action de l’utilisateur | Risque élevé de traitement; peut montrer des personnes | Vérification de retrait des visages puis partage annoncé | Parcours de traitement restreint | `[à confirmer par le conseiller]` | `[rôle]` |
| Photo/vidéo traitée | Média soumis et traité pour les visages | Contenu utilisateur; risque résiduel de réidentification | Public et fin nommés | Public nommé | `[à confirmer par le conseiller]` | `[rôle]` |
| Compte anonyme « +1 » | Action de l’utilisateur | Signal global | Activité arrondie dans la rue | Lecteurs du total | `[confirmer le caractère non personnel]` | `[rôle]` |
| Faits publics d’établissement | Pages d’établissements déjà publiques | Information d’entreprise/publique | Guide d’établissements | Lecteurs du guide | Habituellement non personnel; évaluer les exceptions | `[rôle]` |
| Journaux de sécurité et de vérification | Fonctionnement du système | Sécurité et reddition de comptes | Détecter les abus, prouver l’action | Équipe sécurité/vie privée | `[à confirmer par le conseiller]` | `[rôle]` |

N’ajoutez aucun champ sans mettre à jour ce tableau, le calendrier de conservation, le parcours de consentement, le modèle de menace et la révision juridique.

## 4. Conservation et destruction

| Dossier | Calendrier proposé | Méthode de destruction / dépersonnalisation | Preuves |
|---|---|---|---|
| Événement de zone arrondie | Suppression dans les 24 heures | Tâche automatisée de suppression; vérification dans les journaux | `[ID de tâche / rapport]` |
| Photo/vidéo | Expiration, retrait par l’utilisateur ou fin affichée; écrans actifs dans 24 h et copies ordinaires dans 30 jours après retrait | Retirer l’objet et les références CDN/cache; vérifier le reçu de retrait | `[test]` |
| Donnée de présence | Conversion rapide en total arrondi; aucun historique de visite | Éliminer l’événement source après agrégation | `[test]` |
| Registre de consentement/retrait | Période minimale nécessaire à la reddition de comptes | Registre contrôlé cryptographiquement qui préserve les entrées antérieures; accès restreint | `[calendrier approuvé par le conseiller]` |
| Faits de pages publiques d’établissement | Actualiser/supprimer si la source change, sur demande de retrait ou à la fin du guide | Supprimer la fiche et cesser les consultations prévues | `[test]` |
| Journaux de sécurité | `[courte période définie]` | Suppression sécurisée automatisée | `[calendrier]` |

Les sauvegardes, les obligations de conservation, les supports de récupération et les copies médico-légales exigent un calendrier distinct et documenté. Un conseiller juridique doit confirmer si et comment une exception peut s’appliquer ainsi que tout avis requis.

## 5. Transfert et résidence

**Architecture cible :** données dans un environnement Azure canadien, avec Azure Canada Central et/ou Canada East. Des clés gérées par le client sont prévues. Consigner le locataire exact, les régions, les chemins d’accès du soutien, les sous-traitants, les destinations de télémétrie, les lieux de sauvegarde et tout accès administratif à distance.

**Aucune conclusion présumée :** un hébergement au Canada ne règle pas à lui seul toutes les questions de transfert, d’accès, de contrat ou d’avis. N’activez pas un fournisseur, une trousse analytique, un réseau de diffusion de contenu, un outil de soutien ou un service de modèle tant que ses lieux et ses accès ne sont pas consignés et que le conseiller n’a pas examiné l’entente.

**Point de contrôle juridique :** Confirmer toute évaluation et toute étape contractuelle relative aux communications hors Québec, y compris les accès à distance et les sous-traitants, selon les faits finals et la loi applicable.

## 6. Mesures de sécurité

Contrôles minimaux prévus :

- clés de chiffrement gérées par le client, avec un accès aux clés séparé des opérations courantes;
- chiffrement en transit et au repos;
- accès selon les rôles et le moindre privilège; aucun compte administrateur partagé;
- authentification multifacteur pour les accès privilégiés;
- contrôles de configuration de région canadienne et alertes lors d’un changement de région;
- registre de consentement et de retrait qui préserve les entrées antérieures, avec surveillance de l’intégrité;
- porte de retrait des visages avant l’enregistrement des médias; refus en cas d’incertitude;
- aucun service d’extraction de traits biométriques, de gabarit ou d’identification;
- contrôles d’agrégation qui empêchent une sortie de requête au niveau d’une personne;
- revue du développement sécurisé, revue de code, revue des dépendances, correction des vulnérabilités et test d’intrusion avant le lancement;
- journal d’accès lisible par les abonnés lorsque le produit le présente comme disponible, avec masquage pour qu’il ne révèle pas une autre personne;
- réponse aux incidents, avis d’incident des fournisseurs et procédures de reprise testées; et
- surveillance des tâches de suppression et reçus de retrait.

**Point de contrôle juridique et sécurité :** Transformer chaque contrôle en responsable, billet d’implantation, test, élément de preuve, alerte d’échec et date de révision. Confirmer les obligations d’incident et les seuils d’avis selon les faits finals.

## 7. Question biométrique

**Réponse de conception :** Aucune caractéristique biométrique n’est mesurée ni gabaritée. Le service ne crée pas de gabarit facial, n’identifie pas les visages, ne compare pas les visages et ne conserve pas de mesure biométrique. Les visages des autres personnes dans les médias soumis sont retirés avant l’enregistrement; ce retrait ne doit pas produire de gabarit biométrique conservé.

**Incidence de travail :** Selon cette conception, l’obligation de déclaration à la Commission d’accès à l’information n’est pas engagée parce qu’aucune caractéristique biométrique n’est mesurée ni gabaritée.

**Point de contrôle juridique — obligatoire :** Confirmer que l’implantation réelle du traitement de médias ne mesure pas, ne génère pas, ne transmet pas, ne conserve pas temporairement et ne permet pas à un fournisseur de conserver une caractéristique ou un gabarit biométrique. Confirmer le libellé juridique ci-dessus selon la technologie finale, les modalités des fournisseurs et le [texte québécois sur la protection des renseignements personnels](https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1). Si l’implantation change, arrêtez-vous et réévaluez avant tout essai ou lancement.

## 8. Rôles et responsabilité

| Rôle | Personne ou organisation désignée | Responsabilités | Indépendance / conflits |
|---|---|---|---|
| Exploitant légal | `[entité]` | Décide des fins et des moyens; finance la conformité | `[à compléter]` |
| Personne responsable de la protection des renseignements personnels | `[nom]` | Approuve les communications, gère les escalades, rend compte à la direction | Doit avoir l’autorité et un contact public |
| Responsable produit | `[nom]` | Maintient le produit dans les fins approuvées | Ne peut pas élargir silencieusement le périmètre |
| Responsable sécurité | `[nom]` | Accès, clés, journalisation, réponse aux incidents | `[à compléter]` |
| Intendant des données | `[nom]` | Inventaire, conservation, preuves de suppression | `[à compléter]` |
| Conseiller juridique indépendant au Québec | `[cabinet / avocat]` | Révision juridique et avis documenté | Indépendant de la livraison des fonctions |
| Petit conseil de surveillance | `[membres / charte]` | Examine les changements à risque élevé et les plaintes non réglées | Aucun veto commercial sur le responsable vie privée |

Définir l’escalade vers la personne responsable et le conseil, les droits de décision, la fréquence des réunions, les conflits et une procédure de changement du produit.

## 9. Registre des risques

| Risque | Scénario | Risque initial | Mesures d’atténuation | Risque résiduel | Responsable | Preuves / déclencheur |
|---|---|---:|---|---:|---|---|
| Une personne est identifiée par une sortie | Une recherche ou l’interface expose une personne | Élevé | Aucune requête qui retourne une personne; totaux arrondis; suite de tests | `[évaluer]` | Produit | `[test]` |
| Suivi en arrière-plan | L’app ou une trousse recueille au-delà de l’utilisation active | Élevé | Refus de « en tout temps »; contrôles d’autorisations; revue des trousses | `[évaluer]` | Ingénierie | `[test]` |
| Le traitement de visages devient biométrique | Un fournisseur conserve des gabarits ou mesures | Élevé | Aucun service biométrique; interdiction contractuelle; revue technique; refus en cas d’incertitude | `[évaluer]` | Sécurité | `[preuve fournisseur]` |
| Un média montre une personne de passage | Le retrait des visages manque un visage | Élevé | Porte avant enregistrement; règles de QA humaine/automatisée; voie de retrait | `[évaluer]` | Exploitation | `[test]` |
| La portée du consentement s’élargit | L’interface ou le serveur réutilise une ancienne autorisation | Élevé | Lien obligatoire fin/public/écran; expiration 12 mois; contrôles du registre | `[évaluer]` | Produit | `[test]` |
| Le retrait ne se propage pas | Une copie CDN, de sauvegarde ou fournisseur demeure | Élevé | Orchestration de retrait; reçus; calendrier de sauvegarde; registre d’exception | `[évaluer]` | Ingénierie | `[exercice]` |
| Accès ou transfert hors périmètre | Soutien, télémétrie ou fournisseur traite hors du périmètre prévu | Élevé | Inventaire des flux; contrôles de région; revue fournisseur | `[évaluer]` | Sécurité | `[révision]` |
| Information erronée sur un établissement | Une page publique est désuète ou mal attribuée | Moyen | Lien de source, voie de correction, actualisation de nuit, droit de retrait | `[évaluer]` | Contenu | `[échantillon]` |
| Un mineur apparaît dans un média | Un utilisateur soumet un média montrant un mineur | Élevé | Règle hors périmètre, file de retrait/révision, processus de signalement | `[évaluer]` | Exploitation | `[test]` |
| Le journal de vérification révèle de l’information | Le journal lisible par un abonné expose un autre utilisateur | Moyen | Vue par abonné, masquage, tests d’accès | `[évaluer]` | Sécurité | `[test]` |

Utiliser une échelle de risque documentée. Un risque résiduel « élevé », une mesure non testée ou tout nouvel élément de données personnelles bloque le lancement jusqu’à une décision écrite de la personne responsable et du conseiller juridique.

## 10. Approbation du risque résiduel

**Aucun lancement tant que tous les champs obligatoires ne sont pas remplis.**

| Approbation | Nom | Décision | Date | Conditions / risques ouverts |
|---|---|---|---|---|
| Personne responsable de la protection des renseignements personnels | `[nom]` | `[approuver / refuser]` | `[date]` | `[texte]` |
| Responsable sécurité | `[nom]` | `[approuver / refuser]` | `[date]` | `[texte]` |
| Responsable produit | `[nom]` | `[approuver / refuser]` | `[date]` | `[texte]` |
| Conseiller juridique indépendant au Québec | `[nom]` | `[avis / conditions]` | `[date]` | `[texte]` |
| Conseil de surveillance | `[présidence]` | `[approuver / refuser]` | `[date]` | `[texte]` |
