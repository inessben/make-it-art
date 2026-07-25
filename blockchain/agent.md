## Génération automatique de wallet 

Je souhaite ajouter à la marketplace une fonctionnalité de création automatique de wallet lors de l’inscription d’un utilisateur.

Tu connais déjà le projet, sa stack, son architecture, son système d’authentification, ses modèles de données et ses conventions de code. Commence donc par analyser l’existant avant de proposer ou d’implémenter quoi que ce soit.

## Contexte fonctionnel

La marketplace permet à des artistes de vendre des œuvres numériques.

Actuellement :

* les œuvres sont enregistrées uniquement dans la base de données ;
* elles ne sont pas encore enregistrées sur une blockchain ;
* seuls les artistes peuvent publier des œuvres ;
* les acheteurs peuvent acheter une œuvre directement ou passer par un panier ;
* les utilisateurs peuvent supprimer leur compte.

Je souhaite faciliter l’accès à la blockchain pour les utilisateurs qui n’ont aucune connaissance technique.

Lors de l’inscription, un wallet doit pouvoir être créé automatiquement, sans demander à l’utilisateur d’installer MetaMask ou de comprendre le fonctionnement de la blockchain.

## Objectif principal

Créer un système permettant :

* de générer automatiquement un wallet à l’inscription ;
* d’associer ce wallet au compte utilisateur ;
* d’afficher le wallet dans le profil ;
* de permettre plus tard l’achat ou la réception d’actifs numériques ;
* de permettre également la connexion d’un wallet externe ;
* de conserver une expérience simple pour un utilisateur non initié.

Le wallet automatique ne doit pas obligatoirement être considéré comme le wallet principal du compte.

L’utilisateur devra pouvoir choisir ultérieurement entre :

* son wallet automatique ;
* un wallet externe qu’il aura connecté ;
* éventuellement plusieurs wallets si l’architecture le permet proprement.

## Contraintes importantes

Le modèle doit rester strictement non custodial.

La plateforme ne doit jamais :

* avoir accès à la clé privée complète d’un utilisateur ;
* stocker une clé privée dans la base de données ;
* stocker une seed phrase ;
* pouvoir signer une transaction seule au nom de l’utilisateur ;
* pouvoir déplacer les fonds ou actifs d’un utilisateur sans son consentement ;
* conserver les fonds ou crypto-actifs des utilisateurs ;
* créer une architecture reposant sur un wallet central contenant les actifs de plusieurs utilisateurs.

Chaque opération sensible devra être validée directement par l’utilisateur.

La plateforme ne doit stocker que les informations publiques et techniques strictement nécessaires, par exemple :

* l’adresse publique ;
* le type de wallet ;
* le fournisseur utilisé ;
* le réseau ;
* le statut du wallet ;
* la date de création ;
* les informations nécessaires pour associer le wallet au compte.

Ne stocke aucun secret cryptographique permettant de contrôler le wallet.

## Choix du fournisseur

Je ne souhaite pas imposer un fournisseur précis.

Analyse les solutions disponibles pour les wallets embarqués ou embedded wallets et propose la solution :

* la moins coûteuse possible ;
* fiable ;
* non custodial ;
* adaptée à une marketplace ;
* simple à intégrer dans le projet existant ;
* compatible avec la création automatique à l’inscription ;
* compatible avec une connexion par e-mail, compte social ou passkey si pertinent ;
* permettant une récupération de compte sécurisée ;
* permettant idéalement l’export du wallet ;
* permettant la connexion future d’un wallet externe ;
* adaptée à une montée en charge progressive ;
* sans dépendance excessive ou verrouillage technique difficile à supprimer.

Compare brièvement les options pertinentes avant de choisir.

Pour chaque solution analysée, vérifie au minimum :

* la tarification réelle ;
* les limites du plan gratuit ;
* le coût après dépassement ;
* le modèle de conservation des clés ;
* la méthode de récupération ;
* les possibilités d’export ;
* les restrictions liées aux réseaux compatibles ;
* les possibilités de migration ;
* les risques de dépendance au fournisseur ;
* les fonctionnalités qui pourraient entraîner des frais supplémentaires.

Ne choisis pas uniquement la solution la plus simple à développer. Choisis le meilleur compromis entre coût, fiabilité, sécurité, expérience utilisateur et évolutivité.

## Parcours d’inscription attendu

Lors de l’inscription :

1. le compte utilisateur est créé normalement ;
2. la création du wallet est déclenchée ;
3. le wallet est associé au compte ;
4. l’adresse publique est enregistrée ;
5. l’utilisateur reçoit une confirmation simple ;
6. un échec de création du wallet ne doit pas rendre le compte inutilisable.

La création du wallet ne doit pas bloquer ou casser l’inscription entière si le fournisseur externe rencontre une erreur.

Prévois donc une gestion robuste des statuts, par exemple :

