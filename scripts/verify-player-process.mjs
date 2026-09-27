import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once,EventEmitter} from 'node:events';
import {observePlayer} from './player-process.mjs';
const options={stdio:'ignore',windowsHide:true};
const failed=spawn('nonexistent-player-executable-for-test',[],options),stopFailed=observePlayer(failed);
await once(failed,'error');await stopFailed();
const exited=spawn(process.execPath,['-e','process.exit(0)'],options),stopExited=observePlayer(exited);
await once(exited,'exit');await stopExited();
const signalled=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],options),stopSignalled=observePlayer(signalled);
await once(signalled,'spawn');const ended=once(signalled,'exit');signalled.kill();await ended;await stopSignalled();
const running=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],options),stopRunning=observePlayer(running);
await once(running,'spawn');await stopRunning();assert.ok(running.exitCode!==null||running.signalCode!==null);
console.log('PASS: failed spawn, prior normal exit, prior signal exit and running-child cleanup');
// Kill denial is platform/permission dependent; inject the documented error event.
for(const asynchronous of [false,true]){
 const denied=new EventEmitter(),error=Error('Injected kill denial');
 denied.kill=()=>{if(asynchronous)setImmediate(()=>denied.emit('error',error));else denied.emit('error',error);return false;};
 await assert.rejects(observePlayer(denied)(),e=>e===error);
}
const unresponsive=new EventEmitter();unresponsive.kill=()=>true;
await assert.rejects(observePlayer(unresponsive)(),/did not stop within five seconds/);
console.log('PASS: synchronous/asynchronous kill errors reject; missing exit times out');
