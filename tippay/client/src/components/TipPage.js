import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function TipPage() {
  const { username } = useParams();
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamerInfo, setStreamerInfo] = useState(null);

  React.useEffect(() => {
    // Fetch streamer info for validation
    fetchStreamerInfo();
  }, [username]);

  const fetchStreamerInfo = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/overlay/${username}`);
      setStreamerInfo(res.data);
    } catch (error) {
      console.error('Error fetching streamer info:', error);
    }
  };

  const handleTip = async () => {
    const tipAmount = parseFloat(amount);
    
    if (!tipAmount || tipAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (streamerInfo) {
      if (tipAmount < streamerInfo.overlaySettings.minTipAmount) {
        alert(`Minimum tip amount is ₹${streamerInfo.overlaySettings.minTipAmount}`);
        return;
      }
      if (tipAmount > streamerInfo.overlaySettings.maxTipAmount) {
        alert(`Maximum tip amount is ₹${streamerInfo.overlaySettings.maxTipAmount}`);
        return;
      }
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/create-order/${username}`, { 
        amount: tipAmount, 
        donorName: donorName || 'Anonymous',
        message 
      });
      const { orderId, key } = res.data;
      
      const options = {
        key,
        amount: tipAmount * 100,
        currency: 'INR',
        order_id: orderId,
        name: `Tip ${username}`,
        description: `Support ${username} with your tip`,
        handler: (response) => {
          // Success callback
          showSuccessMessage();
          setAmount('');
          setDonorName('');
          setMessage('');
          setLoading(false);
        },
        prefill: { 
          name: donorName || 'Anonymous'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        },
        theme: {
          color: '#ff6b35'
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const showSuccessMessage = () => {
    // Create a success overlay
    const successDiv = document.createElement('div');
    successDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div style="background: white; padding: 40px; border-radius: 15px; text-align: center; max-width: 400px;">
          <h2 style="color: #28a745; margin-bottom: 20px;">🎉 Tip Sent Successfully!</h2>
          <p style="color: #666; margin-bottom: 20px;">Thank you for supporting ${username}!</p>
          <button onclick="this.parentElement.parentElement.remove()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(successDiv);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#333', 
            marginBottom: '10px',
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            💰 Tip {username}
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '18px',
            margin: 0
          }}>
            Show your support with a tip!
          </p>
        </div>

        {streamerInfo && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '25px',
            fontSize: '14px',
            color: '#666'
          }}>
            💡 Tip range: ₹{streamerInfo.overlaySettings.minTipAmount} - ₹{streamerInfo.overlaySettings.maxTipAmount}
          </div>
        )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
        <input 
          value={donorName} 
          onChange={e => setDonorName(e.target.value)} 
          placeholder="Your Name (optional)"
          style={{ 
            padding: '15px', 
            border: '2px solid #e9ecef', 
            borderRadius: '12px', 
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.3s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
        />
        <input 
          type="number" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
          placeholder="Amount (₹)" 
          min={streamerInfo?.overlaySettings.minTipAmount || 1}
          max={streamerInfo?.overlaySettings.maxTipAmount || 10000}
          style={{ 
            padding: '15px', 
            border: '2px solid #e9ecef', 
            borderRadius: '12px', 
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.3s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          required
        />
        <textarea 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          placeholder="Optional message for the streamer..."
          maxLength="200"
          rows="3"
          style={{ 
            padding: '15px', 
            border: '2px solid #e9ecef', 
            borderRadius: '12px', 
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.3s ease',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
        />
      </div>
      
      <button 
        onClick={handleTip}
        disabled={loading}
        style={{ 
          padding: '18px 40px', 
          backgroundColor: loading ? '#ccc' : '#ff6b35', 
          color: 'white', 
          border: 'none', 
          borderRadius: '12px', 
          cursor: loading ? 'not-allowed' : 'pointer', 
          fontSize: '20px',
          fontWeight: 'bold',
          width: '100%',
          transition: 'all 0.3s ease',
          boxShadow: loading ? 'none' : '0 4px 15px rgba(255, 107, 53, 0.3)'
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.target.style.backgroundColor = '#e55a2b';
            e.target.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseOut={(e) => {
          if (!loading) {
            e.target.style.backgroundColor = '#ff6b35';
            e.target.style.transform = 'translateY(0)';
          }
        }}
      >
        {loading ? '⏳ Processing...' : '🎁 Send Tip'}
      </button>
      
        <div style={{ marginTop: '25px' }}>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>
            🔒 Powered by Razorpay • Secure payments
          </p>
          <p style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>
            Your payment information is encrypted and secure
          </p>
        </div>
      </div>
    </div>
  );
}

export default TipPage;