* création en attente ;
* wallet créé ;
* échec de création ;
* nouvelle tentative nécessaire ;
* wallet désactivé ou dissocié si applicable.

Le processus doit être idempotent : une nouvelle tentative ne doit jamais créer plusieurs wallets automatiquement par erreur pour un même événement d’inscription.

## Expérience utilisateur

L’utilisateur ne doit pas être confronté à du vocabulaire blockchain inutile.

Évite dans l’interface principale :

* seed phrase ;
* clé privée ;
* gas ;
* RPC ;
* chain ID ;
* mint ;
* calldata ;
* signature cryptographique.

Utilise plutôt des formulations simples comme :

* portefeuille numérique ;
* adresse du portefeuille ;
* confirmer ;
* acquisition ;
* collection ;
* transaction en cours ;
* opération confirmée ;
* connecter un portefeuille externe.

Dans le profil utilisateur, ajoute une section dédiée permettant au minimum :

* d’afficher l’adresse publique ;
* de copier l’adresse ;
* d’identifier le type de wallet ;
* de savoir s’il s’agit du wallet automatique ou d’un wallet externe ;
* de consulter son statut ;
* d’accéder à l’explorateur blockchain si pertinent ;
* de connecter un wallet externe ;
* de choisir éventuellement un wallet à utiliser pour une action ;
* d’accéder aux options de sécurité et de récupération proposées par le fournisseur.

Le wallet automatique ne doit pas être présenté comme obligatoire ou comme l’unique wallet du compte.

## Suppression du compte

Les utilisateurs peuvent supprimer leur compte.

C’est un point critique : un wallet blockchain ne peut pas réellement être supprimé comme une ligne dans une base de données.

Conçois le comportement le plus sûr possible.

Lors d’une demande de suppression de compte :

* ne supprime jamais un wallet contenant potentiellement des actifs sans avertissement ;
* ne détruis jamais les moyens de récupération sans validation explicite ;
* vérifie si le fournisseur permet l’export ou la récupération indépendante ;
* informe clairement l’utilisateur des conséquences ;
* propose, lorsque cela est possible, l’export ou le transfert des actifs avant suppression ;
* dissocie les données de la marketplace du wallet uniquement lorsque cela est sûr ;
* anonymise les données personnelles selon le fonctionnement actuel du projet ;
* conserve uniquement les informations nécessaires pour les obligations techniques ou légales ;
* ne conserve aucun moyen de contrôle sur le wallet après suppression du compte.

Propose un parcours adapté selon plusieurs cas :

1. wallet vide ;
2. wallet contenant des actifs ;
3. wallet non encore activé ;
4. wallet externe connecté ;
5. utilisateur n’ayant plus accès à son moyen d’authentification ;
6. échec du fournisseur pendant la suppression.

Explique précisément ce qui peut être supprimé, dissocié, anonymisé ou conservé.

Ne présente pas le wallet comme techniquement supprimé si seule l’association avec le compte est supprimée.

## Architecture fonctionnelle attendue

Ne suppose pas qu’un utilisateur ne peut avoir qu’un seul wallet.

Prévois une modélisation permettant, si cela reste cohérent avec l’architecture existante :

* un utilisateur ;
* zéro, un ou plusieurs wallets ;
* un wallet automatique ;
* un ou plusieurs wallets externes ;
* un type ou une origine de wallet ;
* un statut ;
* éventuellement un wallet sélectionné pour certaines opérations ;
* une distinction entre wallet actif, dissocié ou désactivé.

Ne modifie pas inutilement les modèles existants. Propose d’abord les changements nécessaires et leur impact.

## Fiabilité et sécurité

L’implémentation doit gérer :

* les doubles appels ;
* les doubles inscriptions ;
* les erreurs réseau ;
* les timeouts du fournisseur ;
* les interruptions pendant l’inscription ;
* les comptes créés sans wallet ;
* les wallets créés mais non enregistrés localement ;
* les incohérences entre le fournisseur et la base de données ;
* les tentatives d’association d’un wallet à plusieurs comptes ;
* les changements de compte chez le fournisseur ;
* les erreurs de récupération ;
* les connexions simultanées ;
* la révocation ou la dissociation d’un wallet externe.

Toutes les opérations doivent être authentifiées et autorisées côté serveur.

Ne fais jamais confiance à une adresse publique transmise uniquement par le frontend sans preuve ou vérification adaptée.

Pour la connexion d’un wallet externe, utilise une signature de challenge avec :

* nonce unique ;
* durée de validité courte ;
* vérification côté serveur ;
* protection contre le rejeu ;
* association explicite au compte connecté.

Prévois des logs techniques sans jamais y inscrire de secrets, de tokens sensibles ou de données cryptographiques privées.

## Coût

Le budget est une priorité importante.

Avant l’implémentation :

