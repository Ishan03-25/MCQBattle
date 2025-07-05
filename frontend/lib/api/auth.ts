import axios from './axiosInstance';

export const requestOtp = async (username: string, email: string, password: string) => {
  const res = await axios.post('/users/request-otp', { username, email, password });
  return res.data;
};

export const verifyOtp = async (token: string, otp: string) => {
  const res = await axios.post('/users/verify-otp', { token, otp });
  return res.data;
};

export const signin = async (username: string, password: string) => {
  const res = await axios.post('/users/signin', { username, password });
  return res.data;
};

export const requestForgotPasswordOtp = async (email: string) => {
  const res = await axios.post('/users/forgot-password/request-otp', { email });
  return res.data;
};

export const verifyForgotPasswordOtp = async (token: string, otp: string) => {
  const res = await axios.post('/users/forgot-password/verify-otp', { token, otp });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await axios.post('/users/forgot-password/reset-password', {
    token,
    newPassword,
  });
  return res.data;
};
