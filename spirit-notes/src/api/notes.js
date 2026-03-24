import api from './index';

export const getUserNotes = async (userId) => {
  const response = await api.get(`/notes/${userId}`);
  return response.data.notes;
};

export const getNoteById = async (userId, noteId) => {
  const response = await api.get(`/notes/${userId}/${noteId}`);
  return response.data.note;
};

export const deleteNote = async (userId, noteId) => {
  const response = await api.delete(`/notes/${userId}/${noteId}`);
  return response.data;
};
