import React, { useRef, useState, useEffect } from 'react';

// ============ CONSTANTS ============
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

// Game Settings
const PLAYER_SPEED = 400; // Pixels per second
const PROJECTILE_SPEED = 600;
const FIRE_RATE = 250; // ms between shots
const BOSS_MAX_HEALTH = 50;

// Dimensions
const PLAYER_SIZE = { w: 40, h: 40 };
const BOSS_SIZE = { w: 200, h: 150 };
const PROJECTILE_SIZE = { w: 10, h: 20 };

// Colors
const COLORS = {
  skyPhase1: '#FFD700', // Sunset Yellow
  skyPhase2: '#191970', // Midnight Blue
  player: '#00FF00',    // Green (Boyfriend)
  bossPhase1: '#FFA500', // Orange Taxi color
  bossPhase2: '#FF4500', // Angry Red/Orange
  taxi: '#FFFF00',
  pigeon: '#A9A9A9',
  shockwaveWarn: 'rgba(255, 0, 0, 0.3)',
  shockwaveActive: '#FF0000',
  projectile: '#FF69B4' // Hot Pink Love Bolts
};

function Level5_BossFight({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({});

  // Logic Refs (avoid re-renders for game loop logic)
  const lastTimeRef = useRef(performance.now());
  const lastShotTimeRef = useRef(0);
  const attackTimerRef = useRef(0); // Time until next boss attack
  
  // ============ GAME STATE ============
  const [gameState, setGameState] = useState({
    gameStarted: true,
    gameOver: false,
    levelCompleted: false,
    phase: 1, // 1 = Tourist Trouble, 2 = Rush Hour
    
    // Player
    player: { 
      x: SCREEN_WIDTH / 2, 
      y: SCREEN_HEIGHT - 80, 
      invincible: false, 
      invincibilityTimer: 0 
    },

    // Boss
    boss: { 
      x: SCREEN_WIDTH / 2 - BOSS_SIZE.w / 2, 
      y: 50, 
      health: BOSS_MAX_HEALTH, 
      dir: 1 // Movement direction
    },

    // Objects
    projectiles: [],
    hazards: [], // Taxis, Pigeons, Shockwaves
    particles: [] // Visual effects
  });

  // ============ INPUT HANDLING ============
  useEffect(() => {
    const handleKeyDown = (e) => keysRef.current[e.code] = true;
    const handleKeyUp = (e) => keysRef.current[e.code] = false;
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ============ HELPER FUNCTIONS ============
  
  // Simple AABB Collision Detection
  const checkCollision = (rect1, rect2) => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  const spawnParticles = (x, y, color, count) => {
    const parts = [];
    for(let i=0; i<count; i++) {
      parts.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 0.5, // seconds
        color
      });
    }
    return parts;
  };

  // ============ BOSS ATTACK LOGIC ============
  const spawnAttack = (currentPhase) => {
    const attacks = [];
    
    // Randomly choose an attack based on phase
    const rand = Math.random();
    
    // --- ATTACK 1: TAXI DASH ---
    if (rand < 0.4) { 
      // Phase 1: 1 Taxi. Phase 2: 2 Taxis faster.
      const speed = currentPhase === 1 ? 400 : 700;
      const count = currentPhase === 1 ? 1 : 2;
      
      for(let i=0; i<count; i++) {
        const fromLeft = Math.random() > 0.5;
        const yPos = SCREEN_HEIGHT - (40 + (i * 60)); // Lanes
        attacks.push({
          type: 'taxi',
          x: fromLeft ? -100 : SCREEN_WIDTH + 100,
          y: yPos,
          w: 80, h: 40,
          vx: fromLeft ? speed : -speed,
          vy: 0,
          warning: 0 // Instant spawn for taxi, maybe add warning later
        });
      }
    } 
    // --- ATTACK 2: PIGEON SWOOP ---
    else if (rand < 0.7) {
      // Phase 1: 3 Pigeons. Phase 2: 6 Pigeons.
      const count = currentPhase === 1 ? 3 : 6;
      for(let i=0; i<count; i++) {
        attacks.push({
          type: 'pigeon',
          x: Math.random() * SCREEN_WIDTH,
          y: -50 - (Math.random() * 200), // Staggered start
          w: 30, h: 30,
          vx: (Math.random() - 0.5) * 200, // Slight horizontal drift
          vy: currentPhase === 1 ? 200 : 350 // Fall speed
        });
      }
    }
    // --- ATTACK 3: SUBWAY SHOCKWAVE ---
    else {
      // Phase 1: 1 Wave. Phase 2: 2 Waves.
      const count = currentPhase === 1 ? 1 : 2;
      for(let i=0; i<count; i++) {
        attacks.push({
          type: 'shockwave',
          x: 0,
          y: SCREEN_HEIGHT - 20, // Ground level
          w: SCREEN_WIDTH,
          h: 20,
          vx: 0, vy: 0,
          warning: 1.5, // Seconds of warning before damage
          active: 0.5, // Seconds of active damage
          safeZoneX: Math.random() * (SCREEN_WIDTH - 100), // Safe spot hole
          safeZoneW: 100
        });
      }
    }

    return attacks;
  };

  // ============ GAME LOOP ============
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.levelCompleted) return;

    const loop = (time) => {
      const deltaTime = (time - lastTimeRef.current) / 1000; // Seconds
      lastTimeRef.current = time;

      // Cap deltaTime to prevent skipping collisions on lag
      const dt = Math.min(deltaTime, 0.1);

      setGameState(prev => {
        const next = { ...prev };
        
        // --- 1. PLAYER MOVEMENT ---
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) {
          next.player.x = Math.max(0, next.player.x - PLAYER_SPEED * dt);
        }
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) {
          next.player.x = Math.min(SCREEN_WIDTH - PLAYER_SIZE.w, next.player.x + PLAYER_SPEED * dt);
        }

        // --- 2. PLAYER SHOOTING ---
        if (keysRef.current['Space'] && time - lastShotTimeRef.current > FIRE_RATE) {
          lastShotTimeRef.current = time;
          next.projectiles.push({
            x: next.player.x + PLAYER_SIZE.w / 2 - PROJECTILE_SIZE.w / 2,
            y: next.player.y,
            w: PROJECTILE_SIZE.w,
            h: PROJECTILE_SIZE.h,
            active: true
          });
        }

        // --- 3. BOSS LOGIC ---
        // Float Left/Right
        next.boss.x += 100 * next.boss.dir * dt;
        if (next.boss.x <= 50 || next.boss.x + BOSS_SIZE.w >= SCREEN_WIDTH - 50) {
          next.boss.dir *= -1;
        }

        // Phase Transition
        if (next.boss.health <= BOSS_MAX_HEALTH / 2 && next.phase === 1) {
          next.phase = 2; // Trigger Rush Hour!
          // Push away player slightly as a "roar" effect? (Optional, skipping for simplicity)
        }

        // Win Condition
        if (next.boss.health <= 0) {
            next.levelCompleted = true;
            next.boss.health = 0;
            setTimeout(() => {
                onComplete({
                    title: "The Chaos Subsided",
                    type: "text",
                    content: "NYC is loud, crazy, and overwhelming. But with you, even the chaos feels like an adventure. I'd face any monster for you."
                });
            }, 1000);
            return next; // Stop updates
        }

        // Spawn Attacks
        attackTimerRef.current -= dt;
        if (attackTimerRef.current <= 0) {
          // Reset timer based on phase (Phase 2 is faster)
          attackTimerRef.current = next.phase === 1 ? 2.5 : 1.5;
          const newHazards = spawnAttack(next.phase);
          next.hazards.push(...newHazards);
        }

        // --- 4. PROJECTILE PHYSICS & COLLISION ---
        next.projectiles = next.projectiles.filter(p => {
          p.y -= PROJECTILE_SPEED * dt;
          
          // Hit Boss?
          if (p.active && checkCollision(p, { ...next.boss, w: BOSS_SIZE.w, h: BOSS_SIZE.h })) {
            next.boss.health -= 1;
            next.particles.push(...spawnParticles(p.x, p.y, COLORS.bossPhase2, 5));
            return false; // Remove bullet
          }
          return p.y > -50; // Keep if on screen
        });

        // --- 5. HAZARD PHYSICS & COLLISION ---
        // Handle invincibility
        if (next.player.invincible) {
          next.player.invincibilityTimer -= dt;
          if (next.player.invincibilityTimer <= 0) next.player.invincible = false;
        }

        const playerBox = { x: next.player.x, y: next.player.y, w: PLAYER_SIZE.w, h: PLAYER_SIZE.h };

        next.hazards = next.hazards.filter(h => {
          // Movement
          h.x += h.vx * dt;
          h.y += h.vy * dt;

          // Shockwave specific logic
          if (h.type === 'shockwave') {
            if (h.warning > 0) {
              h.warning -= dt;
            } else {
              h.active -= dt;
            }
            if (h.active <= 0) return false; // Remove expired shockwave
            
            // Shockwave Collision (Complex because of safe spot)
            if (h.warning <= 0 && !next.player.invincible) {
               // Check if player is on the ground level AND NOT in the safe spot
               const inSafeSpot = (next.player.x > h.safeZoneX && next.player.x + PLAYER_SIZE.w < h.safeZoneX + h.safeZoneW);
               if (!inSafeSpot && next.player.y + PLAYER_SIZE.h >= h.y) {
                 next.player.invincible = true;
                 next.player.invincibilityTimer = 2.0;
                 onLoseLife();
               }
            }
            return true;
          }

          // Standard Collision (Taxi/Pigeon)
          if (!next.player.invincible && checkCollision(h, playerBox)) {
            next.player.invincible = true;
            next.player.invincibilityTimer = 2.0;
            onLoseLife();
            // Don't remove hazard, just hurt player
          }

          // Cleanup off-screen
          return h.x > -200 && h.x < SCREEN_WIDTH + 200 && h.y < SCREEN_HEIGHT + 50;
        });

        // --- 6. PARTICLES ---
        next.particles = next.particles.filter(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          return p.life > 0;
        });

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

    // 1. Background (Day vs Night)
    const bgColor = gameState.phase === 1 ? COLORS.skyPhase1 : COLORS.skyPhase2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Draw Skyline (Simple Rectangles)
    ctx.fillStyle = gameState.phase === 1 ? '#555' : '#111';
    // Draw some static buildings
    ctx.fillRect(50, SCREEN_HEIGHT - 300, 100, 300);
    ctx.fillRect(200, SCREEN_HEIGHT - 400, 150, 400);
    ctx.fillRect(SCREEN_WIDTH - 300, SCREEN_HEIGHT - 350, 120, 350);
    
    // Windows (Light up in Phase 2)
    ctx.fillStyle = gameState.phase === 1 ? '#888' : '#FFD700';
    if (gameState.phase === 2) {
      // Simple loop to draw windows
      for(let i=0; i<10; i++) ctx.fillRect(220, SCREEN_HEIGHT - 380 + (i*40), 20, 20);
    }

    // 2. Boss
    const bossColor = gameState.phase === 1 ? COLORS.bossPhase1 : COLORS.bossPhase2;
    const shakeX = gameState.phase === 2 ? (Math.random() - 0.5) * 5 : 0; // Shake in rage
    
    ctx.fillStyle = bossColor;
    ctx.fillRect(gameState.boss.x + shakeX, gameState.boss.y, BOSS_SIZE.w, BOSS_SIZE.h);
    
    // Boss Face
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); // Eyes
    ctx.arc(gameState.boss.x + 50 + shakeX, gameState.boss.y + 50, 20, 0, Math.PI * 2);
    ctx.arc(gameState.boss.x + 150 + shakeX, gameState.boss.y + 50, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Boss Health Bar (Above Boss)
    const hpPercent = gameState.boss.health / BOSS_MAX_HEALTH;
    ctx.fillStyle = '#333';
    ctx.fillRect(gameState.boss.x, gameState.boss.y - 20, BOSS_SIZE.w, 10);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(gameState.boss.x, gameState.boss.y - 20, BOSS_SIZE.w * hpPercent, 10);

    // 3. Hazards
    gameState.hazards.forEach(h => {
      if (h.type === 'taxi') {
        ctx.fillStyle = COLORS.taxi;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        // Wheels
        ctx.fillStyle = '#000';
        ctx.fillRect(h.x + 10, h.y + h.h, 15, 5);
        ctx.fillRect(h.x + h.w - 25, h.y + h.h, 15, 5);
      } else if (h.type === 'pigeon') {
        ctx.fillStyle = COLORS.pigeon;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.w/2, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = '#FFF';
        ctx.fillRect(h.x - 10, h.y - 10, 5, 15);
        ctx.fillRect(h.x + 5, h.y - 10, 5, 15);
      } else if (h.type === 'shockwave') {
        if (h.warning > 0) {
            // Warning box
            ctx.fillStyle = COLORS.shockwaveWarn;
            ctx.fillRect(0, h.y, SCREEN_WIDTH, h.h);
            // Safe zone indicator
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(h.safeZoneX, h.y, h.safeZoneW, h.h);
        } else {
            // Active damage
            ctx.fillStyle = COLORS.shockwaveActive;
            // Left of safe zone
            ctx.fillRect(0, h.y, h.safeZoneX, h.h);
            // Right of safe zone
            ctx.fillRect(h.safeZoneX + h.safeZoneW, h.y, SCREEN_WIDTH - (h.safeZoneX + h.safeZoneW), h.h);
        }
      }
    });

    // 4. Projectiles
    ctx.fillStyle = COLORS.projectile;
    gameState.projectiles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Player
    if (!gameState.player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.fillStyle = COLORS.player;
      ctx.fillRect(gameState.player.x, gameState.player.y, PLAYER_SIZE.w, PLAYER_SIZE.h);
      // Simple face
      ctx.fillStyle = '#000';
      ctx.fillRect(gameState.player.x + 10, gameState.player.y + 10, 5, 5);
      ctx.fillRect(gameState.player.x + 25, gameState.player.y + 10, 5, 5);
      ctx.fillRect(gameState.player.x + 15, gameState.player.y + 25, 10, 3);
    }

    // 6. Particles
    gameState.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });

  }, [gameState]);

  // ============ RETRY LOGIC ============
  const handleRetry = () => {
    onResetLives();
    setGameState(prev => ({
        ...prev,
        gameOver: false,
        levelCompleted: false,
        phase: 1,
        player: { ...prev.player, x: SCREEN_WIDTH / 2, invincible: false },
        boss: { x: SCREEN_WIDTH/2 - BOSS_SIZE.w/2, y: 50, health: BOSS_MAX_HEALTH, dir: 1 },
        projectiles: [],
        hazards: [],
        particles: []
    }));
    lastShotTimeRef.current = 0;
    attackTimerRef.current = 0;
  };

  return (
    <div className="canvas-container">
      {/* HUD */}
      <div style={{
        position: 'absolute', top: 20, left: 20, color: 'white', 
        fontFamily: '"Press Start 2P", monospace', zIndex: 10,
        textShadow: '2px 2px 0 #000'
      }}>
        <h2>🗽 NYC Chaos Beast</h2>
        <p>Lives: {lives}</p>
        <p>Phase: {gameState.phase === 1 ? "Tourist Trouble" : "RUSH HOUR!"}</p>
      </div>

      <canvas 
        ref={canvasRef} 
        width={SCREEN_WIDTH} 
        height={SCREEN_HEIGHT}
        style={{ background: '#333' }}
      />

      {/* Controls Hint */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, color: 'white', 
        fontFamily: 'monospace', opacity: 0.8
      }}>
        [A/D] Move | [SPACE] Shoot Love Bolts
      </div>

      {/* Return Button */}
      <button
        onClick={onReturnToHub}
        style={{
          position: 'absolute', bottom: '20px', right: '20px',
          padding: '12px 24px', fontSize: '12px',
          fontFamily: '"Press Start 2P", monospace',
          background: '#8B4513', color: '#fff',
          border: '3px solid #fff', borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Return to Hub
      </button>

      {/* Game Over Screen */}
      {lives <= 0 && !gameState.levelCompleted && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h2>The City Won...</h2>
            <p>Don't give up! Try again?</p>
            <div className="game-over-buttons">
              <button className="retry-button" onClick={handleRetry}>🔄 Retry</button>
              <button className="hub-button" onClick={onReturnToHub}>🏠 Hub</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Level5_BossFight;