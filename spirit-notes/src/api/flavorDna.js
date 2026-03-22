import api from './index';

export const updateFlavorDNA = async (userId) => {
  const response = await api.post(`/api/flavor-dna/${userId}`);
  return response.data;
};
