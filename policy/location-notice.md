# Location Notice / Avis sur la localisation

> **Draft for review by Québec counsel.** This optional feature is not built as background tracking.
>
> **Brouillon à faire réviser par un conseiller juridique du Québec.** Cette fonction facultative n’est pas conçue comme un suivi en arrière-plan.

---

# EN — Location sharing means one of two things

## 1. While the app is open

This means the app may ask the device for a location only while you are actively using the relevant app screen. It does not mean “all day.” It stops when you close the app or leave that feature. We do not ask for background permission for this option.

What is retained: a rounded area, not a precise point, and a coarse time bucket, not a detailed timestamp. The exact rounding level and bucket length must be displayed in the app before you agree and approved by Québec counsel before launch.

What is never retained: a route, track, path, ordered sequence of locations, address-level location, stay duration at an address, or background location history.

## 2. Always

For this wireframe, **“always” location sharing is not offered**. The system refuses it because continuous or background collection would create a tracking risk that the design does not need.

If the product later proposes an “always” option, it is a new feature. It cannot rely on this notice or on an earlier choice. It needs a new privacy assessment, a new consent screen, and counsel review before any build or test involving real people.

## What the system does with the rounded area

The system may use the rounded area and coarse time bucket only for the single purpose and audience shown before you choose. It must not use them to identify, find, follow, infer habits about, or return a person. No surface may answer a question about where a named or identifiable person is or was.

The optional anonymous presence feature adds one anonymous “+1” to a rounded street count. It does not create a profile of you or store a visit history.

## Retention and deletion

The service target is to delete the retained rounded-area event within **24 hours** of collection, unless it has already been converted into a non-personal rounded aggregate that cannot reasonably be tied back to you. A consent and deletion audit record may remain as described in the [Consent Notice](consent-notice.md).

You can revoke location sharing in one action in the same app surface. Revocation stops new collection immediately in the service. We target removal of ordinary retained location events within 24 hours. Québec counsel must confirm the final retention schedule, the definition of a non-personal aggregate, and any statutory preservation exception.

## You stay in control

You can use the basic service without location sharing. Turning it off must not take away the basic service. You can also use [Removal and Access Requests](removal-and-access-requests.md).

---

# FR — Le partage de localisation peut vouloir dire deux choses

## 1. Lorsque l’app est ouverte

Cela veut dire que l’app peut demander la position de l’appareil seulement pendant que vous utilisez activement l’écran concerné. Cela ne veut pas dire « toute la journée ». La collecte s’arrête quand vous fermez l’app ou quittez cette fonction. Nous ne demandons pas l’autorisation de localisation en arrière-plan pour cette option.

Ce qui est conservé : une zone arrondie, et non un point précis, ainsi qu’une période de temps approximative, et non une heure détaillée. Le niveau d’arrondi et la durée de la période doivent être affichés dans l’app avant votre accord et approuvés par un conseiller juridique du Québec avant le lancement.

Ce qui n’est jamais conservé : un trajet, une trace, un parcours, une suite ordonnée de positions, une localisation à l’adresse près, une durée de présence à une adresse ou un historique de localisation en arrière-plan.

## 2. En tout temps

Dans cette maquette, le partage de localisation **« en tout temps » n’est pas offert**. Le système le refuse parce qu’une collecte continue ou en arrière-plan créerait un risque de suivi dont la conception n’a pas besoin.

Si le produit propose plus tard une option « en tout temps », il s’agira d’une nouvelle fonction. Elle ne pourra pas s’appuyer sur le présent avis ni sur un choix antérieur. Elle exigera une nouvelle évaluation des facteurs relatifs à la vie privée, un nouvel écran de consentement et une révision juridique avant tout développement ou essai avec de vraies personnes.

## Ce que le système fait de la zone arrondie

Le système peut utiliser la zone arrondie et la période de temps approximative seulement pour la fin et le public affichés avant votre choix. Il ne doit pas les utiliser pour identifier, trouver, suivre, déduire des habitudes sur une personne ou retourner une personne. Aucun écran ne peut répondre à une question sur l’endroit où une personne nommée ou identifiable se trouve ou s’est trouvée.

La fonction facultative de présence anonyme ajoute un seul « +1 » anonyme à un compte arrondi de la rue. Elle ne crée pas de profil sur vous et ne conserve pas d’historique de vos visites.

## Conservation et suppression

La cible du service est d’effacer l’événement de zone arrondie conservé dans les **24 heures** suivant sa collecte, sauf s’il a déjà été transformé en total arrondi non personnel qui ne peut raisonnablement pas être relié à vous. Une preuve de consentement et de suppression peut demeurer, comme l’explique l’[Avis de consentement](consent-notice.md).

Vous pouvez retirer le partage de localisation en une action dans le même écran de l’app. Le retrait arrête immédiatement toute nouvelle collecte dans le service. Nous visons le retrait des événements de localisation ordinaires conservés dans les 24 heures. Un conseiller juridique du Québec doit confirmer le calendrier final de conservation, la définition d’un total non personnel et toute exception de conservation prévue par la loi.

## Vous gardez le contrôle

Vous pouvez utiliser le service de base sans partager votre localisation. Le désactiver ne doit pas vous enlever le service de base. Vous pouvez aussi utiliser [Retrait et demandes d’accès](removal-and-access-requests.md).
