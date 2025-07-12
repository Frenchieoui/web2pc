// import { RemoteSocket } from "socket.io";

const socket = io("https://web2pc.loca.lt", {
  Headers: {
    "idk": "idk",
  }
});
const password = prompt("Enter password to continue.");

const title = document.getElementById("title");
const statusP = document.getElementById("status");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const fullscreenButton = document.getElementById("fullscreen");

let peer = null;

let stream = null;

socket.on("auth_send", async (isAuth) => {
  if (!isAuth) {
    alert("Wrong password.");
    location.reload();
    return;
  }

  let role = parseInt(
    prompt(
      "Role? sender=1, receiver=2, quit=3 (it will ask you to share screen, just do it, ur data is safe dw bro, its so that i can actually send u data idk why bruh)",
    ),
  );
  while (![1, 2, 3].includes(role)) {
    role = parseInt(
      prompt(
        "Role? sender=1, receiver=2, quit=3 (it will ask you to share screen, just do it, ur data is safe dw bro, its so that i can actually send u data idk why bruh)",
      ),
    );
  }

  title.textContent = role === 1 ? "U R Sender" : "U R Receiver";

  if (role === 3) {
    window.close();
  }

  stream = await navigator.mediaDevices.getDisplayMedia({   
    video: {
      displaySurface: "screen",
      frameRate: role === 1 ? {ideal: 60, max: 60} : {ideal: 10, max: 10},
    }, 
    audio: role === 1 ? true : false,
  });
  localVideo.srcObject = stream;

  socket.emit("register_role", role);

  if (role === 1) {
    // SENDER
    localVideo.hidden = false;
    remoteVideo.hidden = true;
    fullscreenButton.hidden = true;

    statusP.innerText = "Waiting for receiver to connect";

    socket.on("answer", async (answer) => {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      statusP.innerText = "Receiver connected";
    });

    socket.on("offer_ask", async () => {
      offer();
    });

    socket.on("receiver_disconnected", () => {
      statusP.innerText =
        "Receiver disconnected, waiting for receiver to connect";
    });
  } else {
    // RECEIVER
    localVideo.hidden = true;
    remoteVideo.hidden = false;
    fullscreenButton.hidden = false;

    fullscreenButton.addEventListener("click", () => {
      remoteVideo.parentElement.requestFullscreen();
      remoteVideo.parentElement.ogWidth = remoteVideo.parentElement.style.width;
      remoteVideo.parentElement.ogHeight = remoteVideo.parentElement.style.height;
      removeVideo.parentElement.style.width = document.body.screen.width + "px";
      removeVideo.parentElement.style.height = document.body.screen.height + "px";
    });

    remoteVideo.parentElement.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        remoteVideo.parentElement.style.width =
          remoteVideo.parentElement.ogWidth || "1280px";
        remoteVideo.parentElement.style.height =
          remoteVideo.parentElement.ogHeight || "720px";
      }
    });

    statusP.textContent = "Waiting for sender to connect";

    socket.on("offer", async (offer) => {
      createPeer(2);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", answer);
      statusP.innerText =
        "Sender connected, maybe pc isnt idk im not chekcing im too lazy";
    });

    socket.on("sender_disconnected", () => {
      statusP.innerText = "Sender disconnected, waiting for sender to connect";
    });

    socket.on("pc_disconnected", () => {
      statusP.innerText += "; PC disconnected";
    });

    let mouse = { x: 0, y: 0 };

    remoteVideo.addEventListener("mousemove", (e) => {
      const rect = remoteVideo.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const relativeX = mouseX / rect.width;
      const relativeY = mouseY / rect.height;

      const absoluteX = Math.round(relativeX * remoteVideo.videoWidth);
      const absoluteY = Math.round(relativeY * remoteVideo.videoHeight);

      mouse.x = absoluteX;
      mouse.y = absoluteY;
    });

    function sendMouseMove() {
      socket.emit("mouse_move", { x: mouse.x, y: mouse.y });
      requestAnimationFrame(sendMouseMove);
    }
    sendMouseMove()

    document.addEventListener("mousedown", (e) => {
      socket.emit("mouse_down", e.button);
    });

    document.addEventListener("mouseup", (e) => {
      socket.emit("mouse_up", e.button);
    });

    document.addEventListener("keydown", (e) => {
      socket.emit("key_event", { type: "down", key: e.key });
    });

    document.addEventListener("keyup", (e) => {
      socket.emit("key_event", { type: "up", key: e.key });
    });

    document.addEventListener("wheel", (e) => {
      socket.emit("wheel", { deltaX: e.deltaX, deltaY: e.deltaY });
    });

    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  // Common: ICE candidate
  socket.on("candidate", async (candidate) => {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("ICE error:", err);
    }
  });
});

socket.emit("auth_ask", password);

async function offer() {
  createPeer(1);

  const offer = await peer.createOffer({ offerToReceiveVideo: true });
  await peer.setLocalDescription(offer);
  socket.emit("offer", offer);
}

function createPeer(role) {
  if (peer) peer.close();
  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peer.onicecandidate = (e) => {
    if (e.candidate) socket.emit("candidate", e.candidate);
  };

  peer.oniceconnectionstatechange = () => {
    console.log("ICE state:", peer.iceConnectionState);
  };

  peer.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };

  stream.getTracks().forEach((track) => peer.addTrack(track, stream));
}

