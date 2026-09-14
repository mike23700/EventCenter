// Point d'entrée attendu par cPanel "Setup Node.js App" (Phusion Passenger).
// Le code réel est en TypeScript compilé dans dist/ (npm run build avant déploiement).
require('./dist/index.js');
