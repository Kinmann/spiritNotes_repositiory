import api from './index';

export const getRecommendations = async (userId) => {
  const response = await api.post(`/recommendations/${userId}`);
  return response.data;
};
