// Script de test pour vérifier que toutes les parties du profil fonctionnent
const http = require('http');

// Test 1: Vérifier que la page profile charge correctement
function testProfilePage() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/profile',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Profile page loads successfully (Status: 200)');
                    resolve(true);
                } else {
                    console.log('❌ Profile page failed (Status:', res.statusCode + ')');
                    reject(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Profile page error:', error.message);
            reject(false);
        });

        req.end();
    });
}

// Test 2: Vérifier que l'API profile fonctionne (avec token invalide pour tester)
function testProfileAPI() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/user/profile',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer invalid_token'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (res.statusCode === 401 && result.error.includes('Session invalide')) {
                        console.log('✅ Profile API correctly rejects invalid token (Status: 401)');
                        resolve(true);
                    } else {
                        console.log('❌ Profile API unexpected response:', res.statusCode, result);
                        reject(false);
                    }
                } catch (error) {
                    console.log('❌ Profile API JSON parse error:', error.message);
                    reject(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Profile API error:', error.message);
            reject(false);
        });

        req.end();
    });
}

// Test 3: Vérifier que les fichiers statiques sont accessibles
function testStaticFiles() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/auth-utils.js',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 && data.includes('Auth')) {
                    console.log('✅ Auth utils file accessible (Status: 200)');
                    resolve(true);
                } else {
                    console.log('❌ Auth utils file failed (Status:', res.statusCode + ')');
                    reject(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Auth utils file error:', error.message);
            reject(false);
        });

        req.end();
    });
}

// Test 4: Vérifier que le serveur répond correctement
function testServerHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Server responds correctly (Status: 200)');
                    resolve(true);
                } else {
                    console.log('❌ Server failed (Status:', res.statusCode + ')');
                    reject(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Server error:', error.message);
            reject(false);
        });

        req.end();
    });
}

// Exécuter tous les tests
async function runAllTests() {
    console.log('🧪 TESTING PROFILE FUNCTIONALITY');
    console.log('=====================================');
    
    const tests = [
        { name: 'Server Health', fn: testServerHealth },
        { name: 'Auth Utils File', fn: testStaticFiles },
        { name: 'Profile Page', fn: testProfilePage },
        { name: 'Profile API', fn: testProfileAPI }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`\n🔍 Testing ${test.name}...`);
            await test.fn();
            passed++;
        } catch (error) {
            console.log(`❌ ${test.name} failed:`, error.message || error);
            failed++;
        }
    }
    
    console.log('\n📊 TEST RESULTS');
    console.log('=====================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Profile functionality is working correctly.');
        console.log('\n📋 MANUAL TESTING CHECKLIST:');
        console.log('1. Open http://localhost:3001/profile in browser');
        console.log('2. Check if profile data loads (should show demo data)');
        console.log('3. Try editing profile fields and saving');
        console.log('4. Try switching between tabs (Edit Profile, Publish New Post, My Posts)');
        console.log('5. Try uploading media in Publish New Post tab');
        console.log('6. Try creating and viewing posts');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED! Check server logs for details.');
    }
}

// Exécuter les tests
runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
});
