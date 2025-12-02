import React, { useState } from 'react';

const CORRECT_PASSWORD = "iloveyou";

// All 5 levels with default data
const ALL_LEVELS = [
  { level: 1, title: 'Level 1 Memory', type: 'photo', content: '/photos/level_1_win.jpeg' },
  { level: 2, title: 'Level 2 Memory', type: 'photo', content: '/photos/level_2_win.jpeg' },
  { level: 3, title: 'Level 3 Memory', type: 'photo', content: '/photos/level_3_win.jpeg' },
  { level: 4, title: 'Level 4 Memory', type: 'photo', content: '/photos/level_4_win.jpeg' },
  { level: 5, title: 'Level 5 Memory', type: 'photo', content: '/photos/level_5_win.jpeg' }
];

function MemoryRoomScreen({ unlockedMemories, onReturnToHub }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showError, setShowError] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput.toLowerCase() === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setShowError(false);
    } else {
      setShowError(true);
      setPasswordInput('');
    }
  };

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="memory-room-screen">
        <div className="password-modal">
          <h1>🔒 Memory Room</h1>
          <p>Enter the password to access your memories</p>

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
              className="password-input"
              autoFocus
            />
            <button type="submit" className="submit-button">
              Unlock
            </button>
          </form>

          {showError && (
            <p className="error-message">❌ Incorrect password. Try again!</p>
          )}

          <button onClick={onReturnToHub} className="back-button">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  // Show memory grid after authentication
  return (
    <div className="memory-room-screen authenticated">
      <h1>🏠 Memory Room</h1>
      <p className="subtitle">Your memories ❤️</p>

      <div className="memory-grid">
        {ALL_LEVELS.map((levelData) => {
          // Get memory data if it exists, otherwise use default
          const memoryData = unlockedMemories.find(m => m.level === levelData.level) || levelData;

          return (
            <div key={levelData.level} className="memory-card">
              <div className="memory-card-header">
                <span className="memory-icon">
                  {memoryData.type === 'text' && '📝'}
                  {memoryData.type === 'photo' && '📸'}
                  {memoryData.type === 'video' && '🎥'}
                  {memoryData.type === 'montage' && '🖼️'}
                </span>
                <h3>Level {levelData.level}</h3>
              </div>
              <div className="memory-card-content">
                <h4>{memoryData.title}</h4>
                {memoryData.type === 'photo' && (
                  <img
                    src={memoryData.content}
                    alt={memoryData.title}
                    style={{
                      width: '200px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      display: 'block',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }}
                    onError={(e) => {
                      console.warn(`Failed to load thumbnail: ${memoryData.content}`);
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <p className="memory-preview">{memoryData.type === 'photo' ? '❤️ Memory Photo' : (memoryData.content || 'Memory from Level ' + levelData.level)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onReturnToHub}
        className="hub-button"
        style={{
          marginTop: '30px',
          padding: '15px 40px',
          fontSize: '16px',
          fontFamily: '"Press Start 2P"',
          backgroundColor: '#FF6B9D',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
      >
        ❤️ Return to Hub ❤️
      </button>
    </div>
  );
}

export default MemoryRoomScreen;
