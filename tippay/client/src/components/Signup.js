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
    } catch (error) {
      alert(error.response.data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" placeholder="Username" onChange={handleChange} required />
      <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
      <input name="bank.beneficiary_name" placeholder="Bank Name" onChange={handleChange} required />
      <input name="bank.account_number" placeholder="Account Number" onChange={handleChange} required />
      <input name="bank.ifsc" placeholder="IFSC" onChange={handleChange} required />
      <button type="submit">Signup</button>
    </form>
  );
}

export default Signup;