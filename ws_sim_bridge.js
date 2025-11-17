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
const wss = new WebSocket.Server({port: PORT});

// Equipo de la CPU
const CPU_TEAM = "|dragonite||noability|fuerzadraconica,llamadraconica,alacortante,rafagaceleste|bashful|||||100|]|mewtwo||noability|presionmental,pulsomental|bashful|||||100|]|zoroark||noability|golpesombrio,mareanegra|bashful|||||100|]|rayquaza||noability|fuerzadraconica,llamadraconica,alacortante,rafagaceleste|bashful|||||100|]|shayminsky||noability|golpehoja,rayofotosintetico,alacortante,rafagaceleste|bashful|||||100|]|blazikenmega||noability|golpeardiente,llamasolar,golpekarate,ondaki|bashful|||||100|";

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
                            let moveCount = 4;

                            if (Array.isArray(req.active) && req.active[0] && Array.isArray(req.active[0].moves)) {
                                moveCount = req.active[0].moves.length;
                            }

                            if (moveCount === 0) {
                                moveCount = 1;
                            }

                            const move = Math.floor(Math.random() * moveCount) + 1;

                            stream.write(`>p2 move ${move}`);
                            console.log(`🤖 CPU (con ${moveCount} movs) atacó con ${move}`);
                        }
                        // 3. CAMBIAR POKEMON
                        else if (req.forceSwitch) {
                            const team = req.side.pokemon;
                            let foundValidSwitch = false;

                            for (let i = 0; i < team.length; i++) {
                                const pokemon = team[i];

                                const isFainted = pokemon.condition.startsWith('0/');
                                const isActive = pokemon.active;

                                if (!isActive && !isFainted) {
                                    const slot = i + 1;
                                    stream.write(`>p2 switch ${slot}`);
                                    console.log(`🤖 CPU cambió (forzado) al slot ${slot}`);
                                    foundValidSwitch = true;
                                    break; // Salimos del bucle
                                }
                            }

                            if (!foundValidSwitch) {
                                console.log('🤖 CPU no encontró a quién cambiar (partida terminada).');
                            }

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
