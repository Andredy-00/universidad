// Encriptación simple reversible para contraseñas de clientes
// NOTA: Esto es para el caso específico donde el admin necesita ver la contraseña original
// En producción real, considerar usar un sistema más robusto como AES

const ENCRYPTION_KEY = "universidad-secret-key-2024"

export function encryptPassword(password: string): string {
  // Simple XOR encryption + base64
  let encrypted = ""
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    encrypted += String.fromCharCode(charCode)
  }
  return Buffer.from(encrypted).toString("base64")
}

export function decryptPassword(encryptedPassword: string): string {
  // Decode base64 + XOR decryption
  const decoded = Buffer.from(encryptedPassword, "base64").toString()
  let decrypted = ""
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    decrypted += String.fromCharCode(charCode)
  }
  return decrypted
}

// Generar contraseña aleatoria
export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
