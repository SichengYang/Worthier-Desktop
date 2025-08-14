async function debugServerRoutes() {
    console.log('Debugging server routes...\n');
    
    // Test base endpoint
    try {
        console.log('Testing GET /...');
        const baseResponse = await fetch('https://login.worthier.app/', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        
        console.log(`Base route status: ${baseResponse.status}`);
        const baseText = await baseResponse.text();
        console.log(`Base route response: ${baseText}\n`);
        
    } catch (error) {
        console.log(`Base route error: ${error.message}\n`);
    }
    
    // Test device endpoint variations
    const devicePaths = ['/deviceInfo'];

    for (const path of devicePaths) {
        try {
            console.log(`Testing POST ${path}...`);
            const response = await fetch(`https://login.worthier.app${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionID: 'test-session-123',
                    macAddress: '00:11:22:33:44:55',
                    platform: 'darwin',
                    arch: 'arm64',
                    deviceName: 'Test Device'
                }),
                signal: AbortSignal.timeout(5000)
            });
            
            console.log(`${path} status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            console.log(`${path} response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
            
        } catch (error) {
            console.log(`${path} error: ${error.message}`);
        }
        console.log('');
    }
    
    // Test if the server recognizes any POST endpoints
    console.log('Testing other known endpoints...');
    try {
        console.log('Testing POST /quickLogin...');
        const pollResponse = await fetch('https://login.worthier.app/quickLogin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
        });
        
        console.log(`Poll endpoint status: ${pollResponse.status}`);
        const pollText = await pollResponse.text();
        console.log(`Poll endpoint response: ${pollText.substring(0, 200)}${pollText.length > 200 ? '...' : ''}`);
        
    } catch (error) {
        console.log(`Poll endpoint error: ${error.message}`);
    }
}

debugServerRoutes();
