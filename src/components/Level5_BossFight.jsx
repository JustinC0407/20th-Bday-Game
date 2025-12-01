import React, { useRef, useState, useEffect } from 'react';

// ============ CONSTANTS ============
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

// Game Settings
const PLAYER_SPEED = 375; // 3/4 of original speed (500 * 0.75) 
const PROJECTILE_SPEED = 700;
const FIRE_RATE = 200; 
const BOSS_MAX_HEALTH = 50;

// Lane Settings
const LANE_HEIGHT = 80;
const LANE_BOTTOM_Y = SCREEN_HEIGHT - 80; 
const LANE_TOP_Y = SCREEN_HEIGHT - 160;   

// LOGICAL HITBOX (Physics)
const PLAYER_SIZE = { w: 50, h: 50 }; 
// VISUAL SPRITE (Drawing)
const SPRITE_SIZE = 80; 
const SPRITE_OFFSET_X = (PLAYER_SIZE.w - SPRITE_SIZE) / 2; // Center horizontally
const SPRITE_OFFSET_Y = PLAYER_SIZE.h - SPRITE_SIZE + 10;  // Align feet

const BOSS_SIZE = { w: 200, h: 150 };
const PROJECTILE_SIZE = { w: 10, h: 20 };

// Colors
const COLORS = {
  skyPhase1: '#FFD700', 
  skyPhase2: '#191970', 
  road: '#333333',
  laneDivider: '#FFFF00',
  player: '#00FF00',    
  bossPhase1: '#FFA500', 
  bossPhase2: '#FF4500', 
  taxi: '#FFFF00',
  pigeon: '#A9A9A9',
  shockwaveWarn: 'rgba(255, 0, 0, 0.3)',
  shockwaveActive: '#FF0000',
  projectile: '#FF69B4', 
  warningSign: '#FF4500' 
};

