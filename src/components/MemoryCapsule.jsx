import { useEffect, useState } from 'react';

function MemoryCapsule({ memory, onClose }) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setShowAnimation(true);
  }, []);

  if (!memory) {
    return null;
  }

  const handleClose = () => {
    setShowAnimation(false);
    // Delay to allow exit animation
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="memory-modal">
      <div className={`memory-content ${showAnimation ? 'animate-in' : ''}`}>
        {/* Memory Header */}
        <div className="memory-header">
          <h2>🎊 Memory Unlocked! 🎊</h2>
          <h3>{memory.title}</h3>
        </div>

        {/* Memory Content */}
        <div className="memory-body">
          {memory.type === 'text' && (
            <div className="memory-text">
              <div className="memory-placeholder">
                <p>{memory.content}</p>
              </div>
            </div>
          )}

          {memory.type === 'photo' && (
            <div className="memory-photo">
              <div className="memory-placeholder">
                <span className="placeholder-icon">📸</span>
                <p>Photo placeholder</p>
                <p>{memory.content}</p>
              </div>
            </div>
          )}

          {memory.type === 'video' && (
            <div className="memory-video">
              <div className="memory-placeholder">
                <span className="placeholder-icon">🎥</span>
                <p>Video placeholder</p>
                <p>{memory.content}</p>
              </div>
            </div>
          )}

          {memory.type === 'montage' && (
            <div className="memory-montage">
              <div className="memory-placeholder">
                <span className="placeholder-icon">🖼️</span>
                <p>Photo montage placeholder</p>
                <p>{memory.content}</p>
              </div>
            </div>
          )}
        </div>

        {/* Memory Footer */}
        <div className="memory-footer">
          <div className="memory-meta">
            <span className="memory-level">Level {memory.level || 1} Memory</span>
            <span className="memory-date">{new Date().toLocaleDateString()}</span>
          </div>
          
          <button 
            className="continue-button"
            onClick={handleClose}
          >
            Continue Adventure ❤️
          </button>
        </div>

        {/* Decorative hearts */}
        <div className="memory-decoration">
          <span className="floating-heart heart-1">💖</span>
          <span className="floating-heart heart-2">💕</span>
          <span className="floating-heart heart-3">💗</span>
          <span className="floating-heart heart-4">💝</span>
        </div>
      </div>
    </div>
  );
}

export default MemoryCapsule;