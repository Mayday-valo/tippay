import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

function OverlayPage() {
  const { username } = useParams();
  const [overlaySettings, setOverlaySettings] = useState(null);
  const [currentTip, setCurrentTip] = useState(null);
  const [socket, setSocket] = useState(null);
  const [streamerId, setStreamerId] = useState(null);

  useEffect(() => {
    // Fetch overlay settings
    fetchOverlaySettings();
  }, [username]);

  useEffect(() => {
    if (streamerId) {
      // Initialize socket connection
      const newSocket = io('http://localhost:5000');
      newSocket.emit('join_streamer_room', streamerId);
      
      // Listen for new tips
      newSocket.on('new_tip', (tipData) => {
        showTipNotification(tipData);
      });

      // Listen for overlay config updates
      newSocket.on('overlay_config_updated', (config) => {
        setOverlaySettings(config);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [streamerId]);

  const fetchOverlaySettings = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/overlay/${username}`);
      const data = await response.json();
      
      if (response.ok) {
        setOverlaySettings(data.overlaySettings);
        setStreamerId(data.streamerId);
      } else {
        console.error('Streamer not found');
      }
    } catch (error) {
      console.error('Error fetching overlay settings:', error);
    }
  };

  const showTipNotification = (tipData) => {
    setCurrentTip(tipData);
    
    // Play sound if enabled
    if (overlaySettings?.soundEnabled) {
      playTipSound(tipData.amount);
    }

    // Hide notification after animation duration
    setTimeout(() => {
      setCurrentTip(null);
    }, overlaySettings?.animationDuration || 5000);
  };

  const playTipSound = (amount) => {
    // Create audio context for sound alerts
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Different sounds for different tip amounts
    let frequency = 440; // Default frequency
    if (amount >= 100) frequency = 880; // Higher pitch for larger tips
    if (amount >= 500) frequency = 1320; // Even higher for very large tips

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  if (!overlaySettings) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        Loading overlay...
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'transparent',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif'
    }}>
      {currentTip && (
        <div 
          style={{
            position: 'absolute',
            top: '50px',
            right: '50px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '20px 30px',
            borderRadius: '15px',
            border: '3px solid #ffd700',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
            animation: 'slideInBounce 0.8s ease-out',
            maxWidth: '400px',
            zIndex: 1000
          }}
        >
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            color: '#ffd700',
            textAlign: 'center'
          }}>
            🎉 NEW TIP! 🎉
          </div>
          
          <div style={{ 
            fontSize: '20px', 
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            <span style={{ color: '#87ceeb' }}>{currentTip.donor}</span>
          </div>
          
          {overlaySettings.showAmount && (
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#00ff00',
              textAlign: 'center',
              marginBottom: '10px'
            }}>
              ₹{currentTip.amount}
            </div>
          )}
          
          {overlaySettings.showMessage && currentTip.message && (
            <div style={{ 
              fontSize: '16px', 
              fontStyle: 'italic',
              color: '#ffffff',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              "{currentTip.message}"
            </div>
          )}
          
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            right: '-10px',
            bottom: '-10px',
            border: '2px solid #ffd700',
            borderRadius: '20px',
            animation: 'pulse 2s infinite',
            zIndex: -1
          }} />
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInBounce {
          0% {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateX(-10px) scale(1.1);
            opacity: 1;
          }
          80% {
            transform: translateX(5px) scale(0.95);
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes glow {
          0% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.8);
          }
          100% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
}

export default OverlayPage;