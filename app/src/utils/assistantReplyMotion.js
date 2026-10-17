// A bounded presentation effect over the complete, validated server reply.
// No partial answer is ever persisted or sent back to the API.
export const REPLY_TICK_MS = 40;
export function replyRevealTiming(content) {
  const duration = Math.min(1800, Math.max(320, content.length * 2));
  return { duration, steps: Math.ceil(duration / REPLY_TICK_MS) };
}
export function replyRevealBoundaries(content) {
  const boundaries = [0];
  let offset = 0;
  // Code points avoid exposing half of a surrogate pair at a chunk boundary.
  for (const character of content) {
    offset += character.length;
    boundaries.push(offset);
  }
  return boundaries;
}
export function replyRevealOffset(boundaries, progress) {
  return (
    boundaries[
      Math.min(
        boundaries.length - 1,
        Math.max(1, Math.ceil((boundaries.length - 1) * progress)),
      )
    ] || 0
  );
}
