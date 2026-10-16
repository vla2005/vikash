import { useLayoutEffect } from 'react';
import { invalidateAssistantCapture } from '../services/assistantCaptureCache';
// Source commits include loaded values, privacy toggles, errors and period changes.
export default function useAssistantCaptureInvalidation() {
  useLayoutEffect(invalidateAssistantCapture);
}
