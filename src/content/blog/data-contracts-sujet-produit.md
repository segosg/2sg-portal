---
title: "Les data contracts ne sont pas un sujet technique"
subtitle: "Ce sont les engagements produit que vos équipes refusent encore d'écrire."
date: 2026-05-20
status: published
---

On a installé l'idée que les data contracts sont une affaire d'ingénieurs. Une histoire de fichiers YAML, de schémas Avro, de validation en CI/CD et de checks dans le pipeline. Une discipline interne à la stack data.

C'est une lecture appauvrie de l'objet.

La définition technique fait pourtant consensus. Un contrat formalise des engagements portant sur un schéma, des règles de qualité, des délais de mise à jour garantis, une sémantique métier, et une politique d'évolution.

Mais le mot clé n'est pas technique. C'est *engagement*.

Or un engagement n'est pas une ligne de code. C'est une décision. Qui s'engage, sur quoi, envers qui, et avec quel coût en cas de rupture ? C'est exactement la grammaire du product management.

## Pourquoi le PM est concerné

Prenez n'importe quelle dimension d'un contrat. Chacune déclenche une conversation produit.

Le **schéma** détermine ce que les consommateurs peuvent attendre. Renommer une colonne, c'est rompre une promesse, même si la donnée existe encore sous une autre forme.

Les **SLA** sont des engagements de service au sens littéral. Promettre que les chiffres du jour sont consolidés à 7h implique une infrastructure dimensionnée, un budget d'incident, et une astreinte. Ce n'est pas une configuration technique, c'est un choix d'investissement.

La **sémantique** est l'endroit où se logent les pires malentendus. Si `revenue` désigne le chiffre d'affaires TTC pour la finance et le HT pour le marketing, vous n'avez pas un problème de qualité de donnée. Vous avez deux produits qui partagent un nom sans partager une définition. Aucun outil de monitoring ne le résoudra. Seule une décision produit le fera.

Le **versioning** arbitre entre vitesse et stabilité. Maintenir une ancienne table pendant 90 jours pour laisser le temps aux équipes de migrer a un coût — en ressources, en code mort, en attention. C'est un arbitrage produit.

Aucune de ces décisions ne peut être prise sérieusement par une équipe technique seule. Elles relèvent toutes du design appliqué à la donnée.

## Le moment où ça craque (version 2026)

À l'ère des dashboards, un changement de schéma non communiqué faisait exploser six rapports internes. C'était pénible, mais gérable par quelques analystes en urgence le lundi matin.

Aujourd'hui, vos consommateurs ne sont plus seulement humains. Ce sont aussi des agents autonomes et des LLMs branchés sur votre production. Quand le consommateur n'est plus humain, la nature du dommage change.

Un agent qui interroge une table modifiée silencieusement ne sait pas qu'il a un problème. Il continue. Il consomme une colonne mal typée, ou dont le sens a changé, et il produit des résultats faux qui ont l'air normaux.

Trois exemples concrets, par gravité croissante.

Un assistant interne reçoit des blocs de données dégradés. Au lieu d'admettre l'incohérence, le modèle comble les trous avec quelque chose de plausible. Les équipes prennent des décisions à partir de réponses inventées, sans le savoir.

Un agent de scoring automatique tourne sur une table où `transaction_amount` est passé de centimes à euros sans préavis. Pendant 48 heures, il bloque des transactions légitimes — ou valide ce qu'il aurait dû bloquer.

Une migration en amont ajoute un champ contenant des données personnelles non anonymisées. L'agent l'absorbe, l'inclut dans son contexte, le réécrit dans des logs partagés. L'exposition est découverte trois semaines plus tard.

Le diagnostic post-mortem se concentre presque toujours sur la cause technique apparente : valider le schéma en CI, ajouter des garde-fous au modèle, déployer un schema registry. Ces propositions sont justes. Elles ne touchent pas le vrai problème.

Le vrai problème, c'est qu'une décision produit a été prise par une équipe qui n'avait pas conscience d'en prendre une. Faute d'un espace de décision partagé, le contrat n'existait pas comme objet politique. Seulement comme fichier — ou comme rien du tout.

## Le data contract dans une approche Product-Driven Data

J'appelle *Product-Driven Data* l'approche qui traite chaque dataset comme un produit, et son contrat comme un cahier des charges écrit conjointement par celui qui produit la donnée et celui qui la consomme. Ce n'est pas un framework. C'est un déplacement du centre de gravité : on cesse de regarder le contrat depuis la pipeline, on le regarde depuis l'usage.

Trois pratiques en découlent. Aucune ne dépend d'un outil.

**L'atelier de design initial.** Avant d'écrire la moindre ligne de configuration, le PM du domaine et le data engineer répondent ensemble à trois questions. Qui consomme cette donnée ? Quel usage en fait-il ? Que se passe-t-il si elle arrive en retard, ou différente de ce qui est promis ? La traduction technique vient après. Jamais avant.

**La modification comme release.** Faire évoluer un contrat n'est pas une validation de pull request. C'est une mise à jour produit. Elle exige une note de version, une fenêtre de dépréciation, et un protocole de notification. Aucun engagement ne se modifie unilatéralement.

**Le pilotage de la dépréciation.** Une organisation doit savoir, à tout moment, quelles versions de ses contrats sont en cours de retrait, selon quel calendrier, avec quelles dépendances aval. Sans cette visibilité, on ne gère pas ses données, on les subit. La roadmap de dépréciation appartient à la roadmap produit. Pas à un fichier oublié quelque part dans Confluence.

## Qui décide ?

La standardisation de l'outillage a réglé la question de la forme. On sait désormais comment écrire et valider un contrat.

La question qui reste ouverte est politique : qui décide de ce qu'on y écrit ?

Tant qu'elle reste confinée aux équipes d'ingénierie, le data contract sera une optimisation parmi d'autres. Utile, mais marginale. C'est en la plaçant explicitement sur la table du product management qu'on en fait une discipline.

Et qu'on évite qu'un modèle en production ne prenne des décisions critiques sur des fondations mouvantes.