* estime les coûts du fournisseur choisi ;
* identifie les fonctionnalités gratuites ;
* précise ce qui devient payant ;
* identifie les coûts liés au nombre d’utilisateurs, de wallets, de connexions ou de transactions ;
* évite les services payants inutiles pour le MVP ;
* privilégie une solution avec un coût initial très faible ;
* évite une architecture qui coûterait cher dès que le nombre d’utilisateurs augmente légèrement.

Propose une version MVP peu coûteuse ainsi qu’une trajectoire réaliste pour la production.

## Périmètre actuel

Pour cette première fonctionnalité, concentre-toi sur :

* la génération automatique du wallet à l’inscription ;
* l’association sécurisée au compte ;
* l’affichage dans le profil ;
* la gestion des statuts et erreurs ;
* la connexion future ou immédiate d’un wallet externe selon ce qui est raisonnable ;
* la suppression ou dissociation sécurisée lors de la suppression du compte ;
* la préparation de l’architecture pour les futurs achats blockchain.

Ne transforme pas immédiatement toutes les œuvres existantes en actifs blockchain.

Ne crée pas encore un système complet de NFT, de tokenisation ou de paiement crypto sauf si une petite abstraction est nécessaire pour préparer proprement la suite.

Les œuvres doivent continuer à fonctionner avec le système actuel basé sur la base de données.

## Qualité attendue

Les priorités sont équivalentes :

* sécurité ;
* expérience utilisateur ;
* évolutivité ;
* performance.

Je veux une implémentation propre, robuste et maintenable.

Respecte :

* l’architecture existante ;
* les conventions du projet ;
* le système d’authentification déjà en place ;
* les règles de validation existantes ;
* la structure des services et composants ;
* les conventions de gestion des erreurs ;
* les pratiques de tests déjà utilisées.

Évite :

* les fichiers trop volumineux ;
* la duplication ;
* les responsabilités mélangées ;
* les appels directs au fournisseur dispersés partout dans l’application ;
* les valeurs codées en dur ;
* les secrets exposés côté client ;
* les dépendances inutiles ;
* le refactoring global sans justification.

Crée une couche d’abstraction dédiée au fournisseur de wallet afin de permettre un changement futur de prestataire sans réécrire toute l’application.

Par exemple, le reste du projet ne devrait pas dépendre directement de méthodes propres à un fournisseur précis.

## Méthode de travail obligatoire

Avant d’écrire le code :

1. analyse le projet existant ;
2. identifie le parcours d’inscription actuel ;
3. identifie le système d’authentification ;
4. identifie les modèles utilisateurs ;
5. identifie le parcours de suppression de compte ;
6. identifie les composants du profil ;
7. vérifie les environnements de développement et de production ;
8. analyse les fournisseurs compatibles avec l’existant ;
9. propose une recommandation argumentée ;
10. liste les fichiers et modèles qui devront être modifiés ;
11. présente les risques éventuels ;
12. propose un plan d’implémentation progressif.

Ne commence pas immédiatement par générer du code.

Présente d’abord :

* ton analyse de l’existant ;
* les options possibles ;
* ton choix recommandé ;
* les raisons du choix ;
* l’impact sur l’architecture ;
* les coûts estimés ;
* les risques ;
* le plan d’implémentation.

Après cette analyse, implémente la fonctionnalité progressivement.

## Tests attendus

Ajoute les tests pertinents selon les outils déjà utilisés dans le projet.

Teste au minimum :

* inscription avec création réussie ;
* inscription avec échec du fournisseur ;
* nouvelle tentative ;
* prévention de la création multiple ;
* profil avec wallet ;
* profil sans wallet ;
* connexion d’un wallet externe ;
* rejet d’une signature invalide ;
* rejet d’un nonce expiré ;
* suppression d’un compte avec wallet vide ;
* suppression d’un compte avec actifs potentiels ;
* incohérence entre la base et le fournisseur ;
* indisponibilité temporaire du fournisseur ;
* absence de secrets dans les réponses API ;
* absence de clé privée dans la base de données.

## Livrables attendus

À la fin, fournis :

* le résumé de l’architecture retenue ;
* le fournisseur choisi et les raisons ;
* les coûts connus ou estimés ;
* la liste des changements réalisés ;
* les migrations de base de données ;
* les variables d’environnement nécessaires ;
* les étapes de configuration du fournisseur ;
* les règles de sécurité appliquées ;
* les tests ajoutés ;
* la procédure de récupération ;
* la procédure de suppression ou dissociation ;
* les limitations du MVP ;
* les recommandations pour la future intégration des achats blockchain.

Ne prétends jamais qu’un wallet blockchain est supprimé lorsque seule son association à la marketplace a été supprimée.

En cas de doute sur le modèle de conservation des clés, la récupération, l’export ou la capacité de la plateforme à signer une transaction, arrête l’implémentation et signale clairement le risque avant de continuer.
