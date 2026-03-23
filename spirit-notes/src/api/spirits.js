import api from './index';

export const getAllSpirits = async () => {
  const response = await api.get('/api/spirits');
  return response.data;
};

export const getSpiritById = async (id) => {
  const response = await api.get(`/api/spirits/${id}`);
  return response.data;
};
