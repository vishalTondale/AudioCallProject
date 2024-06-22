# server/server.py
import asyncio
import websockets

clients = {}

async def handle_websocket(websocket, path):
    global clients
    roomID = None

    try:
        roomID = await websocket.recv()
        if roomID not in clients:
            clients[roomID] = []
        clients[roomID].append(websocket)

        print(f"Client connected to room {roomID}: {websocket}")

        while True:
            message = await websocket.recv()
            for client in clients[roomID]:
                if client != websocket:
                    await client.send(message)
                    print(f"Message sent to {client}: {message}")

    except websockets.ConnectionClosed:
        if roomID and roomID in clients and websocket in clients[roomID]:
            clients[roomID].remove(websocket)
            print(f"Client disconnected from room {roomID}: {websocket}")

async def main():
    async with websockets.serve(handle_websocket, "localhost", 8765):
        print("Signaling server started on ws://localhost:8765")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
