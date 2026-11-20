export const biometricCapability = async () => ({ available: false });
export const lockBiometricSessions = () => {};
export const removeBiometricKey = async () => {};
export const openBiometricSession = async record => record;
const unavailable = async () => { throw new Error('Biometria disponível apenas no aplicativo Android ou iOS.'); };
export const unlockBiometricKey = unavailable;
export const sealBiometricSession = unavailable;
export const createBiometricSession = unavailable;
