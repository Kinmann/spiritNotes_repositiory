import api from './index';

export const getAllSpirits = async () => {
  const response = await api.get('/api/spirits');
  return response.data;
};
