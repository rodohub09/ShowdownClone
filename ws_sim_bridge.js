const WebSocket = require('ws');
const fs = require('fs');

// 1. DETECCIÓN DEL MOTOR
let BattleStream;
try {
    BattleStream = require('./.sim-dist/battle-stream').BattleStream;
} catch (e) {
    try {
        BattleStream = require('./dist/sim/battle-stream').BattleStream;
    } catch (e2) {
        console.error("❌ ERROR: No encuentro 'battle-stream'.");
        process.exit(1);
    }
}

const PORT = 8080; 
const FORMAT = 'gen9customgame'; // <--- CAMBIO IMPORTANTE
const wss = new WebSocket.Server({ port: PORT });

// Equipo de prueba para la CPU (Formato Packed)
// (Un Pikachu y un Charizard básicos)
const CPU_TEAM = "Pikachu||lightball|static|thunderbolt,volttackle,ironlovetail,fakeout|Hardy|,252,,,4,252|||||]Charizard||lifeorb|blaze|flamethrower,hurricane,focusblast,roost|Timid|,4,,,252,252|||||";

console.log(`🔥 Backend CUSTOM GAME listo en puerto ${PORT}`);

wss.on('connection', (ws) => {
    console.log('📱 Cliente conectado. Esperando equipo...');
    const stream = new BattleStream();
    let battleStarted = false;

    // Bucle de lectura del motor
    (async () => {
        for await (const chunk of stream) {
            ws.send(chunk); 
            
            // IA BÁSICA (Para que la CPU responda)
            if (chunk.includes('sideupdate\np2\n|request|')) {
                try {
                    const parts = chunk.split('sideupdate\np2\n|request|');
                    if (parts.length > 1) {
                        const jsonStr = parts[1].split('\n')[0];
                        const req = JSON.parse(jsonStr);
                        if (req.active) {
                            const move = Math.floor(Math.random() * 4) + 1;
                            stream.write(`>p2 move ${move}`);
                        } else if (req.forceSwitch) {
                            stream.write('>p2 switch 2');
                        }
                    }
                } catch (err) {}
            }
        }
    })();

    // Bucle de escritura (Desde el cliente)
    ws.on('message', (message) => {
        const msg = message.toString();

        // DETECTAR COMANDO ESPECIAL DE INICIO
        if (msg.startsWith('LOGIN|')) {
            if (battleStarted) return; // Ya empezó, ignorar
            
            const userTeam = msg.replace('LOGIN|', ''); // Extraer equipo
            console.log("⚔️ Recibido equipo del usuario. Iniciando batalla...");
            
            stream.write(`>start {"formatid":"${FORMAT}"}`);
            stream.write(`>player p1 {"name":"Entrenador", "team":"${userTeam}"}`);
            stream.write(`>player p2 {"name":"RivalCPU", "team":"${CPU_TEAM}"}`);
            battleStarted = true;
        } else {
            // Si no es login, es un comando normal de batalla (>p1 move 1)
            stream.write(msg);
        }
    });
});
