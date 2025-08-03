import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import io from 'socket.io-client';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [overlaySettings, setOverlaySettings] = useState({
    theme: 'default',
    showAmount: true,
    showMessage: true,
    soundEnabled: true,
    minTipAmount: 10,
    maxTipAmount: 10000,
    animationDuration: 5000
  });
  const [streamlabsToken, setStreamlabsToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      fetchUserData(token);
      fetchAnalytics(token);
      initializeSocket(decoded.userId);
    } catch (error) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }, []);

  const initializeSocket = (userId) => {
    const newSocket = io('http://localhost:5000');
    newSocket.emit('join_streamer_room', userId);
    setSocket(newSocket);

    return () => newSocket.close();
  };

  const fetchUserData = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setStreamlabsToken(res.data.streamlabsToken || '');
      setOverlaySettings(res.data.overlaySettings || overlaySettings);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/api/analytics?period=7d', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleUpdateOverlaySettings = async (newSettings) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/overlay-settings', 
        { overlaySettings: newSettings }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOverlaySettings(newSettings);
      alert('Overlay settings updated successfully!');
    } catch (error) {
      alert('Error updating overlay settings: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddToken = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/add-token', 
        { streamlabsToken }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Streamlabs token added successfully!');
    } catch (error) {
      alert('Error adding token: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleLogout = () => {
    if (socket) socket.close();
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa', 
      padding: '20px' 
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#333', fontSize: '28px' }}>
              Welcome back, {user?.username}! 👋
            </h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Manage your tipping settings and view analytics
            </p>
          </div>
          <button 
            onClick={handleLogout} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        {analytics && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '25px', 
              borderRadius: '12px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#28a745', fontSize: '32px' }}>
                ₹{analytics.totalEarnings.toFixed(2)}
              </h3>
              <p style={{ margin: 0, color: '#666' }}>Total Earnings (7 days)</p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '25px', 
              borderRadius: '12px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#007bff', fontSize: '32px' }}>
                {analytics.totalTips}
              </h3>
              <p style={{ margin: 0, color: '#666' }}>Total Tips</p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '25px', 
              borderRadius: '12px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#ffc107', fontSize: '32px' }}>
                ₹{analytics.averageTip.toFixed(2)}
              </h3>
              <p style={{ margin: 0, color: '#666' }}>Average Tip</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* Tip Page Info */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>🔗 Your Tip Page</h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Share this link with your audience:
            </p>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '8px', 
              border: '1px solid #dee2e6',
              marginBottom: '15px'
            }}>
              <code style={{ fontSize: '16px', color: '#495057' }}>
                {window.location.origin}/tip/{user?.username}
              </code>
            </div>
            <a 
              href={`/tip/${user?.username}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🚀 Preview Tip Page
            </a>
          </div>

          {/* OBS Overlay */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>📺 OBS Overlay</h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Add this URL as a Browser Source in OBS:
            </p>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '8px', 
              border: '1px solid #dee2e6',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              <code style={{ color: '#495057', wordBreak: 'break-all' }}>
                {window.location.origin}/overlay/{user?.username}
              </code>
            </div>
            <p style={{ fontSize: '12px', color: '#6c757d' }}>
              💡 Set width: 800px, height: 600px in OBS Browser Source
            </p>
          </div>
        </div>

        {/* Overlay Settings */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginTop: '30px'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>⚙️ Overlay Settings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Minimum Tip Amount (₹)
              </label>
              <input 
                type="number" 
                value={overlaySettings.minTipAmount}
                onChange={(e) => setOverlaySettings({
                  ...overlaySettings, 
                  minTipAmount: parseInt(e.target.value) || 10
                })}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Maximum Tip Amount (₹)
              </label>
              <input 
                type="number" 
                value={overlaySettings.maxTipAmount}
                onChange={(e) => setOverlaySettings({
                  ...overlaySettings, 
                  maxTipAmount: parseInt(e.target.value) || 10000
                })}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Animation Duration (ms)
              </label>
              <input 
                type="number" 
                value={overlaySettings.animationDuration}
                onChange={(e) => setOverlaySettings({
                  ...overlaySettings, 
                  animationDuration: parseInt(e.target.value) || 5000
                })}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input 
                type="checkbox" 
                checked={overlaySettings.showAmount}
                onChange={(e) => setOverlaySettings({
                  ...overlaySettings, 
                  showAmount: e.target.checked
                })}
                style={{ marginRight: '8px' }}
              />
              Show tip amount in overlay
            </label>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input 
                type="checkbox" 
                checked={overlaySettings.showMessage}
                onChange={(e) => setOverlaySettings({
                  ...overlaySettings, 
                  showMessage: e.target.checked
                })}
                style={{ marginRight: '8px' }}
              />
              Show tip message in overlay
            </label>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <input 
                type="checkbox" 
                checked={overlaySettings.soundEnabled}
                onChange={(e) => setOverlaySettings({
                  ...overlaySettings, 
                  soundEnabled: e.target.checked
                })}
                style={{ marginRight: '8px' }}
              />
              Enable sound alerts
            </label>
          </div>

          <button 
            onClick={() => handleUpdateOverlaySettings(overlaySettings)}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            💾 Save Overlay Settings
          </button>
        </div>

        {/* Streamlabs Integration */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginTop: '30px'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>🎮 Streamlabs Integration</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Connect your Streamlabs account to enable donation alerts:
          </p>
          <form onSubmit={handleAddToken}>
            <input 
              type="text" 
              value={streamlabsToken} 
              onChange={e => setStreamlabsToken(e.target.value)} 
              placeholder="Streamlabs API Token" 
              style={{ 
                width: '100%', 
                padding: '12px', 
                marginBottom: '15px', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <button 
              type="submit"
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {streamlabsToken ? '🔄 Update Token' : '➕ Add Token'}
            </button>
          </form>
        </div>

        {/* Recent Tips */}
        {user?.recentTips && user.recentTips.length > 0 && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginTop: '30px'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>💰 Recent Tips</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Donor</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Message</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {user.recentTips.map((tip, index) => (
                    <tr key={index}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #f1f3f4' }}>
                        {tip.donorName}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #f1f3f4', fontWeight: '500', color: '#28a745' }}>
                        ₹{tip.amount}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #f1f3f4' }}>
                        {tip.message || '-'}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #f1f3f4', color: '#666' }}>
                        {new Date(tip.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;