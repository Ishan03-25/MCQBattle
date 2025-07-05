import axios from './axiosInstance';

const authHeader = (token: string) => ({
  headers: { authorization: `Bearer ${token}` },
});

export const createGame = async (token: string, gameData: any) => {
  const res = await axios.post('/games/create', {
    game : gameData
  }, authHeader(token));
  return res.data;
};

export const joinGame = async (token: string, gameId: string, userId: string) => {
  const res = await axios.post('/games/join', { gameId, userId }, authHeader(token));
  return res.data;
};

export const leaveGame = async (token: string, gameId: string, userId: string) => {
  const res = await axios.post('/games/leave', { gameId, userId }, authHeader(token));
  return res.data;
};

export const acceptPlayer = async (token: string, gameId: string, playerId: string) => {
  const res = await axios.post('/games/accept', { gameId, playerId }, authHeader(token));
  return res.data;
};

export const updateGame = async (token: string, gameId: string,newName: string) => {
  const res = await axios.put(`/games/${gameId}`,{
    newName: newName
  }, authHeader(token));
  return res.data;
};

export const startGame = async (token: string, gameId: string) => {
  const res = await axios.patch(`/games/${gameId}/start`, { }, {
    headers:{
      Authorization: `Bearer ${token}`
    },  
  });
  return res.data;
};

export const endGame = async (token: string, gameId: string) => {
  const res = await axios.patch(`/games/${gameId}/end`, { }, {
    headers:{
      Authorization: `Bearer ${token}`
    },  
  });
  return res.data;
};

export const getAllMyGames = async (token: string) => {
  const res = await axios.post('/games/my-games',{
    
  },authHeader(token));
  return res.data;
};

export const getAllGames = async () => {
  const res = await axios.get('/games');
  return res.data;
};
export const deleteGame = async (token: string, gameId: string) => {
  const res = await axios.delete(`/games/delete/${gameId}`, {
    ...authHeader(token),
    data:{
      
    }
  });
  return res.data;
};


export const getGameById = async (token: string, gameId: string) => {
  const res = await axios.post(`/games/${gameId}`, {
    gameId
  },authHeader(token));
  return res.data;
};


