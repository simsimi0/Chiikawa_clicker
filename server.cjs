// Optional dependency-free local server: node server.cjs [port]
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const base=__dirname,port=Number(process.argv[2]||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{let file;try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(base,'.'+(name==='/'?'/index.html':name));}catch{res.writeHead(400).end();return;}if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port in use. Try: node server.cjs 4174':e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('Game: http://127.0.0.1:'+port+' (Ctrl+C to stop)'));
