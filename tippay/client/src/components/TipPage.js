import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function TipPage() {
  const { username } = useParams();
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');

  const handleTip = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/create-order/${username}`, { amount, donorName });
      const { orderId, key } = res.data;
      const options = {
        key,
        amount: amount * 100,
        currency: 'INR',
        order_id: orderId,
        handler: (response) => alert('Tip successful! Alert on stream.'),
        prefill: { name: donorName }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert(error.response.data.error);
    }
  };

  return (
    <div>
      <h1>Tip {username}</h1>
      <input value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Your Name" />
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (INR)" />
      <button onClick={handleTip}>Tip Now</button>
    </div>
  );
}

export default TipPage;