import { spawn } from 'child_process';

const HTTP_TUNNEL_URL = 'http://web2pc.loca.lt/ping';
const HTTPS_TUNNEL_URL = 'https://web2pc.loca.lt/ping';
const CHECK_INTERVAL = 10 * 1000;

async function checkTunnel() {
    try{
        const res = await fetch(HTTP_TUNNEL_URL, { method: 'GET' });
        const text = (await res.text()).trim();
        if(res.ok && text === 'pong') {
            console.log('[Watchdog] HTTP Tunnel is UP. Status: ' + res.status);
        }else{
            console.warn(`[Watchdog] HTTP Tunnel unexpected status or response. Status: ${res.status}, Response: "${text}". Restarting...`);
            restartProcess("tunnel")
            restartProcess("server")
        }
        try{
            const res2 = await fetch(HTTPS_TUNNEL_URL, { method: 'GET' });
            if(res2.ok && (await res2.text()).trim() === 'pong') {
                console.log('[Watchdog] HTTPS Tunnel is UP. Status: ' + res2.status);
            }else{
                console.warn(`[Watchdog] HTTPS Tunnel unexpected status or response. Status: ${res2.status}`);
            }
        }catch(err){
            console.error('[Watchdog] HTTPS Tunnel check failed:', err.message);
        }
    }catch (error) {
        console.error('[Watchdog] HTTP Tunnel/server unreachable. Restarting...', error.message);
        restartProcess("tunnel")
        restartProcess("server")
    }
}

function restartProcess(name) {
  const subprocess = spawn('C:\\Users\\frenc\\AppData\\Roaming\\npm\\pm2.cmd', ['restart', name], {
    windowsHide: true,
    shell: true,
  });

  subprocess.unref();

  console.log(`[Watchdog] Restarted process: ${name}`);
}

setInterval(checkTunnel, CHECK_INTERVAL);
console.log('[Watchdog] Running. Monitoring tunnel...');
