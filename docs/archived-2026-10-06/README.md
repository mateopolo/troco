# 📦 Archives Documentaires — 6 Octobre 2026

Ce dossier contient les fichiers de documentation, audits, rapports d'incidents et notes techniques déplacés lors de l'opération d'assainissement documentaire `[CLEANUP-04]`.

## 🎯 Raison de l'archivage
- **Suppression des doublons et des risques de désynchronisation :** Plusieurs rapports d'audit historiques existaient simultanément à la racine du projet, dans `docs/` et dans `docs/audits-archived/`.
- **Économie de tokens & Clarté cognitive :** Réduire la charge documentaire redondante pour les futures sessions IA et pour les développeurs.
- **Source unique de vérité :** Toutes les directives actives, le suivi des correctifs, la conformité légale et la feuille de route produit sont désormais centralisés et maintenus dans [`MASTER_AUDIT.md`](../../MASTER_AUDIT.md) et complétés par [`CONTEXT.md`](../../CONTEXT.md).

## 🗂️ Contenu archivé
1. **Doublons racine & docs :** Audits historiques (`GLOBAL_ARCHITECTURE_AUDIT.md`, `PERFORMANCE_AUDIT*.md`, `AUDIT-00-REPORT.md`, `AUDIT-STRUCTURE.md`, etc.) dont des copies de référence sont conservées dans `docs/audits-archived/`.
2. **Notes de correctifs résolus & Post-mortems :** `HOTFIX-01.md`, `HOTFIX-02.md`, `HOTFIX-04.md`, `HOTFIX-05.md`, `INCIDENT-POST-MORTEM.md`.
3. **Procédures de tests ponctuelles :** `TEST-P0-MOD.md`, `TEST-P0-FIN-03.md`, `TEST-P0-SEC-05.md` (consolidées dans [`docs/TESTING.md`](../TESTING.md)).
4. **Guides ponctuels & Bibles dépassées :** `MIGRATION-PARTICIPANTS.md`, `CODEBASE-BIBLE.md`, `CORS-SETUP.md`, `MONITORING.md` (intégrés dans l'annexe de `MASTER_AUDIT.md`).
5. **README satellites :** `README-APPCHECK.md`, `README-DEMO.md`, `README-RULES.md` (intégrés dans `MASTER_AUDIT.md`).
6. **Snapshots historiques Graphify :** Anciens snapshots du 28/09 et du 29/09 archivés sous `graphify-snapshots/`.
