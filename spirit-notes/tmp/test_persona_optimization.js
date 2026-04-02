const axios = require('axios');

const BASE_URL = 'http://localhost:5000'; // 로컬 백엔드 서버 기준
const userId = 'test-user-123';

async function testPersonaOptimization() {
  console.log('--- Persona Optimization Test Starting ---');

  try {
    // 1. 유저 데이터가 없을 때의 persona 호출 (dummy/null 기대)
    console.log('[Test 1] Fetching persona for a new user (no data)...');
    const res1 = await axios.post(`${BASE_URL}/api/persona/${userId}`);
    console.log('Response persona:', res1.data.persona);
    
    // 2. Flavor DNA 업데이트 (여기서 AI가 호출되어 페르소나가 저장되어야 함)
    // *실제 DB 연동이 필요하므로, 여기서는 로직이 성공적으로 도는지 확인하는 차원*
    console.log('\n[Test 2] Triggering Flavor DNA update...');
    const res2 = await axios.post(`${BASE_URL}/api/flavor-dna/${userId}`);
    if (res2.data.success) {
      console.log('Flavor DNA updated. Persona should have been cached.');
      if (res2.data.persona) {
        console.log('Cached Persona:', res2.data.persona.title);
      }
    }

    // 3. 다시 persona 호출 (캐시된 데이터가 나와야 함 - AI 추가 호출 없음)
    console.log('\n[Test 3] Fetching persona again (should be from cache)...');
    const res3 = await axios.post(`${BASE_URL}/api/persona/${userId}`);
    console.log('Response persona (Cached):', res3.data.persona ? res3.data.persona.title : 'None');

    console.log('\n--- Test Completed Successfully ---');
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\n[!] Note: If the backend server is not running or Firebase is not connected, this test might fail.');
  }
}

testPersonaOptimization();
