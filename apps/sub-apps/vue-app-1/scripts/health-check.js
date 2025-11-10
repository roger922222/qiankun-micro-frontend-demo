const http = require('http');

function checkHealth() {
  const options = {
    hostname: '127.0.0.1',
    port: 3006,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Vue应用健康检查通过 - 状态码: ${res.statusCode}`);
    console.log(`🌐 服务地址: http://localhost:3006`);
    console.log(`⏰ 检查时间: ${new Date().toISOString()}`);
    process.exit(0);
  });

  req.on('error', (err) => {
    console.error(`❌ Vue应用健康检查失败: ${err.message}`);
    console.log(`💡 请确保运行: npm run dev`);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Vue应用健康检查超时');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

checkHealth();