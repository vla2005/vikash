// Development-only, numeric startup diagnostics. Never record user content.
export function createAssistantStartupTrace(platform, enabled=typeof __DEV__ !== 'undefined' && __DEV__, now=()=>global.performance?.now?.() ?? Date.now(), write=report=>console.info('[ViKash assistant startup]',report)) {
  if (!enabled || platform !== 'android') return null;
  const started=now(), stages={tap:0};
  let timer=null,reported=false;
  const flush=reason=>{
    if (reported) return;
    reported=true;clearTimeout(timer);
    write({platform,reason,elapsedMs:Math.round(now()-started),stagesMs:{...stages}});
  };
  return {
    mark(stage) {
      if (reported || Object.prototype.hasOwnProperty.call(stages,stage)) return;
      stages[stage]=Math.round(now()-started);
      if (stage==='keyboard-shown') flush('keyboard-shown');
      else if (stage==='input-revealed') timer=setTimeout(()=>flush('input-ready'),1500);
    },
    flush,
  };
}
