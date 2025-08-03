import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function TipPage() {
  const { username } = useParams();
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTip = async () => {
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/create-order/${username}`, { amount, donorName });
      const { orderId, key } = res.data;
      const options = {
        key,
        amount: amount * 100,
        currency: 'INR',
        order_id: orderId,
        handler: (response) => {
          alert('Tip successful! The streamer has been notified.');
          setAmount('');
          setDonorName('');
        },
        prefill: { name: donorName },
        modal: {
          ondismiss: () => setLoading(false)
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>💰 Tip {username}</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Show your support with a tip!</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        <input 
          value={donorName} 
          onChange={e => setDonorName(e.target.value)} 
          placeholder="Your Name (optional)" 
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
        />
        <input 
          type="number" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
          placeholder="Amount (₹)" 
          min="1"
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
          required
        />
      </div>
      
      <button 
        onClick={handleTip}
        disabled={loading}
        style={{ 
          padding: '15px 30px', 
          backgroundColor: loading ? '#ccc' : '#ff6b35', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: loading ? 'not-allowed' : 'pointer', 
          fontSize: '18px',
          fontWeight: 'bold',
          width: '100%'
        }}
      >
        {loading ? 'Processing...' : '🎁 Tip Now'}
      </button>
      
      <p style={{ fontSize: '12px', color: '#888', marginTop: '20px' }}>
        Powered by Razorpay • Secure payments
      </p>
    </div>
  );
}

export default TipPage;