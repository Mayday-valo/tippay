import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

function Dashboard() {
  const [streamlabsToken, setStreamlabsToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const decoded = jwtDecode(token);
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      // Fetch user data
      fetchUserData(token);
    } catch (error) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setStreamlabsToken(res.data.streamlabsToken || '');
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
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
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
      
      {user && (
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Welcome, {user.username}!</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Your Tip Page:</strong> 
            <a href={`/tip/${user.username}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', color: '#007bff' }}>
              /tip/{user.username}
            </a>
          </p>
        </div>
      )}

      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Streamlabs Integration</h3>
        <p>Add your Streamlabs API token to enable donation alerts in OBS:</p>
        <form onSubmit={handleAddToken}>
          <input 
            type="text" 
            value={streamlabsToken} 
            onChange={e => setStreamlabsToken(e.target.value)} 
            placeholder="Streamlabs API Token" 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            required 
          />
          <button 
            type="submit"
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {streamlabsToken ? 'Update Token' : 'Add Token'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Dashboard;