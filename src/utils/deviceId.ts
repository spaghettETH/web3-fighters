// Generatore di ID dispositivo persistente
const DEVICE_ID_KEY = 'web3_fighters_device_id';

/**
 * Genera un fingerprint unico basato sulle caratteristiche del browser/dispositivo
 */
function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Web3 Fighters Device ID', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0
  ].join('|');
  
  // Genera un hash semplice
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte a 32-bit
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Ottiene l'ID dispositivo persistente
 * Se non esiste, ne crea uno nuovo
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceFingerprint();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Resetta l'ID dispositivo (solo per debug/testing)
 */
export function resetDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
} 