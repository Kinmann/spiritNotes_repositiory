import api from './index';

export const getAllSpirits = async () => {
  const response = await api.get('/spirits');
  return response.data;
};

export const getSpiritById = async (id) => {
  const response = await api.get(`/spirits/${id}`);
  return response.data;
};
