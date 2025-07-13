import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({path: "secret.env"});
import { spawn } from "child_process";

function runPythonScript(){
  const py = spawn(
    "C:\\Users\\frenc\\OneDrive\\Documents\\cool projects ig\\Web 2 PC\\venv\\Scripts\\python.exe",
    ["C:\\Users\\frenc\\OneDrive\\Documents\\cool projects ig\\Web 2 PC\\client.py"],
    {
      windowsHide: true,
    }
  );

  py.stdout.on("data", (data) => {
    console.log(`Python says: ${data}`);
  });

  py.stderr.on("data", (data) => {
    console.error(`Python error: ${data}`);
  });

  py.on("close", (code) => {
    console.log(`Python exited with code ${code}`);
  });

  py.unref()
}

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(cors())
app.use(express.static("public"));

app.get('/ping', (req, res) => {
  res.send('pong');
});

let clientSocket = null;
let pcSocket = null;

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("pc_connect", () => {
    console.log("PC connected");
    pcSocket = socket;
    if(clientSocket) socket.emit("offer_ask")
  });

  socket.on("register_client", () => {
    console.log("Client registered");
    clientSocket = socket;
    
    if(pcSocket){
      pcSocket.emit("die")
    }
    runPythonScript()
  });

  socket.on("auth_ask", (password) => {
    if (password === process.env["PASSWORD"]) {
      socket.emit("auth_send", true);
    } else {
      socket.emit("auth_send", false);
    }
    console.log(!!pcSocket, !!clientSocket, password, process.env["PASSWORD"], "auth_ask");
  });

  socket.on("offer", (data) => {
    if (clientSocket) clientSocket.emit("offer", data);
    console.log(!!pcSocket, !!clientSocket, "offer");
  });

  socket.on("offer_ask", () => {
    if (pcSocket) pcSocket.emit("offer_ask");
    console.log(!!pcSocket, !!clientSocket, "offer_ask");
  });

  socket.on("answer", (data) => {
    if (pcSocket) {
      pcSocket.emit("answer", data);
    }
    console.log(!!pcSocket, !!clientSocket, "answer");
  });

  socket.on("candidate", (data) => {
    if (pcSocket == socket && clientSocket)
      clientSocket.emit("candidate", data);
    if (clientSocket == socket && pcSocket)
      pcSocket.emit("candidate", data);
    console.log(!!pcSocket, !!clientSocket, "candidate");
  });

  socket.on("disconnect", () => {
    if (socket === clientSocket) {
      console.log("Client disconnected");
      if(pcSocket) pcSocket.emit("die")
      clientSocket = null;
    }
    if (socket === pcSocket) {
      console.log("PC disconnected");
      if(clientSocket) clientSocket.emit("pc_disconnect");
      pcSocket = null;
    }
    console.log("some client disconnected");
  });

  socket.on("pc_kill_switch", () => {
    console.log("Kill switch activated by PC");
    clientSocket.emit("pc_kill_switch");
  })

  socket.on("mouse_move", (data) => {
    if (socket == clientSocket && pcSocket) pcSocket.emit("mouse_move", data);
  });

  socket.on("mouse_down", (data) => {
    if (socket == clientSocket && pcSocket) pcSocket.emit("mouse_down", data);
  });
  socket.on("mouse_up", (data) => {
    if (socket == clientSocket && pcSocket) pcSocket.emit("mouse_up", data);
  });

  socket.on("key_event", (data) => {
    if (socket == clientSocket && pcSocket) pcSocket.emit("key_event", data);
  });

  socket.on("wheel", (data) => {
    if (socket == clientSocket && pcSocket) pcSocket.emit("wheel", data);
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});