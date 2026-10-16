// iOS keeps the existing Skia capture path; Android resolves its own adapter.
import { makeImageFromView } from '@shopify/react-native-skia';
export default function captureAssistantBackground(view) {
  return makeImageFromView(view);
}

export function warmupAssistantCapture() {}

export function getAssistantSourceRevision(){return 0;}
export function getAssistantImageRevision(_image,fallback){return fallback;}
