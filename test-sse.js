const http = require('http');

async function run() {
  const travelerId = 'test-traveler-' + Date.now();
  
  // Connect to SSE
  const req = http.request('http://localhost:3000/api/interact/stream?travelerId=' + travelerId, (res) => {
    console.log('SSE connected: status', res.statusCode);
    res.on('data', chunk => {
      const parts = chunk.toString().split('\n\n');
      for (const p of parts) {
        if (p.startsWith('data: ')) {
          const state = JSON.parse(p.substring(6));
          console.log(`[SSE] Step: ${state.step} | Orch Status: ${state.orchestration_status || 'N/A'}`);
        }
      }
    });
  });
  req.end();

  setTimeout(async () => {
    console.log('Sending POST /api/interact');
    const res = await fetch('http://localhost:3000/api/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello', travelerId })
    });
    console.log('POST status:', res.status);
    setTimeout(() => { process.exit(0); }, 3000);
  }, 2000);
}

run();
