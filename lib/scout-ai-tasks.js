// Scout AI task mappings
export const scoutAITasks = [
  // SmartSafe Enclosure moved to the top
  {
    id: "681b97b6d80705cc948ddfe4",
    name: "SmartSafe Enclosure Open",
  },
  {
    id: "681b9df9d80705cc94aa76ae",
    name: "Door Blocked",
  },
  {
    id: "681b9eeed80705cc94ae8108",
    name: "Open Drink Container",
  },
  {
    id: "681b9683d80705cc9487af6c",
    name: "Product Display Counter Empty",
  },
  {
    id: "681b976dd80705cc948c3852",
    name: "Manager Counter",
  },

]

// Server prompts for AI models
export const serverPrompts = {
  gemini: "You are an AI assistant analyzing retail store images. Provide concise, accurate responses.",
  gpt: "You are an AI assistant analyzing retail store images. Provide concise, accurate responses based solely on what you can see in the image.",
}
