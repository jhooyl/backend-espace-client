import fs from 'fs';
import path, { join } from 'path'; 
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cron from 'node-cron';
import { exec } from 'child_process';
import mongoose from 'mongoose';
import dotenv from 'dotenv';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });
mongoose.connect(process.env.MONGO_URL);


// Configurer les logs
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
    }

const logFile = path.join(logDir, 'simulation.log');

// Rediriger console.log et console.error vers le fichier log
const log = fs.createWriteStream(logFile, { flags: 'a' });
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] INFO: ${message}\n`;
    log.write(formattedMessage);
    originalConsoleLog.apply(console, arguments);
};

console.error = function(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ERROR: ${message}\n`;
    log.write(formattedMessage);
    originalConsoleError.apply(console, arguments);
};



console.log('🕒 Service de simulation de consommation démarré');

// Planifier pour 11h
cron.schedule('0 11 * * *', () => {
    console.log('⏰ Exécution de la simulation du matin à 11h00');
    runSimulation();
});

// Planifier pour 16h
cron.schedule('0 16 * * *', () => {
    console.log('⏰ Exécution de la simulation du soir à 16h00');
    runSimulation();
});

function runSimulation() {
    const scriptPath = path.join(__dirname, 'simulateDailyUsage.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Erreur d'exécution: ${error}`);
        return;
    }
    
    console.log(`📊 Résultat de la simulation:\n${stdout}`);
    
    if (stderr) {
    console.error(`⚠️ Stderr: ${stderr}`);
    }
    });
}
    // Planifier pour minuit (gestion des abonnements)
    cron.schedule('0 0 * * *', () => {
        console.log('⏰ Exécution de la gestion des abonnements à minuit');
        runManageAbonnements();
    });
    
    function runManageAbonnements() {
        const scriptPath = path.join(__dirname,  'manageAbonnements.js');
        
        exec(`node ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erreur d'exécution: ${error}`);
            return;
        }
        
        console.log(`📊 Résultat de la gestion:\n${stdout}`);
        
        if (stderr) {
            console.error(`⚠️ Stderr: ${stderr}`);
        }
        });
    }
// Pour tester immédiatement sans attendre l'heure planifiée
// Décommentez la ligne suivante pour tester
// runSimulation();