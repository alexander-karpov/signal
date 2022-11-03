import { RawData, WebSocket, WebSocketServer } from 'ws';
import * as assert from 'assert';

const PORT = 3001;

/**
 * Эти сокеты в процессе соединения по webrtc.
 */
const connectingSockets: Set<WebSocket> = new Set();

/**
 * Обмен сигналами webrtc
 */
function establishWebRTCConnection(clients: Set<WebSocket>) {
    const [socketA, socketB] = Array.from(clients).filter(c => c.OPEN && !connectingSockets.has(c));

    if (!socketA || !socketB) {
        return;
    }

    connectingSockets.add(socketA);
    connectingSockets.add(socketB);

    /**
     *  Получилось или нет - всё равно вырубаем через несколько сек. дня надёжности
     */
    setTimeout(() => {
        connectingSockets.delete(socketA);
        connectingSockets.delete(socketB);

        socketA.close();
        socketB.close();
    }, 10_000);

    socketA.on('message', onMessage);
    socketB.on('message', onMessage);

    socketA.send(JSON.stringify({ type: 'start' }));

    function onMessage(this: WebSocket, data: RawData) {
        const action = JSON.parse(data.toString('utf8'));

        if (action.type === 'signal') {
            assert(action.signal, 'Сообщение signal содержит данные');

            if (socketA?.OPEN && socketB?.OPEN) {
                const anotherSocket = this === socketA ? socketB : socketA;
                anotherSocket.send(JSON.stringify({ type: 'signal', signal: action.signal }))
            }
        }
    }
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', function connection() {
    console.log('Connection, clients:', this.clients.size, 'connectings', connectingSockets.size);

    establishWebRTCConnection(this.clients);
});

console.log(`Signal server start listening on ${PORT}, ${new Date()}`)