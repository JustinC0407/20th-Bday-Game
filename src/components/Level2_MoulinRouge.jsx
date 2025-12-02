import React, { useRef, useState, useEffect } from 'react';

// ============ CONSTANTS ============
const SCREEN_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1000;
const SCREEN_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 800;

const LANE_WIDTH = 80;
const BEAT_SIZE = 60;
const HIT_ZONE_RADIUS = 40;
const HIT_ZONE_Y = SCREEN_HEIGHT - 100;

const FALL_SPEED_PER_SECOND = 400; 
const HIT_TOLERANCE = 80; 

const BEAT_INTERVAL_SECONDS = 60 / 135; 
const TOTAL_HITS_NEEDED = 75;
const TIME_LIMIT = 60; 

const DOUBLE_NOTE_START_CHANCE = 0.10; 
const DOUBLE_NOTE_END_CHANCE = 0.30; 

const LANE_COLORS = ['#9ed8dfff', '#c5f8c2ff', '#fa977eff', '#f4ab6bff'];

function Level2_MoulinRouge({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({});
  const frameCountRef = useRef(0);
  const audioRef = useRef(null);
  const backgroundRef = useRef(null);

  // DELTA TIME FIX: Track actual time instead of frames
  const lastFrameTimeRef = useRef(0);
  const timeSinceLastSecondRef = useRef(0);
  const timeSinceLastBeatRef = useRef(0);

  // ============ GAME STATE ============
  const [musicStarted, setMusicStarted] = useState(false);
  const [gameState, setGameState] = useState({
    lanes: [
      { key: 'KeyA', x: SCREEN_WIDTH * 0.25, hitZoneY: HIT_ZONE_Y },
      { key: 'KeyS', x: SCREEN_WIDTH * 0.40, hitZoneY: HIT_ZONE_Y },
      { key: 'KeyD', x: SCREEN_WIDTH * 0.55, hitZoneY: HIT_ZONE_Y },
      { key: 'KeyF', x: SCREEN_WIDTH * 0.70, hitZoneY: HIT_ZONE_Y }
    ],
    beats: [],
    hitsCollected: 0,
    totalBeats: 0,
    timeRemaining: TIME_LIMIT,
    missPopup: null,
    hitFeedback: [],
    completionNotificationTime: null,
    gameStarted: true,
    levelCompleted: false,
    gameOver: false
  });

  // ============ INPUT HANDLING ============
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!keysRef.current[e.code] && ['KeyA', 'KeyS', 'KeyD', 'KeyF'].includes(e.code)) {
        keysRef.current[e.code] = true;
        checkHit(e.code);
      }
      if (e.code === 'KeyR' && gameState.gameOver) handleRetry();
      if (e.code === 'KeyH' && gameState.gameOver) handleReturnToHub();
    };

    const handleKeyUp = (e) => { keysRef.current[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameOver, gameState.levelCompleted]);

  // ============ AUDIO & BG SETUP ============
  useEffect(() => {
    const audio = new Audio('/audio/level_2.mp3');
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const bg = new Image();
    bg.src = '/level_2.jpeg';
    backgroundRef.current = bg;
  }, []);

  useEffect(() => {
    if (gameState.timeRemaining <= 0) fadeOutMusic();
  }, [gameState.timeRemaining]);

  // ============ HIT DETECTION ============
  const checkHit = (keyCode) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      
      // FIX 2: Deep copy the beats array so we don't mutate state
      const newState = { ...prev, beats: [...prev.beats], hitFeedback: [...prev.hitFeedback] };

      const laneIndex = { 'KeyA': 0, 'KeyS': 1, 'KeyD': 2, 'KeyF': 3 }[keyCode];
      if (laneIndex === undefined) return prev;

      let hit = false;
      const lane = prev.lanes[laneIndex];

      newState.beats = prev.beats.filter(beat => {
        if (beat.laneIndex === laneIndex && !hit) {
          const beatBottomY = beat.y + beat.height;
          const distanceToHitZone = Math.abs(beatBottomY - lane.hitZoneY);
          if (distanceToHitZone <= HIT_TOLERANCE) {
            hit = true;
            newState.hitsCollected++;
            newState.hitFeedback.push({ laneIndex, timestamp: Date.now() });
            return false; 
          }
        }
        return true;
      });

      if (!hit) {
        newState.missPopup = { text: 'Miss!', timestamp: Date.now() };
        newState.hitsCollected = Math.max(0, newState.hitsCollected - 0.5);
      }
      return newState;
    });
  };

  const fadeOutMusic = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const interval = setInterval(() => {
      if (audio.volume > 0.05) audio.volume -= 0.05;
      else { audio.volume = 0; audio.pause(); clearInterval(interval); }
    }, 100);
  };

  // ============ GAME LOOP (FIXED) ============
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    let animationFrameId;
    lastFrameTimeRef.current = performance.now(); // Reset time anchor

    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // FIX 1: Update time refs OUTSIDE setGameState (prevents 2x speed)
      timeSinceLastBeatRef.current += deltaTime;
      timeSinceLastSecondRef.current += deltaTime;

      // Determine triggers before state update
      let shouldSpawn = false;
      if (timeSinceLastBeatRef.current >= BEAT_INTERVAL_SECONDS) {
        timeSinceLastBeatRef.current -= BEAT_INTERVAL_SECONDS;
        shouldSpawn = true;
      }

      let shouldTickTimer = false;
      if (timeSinceLastSecondRef.current >= 1.0) {
        timeSinceLastSecondRef.current -= 1.0;
        shouldTickTimer = true;
      }

      setGameState(prevState => {
        if (prevState.gameOver) return prevState;

        // FIX 2: Deep copy beats array (prevents double spawning)
        const newState = { ...prevState, beats: [...prevState.beats] };
        frameCountRef.current++;

        // 1. Spawn beats
        if (shouldSpawn) {
          const timeElapsed = TIME_LIMIT - newState.timeRemaining;
          const progressRatio = timeElapsed / TIME_LIMIT;
          const doubleNoteChance = DOUBLE_NOTE_START_CHANCE +
                                   (progressRatio * (DOUBLE_NOTE_END_CHANCE - DOUBLE_NOTE_START_CHANCE));

          const isDouble = Math.random() < doubleNoteChance;

          if (isDouble) {
            let lane1, lane2;
            if (Math.random() < 0.5) {
              const adjacentPairs = [[0, 1], [1, 2], [2, 3]];
              const pair = adjacentPairs[Math.floor(Math.random() * adjacentPairs.length)];
              lane1 = pair[0]; lane2 = pair[1];
            } else {
              lane1 = Math.floor(Math.random() * 4);
              do { lane2 = Math.floor(Math.random() * 4); } while (lane2 === lane1);
            }
            const sharedId = Date.now();
            newState.beats.push(
              { id: sharedId + Math.random(), laneIndex: lane1, y: -BEAT_SIZE, width: BEAT_SIZE, height: BEAT_SIZE, color: LANE_COLORS[lane1], isDouble: true },
              { id: sharedId + Math.random() + 0.1, laneIndex: lane2, y: -BEAT_SIZE, width: BEAT_SIZE, height: BEAT_SIZE, color: LANE_COLORS[lane2], isDouble: true }
            );
            newState.totalBeats += 2;
          } else {
            const randomLane = Math.floor(Math.random() * 4);
            newState.beats.push({
              id: Date.now() + Math.random(), laneIndex: randomLane, y: -BEAT_SIZE, width: BEAT_SIZE, height: BEAT_SIZE, color: LANE_COLORS[randomLane], isDouble: false
            });
            newState.totalBeats++;
          }

          if (!musicStarted && audioRef.current) {
            audioRef.current.play().catch(console.warn);
            setMusicStarted(true);
          }
        }

        // 2. Move beats
        newState.beats = newState.beats.map(beat => ({
          ...beat,
          y: beat.y + (FALL_SPEED_PER_SECOND * deltaTime)
        }));

        // 3. Remove beats / Misses
        newState.beats = newState.beats.filter(beat => {
          const beatBottomY = beat.y + beat.height;
          const lane = newState.lanes[beat.laneIndex];
          if (beatBottomY > lane.hitZoneY + HIT_TOLERANCE * 2) {
            newState.missPopup = { text: 'Miss!', timestamp: Date.now() };
            newState.hitsCollected = Math.max(0, newState.hitsCollected - 0.5);
            return false;
          }
          return beat.y < SCREEN_HEIGHT + 100;
        });

        // 4. Timer
        if (shouldTickTimer) {
          newState.timeRemaining = Math.max(0, newState.timeRemaining - 1);
        }

        // 5. Completion
        if (newState.hitsCollected >= TOTAL_HITS_NEEDED && !newState.levelCompleted) {
          newState.levelCompleted = true;
          newState.completionNotificationTime = Date.now();
        }

        // 6. Game Over
        if (newState.timeRemaining <= 0) {
          if (newState.hitsCollected >= TOTAL_HITS_NEEDED) {
            setTimeout(() => {
              onComplete({
                title: "Moulin Rouge Memory",
                type: "photo",
                content: "/photos/level_2_win.jpeg"
              });
            }, 500);
          } else if (!newState.gameOver) {
            newState.gameOver = true;
          }
        }

        return newState;
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [gameState.gameStarted, gameState.gameOver]);

  // ============ RENDERING ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState.gameStarted) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // 1. Background
      if (backgroundRef.current) {
        ctx.drawImage(backgroundRef.current, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        gradient.addColorStop(0, '#4A0E0E'); gradient.addColorStop(1, '#1A0505');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }

      // 2. Draw stage sparkles (These are kept!)
      ctx.fillStyle = 'rgba(249, 243, 207, 0.5)';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * SCREEN_WIDTH;
        const y = Math.random() * (SCREEN_HEIGHT - 100);
        const size = 3 + Math.random() * 4;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // 3. Lane guides
      gameState.lanes.forEach(lane => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lane.x, 0); ctx.lineTo(lane.x, SCREEN_HEIGHT); ctx.stroke();
      });

      // 5. Beats
      gameState.beats.forEach(beat => {
        ctx.fillStyle = beat.color;
        ctx.shadowColor = beat.isDouble ? '#00BFFF' : '#FFD700';
        ctx.shadowBlur = beat.isDouble ? 25 : 15;
        const x = gameState.lanes[beat.laneIndex].x - beat.width / 2;
        ctx.fillRect(x, beat.y, beat.width, beat.height);
        ctx.shadowBlur = 0;
      });

      // 6. Hit zones
      gameState.lanes.forEach((lane, index) => {
        const wasPressed = gameState.hitFeedback.some(f => f.laneIndex === index && Date.now() - f.timestamp < 200);
        ctx.fillStyle = wasPressed ? '#FFD700' : 'rgba(255, 255, 255, 0.3)';
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(lane.x, lane.hitZoneY, HIT_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        if (wasPressed) {
          ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 6; ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(lane.x, lane.hitZoneY, HIT_ZONE_RADIUS + 5, 0, Math.PI * 2);
          ctx.stroke(); ctx.globalAlpha = 1.0;
        }
        ctx.fillStyle = '#000'; ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['A', 'S', 'D', 'F'][index], lane.x, lane.hitZoneY);
      });

      // 7. Miss popup
      if (gameState.missPopup && Date.now() - gameState.missPopup.timestamp < 500) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#FF0000'; ctx.font = '32px "Press Start 2P"';
        ctx.textAlign = 'center'; ctx.fillText('Miss!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        ctx.shadowBlur = 0;
      }
    };
    render();
  }, [gameState]);

  // ============ HELPERS ============
  const handleRetry = () => {
    onResetLives();
    frameCountRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    timeSinceLastSecondRef.current = 0;
    timeSinceLastBeatRef.current = 0;
    setMusicStarted(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setGameState({
      lanes: [
        { key: 'KeyA', x: SCREEN_WIDTH * 0.25, hitZoneY: HIT_ZONE_Y },
        { key: 'KeyS', x: SCREEN_WIDTH * 0.40, hitZoneY: HIT_ZONE_Y },
        { key: 'KeyD', x: SCREEN_WIDTH * 0.55, hitZoneY: HIT_ZONE_Y },
        { key: 'KeyF', x: SCREEN_WIDTH * 0.70, hitZoneY: HIT_ZONE_Y }
      ],
      beats: [], hitsCollected: 0, totalBeats: 0, timeRemaining: TIME_LIMIT,
      missPopup: null, hitFeedback: [], completionNotificationTime: null,
      gameStarted: true, levelCompleted: false, gameOver: false
    });
  };

  const handleReturnToHub = () => onReturnToHub();
  const debugWin = () => setGameState(prev => ({ ...prev, hitsCollected: TOTAL_HITS_NEEDED }));

  // ============ JSX ============
  return (
    <div className="canvas-container">
      <div className="level-title-header" style={{ color: '#FFB6C1', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        <h2>🌹 Level 2: Moulin Rouge Light Show</h2>
        <p>Press A S D F when the beats hit the circles!</p>
      </div>

      <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} className="game-canvas" />

      <div className="game-ui">
        <div className="game-counter" style={{ color: '#FFB6C1', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          <span style={{ marginRight: '30px' }}>🎵 Hits: {gameState.hitsCollected.toFixed(1)}/75</span>
          <span>⏰ Time: {gameState.timeRemaining}s</span>
        </div>
      </div>

      <button onClick={handleReturnToHub} style={{ position: 'absolute', bottom: '20px', right: '20px', padding: '12px 24px', fontSize: '12px', fontFamily: '"Press Start 2P"', background: '#8B4513', color: '#fff', border: '3px solid #fff', borderRadius: '8px', cursor: 'pointer', zIndex: 999 }}>Return to Hub</button>

      {!gameState.levelCompleted && (
        <button onClick={debugWin} style={{ position: 'absolute', top: '100px', right: '20px', background: '#FF0000', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: '"Press Start 2P"', fontSize: '10px', zIndex: 1000 }}>🐛 DEBUG: Win</button>
      )}

      {gameState.completionNotificationTime && Date.now() - gameState.completionNotificationTime < 2000 && (
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.8)', color: '#FFD700', padding: '20px 40px', borderRadius: '15px', fontSize: '24px', fontFamily: '"Press Start 2P"', zIndex: 999 }}>🎉 75 Hits! Keep Going! 🎉</div>
      )}

      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h2>⏰ Time's Up!</h2>
            <p style={{ marginTop: '20px', fontSize: '14px' }}>You got {gameState.hitsCollected.toFixed(1)}/75 hits</p>
            <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={handleRetry} style={{ padding: '15px 30px', fontSize: '14px', fontFamily: '"Press Start 2P"', background: '#FF6B9D', color: '#fff', border: '3px solid #fff', borderRadius: '10px', cursor: 'pointer' }}>Try Again (R)</button>
              <button onClick={handleReturnToHub} style={{ padding: '15px 30px', fontSize: '14px', fontFamily: '"Press Start 2P"', background: '#8B4513', color: '#fff', border: '3px solid #fff', borderRadius: '10px', cursor: 'pointer' }}>Return to Hub (H)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Level2_MoulinRouge;