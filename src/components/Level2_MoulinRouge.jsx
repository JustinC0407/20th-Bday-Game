import React, { useRef, useState, useEffect } from 'react';

// ============ CONSTANTS ============
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

const LANE_WIDTH = 80;
const BEAT_SIZE = 60;
const HIT_ZONE_RADIUS = 40;
const HIT_ZONE_Y = SCREEN_HEIGHT - 100;

const FALL_SPEED_PER_SECOND = 400; // pixels per second (adjusted for 135 BPM rhythm)
const HIT_TOLERANCE = 80; // pixels above/below hit zone

const BEAT_INTERVAL_SECONDS = 60 / 67.5; // seconds between spawns (67.5 BPM = half of 135 BPM = 0.889s per beat)
const TOTAL_HITS_NEEDED = 75;
const TIME_LIMIT = 60; // seconds (1 minute)

// Double note progression
const DOUBLE_NOTE_START_CHANCE = 0.10; // 10% at start
const DOUBLE_NOTE_END_CHANCE = 0.30;   // 30% at end

// Lane colors
const LANE_COLORS = ['#9ed8dfff', '#c5f8c2ff', '#fa977eff', '#f4ab6bff'];

function Level2_MoulinRouge({ lives, onComplete, onLoseLife, onReturnToHub, onResetLives }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({});
  const frameCountRef = useRef(0);
  const audioRef = useRef(null);
  const backgroundRef = useRef(null);

  // DELTA TIME FIX: Track actual time instead of frames
  const lastFrameTimeRef = useRef(performance.now());
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
    completionNotificationTime: null, // Track when 75 hits achieved
    gameStarted: true, // Start immediately
    levelCompleted: false,
    gameOver: false
  });

  // ============ INPUT HANDLING ============
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!keysRef.current[e.code] &&
          ['KeyA', 'KeyS', 'KeyD', 'KeyF'].includes(e.code)) {
        keysRef.current[e.code] = true;
        checkHit(e.code);
      }

      // Retry with R key
      if (e.code === 'KeyR' && gameState.gameOver) {
        handleRetry();
      }

      // Return to hub with H key
      if (e.code === 'KeyH' && gameState.gameOver) {
        handleReturnToHub();
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameOver, gameState.levelCompleted]);

  // ============ AUDIO SETUP ============
  // Audio initialization
  useEffect(() => {
    const audio = new Audio('/src/assets/audio/level_2.mp3');
    audio.loop = true;
    audio.volume = 0.7; // 70% volume
    audio.preload = 'auto';

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // ============ BACKGROUND SETUP ============
  // Load background image
  useEffect(() => {
    const bg = new Image();
    bg.onload = () => {
      backgroundRef.current = bg;
    };
    bg.onerror = () => {
      console.warn('Failed to load background: /level_2.jpeg');
    };
    bg.src = '/level_2.jpeg';
  }, []);

  // Fade out music only when time actually runs out
  useEffect(() => {
    if (gameState.timeRemaining <= 0) {
      fadeOutMusic();
    }
  }, [gameState.timeRemaining]);

  // ============ HIT DETECTION ============
  const checkHit = (keyCode) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;

      const newState = { ...prev };

      // Map key to lane index
      const laneIndex = {
        'KeyA': 0,
        'KeyS': 1,
        'KeyD': 2,
        'KeyF': 3
      }[keyCode];

      if (laneIndex === undefined) return prev;

      // Check if any beat in this lane is in hit zone
      let hit = false;
      const lane = prev.lanes[laneIndex];

      newState.beats = prev.beats.filter(beat => {
        if (beat.laneIndex === laneIndex && !hit) {
          const beatBottomY = beat.y + beat.height;
          const distanceToHitZone = Math.abs(beatBottomY - lane.hitZoneY);

          if (distanceToHitZone <= HIT_TOLERANCE) {
            // HIT!
            hit = true;
            newState.hitsCollected++;

            // Add visual feedback
            newState.hitFeedback.push({
              laneIndex,
              timestamp: Date.now()
            });

            return false; // Remove beat
          }
        }
        return true; // Keep beat
      });

      // If no hit, show miss popup and subtract 0.5 points
      if (!hit) {
        newState.missPopup = {
          text: 'Miss!',
          timestamp: Date.now()
        };
        newState.hitsCollected = Math.max(0, newState.hitsCollected - 0.5);
      }

      return newState;
    });
  };

  // ============ AUDIO FADE OUT ============
  const fadeOutMusic = () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
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

  // ============ GAME LOOP ============
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const gameLoop = (currentTime) => {
      // DELTA TIME FIX: Calculate actual time elapsed since last frame
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000; // in seconds
      lastFrameTimeRef.current = currentTime;

      setGameState(prevState => {
        if (prevState.gameOver) return prevState;

        const newState = { ...prevState };
        frameCountRef.current++;

        // 1. Spawn beats (single or double) - TIME-BASED
        timeSinceLastBeatRef.current += deltaTime;
        if (timeSinceLastBeatRef.current >= BEAT_INTERVAL_SECONDS) {
          timeSinceLastBeatRef.current -= BEAT_INTERVAL_SECONDS;
          // Calculate double note chance (10% -> 30% over 60 seconds)
          const timeElapsed = TIME_LIMIT - newState.timeRemaining;
          const progressRatio = timeElapsed / TIME_LIMIT;
          const doubleNoteChance = DOUBLE_NOTE_START_CHANCE +
                                   (progressRatio * (DOUBLE_NOTE_END_CHANCE - DOUBLE_NOTE_START_CHANCE));

          const isDouble = Math.random() < doubleNoteChance;

          if (isDouble) {
            // Spawn double note (two beats)
            let lane1, lane2;

            // 50% chance for adjacent lanes, 50% for random
            if (Math.random() < 0.5) {
              // Adjacent lanes
              const adjacentPairs = [
                [0, 1], // A + S
                [1, 2], // S + D
                [2, 3]  // D + F
              ];
              const pair = adjacentPairs[Math.floor(Math.random() * adjacentPairs.length)];
              lane1 = pair[0];
              lane2 = pair[1];
            } else {
              // Random lanes (ensure different)
              lane1 = Math.floor(Math.random() * 4);
              do {
                lane2 = Math.floor(Math.random() * 4);
              } while (lane2 === lane1);
            }

            // Create both beats at same Y position
            const sharedY = -BEAT_SIZE;
            const sharedId = Date.now();

            const beat1 = {
              id: sharedId + Math.random(),
              laneIndex: lane1,
              y: sharedY,
              width: BEAT_SIZE,
              height: BEAT_SIZE,
              color: LANE_COLORS[lane1],
              isDouble: true
            };

            const beat2 = {
              id: sharedId + Math.random() + 0.1,
              laneIndex: lane2,
              y: sharedY,
              width: BEAT_SIZE,
              height: BEAT_SIZE,
              color: LANE_COLORS[lane2],
              isDouble: true
            };

            newState.beats.push(beat1, beat2);
            newState.totalBeats += 2;

          } else {
            // Spawn single note
            const randomLane = Math.floor(Math.random() * 4);
            const newBeat = {
              id: Date.now() + Math.random(),
              laneIndex: randomLane,
              y: -BEAT_SIZE,
              width: BEAT_SIZE,
              height: BEAT_SIZE,
              color: LANE_COLORS[randomLane],
              isDouble: false
            };

            newState.beats.push(newBeat);
            newState.totalBeats++;
          }

          // Start music on first beat spawn
          if (!musicStarted && audioRef.current) {
            audioRef.current.play().catch(err => {
              console.warn('Audio playback failed:', err);
            });
            setMusicStarted(true);
          }
        }

        // 2. Move beats down - TIME-BASED
        newState.beats = newState.beats.map(beat => ({
          ...beat,
          y: beat.y + (FALL_SPEED_PER_SECOND * deltaTime)
        }));

        // 3. Remove beats that fell off screen AND detect misses
        newState.beats = newState.beats.filter(beat => {
          const beatBottomY = beat.y + beat.height;
          const lane = newState.lanes[beat.laneIndex];

          // Check if beat passed the hit zone without being hit
          if (beatBottomY > lane.hitZoneY + HIT_TOLERANCE * 2) {
            // Beat missed! Show miss popup and subtract 0.5 points
            newState.missPopup = {
              text: 'Miss!',
              timestamp: Date.now()
            };
            newState.hitsCollected = Math.max(0, newState.hitsCollected - 0.5);
            return false; // Remove beat
          }

          return beat.y < SCREEN_HEIGHT + 100; // Keep if still on screen
        });

        // 4. Update timer - TIME-BASED
        timeSinceLastSecondRef.current += deltaTime;
        if (timeSinceLastSecondRef.current >= 1.0) {
          timeSinceLastSecondRef.current -= 1.0;
          newState.timeRemaining = Math.max(0, newState.timeRemaining - 1);
        }

        // 5. Check win condition (mark completed but keep playing)
        if (newState.hitsCollected >= TOTAL_HITS_NEEDED && !newState.levelCompleted) {
          newState.levelCompleted = true;
          newState.completionNotificationTime = Date.now(); // Set notification timestamp
          // Don't call onComplete yet - wait for timer to end
        }

        // 6. Check end-of-time conditions
        if (newState.timeRemaining <= 0) {
          if (newState.hitsCollected >= TOTAL_HITS_NEEDED) {
            // Success - completed with enough hits
            setTimeout(() => {
              onComplete({
                title: "Moulin Rouge Memory",
                type: "text",
                content: "Every beat of my heart belongs to you. That night at the theater was magical. 💖"
              });
            }, 500);
          } else if (!newState.gameOver) {
            // Failure - time's up without enough hits
            newState.gameOver = true;
          }
        }

        return newState;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop(performance.now());

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gameStarted, gameState.gameOver]);

  // ============ RENDERING ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState.gameStarted) return;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // 1. Draw background image or fallback gradient
      if (backgroundRef.current) {
        ctx.drawImage(backgroundRef.current, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      } else {
        // Fallback theater background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        gradient.addColorStop(0, '#4A0E0E');
        gradient.addColorStop(0.3, '#2D0A0A');
        gradient.addColorStop(1, '#1A0505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      }

      // 2. Draw stage sparkles (decorative)
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
      // Reset shadow
      ctx.shadowBlur = 0;

      // 3. Draw lane guides
      gameState.lanes.forEach(lane => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lane.x, 0);
        ctx.lineTo(lane.x, SCREEN_HEIGHT);
        ctx.stroke();
      });

      // 5. Draw falling beats
      gameState.beats.forEach(beat => {
        ctx.fillStyle = beat.color;

        // Yellow glow for regular beats, blue glow for double beats
        if (beat.isDouble) {
          ctx.shadowColor = '#00BFFF'; // Blue glow for double notes
          ctx.shadowBlur = 25;
        } else {
          ctx.shadowColor = '#FFD700'; // Yellow glow for regular notes
          ctx.shadowBlur = 15;
        }
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const x = gameState.lanes[beat.laneIndex].x - beat.width / 2;
        ctx.fillRect(x, beat.y, beat.width, beat.height);

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });

      // 6. Draw hit zones
      gameState.lanes.forEach((lane, index) => {
        // Check if this lane was just pressed
        const wasPressed = gameState.hitFeedback.some(
          f => f.laneIndex === index && Date.now() - f.timestamp < 200
        );

        // Base circle
        ctx.fillStyle = wasPressed ? '#FFD700' : 'rgba(255, 255, 255, 0.3)';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(lane.x, lane.hitZoneY, HIT_ZONE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glow effect when pressed
        if (wasPressed) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 6;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(lane.x, lane.hitZoneY, HIT_ZONE_RADIUS + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        // Key letter
        ctx.fillStyle = '#000';
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const keyLetter = ['A', 'S', 'D', 'F'][index];
        ctx.fillText(keyLetter, lane.x, lane.hitZoneY);
      });

      // 7. Draw miss popup
      if (gameState.missPopup && Date.now() - gameState.missPopup.timestamp < 500) {
        // Add drop shadow for visibility against red background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = '#FF0000';
        ctx.font = '32px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Miss!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // 8. Clean up old feedback
      const now = Date.now();
      if (gameState.hitFeedback.length > 0) {
        setGameState(prev => ({
          ...prev,
          hitFeedback: prev.hitFeedback.filter(f => now - f.timestamp < 200)
        }));
      }
    };

    render();
  }, [gameState]);

  // ============ RETRY & NAVIGATION ============
  const handleRetry = () => {
    onResetLives();
    frameCountRef.current = 0;

    // Reset time tracking refs for delta time
    lastFrameTimeRef.current = performance.now();
    timeSinceLastSecondRef.current = 0;
    timeSinceLastBeatRef.current = 0;

    // Reset music started flag
    setMusicStarted(false);

    // Stop and reset current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setGameState({
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
      completionNotificationTime: null, // Reset notification
      gameStarted: true,
      levelCompleted: false,
      gameOver: false
    });
  };

  const handleReturnToHub = () => {
    onReturnToHub();
  };

  // ======= DEBUG FUNCTION - EASY TO REMOVE =======
  const debugWin = () => {
    setGameState(prev => ({
      ...prev,
      hitsCollected: TOTAL_HITS_NEEDED
    }));
  };
  // ======= END DEBUG FUNCTION =======

  // ============ JSX RENDER ============
  return (
    <div className="canvas-container">
      {/* Title Section */}
      <div className="level-title-header" style={{
        color: '#FFB6C1',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
      }}>
        <h2>🌹 Level 2: Moulin Rouge Light Show</h2>
        <p>Press A S D F when the beats hit the circles!</p>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        className="game-canvas"
      />

      {/* Game UI Overlay */}
      <div className="game-ui">
        <div className="game-counter" style={{
          color: '#FFB6C1',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
        }}>
          <span style={{ marginRight: '30px' }}>🎵 Hits: {gameState.hitsCollected.toFixed(1)}/75</span>
          <span>⏰ Time: {gameState.timeRemaining}s</span>
        </div>
      </div>

      {/* Return to Hub Button - Bottom Right */}
      <button
        onClick={handleReturnToHub}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '12px 24px',
          fontSize: '12px',
          fontFamily: '"Press Start 2P", monospace',
          background: '#8B4513',
          color: '#fff',
          border: '3px solid #fff',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          zIndex: 999
        }}
      >
        Return to Hub
      </button>

      {/* ======= DEBUG BUTTON - EASY TO REMOVE ======= */}
      {!gameState.levelCompleted && (
        <button
          onClick={debugWin}
          style={{
            position: 'absolute',
            top: '100px',
            right: '20px',
            background: '#FF0000',
            color: '#fff',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            zIndex: 1000
          }}
        >
          🐛 DEBUG: Win
        </button>
      )}
      {/* ======= END DEBUG BUTTON ======= */}

      {/* Auto-Dismissing Completion Notification */}
      {gameState.completionNotificationTime &&
       Date.now() - gameState.completionNotificationTime < 2000 && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#FFD700',
          padding: '20px 40px',
          borderRadius: '15px',
          fontSize: '24px',
          fontFamily: '"Press Start 2P", monospace',
          zIndex: 999,
          opacity: (2000 - (Date.now() - gameState.completionNotificationTime)) / 2000,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9)'
        }}>
          🎉 75 Hits! Keep Going! 🎉
        </div>
      )}

      {/* Game Over Dialog */}
      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-dialog">
            <h2>⏰ Time's Up!</h2>
            <p style={{ marginTop: '20px', fontSize: '14px' }}>
              You got {gameState.hitsCollected.toFixed(1)}/75 hits
            </p>
            <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                onClick={handleRetry}
                style={{
                  padding: '15px 30px',
                  fontSize: '14px',
                  fontFamily: '"Press Start 2P", monospace',
                  background: '#FF6B9D',
                  color: '#fff',
                  border: '3px solid #fff',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Try Again (R)
              </button>
              <button
                onClick={handleReturnToHub}
                style={{
                  padding: '15px 30px',
                  fontSize: '14px',
                  fontFamily: '"Press Start 2P", monospace',
                  background: '#8B4513',
                  color: '#fff',
                  border: '3px solid #fff',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Return to Hub (H)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Level2_MoulinRouge;
