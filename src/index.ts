import { WebSocket, WebSocketServer } from 'ws';
import * as assert from 'assert';
import ports from './ports';

function establishWebRTCConnection(socketA: WebSocket, socketB: WebSocket) {
    socketA.send(JSON.stringify({ type: 'start' }));

    socketA.on('message', function (data) {
        const action = JSON.parse(data.toString('utf8'));

        switch (action.type) {
            case 'offer':
                assert(action.signal, 'Сигнал первого клиента получен');
                socketB.send(JSON.stringify({ type: 'offer', signal: action.signal }))
        }
    });

    socketB.on('message', function (data) {
        const action = JSON.parse(data.toString('utf8'));

        switch (action.type) {
            case 'answer':
                assert(action.signal, 'Сигнал второго клиента получен');
                socketA.send(JSON.stringify({ type: 'answer', signal: action.signal }));
        }
    });
}

function main() {
    const port = ports.samuraiSignal;
    const wss = new WebSocketServer({ port });

    wss.on('connection', function connection() {
        const [a, b] = this.clients;

        if (a && b) {
            establishWebRTCConnection(a, b);
        }
    });

    console.log(`Samurai signal server start listening on ${port}, ${new Date}`)
}

main();