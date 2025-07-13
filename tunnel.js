import localtunnel from 'localtunnel';

console.log("Tunnel script initializing...");

(async () => {
  const tunnel = await localtunnel({ port: 3000, subdomain: 'web2pc' });

  console.log(`Tunnel is live at: ${tunnel.url}`);

  if(tunnel.url !== "https://web2pc.loca.lt") {
    console.error("Tunnel URL does not match expected URL. Exiting in 5 seconds...");
    tunnel.close()
    setTimeout(()=>{
      process.exit(1);
    }, 5000)
  }

  tunnel.on('close', () => {
    console.log("Tunnel closed.");
    process.exit(1);
  });

  tunnel.on('error', (err) => {
    console.error("Tunnel error:", err);
    process.exit(1);
  });
})();

function cleanup() {
  if (tunnel) {
    tunnel.close();
    console.log('Tunnel closed on exit');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('beforeExit', cleanup);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup();
});