function Level5_BossFight({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({});

  // Logic Refs
  const lastTimeRef = useRef(performance.now());
  const lastShotTimeRef = useRef(0);
  const attackTimerRef = useRef(0); 
  
  // Sprite Refs
  const spriteRefs = useRef({
    standing: null,
    runLeft1: null, runLeft2: null, runLeft3: null,
    runRight1: null, runRight2: null, runRight3: null
  });

  // Background Image Refs
  const backgroundDayRef = useRef(null);
  const backgroundNightRef = useRef(null);
  const roadOverlayRef = useRef(null);

  // Hazard Image Refs
  const birdImageRef = useRef(null);
  const carLeftImageRef = useRef(null);
  const carRightImageRef = useRef(null);

  // Boss Image Refs
  const bossPhase1ImageRef = useRef(null);
  const bossPhase2ImageRef = useRef(null);
  const bossDeadImageRef = useRef(null);

  // Audio Refs
  const backgroundMusicRef = useRef(null);
  const attackSoundRef = useRef(null);
  const birdSoundRef = useRef(null);
  const carSoundRef = useRef(null);

  // Animation State
  const [animationState, setAnimationState] = useState('idle');
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationTimerRef = useRef(0);
  const animationStateRef = useRef('idle');
  const animationFrameRef = useRef(0);

  // Game State
  const [gameState, setGameState] = useState({
    gameStarted: true,
    gameOver: false,
    levelCompleted: false,
    phase: 1, 
    player: { x: SCREEN_WIDTH / 2, lane: 1, y: LANE_BOTTOM_Y + 15, invincible: false, invincibilityTimer: 0 },
    boss: { x: SCREEN_WIDTH / 2 - BOSS_SIZE.w / 2, y: 50, health: BOSS_MAX_HEALTH, dir: 1 },
    projectiles: [],
    hazards: [], 
    particles: [] 
  });

  // ============ ASSET LOADING ============
  useEffect(() => {
    const loadImg = (src) => {
      const img = new Image();
      img.src = src;
      return img;
    };
    spriteRefs.current = {
      standing: loadImg('/src/assets/sprites/standing.png'),
      runLeft1: loadImg('/src/assets/sprites/runleft1.png'),
      runLeft2: loadImg('/src/assets/sprites/runleft2.png'),
      runLeft3: loadImg('/src/assets/sprites/runleft3.png'),
      runRight1: loadImg('/src/assets/sprites/runright1.png'),
      runRight2: loadImg('/src/assets/sprites/runright2.png'),
      runRight3: loadImg('/src/assets/sprites/runright3.png')
    };
  }, []);

  // Load background images
  useEffect(() => {
    // Day background
    const dayBg = new Image();
    dayBg.onload = () => { backgroundDayRef.current = dayBg; };
    dayBg.onerror = () => { console.warn('Failed to load /level_5_day.png'); };
    dayBg.src = '/level_5_day.png';

    // Night background
    const nightBg = new Image();
    nightBg.onload = () => { backgroundNightRef.current = nightBg; };
    nightBg.onerror = () => { console.warn('Failed to load /level_5_night.png'); };
    nightBg.src = '/level_5_night.png';

    // Road overlay
    const road = new Image();
    road.onload = () => { roadOverlayRef.current = road; };
    road.onerror = () => { console.warn('Failed to load road overlay'); };
    road.src = '/level_5_road.png';
  }, []);

  // Load hazard images
  useEffect(() => {
    // Bird image
    const bird = new Image();
    bird.onload = () => { birdImageRef.current = bird; };
    bird.onerror = () => { console.warn('Failed to load bird image'); };
    bird.src = '/src/assets/photos/level_5_bird.png';

    // Car left image
    const carLeft = new Image();
    carLeft.onload = () => { carLeftImageRef.current = carLeft; };
    carLeft.onerror = () => { console.warn('Failed to load car left image'); };
    carLeft.src = '/src/assets/photos/level_5_car_face_left.png';

    // Car right image
    const carRight = new Image();
    carRight.onload = () => { carRightImageRef.current = carRight; };
    carRight.onerror = () => { console.warn('Failed to load car right image'); };
    carRight.src = '/src/assets/photos/level_5_car_face_right.png';
  }, []);

  // Load boss images
  useEffect(() => {
    // Boss Phase 1 image
    const bossPhase1 = new Image();
    bossPhase1.onload = () => { bossPhase1ImageRef.current = bossPhase1; };
    bossPhase1.onerror = () => { console.warn('Failed to load boss phase 1 image'); };
    bossPhase1.src = '/src/assets/photos/level_5_boss_phase_1.png';

    // Boss Phase 2 image
    const bossPhase2 = new Image();
    bossPhase2.onload = () => { bossPhase2ImageRef.current = bossPhase2; };
    bossPhase2.onerror = () => { console.warn('Failed to load boss phase 2 image'); };
    bossPhase2.src = '/src/assets/photos/level_5_boss_phase_2.png';

    // Boss Dead image
    const bossDead = new Image();
    bossDead.onload = () => { bossDeadImageRef.current = bossDead; };
    bossDead.onerror = () => { console.warn('Failed to load boss dead image'); };
    bossDead.src = '/src/assets/photos/level_5_boss_dead.png';
  }, []);

  // Load audio files
  useEffect(() => {
    // Background music
    const bgMusic = new Audio('/src/assets/audio/level_5.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.3; // 30% volume (like Level 1 platformer)
    bgMusic.preload = 'auto';
    backgroundMusicRef.current = bgMusic;

    // Attack sound
    const attackSound = new Audio('/src/assets/audio/level_5_attack.mp3');
    attackSound.volume = 0.5; // 50% volume
    attackSound.preload = 'auto';
    attackSoundRef.current = attackSound;

    // Bird spawn sound
    const birdSound = new Audio('/src/assets/audio/level_5_bird.mp3');
    birdSound.volume = 0.4; // 40% volume
    birdSound.preload = 'auto';
    birdSoundRef.current = birdSound;

    // Car spawn sound
    const carSound = new Audio('/src/assets/audio/level_5_car.mp3');
    carSound.volume = 0.5; // 50% volume
    carSound.preload = 'auto';
    carSoundRef.current = carSound;

    return () => {
      // Cleanup all audio on unmount
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  // Start background music when game begins
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.levelCompleted && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(err => {
        console.warn('Background music playback failed:', err);
      });
    }
  }, [gameState.gameStarted, gameState.gameOver, gameState.levelCompleted]);

  // Sync animation refs to state for rendering
  useEffect(() => {
    const syncInterval = setInterval(() => {
      // Only update state when values actually change
      if (animationStateRef.current !== animationState) {
        setAnimationState(animationStateRef.current);
      }
      if (animationFrameRef.current !== animationFrame) {
        setAnimationFrame(animationFrameRef.current);
      }
    }, 1000/60); // Check at 60 FPS

    return () => clearInterval(syncInterval);
  }, [animationState, animationFrame]);

  // Detect game over when lives run out
  useEffect(() => {
    if (lives <= 0 && gameState.gameStarted && !gameState.levelCompleted && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
    }
  }, [lives, gameState.gameStarted, gameState.levelCompleted, gameState.gameOver]);

  const getCurrentSprite = () => {
    const sprites = spriteRefs.current;
    switch (animationState) {
      case 'runLeft': return [sprites.runLeft1, sprites.runLeft2, sprites.runLeft3][animationFrame] || null;
      case 'runRight': return [sprites.runRight1, sprites.runRight2, sprites.runRight3][animationFrame] || null;
      default: return sprites.standing || null;
    }
  };

  // ============ INPUT HANDLING ============
  useEffect(() => {
    const handleKeyDown = (e) => keysRef.current[e.code] = true;
    const handleKeyUp = (e) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  // ============ HELPER FUNCTIONS ============
  const checkCollision = (rect1, rect2) => {
    return (rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x && rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y);
  };

  const spawnParticles = (x, y, color, count) => {
    const parts = [];
    for(let i=0; i<count; i++) {
      parts.push({ x, y, vx: (Math.random()-0.5)*300, vy: (Math.random()-0.5)*300, life: 0.5, color });
    }
    return parts;
  };

  const handleRetry = () => {
    onResetLives();
    setGameState({
      gameStarted: true,
      gameOver: false,
      levelCompleted: false,
      phase: 1,
      player: { x: SCREEN_WIDTH / 2, lane: 1, y: LANE_BOTTOM_Y + 15, invincible: false, invincibilityTimer: 0 },
      boss: { x: SCREEN_WIDTH / 2 - BOSS_SIZE.w / 2, y: 50, health: BOSS_MAX_HEALTH, dir: 1 },
      projectiles: [],
      hazards: [],
      particles: []
    });
    animationStateRef.current = 'idle';
    animationFrameRef.current = 0;
    animationTimerRef.current = 0;
  };

  const handleReturnToHub = () => {
    onReturnToHub();
  };

  const fadeOutMusic = () => {
    if (!backgroundMusicRef.current) return;

    const audio = backgroundMusicRef.current;
    const fadeDuration = 1500; // 1.5 seconds
    const fadeInterval = 50; // Update every 50ms
    const steps = fadeDuration / fadeInterval;
    const volumeStep = audio.volume / steps;

    const fadeTimer = setInterval(() => {
      if (audio.volume > volumeStep) {
        audio.volume = Math.max(0, audio.volume - volumeStep);
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(fadeTimer);
      }
    }, fadeInterval);
  };

  // Fade out music when level completes or player loses
  useEffect(() => {
    if ((gameState.levelCompleted || gameState.gameOver) && backgroundMusicRef.current) {
      fadeOutMusic();
    }
  }, [gameState.levelCompleted, gameState.gameOver]);

  // ============ SPAWN LOGIC (WITH SAFETY LOCK RESTORED) ============
  const spawnAttack = (currentPhase, currentHazards) => {
    const attacks = [];
    
    // SAFETY CHECK: Is there ALREADY a Taxi or Shockwave (Ground Hazard) active?
    const isGroundBlocked = currentHazards.some(h => h.type === 'taxi' || h.type === 'shockwave');

    // If ground is blocked, FORCE 'rand' to fall into the Pigeon range (0.6)
    // This prevents spawning a second ground hazard that makes the game impossible.
    let rand = isGroundBlocked ? 0.6 : Math.random();
    
    // --- ATTACK 1: TAXI DASH ---
    if (rand < 0.5) {
      const speed = currentPhase === 1 ? 350 : 450;
      const count = currentPhase === 1 ? 1 : 2;
      const batchLane = Math.random() > 0.5 ? 1 : 2;
      const fromLeft = Math.random() > 0.5;
      const yPos = batchLane === 1 ? LANE_BOTTOM_Y + 20 : LANE_TOP_Y + 20;

      for(let i=0; i<count; i++) {
        const offsetX = i * 250;
        attacks.push({
          type: 'taxi', lane: batchLane,
          x: fromLeft ? -150 - offsetX : SCREEN_WIDTH + 150 + offsetX,
          y: yPos, w: 100, h: 40, vx: fromLeft ? speed : -speed, vy: 0,
          spawnTimer: 1.5, spawnSide: fromLeft ? 'left' : 'right'
        });
      }

      // Play car sound (once per spawn event, not per taxi)
      if (carSoundRef.current) {
        carSoundRef.current.currentTime = 0;
        carSoundRef.current.play().catch(err => console.warn('Car sound failed:', err));
      }
    } 
    // --- ATTACK 2: PIGEON SWOOP ---
    else if (rand < 0.8) {
      const count = currentPhase === 1 ? 2 : 3;
      for(let i=0; i<count; i++) {
        attacks.push({
          type: 'pigeon', lane: 0,
          x: Math.random() * SCREEN_WIDTH, y: -50 - (Math.random() * 200),
          w: 30, h: 30, vx: (Math.random()-0.5)*200, vy: currentPhase === 1 ? 200 : 300
        });
      }

      // Play bird sound (once per spawn event, not per bird)
      if (birdSoundRef.current) {
        birdSoundRef.current.currentTime = 0;
        birdSoundRef.current.play().catch(err => console.warn('Bird sound failed:', err));
      }
    }
    // --- ATTACK 3: SHOCKWAVE ---
    else {
      const targetLane = Math.random() > 0.5 ? 1 : 2;
      const yPos = targetLane === 1 ? LANE_BOTTOM_Y : LANE_TOP_Y;
      attacks.push({
        type: 'shockwave', lane: targetLane, 
        x: 0, y: yPos, w: SCREEN_WIDTH, h: LANE_HEIGHT, vx: 0, vy: 0,
        warning: 2.0, active: 0.5 
      });
    }
    return attacks;
  };

  // ============ GAME LOOP ============
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.levelCompleted) return;

    const loop = (time) => {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      const dt = Math.min(deltaTime, 0.1);

      setGameState(prev => {
        const next = { ...prev };

        // --- MOVEMENT & ANIMATION ---
        let newAnim = 'idle';
        let isMoving = false;

        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) {
          next.player.x = Math.max(0, next.player.x - PLAYER_SPEED * dt);
          newAnim = 'runLeft'; isMoving = true;
        }
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) {
          next.player.x = Math.min(SCREEN_WIDTH - PLAYER_SIZE.w, next.player.x + PLAYER_SPEED * dt);
          newAnim = 'runRight'; isMoving = true;
        }
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) next.player.lane = 2;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) next.player.lane = 1;

        next.player.y = next.player.lane === 1 ? LANE_BOTTOM_Y + 15 : LANE_TOP_Y + 15;

        // --- SHOOTING ---
        if (keysRef.current['Space'] && time - lastShotTimeRef.current > FIRE_RATE) {
          lastShotTimeRef.current = time;
          next.projectiles.push({
            x: next.player.x + PLAYER_SIZE.w/2 - PROJECTILE_SIZE.w/2, y: next.player.y,
            w: PROJECTILE_SIZE.w, h: PROJECTILE_SIZE.h, active: true
          });

          // Play attack sound (allow overlapping)
          if (attackSoundRef.current) {
            const attackClone = attackSoundRef.current.cloneNode();
            attackClone.play().catch(err => console.warn('Attack sound failed:', err));
          }
        }

        // --- BOSS ---
        next.boss.x += 150 * next.boss.dir * dt;
        if (next.boss.x <= 50 || next.boss.x + BOSS_SIZE.w >= SCREEN_WIDTH - 50) next.boss.dir *= -1;
        if (next.boss.health <= BOSS_MAX_HEALTH / 2 && next.phase === 1) next.phase = 2;

        if (next.boss.health <= 0) {
            next.levelCompleted = true; next.boss.health = 0;
            setTimeout(() => { onComplete({ title: "Chaos Subsided", type: "text", content: "NYC is crazy, but we conquered it together!" }); }, 2500);
            return next;
        }

        // --- SPAWNING ---
        attackTimerRef.current -= dt;
        if (attackTimerRef.current <= 0) {
          // Slightly reduced attack frequency to account for longer hazard duration
          attackTimerRef.current = next.phase === 1 ? 1.8 : 1.2; 
          // PASS CURRENT HAZARDS to enable the Safety Lock
          next.hazards.push(...spawnAttack(next.phase, next.hazards));
        }

        // --- PHYSICS ---
        next.projectiles = next.projectiles.filter(p => {
          p.y -= PROJECTILE_SPEED * dt;
          if (p.active && checkCollision(p, { ...next.boss, w: BOSS_SIZE.w, h: BOSS_SIZE.h })) {
            next.boss.health -= 1; next.particles.push(...spawnParticles(p.x, p.y, COLORS.bossPhase2, 5)); return false; 
          }
          return p.y > -50; 
        });

        if (next.player.invincible) {
          next.player.invincibilityTimer -= dt;
          if (next.player.invincibilityTimer <= 0) next.player.invincible = false;
        }

        const playerBox = { x: next.player.x, y: next.player.y, w: PLAYER_SIZE.w, h: PLAYER_SIZE.h };

        next.hazards = next.hazards.filter(h => {
          let isHit = false;
          if (h.type === 'taxi') {
             if (h.spawnTimer > 0) { h.spawnTimer -= dt; return true; }
             else { h.x += h.vx * dt; if (next.player.lane === h.lane && checkCollision(h, playerBox)) isHit = true; }
          }
          else if (h.type === 'shockwave') {
            if (h.warning > 0) h.warning -= dt;
            else { h.active -= dt; if (h.active > 0 && next.player.lane === h.lane) isHit = true; }
            if (h.active <= 0) return false; 
          }
          else if (h.type === 'pigeon') {
            h.x += h.vx * dt; h.y += h.vy * dt; if (checkCollision(h, playerBox)) isHit = true;
          }

          if (isHit && !next.player.invincible) {
            next.player.invincible = true; next.player.invincibilityTimer = 2.0; onLoseLife();
          }
          return h.x > -400 && h.x < SCREEN_WIDTH + 400 && h.y < SCREEN_HEIGHT + 50;
        });

        next.particles = next.particles.filter(p => { p.life -= dt; return p.life > 0; });

        // --- ANIMATION (Using refs to avoid state batching issues) ---
        // Update refs if animation state changed
        if (newAnim !== animationStateRef.current) {
          animationStateRef.current = newAnim;
          animationFrameRef.current = 0;
          animationTimerRef.current = 0;
        }

        // Handle frame animation timing for running animations
        if (isMoving) {
          animationTimerRef.current += 1;
          if (animationTimerRef.current >= 12) { // 12 frames = ~200ms at 60fps
            animationTimerRef.current = 0;
            animationFrameRef.current = (animationFrameRef.current + 1) % 3; // Cycles: 0 → 1 → 2 → 0
          }
        } else {
          // Reset to idle frame when not moving
          animationFrameRef.current = 0;
          animationTimerRef.current = 0;
        }

        return next;
      });

      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState.gameStarted, gameState.gameOver, gameState.levelCompleted]);

  // ============ RENDERING ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Background image based on phase
    const bgImage = gameState.phase === 1 ? backgroundDayRef.current : backgroundNightRef.current;
    if (bgImage && bgImage.complete) {
      ctx.drawImage(bgImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    } else {
      // Fallback: solid color fill if image not loaded
      ctx.fillStyle = gameState.phase === 1 ? COLORS.skyPhase1 : COLORS.skyPhase2;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    ctx.fillStyle = gameState.phase === 1 ? '#555' : '#222';
    ctx.fillRect(50, SCREEN_HEIGHT - 400, 100, 240);
    ctx.fillRect(200, SCREEN_HEIGHT - 500, 150, 340);
    ctx.fillRect(SCREEN_WIDTH - 300, SCREEN_HEIGHT - 450, 120, 290);

    // Road
    ctx.fillStyle = '#444'; ctx.fillRect(0, LANE_TOP_Y, SCREEN_WIDTH, LANE_HEIGHT);
    ctx.fillStyle = COLORS.laneDivider; for(let i=0; i<SCREEN_WIDTH; i+=100) ctx.fillRect(i, LANE_BOTTOM_Y - 2, 50, 4);
    ctx.fillStyle = '#444'; ctx.fillRect(0, LANE_BOTTOM_Y, SCREEN_WIDTH, LANE_HEIGHT);

    // Road overlay texture
    if (roadOverlayRef.current && roadOverlayRef.current.complete) {
      // Draw road overlay covering both lanes
      const roadStartY = LANE_TOP_Y;
      const roadHeight = (LANE_BOTTOM_Y + LANE_HEIGHT) - LANE_TOP_Y;
      ctx.drawImage(roadOverlayRef.current, 0, roadStartY, SCREEN_WIDTH, roadHeight);
    }

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '16px monospace';
    ctx.fillText("LANE 2 (UP)", 20, LANE_TOP_Y + 45); ctx.fillText("LANE 1 (DOWN)", 20, LANE_BOTTOM_Y + 45);

    // Boss - select image based on state
    let bossImage;
    if (gameState.levelCompleted) {
      // Player won - boss is dead
      bossImage = bossDeadImageRef.current;
    } else if (gameState.phase === 1) {
      // Phase 1 - health > 50%
      bossImage = bossPhase1ImageRef.current;
    } else {
      // Phase 2 - health ≤ 50%
      bossImage = bossPhase2ImageRef.current;
    }

    if (bossImage && bossImage.complete) {
      // Draw boss image
      ctx.drawImage(bossImage, gameState.boss.x, gameState.boss.y, BOSS_SIZE.w, BOSS_SIZE.h);
    } else {
      // Fallback: colored rectangle with eyes
      ctx.fillStyle = gameState.phase === 1 ? COLORS.bossPhase1 : COLORS.bossPhase2;
      ctx.fillRect(gameState.boss.x, gameState.boss.y, BOSS_SIZE.w, BOSS_SIZE.h);
      ctx.fillStyle = '#FFF'; ctx.beginPath();
      ctx.arc(gameState.boss.x + 50, gameState.boss.y + 50, 20, 0, Math.PI * 2);
      ctx.arc(gameState.boss.x + 150, gameState.boss.y + 50, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health
    ctx.fillStyle = '#333'; ctx.fillRect(gameState.boss.x, gameState.boss.y - 20, BOSS_SIZE.w, 10);
    ctx.fillStyle = '#FF0000'; ctx.fillRect(gameState.boss.x, gameState.boss.y - 20, BOSS_SIZE.w * (gameState.boss.health/BOSS_MAX_HEALTH), 10);

    // Hazards
    gameState.hazards.forEach(h => {
      if (h.type === 'taxi') {
        if (h.spawnTimer > 0) {
            ctx.fillStyle = COLORS.warningSign;
            const warnX = h.spawnSide === 'left' ? 20 : SCREEN_WIDTH - 60;
            ctx.fillRect(warnX, h.y, 40, 40);
            ctx.fillStyle = '#FFF'; ctx.font = '30px monospace'; ctx.fillText("!", warnX + 12, h.y + 30);
        } else {
            // Select car image based on direction
            const carImage = h.vx > 0 ? carRightImageRef.current : carLeftImageRef.current;

            if (carImage && carImage.complete) {
              // Draw directional car image 1.5x larger, centered at same position
              ctx.drawImage(carImage, h.x - h.w*0.25, h.y - h.h*0.25, h.w*1.5, h.h*1.5);
            } else {
              // Fallback: yellow rectangle with headlight
              ctx.fillStyle = COLORS.taxi;
              ctx.fillRect(h.x, h.y, h.w, h.h);
              ctx.fillStyle = '#FFF';
              h.vx > 0 ? ctx.fillRect(h.x+h.w-10, h.y+5, 10, 10) : ctx.fillRect(h.x, h.y+5, 10, 10);
            }
        }
      } else if (h.type === 'shockwave') {
        ctx.fillStyle = h.warning > 0 ? COLORS.shockwaveWarn : COLORS.shockwaveActive;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        if (h.warning > 0) { ctx.fillStyle = '#FFF'; ctx.font = '20px monospace'; ctx.fillText("!!! MOVE !!!", SCREEN_WIDTH/2 - 50, h.y + 45); }
      } else if (h.type === 'pigeon') {
        if (birdImageRef.current && birdImageRef.current.complete) {
          // Draw bird image 1.5x larger, centered at pigeon position
          ctx.drawImage(birdImageRef.current, h.x - (h.w*1.5)/2, h.y - (h.h*1.5)/2, h.w*1.5, h.h*1.5);
        } else {
          // Fallback: gray circle
          ctx.fillStyle = COLORS.pigeon;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.w/2, 0, Math.PI*2);
          ctx.fill();
        }
      }
    });

    // Projectiles
    ctx.fillStyle = COLORS.projectile;
    gameState.projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w, 0, Math.PI*2); ctx.fill(); });

    // Player (Corrected Sprite Drawing)
    const shouldFlash = gameState.player.invincible && Math.floor(Date.now() / 100) % 2 === 1;
    if (!shouldFlash) {
      const currentSprite = getCurrentSprite();
      if (currentSprite) {
        ctx.drawImage(currentSprite, gameState.player.x + SPRITE_OFFSET_X, gameState.player.y + SPRITE_OFFSET_Y, SPRITE_SIZE, SPRITE_SIZE);
      } else {
        ctx.fillStyle = COLORS.player; ctx.fillRect(gameState.player.x, gameState.player.y, PLAYER_SIZE.w, PLAYER_SIZE.h);
      }
    }

    // Particles
    gameState.particles.forEach(p => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); });

  }, [gameState, animationState, animationFrame]);

  // ============ UI & RETRY ============
  return (
    <div className="canvas-container">
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: '"Press Start 2P", monospace', zIndex: 10, textShadow: '2px 2px 0 #000' }}>
        <h2>🗽 NYC Chaos Beast</h2>
        
        {/* Visual Hearts Display */}
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
           {[...Array(3)].map((_, i) => <span key={i} style={{ fontSize: '24px', opacity: i < lives ? 1 : 0.3 }}>❤️</span>)}
        </div>

        <p style={{ marginTop: '10px', fontSize: '14px' }}>Phase: {gameState.phase === 1 ? "Tourist Trouble" : "RUSH HOUR!"}</p>
        <p style={{ fontSize: '10px', color: '#FFFF00', marginTop: '5px' }}>W/S: Switch Lanes | SPACE: Shoot</p>
      </div>

      <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={{ background: '#333' }} />

      <button onClick={onReturnToHub} style={{ position: 'absolute', bottom: '20px', right: '20px', padding: '12px 24px', fontSize: '12px', fontFamily: '"Press Start 2P", monospace', background: '#8B4513', color: '#fff', border: '3px solid #fff', borderRadius: '8px', cursor: 'pointer' }}>
        Return to Hub
      </button>

      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h2>Game Over</h2>
            <p>The NYC Chaos Beast was too much!</p>
            <p>Would you like to try again or return to the hub?</p>
            <div className="game-over-buttons">
              <button className="retry-button" onClick={handleRetry}>
                🔄 Try Again
              </button>
              <button className="hub-button" onClick={handleReturnToHub}>
                🏠 Return to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Level5_BossFight;