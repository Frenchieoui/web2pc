const socket = io("http://localhost:3000");
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

  stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
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
    const mouse = { x: 0, y: 0, click: false };

    // RECEIVER
    localVideo.hidden = true;
    remoteVideo.hidden = false;
    fullscreenButton.hidden = false;

    fullscreenButton.addEventListener("click", () => {
      remoteVideo.parentElement.requestFullscreen();
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

    remoteVideo.addEventListener("mousedown", () => {
      mouse.click = true;
    });
    remoteVideo.addEventListener("mouseup", () => {
      mouse.click = false;
    });

    setInterval(() => {
      socket.emit("mouse", mouse);
    }, 100);
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
  stream.getTracks().forEach((track) => peer.addTrack(track, stream));

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
}
