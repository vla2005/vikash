import {createAssistantStartupTrace} from '../src/utils/assistantStartup';
afterEach(()=>jest.useRealTimers());
test('diagnostics are disabled outside development Android',()=>{
  const write=jest.fn();
  expect(createAssistantStartupTrace('ios',true,()=>0,write)).toBeNull();
  expect(createAssistantStartupTrace('android',false,()=>0,write)).toBeNull();
  expect(write).not.toHaveBeenCalled();
});
test('reports numeric milestone times once without content or per-frame logging',()=>{
  jest.useFakeTimers();let time=100;
  const write=jest.fn(), trace=createAssistantStartupTrace('android',true,()=>time,write);
  time=125;trace.mark('dock-measured');
  time=300;trace.mark('capture-start');
  time=900;trace.mark('capture-ready');
  time=1000;trace.mark('input-revealed');
  expect(write).not.toHaveBeenCalled();
  time=1200;trace.mark('keyboard-shown');trace.flush('closed');jest.runOnlyPendingTimers();
  expect(write).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledWith({platform:'android',reason:'keyboard-shown',elapsedMs:1100,stagesMs:{tap:0,'dock-measured':25,'capture-start':200,'capture-ready':800,'input-revealed':900,'keyboard-shown':1100}});
});
test('hardware keyboards and early cancellation cannot leave diagnostic timers running',()=>{
  jest.useFakeTimers();const write=jest.fn();
  const trace=createAssistantStartupTrace('android',true,()=>10,write);
  trace.mark('input-revealed');jest.advanceTimersByTime(1500);
  expect(write).toHaveBeenCalledTimes(1);
  expect(write.mock.calls[0][0].reason).toBe('input-ready');
  const canceled=createAssistantStartupTrace('android',true,()=>10,write);
  canceled.mark('input-revealed');canceled.flush('closed');jest.runOnlyPendingTimers();
  expect(write).toHaveBeenCalledTimes(2);
});
