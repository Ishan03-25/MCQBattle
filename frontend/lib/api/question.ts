import axios from './axiosInstance';

export const createQuestion = async (token: string, data: any) => {
  const res = await axios.post('/questions/create', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getQuestions = async (token: string, gameId: string, userId: string) => {
  const res = await axios.get('/questions', {
    headers: { Authorization: `Bearer ${token}` },
    params: { gameId },
    data: { userId },
  });
  return res.data;
};

export const UpdateQuestion = async (token: string, id: string, data: {
  question: string,
  explanation: string
}) => {
  const res = await axios.put(`/questions/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteQuestion = async (token: string, id: string) => {
  const res = await axios.post(`/questions/delete/${id}`, {
  },{
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
