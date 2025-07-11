import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let senderSocket = null;
let receiverSocket = null;
let pcSocket = null;

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("pcconnect", () => {
    console.log("PC connected");
    pcSocket = socket;
  });

  socket.on("auth_ask", (password) => {
    if (password === process.env["PASSWORD"]) {
      socket.emit("auth_send", true);
    } else {
      socket.emit("auth_send", false);
    }
    console.log(!!senderSocket, !!receiverSocket, password, process.env["PASSWORD"], "auth_ask");
  });

  socket.on("register_role", (role) => {
    if (role === 1) {
      senderSocket = socket;
      if (receiverSocket) socket.emit("offer_ask");
      console.log("Sender registered");
    } else {
      receiverSocket = socket;
      if (senderSocket) senderSocket.emit("offer_ask");
      console.log("Receiver registered");
    }
    console.log(!!senderSocket, !!receiverSocket, "register_role");
  });

  socket.on("offer", (data) => {
    if (receiverSocket) receiverSocket.emit("offer", data);
    console.log(!!senderSocket, !!receiverSocket, "offer");
  });

  socket.on("answer", (data) => {
    if (senderSocket) senderSocket.emit("answer", data);
    console.log(!!senderSocket, !!receiverSocket, "answer");
  });

  socket.on("candidate", (data) => {
    if (senderSocket == socket && receiverSocket)
      receiverSocket.emit("candidate", data);
    if (receiverSocket == socket && senderSocket)
      senderSocket.emit("candidate", data);
    console.log(!!senderSocket, !!receiverSocket, "candidate");
  });

  socket.on("disconnect", () => {
    if (socket === senderSocket) {
      console.log("Sender disconnected");
      senderSocket = null;
      if (receiverSocket) receiverSocket.emit("sender_disconnected");
    }
    if (socket === receiverSocket) {
      console.log("Receiver disconnected");
      receiverSocket = null;
      if (senderSocket) senderSocket.emit("receiver_disconnected");
    }
    if (socket === pcSocket) {
      console.log("PC disconnected");
      pcSocket = null;
      if (receiverSocket) receiverSocket.emit("pc_disconnected");
    }
    console.log("client disconnected");
  });

  socket.on("mouse", (data) => {
    console.log(socket == receiverSocket, pcSocket);
    if (socket == receiverSocket && pcSocket) pcSocket.emit("mouse", data);
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});