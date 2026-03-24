import api from './index';

export const updateFlavorDNA = async (userId) => {
  const response = await api.post(`/flavor-dna/${userId}`);
  return response.data;
};

export const getPersona = async (userId) => {
  const response = await api.post(`/persona/${userId}`);
  return response.data;
};
