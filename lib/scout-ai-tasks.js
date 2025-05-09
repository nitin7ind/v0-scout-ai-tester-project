// Scout AI task mappings
export const scoutAITasks = [
  {
    id: "681b9df9d80705cc94aa76ae",
    name: "Door Blocked",
    prompt:
      "You are an image analysis expert specializing in retail safety and compliance. Analyze the provided image and focus on all visible doorways. Determine whether any door is blocked, defined as having objects, equipment, or obstructions that would prevent it from opening fully or being used as an exit. Ignore minor items that clearly do not impede access or egress. If any door is visibly blocked, respond with Door Blocked. If all doors are clear and accessible, respond with Door Not Blocked. Your response must be only one of the two phrases Door Blocked or Door Not Blocked with no additional explanation.",
  },
  {
    id: "681b976dd80705cc948c3852",
    name: "Unattended Cash",
    prompt:
      "You are an image analysis expert specializing in retail and cash handling inspection. Analyze the provided image and focus on the counter area. Determine whether any cash (U.S. dollars) is visibly left on the counter. Ignore any cash that is clearly being held in someone's hand or already placed inside a cash till. If any cash is visible on the counter and not in hand or in the cash till, respond with Cash Visible. If no such cash is found, respond with No Cash Visible. Your response must be only one of the two phrases Cash Visible or No Cash Visible with no additional explanation.",
  },
  {
    id: "681b9eeed80705cc94ae8108",
    name: "Open Drink Container",
    prompt:
      "You are a visual analysis assistant examining overhead images of a food prep counter at a Quick Service Restaurant (QSR). Analyze the area around the POS station and check for drink containers. If any drink container near the POS is visibly missing its cap or lid, respond with 'Open Drink Container'. Ignore containers that are sealed, far from the POS, or stacked upside down. If all containers near the POS are sealed or none are present, respond with 'No Open Drink Container'. Return only one of these two phrases with no additional explanation.",
  },
  {
    id: "681b9683d80705cc9487af6c",
    name: "Product Display Counter Empty",
    prompt:
      "You are a visual analysis assistant examining overhead images of a food preparation counter at a Quick Service Restaurant (QSR). Focus on the product display tray typically used for items like snacks or condiments. If the tray is empty and the bottom is clearly visible, return Product Display Empty. If the tray contains products and the bottom is not visible, return Product Display Full. Return only one of these two phrases with no additional text.",
  },
  {
    id: "681b97b6d80705cc948ddfe4",
    name: "SmartSafe Enclosure Open",
    prompt:
      "You are a visual analysis assistant examining overhead images of a food prep counter at a QSR (Quick Service Restaurant). Analyse this image for a manager's counter in kitchen to check if the SmartSafe enclosure door is open or closed. If the door is open, the SmartSafe digital screen will likely be visible. The enclosure is a silver block near the floor. If the door is open, Return Enclosure Open or else return Enclosure Closed. Don't return anything else.",
  },
]

// Server prompts for AI models
export const serverPrompts = {
  gemini: "You are an AI assistant analyzing retail store images. Provide concise, accurate responses.",
  gpt: "You are an AI assistant analyzing retail store images. Provide concise, accurate responses based solely on what you can see in the image.",
}
