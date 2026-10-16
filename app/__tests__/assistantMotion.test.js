import { assistantDockAnchor, assistantOpenGeometry, assistantReturnGeometry, measureAssistantNode } from '../src/utils/assistantMotion';

test('returns from the composer to the measured dock, relative to the modal frame', () => {
  expect(assistantReturnGeometry({
    source:{x:55,y:400,width:428,height:178},target:{x:55,y:752,width:354,height:44},
    frame:{x:39,y:0,width:460,height:884},width:538,height:884,
  })).toEqual({from:{x:16,y:400,width:428,height:178},to:{x:16,y:752,width:354,height:44}});
});
test('preserves the measured target of a collapsed dock even when the keyboard resized the window', () => {
  const result=assistantReturnGeometry({target:{x:80,y:780,width:220,height:44},width:390,height:500,collapsed:true});
  expect(result.to).toEqual({x:80,y:780,width:220,height:44});
  expect(result.from.width).toBeGreaterThan(0);
});
test('measures web and native nodes, rejecting invalid or unavailable bounds', async () => {
  const rect={x:16,y:700,width:300,height:44};
  await expect(measureAssistantNode({getBoundingClientRect:()=>rect})).resolves.toEqual(rect);
  await expect(measureAssistantNode({measureInWindow:callback=>callback(16,700,300,44)})).resolves.toEqual(rect);
  await expect(measureAssistantNode({getBoundingClientRect:()=>({...rect,width:0})})).resolves.toBeNull();
  await expect(measureAssistantNode(null)).resolves.toBeNull();
});
test('missing native measurement cannot leave closing stuck indefinitely', async () => {
  jest.useFakeTimers();
  const pending=measureAssistantNode({measureInWindow:()=>{}});
  jest.advanceTimersByTime(101);
  await expect(pending).resolves.toBeNull();
  jest.useRealTimers();
});

test('opening exactly reverses the measured close geometry, including a collapsed dock', () => {
  const options={source:{x:55,y:620,width:428,height:178},target:{x:119,y:814,width:260,height:44},
    frame:{x:39,y:0,width:460,height:884},width:538,height:884,collapsed:true};
  const closing=assistantReturnGeometry(options);
  expect(assistantOpenGeometry(options)).toEqual({from:closing.to,to:closing.from,direction:'open'});
});

test('maps the dock by its app-edge distances into a taller Android modal instead of mixing window origins', () => {
  const anchor=assistantDockAnchor({x:16,y:680,width:284,height:44},{x:0,y:0,width:390,height:800});
  const options={source:{x:16,y:260,width:358,height:178},target:anchor,frame:{x:0,y:0,width:390,height:844},width:390,height:500};
  const closing=assistantReturnGeometry(options);
  expect(closing.to).toEqual({x:16,y:724,width:284,height:44});
  expect(844-closing.to.y-closing.to.height).toBe(800-680-44);
  expect(assistantOpenGeometry(options).from).toEqual(closing.to);
});
test('same-size iOS/web windows retain the dock coordinates and horizontal centering', () => {
  const anchor=assistantDockAnchor({x:55,y:752,width:354,height:44},{x:39,y:0,width:460,height:884});
  const result=assistantReturnGeometry({target:anchor,frame:{x:0,y:0,width:460,height:884},width:538,height:884});
  expect(result.to).toEqual({x:16,y:752,width:354,height:44});
});
