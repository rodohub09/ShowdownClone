const WebSocket = require('ws');

// 1. DETECCIÓN DEL MOTOR
let BattleStream;
try {
    BattleStream = require('./.sim-dist/battle-stream').BattleStream;
} catch (e) {
    try {
        BattleStream = require('./dist/sim/battle-stream').BattleStream;
    } catch (e2) {
        console.error("❌ ERROR: No encuentro 'battle-stream'. Ejecuta 'node build'");
        process.exit(1);
    }
}

const PORT = 8080; 
const FORMAT = 'gen9customgame';
const wss = new WebSocket.Server({ port: PORT });

// Equipo de la CPU
const CPU_TEAM = "Pikachu||lightball|static|thunderbolt,volttackle,ironlovetail,fakeout|Hardy|,252,,,4,252|||||]Charizard||lifeorb|blaze|flamethrower,hurricane,focusblast,roost|Timid|,4,,,252,252|||||";

console.log(`🔥 Backend CUSTOM GAME (IA Mejorada) listo en puerto ${PORT}`);

wss.on('connection', (ws) => {
    console.log('📱 Cliente conectado.');
    const stream = new BattleStream();
    let battleStarted = false;

    (async () => {
        for await (const chunk of stream) {
            ws.send(chunk); 

            // --- IA DEL JUGADOR 2 (CPU) ---
            // Detectamos mensajes dirigidos a P2
            if (chunk.includes('sideupdate\np2\n|request|')) {
                try {
                    const parts = chunk.split('sideupdate\np2\n|request|');
                    if (parts.length > 1) {
                        const jsonStr = parts[1].split('\n')[0];
                        const req = JSON.parse(jsonStr);

                        // 1. ACEPTAR TEAM PREVIEW (La pieza que faltaba)
                        if (req.teamPreview) {
                            stream.write('>p2 team 123456');
                            console.log('🤖 CPU aceptó el Team Preview');
                        }
                        // 2. ATACAR
                        else if (req.active) {
                            const move = Math.floor(Math.random() * 4) + 1;
                            stream.write(`>p2 move ${move}`);
                            console.log(`🤖 CPU atacó con movimiento ${move}`);
                        } 
                        // 3. CAMBIAR POKEMON
                        else if (req.forceSwitch) {
                            stream.write('>p2 switch 2');
                            console.log('🤖 CPU cambió pokemon');
                        }
                    }
                } catch (err) {
                    // Ignorar errores de parsing parciales
                }
            }
        }
    })();

    ws.on('message', (message) => {
        const msg = message.toString();
        if (msg.startsWith('LOGIN|')) {
            if (battleStarted) return;
            const userTeam = msg.replace('LOGIN|', '');
            console.log("⚔️ Batalla iniciada.");
            stream.write(`>start {"formatid":"${FORMAT}"}`);
            stream.write(`>player p1 {"name":"Entrenador", "team":"${userTeam}"}`);
            stream.write(`>player p2 {"name":"RivalCPU", "team":"${CPU_TEAM}"}`);
            battleStarted = true;
        } else {
            stream.write(msg);
        }
    });
});
