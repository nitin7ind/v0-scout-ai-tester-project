"use server"

// Helper function to ensure objects are serializable
export async function makeSerializable(obj) {
  return JSON.parse(JSON.stringify(obj))
}
