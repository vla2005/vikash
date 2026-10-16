/* eslint-env browser */
// System file pickers on the web; capture=environment opens the camera on mobile.
export function pickAssistantAttachments(kind) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'files'
      ? 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/plain,text/csv,.xlsx,.docx'
      : 'image/*';
    input.multiple = kind !== 'camera';
    if (kind === 'camera') input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    input.setAttribute('aria-label', kind === 'camera' ? 'Fotografar' : 'Selecionar anexos');
    let completed = false;
    let timer;
    const finish = files => {
      if (completed) return;
      completed = true;
      clearTimeout(timer); window.removeEventListener('focus', focus);
      input.remove(); resolve(files);
    };
    const focus = () => { timer = setTimeout(() => { if (!input.files?.length) finish([]); }, 500); };
    input.onchange = () => finish([...input.files].map(file => ({ name:file.name, mimeType:file.type, size:file.size, file })));
    input.oncancel = () => finish([]);
    input.onerror = () => { finish([]); reject(new Error('Não foi possível abrir o seletor de arquivos.')); };
    window.addEventListener('focus', focus, { once:true });
    document.body.appendChild(input);
    input.click();
  });
}
