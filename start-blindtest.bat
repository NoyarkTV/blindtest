@echo off
echo 🚀 Lancement du serveur Node.js...
start powershell -NoExit -Command "cd 'G:\UTC\Travail Asso\Z fin\Photoshop\Jeu Blindtest\Projet\blindtest\server'; node index.js"

timeout /t 2

echo 🌐 Connexion au tunnel localhost.run...
start powershell -NoExit -Command "ssh -i $env:USERPROFILE\.ssh\id_rsa -R 80:localhost:8888 localhost.run"
