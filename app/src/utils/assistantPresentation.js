// Mesmo contrato na API e no histórico local. Metadados inválidos usam o texto acessível.
// Controles invisíveis de mensagens corrompidas são recusados.
const safeText = (text, max) =>
  typeof text === 'string' &&
  text.length <= max &&
  Array.from(text).every(character => {
    const code = character.charCodeAt(0);
    return (
      code === 9 || code === 10 || (code >= 32 && (code < 127 || code > 159))
    );
  });
export function normalizeAssistantPresentation(value) {
  if (value == null) return null;
  try {
    if (
      value.version !== 'financial-presentation-v1' ||
      !Array.isArray(value.blocks) ||
      !value.blocks.length ||
      value.blocks.length > 3 ||
      typeof value.limited !== 'boolean' ||
      typeof value.queriedAt !== 'string' ||
      (value.queriedAt && !Number.isFinite(Date.parse(value.queriedAt))) ||
      JSON.stringify(value).length > 48000
    )
      return null;
    let charts = 0;
    const blocks = value.blocks.map(block => {
      if (
        !['metric', 'pie', 'bar', 'list'].includes(block.type) ||
        !safeText(block.title, 360) ||
        !block.title.trim() ||
        !safeText(block.caption, 720) ||
        !['money', 'number'].includes(block.format) ||
        !Array.isArray(block.items)
      )
        throw new Error();
      if (block.type === 'metric') {
        if (!safeText(block.value, 500) || !block.value || block.items.length)
          throw new Error();
        return {
          type: block.type,
          title: block.title,
          caption: block.caption,
          value: block.value,
          format: block.format,
          items: [],
        };
      }
      if (++charts > 1 || !block.items.length || block.items.length > 100)
        throw new Error();
      const labels = new Set();
      const items = block.items.map(item => {
        if (
          !safeText(item.label, 240) ||
          !safeText(item.formattedValue, 500) ||
          typeof item.value !== 'string' ||
          !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(item.value) ||
          item.value.length > 300
        )
          throw new Error();
        labels.add(item.label);
        return {
          label: item.label,
          value: item.value,
          formattedValue: item.formattedValue,
        };
      });
      const drawable =
        labels.size === items.length &&
        items.length <= 12 &&
        items.every(
          i =>
            Number.isFinite(Number(i.value)) &&
            Number(i.value) >= 0 &&
            Number(i.value) <= 90071992547409,
        ) &&
        items.some(i => Number(i.value) > 0);
      return {
        type: drawable ? block.type : 'list',
        title: block.title,
        caption: block.caption,
        value: null,
        format: block.format,
        items,
      };
    });
    return {
      version: value.version,
      blocks,
      queriedAt: value.queriedAt,
      limited: value.limited,
    };
  } catch {
    return null;
  }
}
