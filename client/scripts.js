// client/scripts.js
let localStream;
let localConnection;
let remoteConnection;
let ws;

async function startCall() {
    try {
        // Get local audio stream
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const localAudio = document.createElement('audio');
        localAudio.srcObject = localStream;
        localAudio.play();

        // Setup WebSocket connection for signaling
        ws = new WebSocket('ws://localhost:8765'); // Replace with your signaling server URL

        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.offer) {
                await remoteConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
                const answer = await remoteConnection.createAnswer();
                await remoteConnection.setLocalDescription(answer);
                ws.send(JSON.stringify({ answer: remoteConnection.localDescription }));
            } else if (message.answer) {
                await localConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
            } else if (message.candidate) {
                await (message.target === 'remote' ? remoteConnection : localConnection)
                    .addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        // Create WebRTC peer connections
        localConnection = new RTCPeerConnection();
        remoteConnection = new RTCPeerConnection();

        // Add local stream to local connection
        localStream.getTracks().forEach(track => localConnection.addTrack(track, localStream));

        // Setup ICE candidates
        localConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                ws.send(JSON.stringify({ candidate, target: 'remote' }));
            }
        };

        remoteConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                ws.send(JSON.stringify({ candidate, target: 'local' }));
            }
        };

        // Setup remote stream
        remoteConnection.ontrack = (e) => {
            const remoteAudio = document.createElement('audio');
            remoteAudio.srcObject = e.streams[0];
            remoteAudio.play();
        };

        // Create offer
        const offer = await localConnection.createOffer();
        await localConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({ offer: localConnection.localDescription }));

        // Display call link
        const roomID = generateRoomID(); // Generate a unique room ID (you can use UUID or any unique identifier)
        document.getElementById('callLink').innerText = `Share this link with the other person: ${window.location.href}?roomID=${roomID}`;

    } catch (error) {
        console.error('Error starting call:', error);
    }
}

function generateRoomID() {
    // Generate a simple random room ID (for demo purposes)
    return Math.random().toString(36).substring(7);
}
