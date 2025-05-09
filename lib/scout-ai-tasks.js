// Scout AI task mappings
export const scoutAITasks = [
  {
    id: "681b9df9d80705cc94aa76ae",
    name: "Door Blocked",
    prompt:
      "Analyze this image and determine if there is a door that is blocked or obstructed. Respond with 'Yes' if the door is blocked, or 'No' if the door is clear.",
  },
  {
    id: "681b976dd80705cc948c3852",
    name: "Unattended Cash",
    prompt:
      "Examine this image and identify if there is unattended cash or money visible. Respond with 'Yes' if unattended cash is present, or 'No' if no unattended cash is visible.",
  },
  {
    id: "681b9eeed80705cc94ae8108",
    name: "Open Drink Container",
    prompt:
      "Look at this image and determine if there are any open drink containers visible. Respond with 'Yes' if open drink containers are present, or 'No' if no open drink containers are visible.",
  },
  {
    id: "681b9683d80705cc9487af6c",
    name: "Product Display Counter Empty",
    prompt:
      "Analyze this image and determine if the product display counter is empty. Respond with 'Yes' if the counter is empty or nearly empty, or 'No' if the counter has adequate product displayed.",
  },
  {
    id: "681b97b6d80705cc948ddfe4",
    name: "SmartSafe Enclosure Open",
    prompt:
      "Examine this image and identify if the SmartSafe enclosure is open. Respond with 'Yes' if the SmartSafe enclosure is open, or 'No' if it is properly closed.",
  },
]

// Server prompts for AI models
export const serverPrompts = {
  gemini: "You are an AI assistant analyzing retail store images. Provide concise, accurate responses.",
  gpt: "You are an AI assistant analyzing retail store images. Provide concise, accurate responses based solely on what you can see in the image.",
}
