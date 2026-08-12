/* ==========================================================================
   SIAPA PEMUTUS ARUS? - Physics Circuit Logic Game Engine (Kelas 12)
   PhET Circuit Construction Kit (DC) Interactive Engine - Complete Workflow
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- Audio Engine (Web Audio API with Lazy User-Gesture Init) ---
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.enabled = true;
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        }

        playClick() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
                gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.05);
            } catch (e) {}
        }

        playUnscrew() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(250, this.ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.12);
            } catch (e) {}
        }

        playSpark() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;
            try {
                const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
                noise.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start();
            } catch (e) {}
        }

        playVictory() {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;
            try {
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, index) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.1);
                    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + index * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.1 + 0.3);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(this.ctx.currentTime + index * 0.1);
                    osc.stop(this.ctx.currentTime + index * 0.1 + 0.3);
                });
            } catch (e) {}
        }
    }

    const sound = new SoundEngine();

    // Sound Toggle Button
    const btnSound = document.getElementById('btn-sound');
    btnSound.addEventListener('click', () => {
        sound.enabled = !sound.enabled;
        btnSound.innerHTML = sound.enabled ? 
            '<i class="fa-solid fa-volume-high"></i>' : 
            '<i class="fa-solid fa-volume-xmark"></i>';
        btnSound.style.color = sound.enabled ? 'var(--text-primary)' : 'var(--color-red)';
        if (sound.enabled) sound.playClick();
    });

    // --- Canvas Background Snow Particles ---
    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    let particles = [];

    function resizeBgCanvas() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBgCanvas);
    resizeBgCanvas();

    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            radius: Math.random() * 2 + 0.5,
            alpha: Math.random(),
            speedY: Math.random() * 0.5 + 0.1,
            speedAlpha: Math.random() * 0.02 + 0.005
        });
    }

    function animateBg() {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        particles.forEach(p => {
            p.y += p.speedY;
            if (p.y > bgCanvas.height) p.y = 0;
            p.alpha += p.speedAlpha;
            if (p.alpha > 1 || p.alpha < 0.2) p.speedAlpha = -p.speedAlpha;

            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.6})`;
            bgCtx.fill();
        });
        requestAnimationFrame(animateBg);
    }
    animateBg();

    // --- Game State Constants & Variables ---
    let currentLevel = 1;
    let isSandbox = false;
    let showCurrentVision = true;
    let electronAnimFrame = null;
    let timerInterval = null;
    let timeRemaining = 60;

    const BULB_RESISTANCE = 10.0; // Ohms per bulb
    const BATTERY_VOLTAGE = 12.0; // Volts for main levels
    let sandboxVoltage = 12.0;    // Customizable for Sandbox

    // --- PhET Simulator Display Options ---
    let phetViewMode = 'real';          // 'real' or 'schematic'
    let phetCurrentType = 'electrons';  // 'electrons' or 'conventional'
    let phetShowLabels = true;
    let phetShowValues = true;

    // --- Selected Component for Context Menu ---
    let selectedComponent = null;

    /* Level Definitions */
    const LEVELS = {
        1: {
            title: "Dasar Rangkaian Seri Tunggal",
            subtitle: "Padamkan SELURUH lampu dengan melepas 1 lampu manapun!",
            hint: "Pada <b>Rangkaian Seri</b>, semua lampu berada dalam 1 lintasan tunggal. Jika 1 lampu dilepas, arus listrik <i>I</i> = 0 di seluruh rangkaian.",
            explanation: "Tepat sekali! Pada Rangkaian Seri, semua lampu saling bergantung. Memutus salah satu saklar/lampu membuka lintasan utama sehingga arus terhenti total (<i>I</i><sub>total</sub> = 0).",
            targets: {
                L1: 'OFF', L2: 'OFF', L3: 'OFF', L4: 'OFF'
            },
            targetDesc: "Semua Lampu (L1, L2, L3, L4) Harus PADAM",
            nodes: [
                { id: 'bat', type: 'battery', x: 120, y: 300, label: '12V' },
                { id: 'L1', type: 'bulb', x: 260, y: 160, label: 'L1', color: 'gold' },
                { id: 'L2', type: 'bulb', x: 440, y: 160, label: 'L2', color: 'cyan' },
                { id: 'L3', type: 'bulb', x: 620, y: 160, label: 'L3', color: 'green' },
                { id: 'L4', type: 'bulb', x: 760, y: 300, label: 'L4', color: 'red' }
            ],
            connections: [
                { from: 'bat-top', to: 'L1-left' },
                { from: 'L1-right', to: 'L2-left' },
                { from: 'L2-right', to: 'L3-left' },
                { from: 'L3-right', to: 'L4-top' },
                { from: 'L4-bottom', to: 'bat-bottom' }
            ]
        },

        2: {
            title: "Rangkaian Paralel Cabang - Pemutus Utama",
            subtitle: "Temukan 'Master Cutout' (L0) yang dapat memadamkan SELURUH cabang sekaligus!",
            hint: "Lampu pada cabang paralel (L1, L2, L3) bekerja secara independen. Tetapi lampu <b>L0</b> terletak di jalur utama (Main Loop) sebelum percabangan!",
            explanation: "Hebat! Lampu L0 terpasang di jalur utama sebelum percabangan (Induk). Melepas L0 memutuskan arus utama dari baterai ke SELURUH cabang paralel!",
            targets: {
                L0: 'REMOVED', L1: 'OFF', L2: 'OFF', L3: 'OFF'
            },
            targetDesc: "Lepas 1 Lampu Utama (L0) yang membuat L1, L2, & L3 Semuanya PADAM!",
            nodes: [
                { id: 'bat', type: 'battery', x: 100, y: 300, label: '12V' },
                { id: 'L0', type: 'bulb', x: 240, y: 300, label: 'L0 (Utama)', color: 'gold' },
                { id: 'L1', type: 'bulb', x: 500, y: 140, label: 'L1 (Cabang A)', color: 'cyan' },
                { id: 'L2', type: 'bulb', x: 500, y: 300, label: 'L2 (Cabang B)', color: 'green' },
                { id: 'L3', type: 'bulb', x: 500, y: 460, label: 'L3 (Cabang C)', color: 'red' }
            ],
            connections: [
                { from: 'bat-top', to: 'L0-left' },
                { from: 'L0-right', to: 'junct-top' },
                { from: 'junct-top', to: 'L1-left' },
                { from: 'junct-top', to: 'L2-left' },
                { from: 'junct-top', to: 'L3-left' },
                { from: 'L1-right', to: 'junct-bottom' },
                { from: 'L2-right', to: 'junct-bottom' },
                { from: 'L3-right', to: 'junct-bottom' },
                { from: 'junct-bottom', to: 'bat-bottom' }
            ]
        },

        3: {
            title: "Campuran Hias - Isolasi Cabang",
            subtitle: "Isolasi Cabang A (L2 & L3) agar PADAM, tetapi biarkan L4 di Cabang B TETAP MENYALA!",
            hint: "Melepas L1 akan memadamkan seluruh sirkuit. Untuk memadamkan Cabang A tanpa mengganggu Cabang B (L4), lepas salah satu lampu di Cabang A!",
            explanation: "Luar biasa! Lampu L2 dan L3 berada dalam hubungan SERI pada Cabang A. Melepas salah satunya (L2 atau L3) memadamkan Cabang A saja, sementara L4 pada Cabang B tetap dialiri arus dari Jalur Utama!",
            targets: {
                L1: 'ON', L2: 'OFF', L3: 'OFF', L4: 'ON'
            },
            targetDesc: "Cabang A (L2 & L3) PADAM &bull; Cabang B (L4) TETAP MENYALA",
            nodes: [
                { id: 'bat', type: 'battery', x: 100, y: 300, label: '12V' },
                { id: 'L1', type: 'bulb', x: 230, y: 300, label: 'L1 (Sekring)', color: 'gold' },
                { id: 'L2', type: 'bulb', x: 440, y: 160, label: 'L2 (Cabang A1)', color: 'cyan' },
                { id: 'L3', type: 'bulb', x: 620, y: 160, label: 'L3 (Cabang A2)', color: 'cyan' },
                { id: 'L4', type: 'bulb', x: 530, y: 440, label: 'L4 (Cabang B)', color: 'green' }
            ],
            connections: [
                { from: 'bat-top', to: 'L1-left' },
                { from: 'L1-right', to: 'junct-in' },
                { from: 'junct-in', to: 'L2-left' },
                { from: 'L2-right', to: 'L3-left' },
                { from: 'L3-right', to: 'junct-out' },
                { from: 'junct-in', to: 'L4-left' },
                { from: 'L4-right', to: 'junct-out' },
                { from: 'junct-out', to: 'bat-bottom' }
            ]
        },

        4: {
            title: "Matriks Bintang Hias (Star Bridge Circuit)",
            subtitle: "Padamkan Mahkota Bintang (L2, L3, L4, L5) tetapi pastikan Batang Pohon (L6) TETAP MENYALA!",
            hint: "Cari lampu 'Pemutus Bintang' (L1) yang menghubungkan daya ke seluruh bagian atas bintang sebelum arus bercabang ke L2-L5!",
            explanation: "Sangat Akurat! Lampu L1 bertindak sebagai gerbang pemutus arus khusus untuk blok Mahkota Bintang. Melepas L1 mengisolasi L2, L3, L4, L5 tanpa memutus alur ke Batang Pohon L6!",
            targets: {
                L1: 'REMOVED', L2: 'OFF', L3: 'OFF', L4: 'OFF', L5: 'OFF', L6: 'ON'
            },
            targetDesc: "Bintang (L2-L5) PADAM &bull; Batang Pohon (L6) MENYALA",
            nodes: [
                { id: 'bat', type: 'battery', x: 90, y: 300, label: '12V' },
                { id: 'L1', type: 'bulb', x: 260, y: 180, label: 'L1 (Pemutus Bintang)', color: 'gold' },
                { id: 'L2', type: 'bulb', x: 440, y: 100, label: 'L2', color: 'cyan' },
                { id: 'L3', type: 'bulb', x: 620, y: 100, label: 'L3', color: 'cyan' },
                { id: 'L4', type: 'bulb', x: 440, y: 260, label: 'L4', color: 'magenta' },
                { id: 'L5', type: 'bulb', x: 620, y: 260, label: 'L5', color: 'magenta' },
                { id: 'L6', type: 'bulb', x: 440, y: 460, label: 'L6 (Batang Pohon)', color: 'green' }
            ],
            connections: [
                { from: 'bat-top', to: 'junct-main-in' },
                { from: 'junct-main-in', to: 'L1-left' },
                { from: 'L1-right', to: 'junct-star-split' },
                { from: 'junct-star-split', to: 'L2-left' },
                { from: 'L2-right', to: 'L3-left' },
                { from: 'L3-right', to: 'junct-star-merge' },
                { from: 'junct-star-split', to: 'L4-left' },
                { from: 'L4-right', to: 'L5-left' },
                { from: 'L5-right', to: 'junct-star-merge' },
                { from: 'junct-star-merge', to: 'junct-main-out' },
                { from: 'junct-main-in', to: 'L6-left' },
                { from: 'L6-right', to: 'junct-main-out' },
                { from: 'junct-main-out', to: 'bat-bottom' }
            ]
        },

        5: {
            title: "Time Attack: Pemutus Misteri Kritis",
            subtitle: "Waktu: 60 Detik! Matikan HANYA L3 dan L4, biarkan L1, L2, dan L5 TETAP MENYALA!",
            hint: "Analisis percabangan mana yang mengaliri L3 & L4 secara spesifik. Lepas salah satu lampu pada cabang tersebut!",
            explanation: "Sempurna! Kamu telah menyelesaikan Tantangan Kritis dengan ketelitian seorang Teknisi Listrik Profesional!",
            targets: {
                L1: 'ON', L2: 'ON', L3: 'OFF', L4: 'OFF', L5: 'ON'
            },
            targetDesc: "L3 & L4 PADAM &bull; L1, L2, & L5 TETAP MENYALA! (Batas: 60 dtk)",
            nodes: [
                { id: 'bat', type: 'battery', x: 90, y: 300, label: '12V' },
                { id: 'L1', type: 'bulb', x: 230, y: 300, label: 'L1 (Utama)', color: 'gold' },
                { id: 'L2', type: 'bulb', x: 420, y: 140, label: 'L2 (Cabang 1)', color: 'green' },
                { id: 'L3', type: 'bulb', x: 420, y: 300, label: 'L3 (Cabang 2A)', color: 'red' },
                { id: 'L4', type: 'bulb', x: 600, y: 300, label: 'L4 (Cabang 2B)', color: 'red' },
                { id: 'L5', type: 'bulb', x: 420, y: 460, label: 'L5 (Cabang 3)', color: 'cyan' }
            ],
            connections: [
                { from: 'bat-top', to: 'L1-left' },
                { from: 'L1-right', to: 'junct-in' },
                { from: 'junct-in', to: 'L2-left' },
                { from: 'L2-right', to: 'junct-out' },
                { from: 'junct-in', to: 'L3-left' },
                { from: 'L3-right', to: 'L4-left' },
                { from: 'L4-right', to: 'junct-out' },
                { from: 'junct-in', to: 'L5-left' },
                { from: 'L5-right', to: 'junct-out' },
                { from: 'junct-out', to: 'bat-bottom' }
            ]
        }
    };

    // Active States
    let bulbStates = {}; // e.g. { L1: 'installed', L2: 'unscrewed' }
    let bulbIllumination = {}; // e.g. { L1: true, L2: false }
    let computedReq = Infinity;
    let computedI = 0.0;

    // --- PhET Sandbox Nodes ---
    let sandboxNodes = [
        { id: 'bat', type: 'battery', x: 140, y: 300, label: 'Baterai', val: 12.0, r: 0 },
        { id: 'sw', type: 'switch', x: 280, y: 300, label: 'Saklar', val: 0, r: 0 },
        { id: 'L1', type: 'bulb', x: 440, y: 300, label: 'Lampu L1', val: 10.0, r: 10, color: 'gold' },
        { id: 'L2', type: 'bulb', x: 620, y: 300, label: 'Lampu L2', val: 10.0, r: 10, color: 'cyan' }
    ];
    let sandboxConnections = [
        { from: 'bat-top', to: 'sw-left' },
        { from: 'sw-right', to: 'L1-left' },
        { from: 'L1-right', to: 'L2-left' },
        { from: 'L2-right', to: 'bat-bottom' }
    ];
    let sandboxState = { switchClosed: true, mode: 'series' };

    // --- Component Resistance Mapping ---
    function getNodeResistance(node) {
        if (node.type === 'battery') return 0;
        if (node.type === 'switch') return sandboxState.switchClosed ? 0 : Infinity;
        if (node.type === 'eraser') return Infinity; // Rubber insulator
        if (node.type === 'paperclip') return 0.1;   // Metal conductor
        if (node.type === 'coin') return 0.1;        // Metal conductor
        if (node.type === 'pencil') return 25.0;      // Graphite resistor
        if (node.type === 'fuse') return 0.1;        // Metal fuse
        if (node.type === 'resistor') return node.r || 10.0;
        if (node.type === 'bulb') return node.r || BULB_RESISTANCE;
        return 10.0;
    }

    // --- Advanced Physics Circuit Graph Solver ---
    function solveCircuit() {
        bulbIllumination = {};
        computedReq = Infinity;
        computedI = 0.0;

        if (isSandbox) {
            solveSandboxCircuit();
            return;
        }

        const lvl = LEVELS[currentLevel];
        if (!lvl) return;

        if (currentLevel === 1) {
            const openBulb = lvl.nodes.find(n => n.type === 'bulb' && bulbStates[n.id] === 'unscrewed');
            if (!openBulb) {
                computedReq = 4 * BULB_RESISTANCE;
                computedI = BATTERY_VOLTAGE / computedReq;
                lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = true; });
            } else {
                lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
            }
        }
        else if (currentLevel === 2) {
            if (bulbStates['L0'] === 'unscrewed') {
                lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
            } else {
                const activeBranches = ['L1', 'L2', 'L3'].filter(id => bulbStates[id] === 'installed');
                if (activeBranches.length === 0) {
                    lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
                } else {
                    const rParallel = BULB_RESISTANCE / activeBranches.length;
                    computedReq = BULB_RESISTANCE + rParallel;
                    computedI = BATTERY_VOLTAGE / computedReq;

                    bulbIllumination['L0'] = true;
                    ['L1', 'L2', 'L3'].forEach(id => {
                        bulbIllumination[id] = (bulbStates[id] === 'installed');
                    });
                }
            }
        }
        else if (currentLevel === 3) {
            if (bulbStates['L1'] === 'unscrewed') {
                lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
            } else {
                const branchAActive = (bulbStates['L2'] === 'installed' && bulbStates['L3'] === 'installed');
                const branchBActive = (bulbStates['L4'] === 'installed');

                if (!branchAActive && !branchBActive) {
                    lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
                } else {
                    let rParallel = 0;
                    if (branchAActive && branchBActive) {
                        const rA = 2 * BULB_RESISTANCE;
                        const rB = BULB_RESISTANCE;
                        rParallel = (rA * rB) / (rA + rB);
                    } else if (branchAActive) {
                        rParallel = 2 * BULB_RESISTANCE;
                    } else {
                        rParallel = BULB_RESISTANCE;
                    }

                    computedReq = BULB_RESISTANCE + rParallel;
                    computedI = BATTERY_VOLTAGE / computedReq;

                    bulbIllumination['L1'] = true;
                    bulbIllumination['L2'] = branchAActive;
                    bulbIllumination['L3'] = branchAActive;
                    bulbIllumination['L4'] = branchBActive;
                }
            }
        }
        else if (currentLevel === 4) {
            const trunkActive = (bulbStates['L6'] === 'installed');
            const starFeedActive = (bulbStates['L1'] === 'installed');

            const starUpperActive = (bulbStates['L2'] === 'installed' && bulbStates['L3'] === 'installed');
            const starLowerActive = (bulbStates['L4'] === 'installed' && bulbStates['L5'] === 'installed');

            const starBranchActive = starFeedActive && (starUpperActive || starLowerActive);

            if (!trunkActive && !starBranchActive) {
                lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
            } else {
                let rStarTotal = Infinity;
                if (starBranchActive) {
                    let rStarP = 0;
                    if (starUpperActive && starLowerActive) {
                        rStarP = (20 * 20) / 40;
                    } else if (starUpperActive) {
                        rStarP = 20;
                    } else {
                        rStarP = 20;
                    }
                    rStarTotal = BULB_RESISTANCE + rStarP;
                }

                let invReq = 0;
                if (trunkActive) invReq += 1 / BULB_RESISTANCE;
                if (starBranchActive) invReq += 1 / rStarTotal;

                computedReq = 1 / invReq;
                computedI = BATTERY_VOLTAGE / computedReq;

                bulbIllumination['L6'] = trunkActive;
                bulbIllumination['L1'] = starBranchActive;
                bulbIllumination['L2'] = starBranchActive && starUpperActive;
                bulbIllumination['L3'] = starBranchActive && starUpperActive;
                bulbIllumination['L4'] = starBranchActive && starLowerActive;
                bulbIllumination['L5'] = starBranchActive && starLowerActive;
            }
        }
        else if (currentLevel === 5) {
            if (bulbStates['L1'] === 'unscrewed') {
                lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
            } else {
                const b1Active = (bulbStates['L2'] === 'installed');
                const b2Active = (bulbStates['L3'] === 'installed' && bulbStates['L4'] === 'installed');
                const b3Active = (bulbStates['L5'] === 'installed');

                if (!b1Active && !b2Active && !b3Active) {
                    lvl.nodes.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
                } else {
                    let invParallel = 0;
                    if (b1Active) invParallel += 1 / BULB_RESISTANCE;
                    if (b2Active) invParallel += 1 / (2 * BULB_RESISTANCE);
                    if (b3Active) invParallel += 1 / BULB_RESISTANCE;

                    const rParallel = 1 / invParallel;
                    computedReq = BULB_RESISTANCE + rParallel;
                    computedI = BATTERY_VOLTAGE / computedReq;

                    bulbIllumination['L1'] = true;
                    bulbIllumination['L2'] = b1Active;
                    bulbIllumination['L3'] = b2Active;
                    bulbIllumination['L4'] = b2Active;
                    bulbIllumination['L5'] = b3Active;
                }
            }
        }

        updateMetricsHUD();
        renderCircuitDOM();
    }

    function solveSandboxCircuit() {
        const loads = sandboxNodes.filter(n => n.type !== 'battery');
        let hasInsulator = false;
        let totalR = 0;

        if (sandboxState.mode === 'parallel') {
            const parallelLoads = loads.filter(n => n.type !== 'switch');
            let invR = 0;
            parallelLoads.forEach(n => {
                const r = (bulbStates[n.id] === 'unscrewed') ? Infinity : getNodeResistance(n);
                if (r === Infinity) {
                    // Open branch
                } else {
                    invR += 1 / r;
                }
            });
            totalR = (invR > 0) ? (1 / invR) : Infinity;
        } else {
            // Series loads
            loads.forEach(n => {
                const r = (bulbStates[n.id] === 'unscrewed') ? Infinity : getNodeResistance(n);
                if (r === Infinity) hasInsulator = true;
                totalR += r;
            });
        }

        if (hasInsulator || !sandboxState.switchClosed || totalR === Infinity || totalR <= 0) {
            loads.forEach(n => { if (n.type === 'bulb') bulbIllumination[n.id] = false; });
            computedReq = Infinity;
            computedI = 0;
        } else {
            computedReq = totalR;
            computedI = sandboxVoltage / computedReq;
            loads.forEach(n => {
                if (n.type === 'bulb') {
                    bulbIllumination[n.id] = (bulbStates[n.id] === 'installed');
                }
            });
        }
        updateMetricsHUD();
        renderCircuitDOM();
        updateVoltmeterReading();
    }

    // --- HUD Metrics Display & PhET Controls ---
    function updateMetricsHUD() {
        const metricV = document.getElementById('metric-voltage');
        const metricR = document.getElementById('metric-resistance');
        const metricI = document.getElementById('metric-current');
        const metricStatus = document.getElementById('metric-status');

        const phetV = document.getElementById('phet-v-val');
        const phetI = document.getElementById('phet-i-val');

        const activeVoltage = isSandbox ? sandboxVoltage : BATTERY_VOLTAGE;
        metricV.textContent = `${activeVoltage.toFixed(1)} V`;
        if (phetV) phetV.textContent = `${activeVoltage.toFixed(1)} V`;

        if (!isFinite(computedReq) || computedReq <= 0 || computedI <= 0) {
            metricR.textContent = "∞ Ω (Terbuka)";
            metricI.textContent = "0.00 A";
            metricStatus.textContent = "TERBUKA";
            metricStatus.className = "metric-value text-red";

            if (phetI) phetI.textContent = "0.00 A";
        } else {
            metricR.textContent = `${computedReq.toFixed(1)} Ω`;
            metricI.textContent = `${computedI.toFixed(2)} A`;
            metricStatus.textContent = "TERTUTUP";
            metricStatus.className = "metric-value text-emerald";

            if (phetI) phetI.textContent = `${computedI.toFixed(2)} A`;
        }
    }

    // --- Render Circuit SVG (DOM Structural updates ONLY on state change) ---
    const svgElem = document.getElementById('circuit-svg');
    const tooltipElem = document.getElementById('circuit-tooltip');

    let activeWirePaths = [];

    function renderCircuitDOM() {
        const oldDynamic = svgElem.querySelectorAll('.dynamic-render');
        oldDynamic.forEach(el => el.remove());

        activeWirePaths = [];

        const electronContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        electronContainer.setAttribute('id', 'electron-container');
        electronContainer.setAttribute('class', 'dynamic-render');
        svgElem.appendChild(electronContainer);

        if (isSandbox) {
            renderSandboxDOM();
            return;
        }

        const lvl = LEVELS[currentLevel];

        // Draw multi-layer wires
        lvl.connections.forEach(conn => {
            const pathData = calculateWirePath(conn.from, conn.to, lvl.nodes);
            
            // Outer wire sheath background
            const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            bgPath.setAttribute('d', pathData);
            bgPath.setAttribute('fill', 'none');
            bgPath.setAttribute('class', 'circuit-wire-bg dynamic-render');
            svgElem.appendChild(bgPath);

            // Inner wire core
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('class', 'circuit-wire dynamic-render');
            
            const isActive = isWireActive(conn, lvl);
            if (isActive) {
                path.classList.add('active');
                activeWirePaths.push(pathData);
            }
            svgElem.appendChild(path);
        });

        // Draw Nodes
        lvl.nodes.forEach(node => {
            if (node.type === 'battery') {
                renderBattery(node);
            } else if (node.type === 'bulb') {
                renderBulb(node);
            }
        });

        // Draw terminal connection rings
        lvl.nodes.forEach(node => {
            renderTerminalRing(node.x - 30, node.y);
            renderTerminalRing(node.x + 30, node.y);
        });

        initElectronParticleDOM();
    }

    function renderTerminalRing(x, y) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', x);
        ring.setAttribute('cy', y);
        ring.setAttribute('r', '4.5');
        ring.setAttribute('class', 'terminal-node dynamic-render');
        svgElem.appendChild(ring);
    }

    function renderSandboxDOM() {
        sandboxConnections.forEach(conn => {
            const pathData = calculateWirePath(conn.from, conn.to, sandboxNodes);
            
            const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            bgPath.setAttribute('d', pathData);
            bgPath.setAttribute('fill', 'none');
            bgPath.setAttribute('class', 'circuit-wire-bg dynamic-render');
            svgElem.appendChild(bgPath);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('class', 'circuit-wire dynamic-render');

            const isActive = sandboxState.switchClosed && isFinite(computedReq) && computedI > 0;
            if (isActive) {
                path.classList.add('active');
                activeWirePaths.push(pathData);
            }
            svgElem.appendChild(path);
        });

        sandboxNodes.forEach(node => {
            if (node.type === 'battery') renderBattery(node);
            else if (node.type === 'switch') renderSwitch(node);
            else if (node.type === 'bulb') renderBulb(node);
            else renderGenericPhETComponent(node);
        });

        sandboxNodes.forEach(node => {
            renderTerminalRing(node.x - 30, node.y);
            renderTerminalRing(node.x + 30, node.y);
        });

        initElectronParticleDOM();
    }

    function calculateWirePath(fromKey, toKey, nodes) {
        const getCoord = (key) => {
            if (key.startsWith('junct-')) {
                return getJunctionCoord(key);
            }
            const parts = key.split('-');
            const node = nodes.find(n => n.id === parts[0]);
            if (!node) return { x: 0, y: 0 };

            let offset = { x: 0, y: 0 };
            if (parts[1] === 'left') offset.x = -32;
            else if (parts[1] === 'right') offset.x = 32;
            else if (parts[1] === 'top') offset.y = -32;
            else if (parts[1] === 'bottom') offset.y = 32;

            return { x: node.x + offset.x, y: node.y + offset.y };
        };

        const p1 = getCoord(fromKey);
        const p2 = getCoord(toKey);

        if (Math.abs(p1.x - p2.x) < 5 || Math.abs(p1.y - p2.y) < 5) {
            return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
        } else {
            const midX = p1.x + (p2.x - p1.x) / 2;
            return `M ${p1.x} ${p1.y} H ${midX} V ${p2.y} H ${p2.x}`;
        }
    }

    function getJunctionCoord(junctKey) {
        const map = {
            'junct-top': { x: 360, y: 300 },
            'junct-bottom': { x: 640, y: 300 },
            'junct-in': { x: 340, y: 300 },
            'junct-out': { x: 720, y: 300 },
            'junct-main-in': { x: 180, y: 300 },
            'junct-star-split': { x: 340, y: 180 },
            'junct-star-merge': { x: 720, y: 180 },
            'junct-main-out': { x: 740, y: 300 }
        };
        return map[junctKey] || { x: 400, y: 300 };
    }

    function isWireActive(conn, lvl) {
        if (!isFinite(computedReq) || computedReq <= 0) return false;
        const fromNode = conn.from.split('-')[0];
        const toNode = conn.to.split('-')[0];

        if (fromNode === 'bat' || toNode === 'bat') return true;
        if (bulbIllumination[fromNode] || bulbIllumination[toNode]) return true;
        return true;
    }

    // Attach Component Click for Property Context Menu
    function attachComponentEvents(group, node) {
        if (!isSandbox) return;
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            sound.playClick();
            openComponentProperties(node, e.clientX, e.clientY);
        });
    }

    // --- Render Battery (Real vs IEEE Schematic) ---
    function renderBattery(node) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'battery-group dynamic-render');
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        const vText = isSandbox ? `${(node.val || sandboxVoltage).toFixed(0)}V` : '12V';

        if (phetViewMode === 'schematic') {
            group.innerHTML = `
                <circle r="36" fill="transparent" pointer-events="all"/>
                <line x1="-28" y1="0" x2="-8" y2="0" stroke="#00e5ff" stroke-width="3"/>
                <line x1="8" y1="0" x2="28" y2="0" stroke="#00e5ff" stroke-width="3"/>
                <line x1="-8" y1="-24" x2="-8" y2="24" stroke="#ffd700" stroke-width="4"/>
                <line x1="8" y1="-12" x2="8" y2="12" stroke="#ef4444" stroke-width="6"/>
                ${phetShowLabels ? `<text x="0" y="-30" font-family="JetBrains Mono" font-size="12" fill="#94a3b8" text-anchor="middle">Baterai</text>` : ''}
                ${phetShowValues ? `<text x="0" y="36" font-family="JetBrains Mono" font-size="12" font-weight="700" fill="#ffd700" text-anchor="middle">${vText}</text>` : ''}
            `;
        } else {
            group.innerHTML = `
                <circle r="36" fill="transparent" pointer-events="all"/>
                <rect x="-24" y="-36" width="48" height="72" rx="8" fill="#1e293b" stroke="#00e5ff" stroke-width="2"/>
                <rect x="-10" y="-44" width="20" height="8" rx="2" fill="#00e5ff"/>
                <text x="0" y="4" font-family="Outfit" font-weight="800" font-size="15" fill="#ffd700" text-anchor="middle">${vText}</text>
                <text x="0" y="-18" font-family="JetBrains Mono" font-weight="800" font-size="16" fill="#10b981" text-anchor="middle">+</text>
                <text x="0" y="26" font-family="JetBrains Mono" font-weight="800" font-size="16" fill="#ef4444" text-anchor="middle">-</text>
                ${phetShowLabels ? `<text x="0" y="-52" font-family="JetBrains Mono" font-size="11" fill="#94a3b8" text-anchor="middle">${node.label}</text>` : ''}
            `;
        }
        attachComponentEvents(group, node);
        svgElem.appendChild(group);
    }

    // --- Render Switch (Real vs IEEE Schematic) ---
    function renderSwitch(node) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'switch-interactive dynamic-render');
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        group.style.cursor = 'pointer';

        const isOpen = !sandboxState.switchClosed;
        const leverAngle = isOpen ? -38 : 0;
        const statusColor = isOpen ? '#ef4444' : '#10b981';

        if (phetViewMode === 'schematic') {
            group.innerHTML = `
                <circle r="36" fill="transparent" pointer-events="all"/>
                <line x1="-28" y1="0" x2="-14" y2="0" stroke="#00e5ff" stroke-width="3"/>
                <line x1="14" y1="0" x2="28" y2="0" stroke="#00e5ff" stroke-width="3"/>
                <circle cx="-14" cy="0" r="4" fill="#ffd700"/>
                <circle cx="14" cy="0" r="4" fill="#ffd700"/>
                <line x1="-14" y1="0" x2="14" y2="${isOpen ? -20 : 0}" stroke="#ffd700" stroke-width="3.5"/>
                ${phetShowLabels ? `<text x="0" y="-28" font-family="JetBrains Mono" font-size="11" fill="${statusColor}" text-anchor="middle">SAKLAR</text>` : ''}
            `;
        } else {
            group.innerHTML = `
                <circle r="36" fill="transparent" pointer-events="all"/>
                <rect x="-26" y="-14" width="52" height="28" rx="6" fill="#0f172a" stroke="${statusColor}" stroke-width="2"/>
                <circle cx="-16" cy="0" r="4" fill="#ffd700"/>
                <circle cx="16" cy="0" r="4" fill="#ffd700"/>
                <g transform="translate(-16, 0) rotate(${leverAngle})">
                    <line x1="0" y1="0" x2="32" y2="0" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
                    <circle cx="32" cy="0" r="5" fill="#ff3366"/>
                </g>
                ${phetShowLabels ? `<text x="0" y="32" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="${statusColor}" text-anchor="middle">SAKLAR ${isOpen ? '(BUKA)' : '(TUTUP)'}</text>` : ''}
            `;
        }

        group.addEventListener('click', (e) => {
            e.stopPropagation();
            sound.init();
            sound.playClick();
            sandboxState.switchClosed = !sandboxState.switchClosed;
            const switchBtnIcon = document.querySelector('[data-tool="toggle-switch"] i');
            if (switchBtnIcon) {
                switchBtnIcon.className = sandboxState.switchClosed ? "fa-solid fa-toggle-on text-green" : "fa-solid fa-toggle-off text-red";
            }
            solveCircuit();
        });

        svgElem.appendChild(group);
    }

    // --- Render Light Bulb (Real vs IEEE Schematic) ---
    function renderBulb(node) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const isUnscrewed = (bulbStates[node.id] === 'unscrewed');
        const isLit = (bulbIllumination[node.id] === true);

        group.setAttribute('class', 'bulb-interactive dynamic-render');
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        const colorClass = isLit ? `lit-${node.color || 'gold'}` : 'dark';
        const rVal = node.r || BULB_RESISTANCE;

        if (phetViewMode === 'schematic') {
            group.innerHTML = `
                <circle r="40" fill="transparent" pointer-events="all"/>
                <line x1="-28" y1="0" x2="-16" y2="0" stroke="#00e5ff" stroke-width="3"/>
                <line x1="16" y1="0" x2="28" y2="0" stroke="#00e5ff" stroke-width="3"/>
                <circle cx="0" cy="0" r="16" fill="${isLit ? '#ffd700' : '#1e293b'}" stroke="#00e5ff" stroke-width="2.5"/>
                <line x1="-10" y1="-10" x2="10" y2="10" stroke="${isLit ? '#0f172a' : '#94a3b8'}" stroke-width="2"/>
                <line x1="10" y1="-10" x2="-10" y2="10" stroke="${isLit ? '#0f172a' : '#94a3b8'}" stroke-width="2"/>
                ${phetShowLabels ? `<text x="0" y="-24" font-family="JetBrains Mono" font-size="11" fill="#94a3b8" text-anchor="middle">${node.label}</text>` : ''}
                ${phetShowValues ? `<text x="0" y="32" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#ffd700" text-anchor="middle">${rVal}Ω</text>` : ''}
            `;
        } else {
            if (isUnscrewed) {
                group.innerHTML = `
                    <circle r="40" fill="transparent" pointer-events="all"/>
                    <rect x="-22" y="-14" width="44" height="28" rx="6" class="bulb-socket" fill="#0f172a" stroke="#ef4444"/>
                    <line x1="-12" y1="-12" x2="12" y2="12" class="unscrewed-cross"/>
                    <line x1="12" y1="-12" x2="-12" y2="12" class="unscrewed-cross"/>
                    <text x="0" y="32" class="bulb-label">${node.label} (Dilepas)</text>
                `;
            } else {
                group.innerHTML = `
                    <circle r="40" fill="transparent" pointer-events="all"/>
                    <rect x="-18" y="10" width="36" height="20" rx="4" class="bulb-socket"/>
                    <path d="M -22 -10 C -22 -32, 22 -32, 22 -10 C 22 8, 14 12, 14 16 L -14 16 C -14 12, -22 8, -22 -10 Z" 
                          class="bulb-glass ${colorClass}"/>
                    <path d="M -8 10 L -4 -10 L 0 -4 L 4 -10 L 8 10" class="bulb-filament"/>
                    ${phetShowLabels ? `<text x="0" y="44" class="bulb-label">${node.label}</text>` : ''}
                    ${phetShowValues ? `<text x="0" y="-36" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#ffd700" text-anchor="middle">${rVal}Ω</text>` : ''}
                `;
            }
        }

        group.addEventListener('click', (e) => {
            sound.init();
            if (e.target.tagName === 'text' || isSandbox) {
                openComponentProperties(node, e.clientX, e.clientY);
                return;
            }
            if (isUnscrewed) {
                bulbStates[node.id] = 'installed';
                sound.playClick();
            } else {
                bulbStates[node.id] = 'unscrewed';
                sound.playUnscrew();
                sound.playSpark();
            }
            solveCircuit();
        });

        group.addEventListener('mouseenter', () => {
            const statusStr = isUnscrewed ? "Dilepas (Terbuka)" : (isLit ? "MENYALA" : "PADAM");
            tooltipElem.innerHTML = `<strong>${node.label}</strong><br>Status: ${statusStr}<br>Hambatan: ${rVal} Ω`;
            tooltipElem.classList.remove('hidden');
        });

        group.addEventListener('mousemove', (e) => {
            const rect = svgElem.getBoundingClientRect();
            const posX = e.clientX - rect.left + 15;
            const posY = e.clientY - rect.top - 10;
            tooltipElem.style.left = `${Math.min(rect.width - 150, Math.max(10, posX))}px`;
            tooltipElem.style.top = `${Math.min(rect.height - 60, Math.max(10, posY))}px`;
        });

        group.addEventListener('mouseleave', () => {
            tooltipElem.classList.add('hidden');
        });

        svgElem.appendChild(group);
    }

    // --- Render Generic PhET Components ---
    function renderGenericPhETComponent(node) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'phet-comp-interactive dynamic-render');
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        group.style.cursor = 'pointer';

        const rVal = getNodeResistance(node);
        const rText = (rVal === Infinity) ? '∞ Ω' : `${rVal}Ω`;

        if (phetViewMode === 'schematic') {
            if (node.type === 'resistor' || node.type === 'pencil') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <line x1="-28" y1="0" x2="-16" y2="0" stroke="#00e5ff" stroke-width="3"/>
                    <line x1="16" y1="0" x2="28" y2="0" stroke="#00e5ff" stroke-width="3"/>
                    <path d="M -16 0 L -12 -8 L -4 8 L 4 -8 L 12 8 L 16 0" stroke="#ffd700" stroke-width="3" fill="none"/>
                    ${phetShowLabels ? `<text x="0" y="-22" font-family="JetBrains Mono" font-size="11" fill="#94a3b8" text-anchor="middle">${node.label}</text>` : ''}
                    ${phetShowValues ? `<text x="0" y="24" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#ffd700" text-anchor="middle">${rText}</text>` : ''}
                `;
            } else if (node.type === 'fuse') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <line x1="-28" y1="0" x2="28" y2="0" stroke="#00e5ff" stroke-width="3"/>
                    <rect x="-14" y="-8" width="28" height="16" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
                    ${phetShowLabels ? `<text x="0" y="-22" font-family="JetBrains Mono" font-size="11" fill="#ef4444" text-anchor="middle">Sekring</text>` : ''}
                `;
            } else {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <line x1="-28" y1="0" x2="-14" y2="0" stroke="#00e5ff" stroke-width="3"/>
                    <line x1="14" y1="0" x2="28" y2="0" stroke="#00e5ff" stroke-width="3"/>
                    <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#1e293b" stroke="#00e5ff" stroke-width="2"/>
                    ${phetShowLabels ? `<text x="0" y="-20" font-family="JetBrains Mono" font-size="11" fill="#94a3b8" text-anchor="middle">${node.label}</text>` : ''}
                    ${phetShowValues ? `<text x="0" y="26" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#ffd700" text-anchor="middle">${rText}</text>` : ''}
                `;
            }
        } else {
            if (node.type === 'resistor') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <line x1="-28" y1="0" x2="28" y2="0" stroke="#94a3b8" stroke-width="4"/>
                    <rect x="-16" y="-8" width="32" height="16" rx="4" fill="#d97706" stroke="#b45309"/>
                    <line x1="-8" y1="-8" x2="-8" y2="8" stroke="#ef4444" stroke-width="2"/>
                    <line x1="-2" y1="-8" x2="-2" y2="8" stroke="#3b82f6" stroke-width="2"/>
                    <line x1="4" y1="-8" x2="4" y2="8" stroke="#10b981" stroke-width="2"/>
                    ${phetShowLabels ? `<text x="0" y="24" font-family="JetBrains Mono" font-size="11" fill="#94a3b8" text-anchor="middle">${node.label}</text>` : ''}
                    ${phetShowValues ? `<text x="0" y="-18" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#ffd700" text-anchor="middle">${rText}</text>` : ''}
                `;
            } else if (node.type === 'fuse') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <line x1="-28" y1="0" x2="28" y2="0" stroke="#94a3b8" stroke-width="4"/>
                    <rect x="-16" y="-7" width="32" height="14" rx="3" fill="rgba(255,255,255,0.2)" stroke="#cbd5e1"/>
                    <rect x="-16" y="-7" width="6" height="14" fill="#94a3b8"/>
                    <rect x="10" y="-7" width="6" height="14" fill="#94a3b8"/>
                    <line x1="-10" y1="0" x2="10" y2="0" stroke="#ef4444" stroke-width="1.5"/>
                    ${phetShowLabels ? `<text x="0" y="24" font-family="JetBrains Mono" font-size="11" fill="#ef4444" text-anchor="middle">Sekring</text>` : ''}
                `;
            } else if (node.type === 'paperclip') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <path d="M -16 -4 L 10 -4 C 14 -4 14 4 10 4 L -12 4 C -14 4 -14 -1 -12 -1 L 6 -1" fill="none" stroke="#00e5ff" stroke-width="3" stroke-linecap="round"/>
                    ${phetShowLabels ? `<text x="0" y="24" font-family="JetBrains Mono" font-size="11" fill="#00e5ff" text-anchor="middle">Klip Kertas</text>` : ''}
                `;
            } else if (node.type === 'coin') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <circle cx="0" cy="0" r="14" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
                    <text x="0" y="4" font-family="Outfit" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">Rp</text>
                    ${phetShowLabels ? `<text x="0" y="28" font-family="JetBrains Mono" font-size="11" fill="#ffd700" text-anchor="middle">Koin</text>` : ''}
                `;
            } else if (node.type === 'pencil') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <polygon points="-18,-4 14,-4 18,0 14,4 -18,4" fill="#eab308" stroke="#ca8a04"/>
                    <polygon points="14,-4 18,0 14,4" fill="#1e293b"/>
                    ${phetShowLabels ? `<text x="0" y="24" font-family="JetBrains Mono" font-size="11" fill="#eab308" text-anchor="middle">Pensil (25Ω)</text>` : ''}
                `;
            } else if (node.type === 'eraser') {
                group.innerHTML = `
                    <circle r="36" fill="transparent" pointer-events="all"/>
                    <rect x="-16" y="-8" width="32" height="16" rx="4" fill="#f43f5e" stroke="#be123c"/>
                    ${phetShowLabels ? `<text x="0" y="24" font-family="JetBrains Mono" font-size="11" fill="#f43f5e" text-anchor="middle">Penghapus</text>` : ''}
                    ${phetShowValues ? `<text x="0" y="-16" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#ef4444" text-anchor="middle">∞ Ω</text>` : ''}
                `;
            }
        }

        attachComponentEvents(group, node);

        group.addEventListener('mouseenter', () => {
            tooltipElem.innerHTML = `<strong>${node.label}</strong><br>Hambatan: ${rText}`;
            tooltipElem.classList.remove('hidden');
        });

        group.addEventListener('mousemove', (e) => {
            const rect = svgElem.getBoundingClientRect();
            const posX = e.clientX - rect.left + 15;
            const posY = e.clientY - rect.top - 10;
            tooltipElem.style.left = `${Math.min(rect.width - 150, Math.max(10, posX))}px`;
            tooltipElem.style.top = `${Math.min(rect.height - 60, Math.max(10, posY))}px`;
        });

        group.addEventListener('mouseleave', () => {
            tooltipElem.classList.add('hidden');
        });

        svgElem.appendChild(group);
    }

    // --- Performant Particle Renderer (Electrons vs Conventional) ---
    let electronOffset = 0;
    let particleElements = [];

    function initElectronParticleDOM() {
        const container = document.getElementById('electron-container');
        if (!container) return;
        container.innerHTML = '';
        particleElements = [];

        const isCurrentEnabled = isSandbox ? document.getElementById('phet-toggle-current').checked : showCurrentVision;

        if (!isCurrentEnabled || activeWirePaths.length === 0) return;

        activeWirePaths.forEach(pathData => {
            const pathObj = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathObj.setAttribute('d', pathData);
            const totalLen = pathObj.getTotalLength();
            if (totalLen <= 0) return;

            const count = Math.max(3, Math.floor(totalLen / 45));
            for (let i = 0; i < count; i++) {
                if (phetCurrentType === 'conventional') {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('font-family', 'Outfit');
                    text.setAttribute('font-weight', '900');
                    text.setAttribute('font-size', '14');
                    text.setAttribute('fill', '#ff3366');
                    text.setAttribute('text-anchor', 'middle');
                    text.textContent = '➔';
                    container.appendChild(text);

                    particleElements.push({
                        elem: text,
                        pathObj: pathObj,
                        totalLen: totalLen,
                        offsetRatio: i / count
                    });
                } else {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('r', 3.5);
                    circle.setAttribute('class', 'wire-current-particle');
                    container.appendChild(circle);

                    particleElements.push({
                        elem: circle,
                        pathObj: pathObj,
                        totalLen: totalLen,
                        offsetRatio: i / count
                    });
                }
            }
        });
    }

    function animateElectrons() {
        const isCurrentEnabled = isSandbox ? document.getElementById('phet-toggle-current').checked : showCurrentVision;

        if (isCurrentEnabled && particleElements.length > 0) {
            const speed = (phetCurrentType === 'conventional') ? -1.5 : 1.5;
            electronOffset += speed;
            if (electronOffset > 1000) electronOffset = 0;
            if (electronOffset < -1000) electronOffset = 0;

            particleElements.forEach(p => {
                const dist = (electronOffset + (p.offsetRatio * p.totalLen) + 10000) % p.totalLen;
                const pt = p.pathObj.getPointAtLength(dist);
                if (phetCurrentType === 'conventional') {
                    p.elem.setAttribute('x', pt.x);
                    p.elem.setAttribute('y', pt.y + 4);
                } else {
                    p.elem.setAttribute('cx', pt.x);
                    p.elem.setAttribute('cy', pt.y);
                }
            });
        }
        electronAnimFrame = requestAnimationFrame(animateElectrons);
    }

    // --- Complete PhET Sandbox Graph Builder ---
    function rebuildSandboxGraph() {
        const loads = sandboxNodes.filter(n => n.type !== 'battery');
        sandboxConnections = [];

        if (sandboxState.mode === 'parallel') {
            sandboxConnections.push({ from: 'bat-top', to: 'junct-top' });
            loads.forEach(b => {
                sandboxConnections.push({ from: 'junct-top', to: `${b.id}-left` });
                sandboxConnections.push({ from: `${b.id}-right`, to: 'junct-bottom' });
            });
            sandboxConnections.push({ from: 'junct-bottom', to: 'bat-bottom' });
        } else {
            if (loads.length > 0) {
                sandboxConnections.push({ from: 'bat-top', to: `${loads[0].id}-left` });
                for (let i = 0; i < loads.length - 1; i++) {
                    sandboxConnections.push({ from: `${loads[i].id}-right`, to: `${loads[i+1].id}-left` });
                }
                sandboxConnections.push({ from: `${loads[loads.length - 1].id}-right`, to: 'bat-bottom' });
            } else {
                sandboxConnections.push({ from: 'bat-top', to: 'bat-bottom' });
            }
        }
    }

    // --- Component Properties Popover ---
    const popover = document.getElementById('component-props-popover');
    const popTitle = document.getElementById('prop-comp-title');
    const groupV = document.getElementById('prop-voltage-group');
    const rangeV = document.getElementById('prop-v-range');
    const numV = document.getElementById('prop-v-num');
    const groupR = document.getElementById('prop-resistance-group');
    const rangeR = document.getElementById('prop-r-range');
    const numR = document.getElementById('prop-r-num');
    const btnDelete = document.getElementById('btn-prop-delete');
    const btnCloseProps = document.getElementById('btn-close-props');

    function openComponentProperties(node, clientX, clientY) {
        selectedComponent = node;
        popTitle.textContent = `Konfigurasi: ${node.label}`;

        if (node.type === 'battery') {
            groupV.style.display = 'block';
            groupR.style.display = 'none';
            rangeV.value = node.val || sandboxVoltage;
            numV.textContent = `${rangeV.value}.0 V`;
        } else if (node.type === 'bulb' || node.type === 'resistor' || node.type === 'pencil') {
            groupV.style.display = 'none';
            groupR.style.display = 'block';
            rangeR.value = node.r || (node.type === 'pencil' ? 25 : 10);
            numR.textContent = `${rangeR.value}.0 Ω`;
        } else {
            groupV.style.display = 'none';
            groupR.style.display = 'none';
        }

        const containerRect = document.getElementById('circuit-container').getBoundingClientRect();
        const posX = Math.min(containerRect.width - 230, Math.max(10, clientX - containerRect.left + 10));
        const posY = Math.min(containerRect.height - 180, Math.max(10, clientY - containerRect.top - 10));

        popover.style.left = `${posX}px`;
        popover.style.top = `${posY}px`;
        popover.classList.remove('hidden');
    }

    if (btnCloseProps) {
        btnCloseProps.addEventListener('click', () => {
            popover.classList.add('hidden');
        });
    }

    if (rangeV) {
        rangeV.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            numV.textContent = `${val.toFixed(1)} V`;
            if (selectedComponent) {
                selectedComponent.val = val;
                sandboxVoltage = val;
                const vLabel = document.getElementById('sandbox-voltage-label');
                if (vLabel) vLabel.textContent = `${val.toFixed(0)}V`;
                solveCircuit();
            }
        });
    }

    if (rangeR) {
        rangeR.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            numR.textContent = `${val.toFixed(1)} Ω`;
            if (selectedComponent) {
                selectedComponent.r = val;
                selectedComponent.val = `${val}Ω`;
                solveCircuit();
            }
        });
    }

    if (btnDelete) {
        btnDelete.addEventListener('click', () => {
            if (selectedComponent) {
                sound.playClick();
                sandboxNodes = sandboxNodes.filter(n => n.id !== selectedComponent.id);
                delete bulbStates[selectedComponent.id];
                delete bulbIllumination[selectedComponent.id];
                popover.classList.add('hidden');
                rebuildSandboxGraph();
                solveCircuit();
            }
        });
    }

    // --- Draggable Voltmeter & Probe Handles ---
    const voltmeterBody = document.getElementById('voltmeter-instrument');
    const probeRed = document.getElementById('probe-red');
    const probeBlack = document.getElementById('probe-black');
    const btnPhetReset = document.getElementById('btn-phet-reset');

    let probeRedPos = { x: 620, y: 460 };
    let probeBlackPos = { x: 740, y: 460 };
    let voltmeterPos = { x: 680, y: 360 };

    function initVoltmeterPositions() {
        if (!voltmeterBody || !probeRed || !probeBlack) return;
        voltmeterBody.style.left = `${voltmeterPos.x}px`;
        voltmeterBody.style.top = `${voltmeterPos.y}px`;
        probeRed.style.left = `${probeRedPos.x}px`;
        probeRed.style.top = `${probeRedPos.y}px`;
        probeBlack.style.left = `${probeBlackPos.x}px`;
        probeBlack.style.top = `${probeBlackPos.y}px`;
        updateVoltmeterReading();
    }

    function setupDrag(element, onMove) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newX = initialLeft + dx;
            const newY = initialTop + dy;
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            if (onMove) onMove(newX, newY);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
                updateVoltmeterReading();
            }
        });
    }

    setupDrag(voltmeterBody, (x, y) => { voltmeterPos = { x, y }; });
    setupDrag(probeRed, (x, y) => { probeRedPos = { x, y }; updateVoltmeterReading(); });
    setupDrag(probeBlack, (x, y) => { probeBlackPos = { x, y }; updateVoltmeterReading(); });

    function updateVoltmeterReading() {
        const vmDisplay = document.getElementById('vm-display-text');
        if (!vmDisplay || !isSandbox) return;

        if (!sandboxState.switchClosed || !isFinite(computedReq) || computedI <= 0) {
            vmDisplay.textContent = "0.0 V";
            return;
        }

        // Calculate probe distance to battery terminals or components
        const redTipX = probeRedPos.x + 2;
        const redTipY = probeRedPos.y;
        const blackTipX = probeBlackPos.x + 2;
        const blackTipY = probeBlackPos.y;

        const batNode = sandboxNodes.find(n => n.type === 'battery');
        if (batNode) {
            const distRedBatPos = Math.hypot(redTipX - (batNode.x - 24), redTipY - (batNode.y - 30));
            const distBlackBatNeg = Math.hypot(blackTipX - (batNode.x + 24), blackTipY - (batNode.y + 30));

            if (distRedBatPos < 60 && distBlackBatNeg < 60) {
                vmDisplay.textContent = `${sandboxVoltage.toFixed(1)} V`;
                return;
            }
        }

        // Measure across load components
        const activeBulbs = sandboxNodes.filter(n => n.type === 'bulb' && bulbIllumination[n.id]);
        if (activeBulbs.length > 0) {
            const vDrop = computedI * (activeBulbs[0].r || BULB_RESISTANCE);
            vmDisplay.textContent = `${vDrop.toFixed(1)} V`;
        } else {
            vmDisplay.textContent = "0.0 V";
        }
    }

    // --- Orange Reset Circular Button Handler ---
    if (btnPhetReset) {
        btnPhetReset.addEventListener('click', () => {
            sound.playClick();
            sandboxState.mode = 'series';
            sandboxState.switchClosed = true;
            sandboxVoltage = 12.0;

            const vLabel = document.getElementById('sandbox-voltage-label');
            if (vLabel) vLabel.textContent = "12V";

            const switchBtnIcon = document.querySelector('[data-tool="toggle-switch"] i');
            if (switchBtnIcon) switchBtnIcon.className = "fa-solid fa-toggle-on text-green";

            sandboxNodes = [
                { id: 'bat', type: 'battery', x: 140, y: 300, label: 'Baterai', val: 12.0, r: 0 },
                { id: 'sw', type: 'switch', x: 280, y: 300, label: 'Saklar', val: 0, r: 0 },
                { id: 'L1', type: 'bulb', x: 440, y: 300, label: 'Lampu L1', val: 10.0, r: 10, color: 'gold' },
                { id: 'L2', type: 'bulb', x: 620, y: 300, label: 'Lampu L2', val: 10.0, r: 10, color: 'cyan' }
            ];
            bulbStates = { L1: 'installed', L2: 'installed' };
            popover.classList.add('hidden');
            rebuildSandboxGraph();
            solveCircuit();
            initVoltmeterPositions();
        });
    }

    // --- PhET Palette Drawer Click & Add Handlers ---
    document.querySelectorAll('.phet-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!isSandbox) return;
            sound.playClick();
            const type = e.currentTarget.dataset.add;

            const loads = sandboxNodes.filter(n => n.type !== 'battery');
            if (loads.length >= 6) {
                alert("Maksimal 6 komponen di Lab Bebas PhET!");
                return;
            }

            const nextId = `${type}_${sandboxNodes.length}`;
            const colors = ['gold', 'cyan', 'green', 'magenta', 'red'];
            const color = colors[loads.length % colors.length];

            const labelMap = {
                battery: 'Baterai Tambahan',
                bulb: `Lampu L${loads.length + 1}`,
                resistor: `Resistor R${loads.length + 1}`,
                switch: 'Saklar',
                fuse: 'Sekring',
                paperclip: 'Klip Kertas',
                coin: 'Koin Logam',
                pencil: 'Pensil Grafit',
                eraser: 'Penghapus Karet'
            };

            const newNode = {
                id: nextId,
                type: type,
                x: 400,
                y: 300,
                label: labelMap[type] || type,
                color: color,
                r: (type === 'pencil' ? 25 : (type === 'eraser' ? Infinity : 10))
            };

            sandboxNodes.push(newNode);
            bulbStates[nextId] = 'installed';

            const updatedLoads = sandboxNodes.filter(n => n.type !== 'battery');
            if (sandboxState.mode === 'parallel') {
                const yPositions = [140, 220, 300, 380, 460, 520];
                updatedLoads.forEach((b, idx) => {
                    b.x = 500;
                    b.y = yPositions[idx] || (140 + idx * 70);
                });
            } else {
                const startX = 260;
                const spacing = Math.min(110, 540 / updatedLoads.length);
                updatedLoads.forEach((b, idx) => {
                    b.x = startX + idx * spacing;
                    b.y = 300;
                });
            }

            rebuildSandboxGraph();
            solveCircuit();
        });
    });

    // Palette scroll buttons
    const paletteScroll = document.getElementById('phet-palette-list');
    if (paletteScroll) {
        document.getElementById('phet-scroll-up').addEventListener('click', () => {
            paletteScroll.scrollBy({ top: -80, behavior: 'smooth' });
        });
        document.getElementById('phet-scroll-down').addEventListener('click', () => {
            paletteScroll.scrollBy({ top: 80, behavior: 'smooth' });
        });
    }

    // View Mode Toggle (Real vs Schematic)
    const btnViewReal = document.getElementById('btn-view-real');
    const btnViewSchematic = document.getElementById('btn-view-schematic');

    if (btnViewReal && btnViewSchematic) {
        btnViewReal.addEventListener('click', () => {
            sound.playClick();
            phetViewMode = 'real';
            btnViewReal.classList.add('active');
            btnViewSchematic.classList.remove('active');
            renderCircuitDOM();
        });

        btnViewSchematic.addEventListener('click', () => {
            sound.playClick();
            phetViewMode = 'schematic';
            btnViewSchematic.classList.add('active');
            btnViewReal.classList.remove('active');
            renderCircuitDOM();
        });
    }

    // Control Box Inputs
    const toggleCurr = document.getElementById('phet-toggle-current');
    if (toggleCurr) {
        toggleCurr.addEventListener('change', () => {
            initElectronParticleDOM();
        });
    }

    document.querySelectorAll('input[name="phetCurrentType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            phetCurrentType = e.target.value;
            initElectronParticleDOM();
        });
    });

    const toggleLabels = document.getElementById('phet-toggle-labels');
    if (toggleLabels) {
        toggleLabels.addEventListener('change', (e) => {
            phetShowLabels = e.target.checked;
            renderCircuitDOM();
        });
    }

    const toggleValues = document.getElementById('phet-toggle-values');
    if (toggleValues) {
        toggleValues.addEventListener('change', (e) => {
            phetShowValues = e.target.checked;
            renderCircuitDOM();
        });
    }

    // --- Legacy Toolbar Handlers ---
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            sound.playClick();
            const action = e.currentTarget.dataset.tool;

            if (action === 'add-series') {
                sandboxState.mode = 'series';
                rebuildSandboxGraph();
                solveCircuit();
            }
            else if (action === 'add-parallel') {
                sandboxState.mode = 'parallel';
                rebuildSandboxGraph();
                solveCircuit();
            }
            else if (action === 'toggle-switch') {
                sandboxState.switchClosed = !sandboxState.switchClosed;
                const btnIcon = btn.querySelector('i');
                if (btnIcon) {
                    btnIcon.className = sandboxState.switchClosed ? "fa-solid fa-toggle-on text-green" : "fa-solid fa-toggle-off text-red";
                }
                solveCircuit();
            }
            else if (action === 'change-voltage') {
                const voltages = [3.0, 6.0, 12.0, 24.0];
                const curIdx = voltages.indexOf(sandboxVoltage);
                sandboxVoltage = voltages[(curIdx + 1) % voltages.length];
                const label = document.getElementById('sandbox-voltage-label');
                if (label) label.textContent = `${sandboxVoltage}V`;
                solveCircuit();
            }
            else if (action === 'remove-bulb') {
                const loads = sandboxNodes.filter(n => n.type !== 'battery');
                if (loads.length <= 1) {
                    alert("Minimal harus ada 1 komponen di Lab Bebas!");
                    return;
                }
                const lastLoad = loads.pop();
                sandboxNodes = sandboxNodes.filter(n => n.id !== lastLoad.id);
                delete bulbStates[lastLoad.id];
                delete bulbIllumination[lastLoad.id];
                rebuildSandboxGraph();
                solveCircuit();
            }
            else if (action === 'clear-all') {
                if (btnPhetReset) btnPhetReset.click();
            }
        });
    });

    // --- Level Loading ---
    function loadLevel(levelNum) {
        currentLevel = (levelNum === 'sandbox') ? 'sandbox' : parseInt(levelNum);
        isSandbox = (levelNum === 'sandbox');

        if (timerInterval) clearInterval(timerInterval);
        const existingTimer = document.getElementById('timer-box');
        if (existingTimer) existingTimer.remove();

        const sandboxTools = document.getElementById('sandbox-tools');
        const phetLeftPalette = document.getElementById('phet-left-palette');
        const phetRightPanel = document.getElementById('phet-right-panel');
        const phetResetBtn = document.getElementById('btn-phet-reset');
        const voltmeterInst = document.getElementById('voltmeter-instrument');
        const probeRedEl = document.getElementById('probe-red');
        const probeBlackEl = document.getElementById('probe-black');

        if (isSandbox) {
            sandboxTools.classList.remove('hidden');
            if (phetLeftPalette) phetLeftPalette.classList.remove('hidden');
            if (phetRightPanel) phetRightPanel.classList.remove('hidden');
            if (phetResetBtn) phetResetBtn.classList.remove('hidden');
            if (voltmeterInst) voltmeterInst.classList.remove('hidden');
            if (probeRedEl) probeRedEl.classList.remove('hidden');
            if (probeBlackEl) probeBlackEl.classList.remove('hidden');

            document.getElementById('stage-name').textContent = "Lab Bebas PhET Simulator";
            document.getElementById('mission-title').textContent = "Eksperimen PhET Circuit Construction Kit";
            document.getElementById('mission-desc').textContent = "Pilih komponen di palet kiri, sambungkan sirkuit, ubah voltase/hambatan, dan ukur tegangan menggunakan Probe Voltmeter!";
            document.getElementById('current-level-num').textContent = "LAB";
            document.getElementById('target-badges').innerHTML = '<span class="badge badge-on">Modus PhET Simulator</span>';
            document.getElementById('hint-text').innerHTML = "Klik komponen untuk mengubah voltase/hambatan. Tarik <b>Probe Merah (+)</b> dan <b>Hitam (-)</b> Voltmeter untuk mengukur tegangan.";
            
            bulbStates = {};
            sandboxNodes.forEach(n => { if (n.type === 'bulb') bulbStates[n.id] = 'installed'; });
            rebuildSandboxGraph();
            initVoltmeterPositions();
        } else {
            sandboxTools.classList.add('hidden');
            if (phetLeftPalette) phetLeftPalette.classList.add('hidden');
            if (phetRightPanel) phetRightPanel.classList.add('hidden');
            if (phetResetBtn) phetResetBtn.classList.add('hidden');
            if (voltmeterInst) voltmeterInst.classList.add('hidden');
            if (probeRedEl) probeRedEl.classList.add('hidden');
            if (probeBlackEl) probeBlackEl.classList.add('hidden');
            if (popover) popover.classList.add('hidden');

            const lvl = LEVELS[currentLevel];

            document.getElementById('stage-name').textContent = `Rangkaian: ${lvl.title}`;
            document.getElementById('mission-title').textContent = lvl.subtitle;
            document.getElementById('mission-desc').textContent = lvl.targetDesc;
            document.getElementById('hint-text').innerHTML = lvl.hint;
            document.getElementById('current-level-num').textContent = currentLevel;

            // Target badges
            const badgesBox = document.getElementById('target-badges');
            badgesBox.innerHTML = '';
            Object.keys(lvl.targets).forEach(bId => {
                const targetState = lvl.targets[bId];
                const badge = document.createElement('span');
                badge.className = `badge ${targetState === 'OFF' || targetState === 'REMOVED' ? 'badge-off' : 'badge-on'}`;
                badge.innerHTML = `<i class="fa-solid ${targetState === 'OFF' || targetState === 'REMOVED' ? 'fa-lightbulb' : 'fa-bolt'}"></i> ${bId}: ${targetState}`;
                badgesBox.appendChild(badge);
            });

            // Reset bulb states
            bulbStates = {};
            lvl.nodes.forEach(n => {
                if (n.type === 'bulb') bulbStates[n.id] = 'installed';
            });

            if (currentLevel === 5) {
                timeRemaining = 60;
                startTimer();
            }
        }

        // Active tab CSS
        document.querySelectorAll('.level-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.level == levelNum);
        });

        solveCircuit();
    }

    function startTimer() {
        const existingTimer = document.getElementById('timer-box');
        if (existingTimer) existingTimer.remove();

        const timerBadge = document.createElement('div');
        timerBadge.id = 'timer-box';
        timerBadge.style.cssText = 'color: #ff3366; font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem; margin-top: 6px;';
        timerBadge.textContent = `⏱️ Waktu Tersisa: 60 dtk`;
        document.getElementById('target-badges').appendChild(timerBadge);

        timerInterval = setInterval(() => {
            timeRemaining--;
            const tb = document.getElementById('timer-box');
            if (tb) tb.textContent = `⏱️ Waktu Tersisa: ${timeRemaining} dtk`;
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                alert("Waktu Habis! Silakan coba lagi.");
                loadLevel(5);
            }
        }, 1000);
    }

    // --- Strict Victory Validation ---
    function checkVictory() {
        if (isSandbox) {
            alert("Kamu berada di Lab Bebas! Silakan berpindah ke Level 1-5 untuk menyelesaikan tantangan misi.");
            return;
        }

        const lvl = LEVELS[currentLevel];
        let isPassed = true;

        Object.keys(lvl.targets).forEach(bId => {
            const required = lvl.targets[bId];
            if (required === 'OFF') {
                if (bulbIllumination[bId] !== false) isPassed = false;
            } else if (required === 'ON') {
                if (bulbIllumination[bId] !== true) isPassed = false;
            } else if (required === 'REMOVED') {
                if (bulbStates[bId] !== 'unscrewed') isPassed = false;
            }
        });

        if (currentLevel === 2) {
            if (bulbStates['L0'] !== 'unscrewed') isPassed = false;
        } else if (currentLevel === 4) {
            if (bulbStates['L1'] !== 'unscrewed') isPassed = false;
            if (bulbStates['L6'] === 'unscrewed') isPassed = false;
        }

        if (isPassed) {
            sound.playVictory();
            if (timerInterval) clearInterval(timerInterval);

            document.getElementById('victory-title').textContent = `Misi Level ${currentLevel} Tuntas! 🎉`;
            document.getElementById('victory-message').textContent = `Hebat! Kamu berhasil mengidentifikasi Pemutus Arus yang tepat pada ${lvl.title}.`;
            document.getElementById('victory-explanation').innerHTML = lvl.explanation;

            document.getElementById('modal-victory').classList.remove('hidden');
        } else {
            sound.playSpark();
            alert("Target belum tercapai! Periksa kembali kondisi lampu yang harus menyala / padam sesuai petunjuk misi.");
        }
    }

    // --- Event Listeners ---
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            sound.playClick();
            loadLevel(e.currentTarget.dataset.level);
        });
    });

    document.getElementById('btn-check').addEventListener('click', checkVictory);

    document.getElementById('btn-reset').addEventListener('click', () => {
        sound.playClick();
        loadLevel(currentLevel);
    });

    document.getElementById('toggle-current-vision').addEventListener('change', (e) => {
        showCurrentVision = e.target.checked;
        initElectronParticleDOM();
    });

    // Modal controls
    document.getElementById('btn-theory').addEventListener('click', () => {
        sound.playClick();
        document.getElementById('modal-theory').classList.remove('hidden');
    });

    document.getElementById('btn-close-theory').addEventListener('click', () => {
        sound.playClick();
        document.getElementById('modal-theory').classList.add('hidden');
    });

    document.getElementById('btn-understand').addEventListener('click', () => {
        sound.playClick();
        document.getElementById('modal-theory').classList.add('hidden');
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
        sound.playClick();
        document.getElementById('modal-victory').classList.add('hidden');
        if (currentLevel < 5) {
            loadLevel(currentLevel + 1);
        } else {
            loadLevel('sandbox');
        }
    });

    document.getElementById('btn-replay-level').addEventListener('click', () => {
        sound.playClick();
        document.getElementById('modal-victory').classList.add('hidden');
        loadLevel(currentLevel);
    });

    document.getElementById('btn-sandbox-toggle').addEventListener('click', () => {
        sound.playClick();
        loadLevel('sandbox');
    });

    // Initial Launch
    loadLevel(1);
    animateElectrons();
});
