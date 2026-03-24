const http = require('http');

http.get('http://localhost:5000/api/notes/Y6yrkpoSFBPbyWR9GleCxElAKQk2', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify({
        success: parsed.success,
        notesCount: parsed.notes ? parsed.notes.length : 0,
        firstNoteId: parsed.notes && parsed.notes.length > 0 ? parsed.notes[0].id : null
      }, null, 2));
    } catch (e) {
      console.log('Error parsing JSON:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
