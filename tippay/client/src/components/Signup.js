import React, { useState } from 'react';
import axios from 'axios';

function Signup() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', bankDetails: { beneficiary_name: '', account_number: '', ifsc: '' } });

  const handleChange = (e) => {
    if (e.target.name.startsWith('bank')) {
      const key = e.target.name.split('.')[1];
      setFormData({ ...formData, bankDetails: { ...formData.bankDetails, [key]: e.target.value } });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/signup', formData);
      alert('Signup successful! Login now.');
      window.location.href = '/login';
    } catch (error) {
      alert('Signup failed: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Sign Up for Tippay</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          name="username" 
          placeholder="Username" 
          onChange={handleChange} 
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          required 
        />
        <input 
          name="email" 
          type="email" 
          placeholder="Email" 
          onChange={handleChange} 
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          required 
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Password" 
          onChange={handleChange} 
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          required 
        />
        <h3>Bank Details</h3>
        <input 
          name="bank.beneficiary_name" 
          placeholder="Account Holder Name" 
          onChange={handleChange} 
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          required 
        />
        <input 
          name="bank.account_number" 
          placeholder="Account Number" 
          onChange={handleChange} 
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          required 
        />
        <input 
          name="bank.ifsc" 
          placeholder="IFSC Code" 
          onChange={handleChange} 
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          required 
        />
        <button 
          type="submit"
          style={{ padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
        >
          Sign Up
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Already have an account? <a href="/login" style={{ color: '#007bff' }}>Login here</a>
      </p>
    </div>
  );
}

export default Signup;