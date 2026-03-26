import api from './index';
import { getSpiritById, getAllSpirits } from './spirits';

export const getUserNotes = async (userId) => {
  const response = await api.get(`/notes/${userId}`);
  const notes = response.data.notes;

  try {
    // 모든 주류 정보를 가져와서 매핑 준비
    const spiritsData = await getAllSpirits();
    const spirits = spiritsData.spirits || spiritsData;
    const spiritsMap = Array.isArray(spirits) 
      ? spirits.reduce((acc, s) => ({ ...acc, [s.id]: s }), {})
      : {};

    return notes.map(note => {
      if (note.spirit_id && !note.name) {
        const spirit = spiritsMap[note.spirit_id];
        if (spirit) {
          return {
            ...spirit,
            ...note,
            name: note.name || spirit.name,
            distillery: note.distillery || spirit.distillery || spirit.distilleryName,
            category: note.category || spirit.category,
            origin: note.origin || spirit.origin,
            abv: note.abv || spirit.abv,
            volume: note.volume || spirit.volume,
          };
        }
      }
      return note;
    });
  } catch (err) {
    console.error('Failed to enrich notes with spirit data:', err);
    return notes;
  }
};

export const getNoteById = async (userId, noteId) => {
  const response = await api.get(`/notes/${userId}/${noteId}`);
  const note = response.data.note;

  if (note && note.spirit_id && !note.name) {
    try {
      const spiritData = await getSpiritById(note.spirit_id);
      const spirit = spiritData.spirit;
      if (spirit) {
        return {
          ...spirit,
          ...note,
          name: note.name || spirit.name,
          distillery: note.distillery || spirit.distillery || spirit.distilleryName,
          category: note.category || spirit.category,
          origin: note.origin || spirit.origin,
          abv: note.abv || spirit.abv,
          volume: note.volume || spirit.volume,
          categoryHierarchy: note.categoryHierarchy || spirit.categoryHierarchy || [],
          locationHierarchy: note.locationHierarchy || spirit.locationHierarchy || [],
        };
      }
    } catch (err) {
      console.error('Failed to enrich note with spirit data:', err);
    }
  }
  return note;
};

export const deleteNote = async (userId, noteId) => {
  const response = await api.delete(`/notes/${userId}/${noteId}`);
  return response.data;
};
