@echo off
REM =============================================================================
REM SCRIPT DE DÉPLOIEMENT AUTOMATIQUE - TALENT AGENCY MARKETPLACE (Windows)
REM =============================================================================

setlocal enabledelayedexpansion

echo 🚀 DÉPLOIEMENT - Talent & Agency Marketplace
echo ==========================================

REM Vérifications pré-déploiement
echo 📋 Vérifications pré-déploiement...

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% OK

REM Vérifier npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm n'est pas installé
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% OK

REM Nettoyage de l'environnement
echo 🧹 Nettoyage de l'environnement...

REM Supprimer les anciens logs
if exist "logs" (
    del /q logs\* >nul 2>&1
    echo 🗑️ Logs supprimés
)

REM Supprimer les anciens uploads (développement uniquement)
if not "%NODE_ENV%"=="production" (
    if exist "uploads" (
        del /q uploads\* >nul 2>&1
        echo 🗑️ Uploads supprimés (mode développement)
    )
)

REM Supprimer la base de données SQLite (développement uniquement)
if not "%NODE_ENV%"=="production" (
    if exist "database.sqlite" (
        del database.sqlite >nul 2>&1
        echo 🗑️ Base de données SQLite supprimée (mode développement)
    )
)

REM Installation des dépendances
echo 📦 Installation des dépendances...
npm ci --production=false

if errorlevel 1 (
    echo ❌ Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)

REM Création des dossiers nécessaires
echo 📁 Création des dossiers nécessaires...

if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "backups" mkdir backups

echo ✅ Dossiers créés

REM Vérification du fichier .env
echo 🔧 Vérification des variables d'environnement...

if not exist ".env" (
    echo ⚠️ Fichier .env manquant
    echo 📝 Création à partir de .env.example...
    
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✅ .env créé à partir de .env.example
        echo ⚠️ N'oubliez pas de modifier les valeurs dans .env !
    ) else (
        echo ❌ .env.example manquant
        pause
        exit /b 1
    )
) else (
    echo ✅ Fichier .env trouvé
)

REM Démarrage du serveur
echo 🚀 Démarrage du serveur...

if "%NODE_ENV%"=="production" (
    echo 🏭 Mode production
    set NODE_ENV=production
    start /B npm start
) else (
    echo 🛠️ Mode développement
    start /B npm start
)

REM Attendre que le serveur démarre
echo ⏳ Attente du démarrage du serveur...
timeout /t 5 /nobreak >nul

REM Test de santé du serveur
echo 🏥 Test de santé du serveur...

curl -f http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo ⏳ Le serveur démarre...
    timeout /t 5 /nobreak >nul
    
    curl -f http://localhost:3001/health >nul 2>&1
    if errorlevel 1 (
        echo ❌ Le serveur n'a pas pu démarrer correctement
        pause
        exit /b 1
    )
)

echo ✅ Serveur démarré avec succès !

REM Affichage des informations finales
echo.
echo 🎉 DÉPLOIEMENT RÉUSSI !
echo ==========================================
echo 🌐 Serveur: http://localhost:3001
echo 🏥 Health: http://localhost:3001/health
echo 📊 Dashboard: http://localhost:3001/dashboard
echo 👤 Profile: http://localhost:3001/profile
echo ⚙️ Settings: http://localhost:3001/settings
echo.
echo 📝 Logs en temps réel:
echo    npm run logs
echo.
echo 🔄 Pour redémarrer:
echo    taskkill /F /IM node.exe && npm start
echo.
echo 🧹 Pour nettoyer:
echo    npm run clean
echo.

if "%NODE_ENV%"=="production" (
    echo 🏭 MODE PRODUCTION - Ne pas oublier:
    echo    - Configurer les variables d'environnement de production
    echo    - Mettre en place le monitoring
    echo    - Configurer les backups
    echo    - Mettre à jour le DNS
) else (
    echo 🛠️ MODE DÉVELOPPEMENT - Pour passer en production:
    echo    set NODE_ENV=production && npm run prod:start
)

echo.
echo ✨ Bon développement ! ✨
echo.
echo Appuyez sur une touche pour ouvrir le site dans le navigateur...
pause >nul
start http://localhost:3001

pause
