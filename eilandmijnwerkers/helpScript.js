class Gebouw {
    constructor(type, snelheid, gain) {
        this.type = type;
        this.snelheid = snelheid;
        this.gain = gain;
    }
}


class Tegel {
    constructor(type, hoeveelheid) {
        this.type = type;
        this.hoeveelheid = hoeveelheid;
        this.gebouw = null;
        this.warning = false;
    }

    mijn() {
        this.hoeveelheid -= this.gebouw.snelheid;
        return this.hoeveelheid <= 0;

    }
}


class GameMap {
    constructor(gameMap=[]) {
        this.gameMap = gameMap;
        this.money = 50;
        this.valAfTel = 0;
    }

    mijn() {
        for (let i = 0; i < this.gameMap.length; i++) {
            let row = this.gameMap[i];
            for (let j = 0; j < row.length; j++) {
                let tegel = row[j];
                if (tegel) {
                    if (tegel.gebouw !== null) {
                        if (tegel.mijn()) {
                            this.gameMap[i][j] = null;
                        }
                        this.money += tegel.gebouw.gain;
                    }
                }
            }
        }
    }

    setWarning(i, j) {
        if (this.gameMap[i][j]) {
            this.gameMap[i][j].warning = true;
        }
    }

    markeer() {
        for (let i = this.valAfTel; i < this.gameMap.length-this.valAfTel; i++) {
            this.setWarning(this.valAfTel, i);
            this.setWarning(this.gameMap.length - 1 - this.valAfTel, i);
            this.setWarning(i, this.valAfTel);
            this.setWarning(i, this.gameMap.length - 1 - this.valAfTel);
        }
        this.valAfTel++;
    }

    valAf() {
        for (let i = 0; i < this.gameMap.length; i++) {
            let row = this.gameMap[i];
            for (let j = 0; j < row.length; j++) {
                if (row[j]) {
                    if (row[j].warning) {
                        this.gameMap[i][j] = null;
                    }
                }
            }
        }
    }
}


function seededRandom(seed) {
    return function() {
        var t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function generateMap() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dailySeed = parseInt(`${year}${month}${day}`);

    const random = seededRandom(dailySeed);
    const gridSize = 15;
    const map = new GameMap();

    for (let y = 0; y < gridSize; y++) {
        let row = [];
            for (let x = 0; x < gridSize; x++) {
                let diceRoll = random();
                if (x === 7 && y === 7) {
                    let tegel = new Tegel("aarde", 30);
                    tegel.gebouw = new Gebouw("centrum", 1, 1)
                    row.push(tegel);
                }
                else if (diceRoll < 0.60) {
                    row.push(new Tegel("aarde", 30));
                }
                else if (diceRoll < 0.90) {
                    row.push(new Tegel("metaal", 60));
                }
                else {
                    row.push(new Tegel("plasma", 120));
                }
            }
        map.gameMap.push(row);
    }

    return map
}

function laadImages(callback) {
    let map = new Map();
    let imageNames = ["centrum", "aarde", "metaal", "mijnwerker", "plasma", "plasmapomp", "centrum-warn", "aarde-warn", "metaal-warn", "mijnwerker-warn", "plasma-tegel-warn", "plasmapomp-warn"];
    let loadedCount = 0;

    imageNames.forEach(name => {
        let img = new Image();

        img.onload = () => {
            loadedCount++;
            if (loadedCount === imageNames.length && callback) {
                callback();
            }
        };

        img.src = "images/" + name + ".png";
        map.set(name, img);
    });

    return map;
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}
