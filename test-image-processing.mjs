// Test script to validate image processing with Events API data
import { processImagesWithGPT } from "./app/actions/image-processing.js"

// Sample image data structure that matches what Events API returns
const sampleImages = [
  {
    image: "https://example.com/image1.jpg",
    serialNumber: 1,
    eventData: {
      id: "event1",
      timestamp: "2025-07-11T10:00:00Z",
      camera: "camera1"
    },
    processed: false,
    label: null
  },
  {
    image: "https://example.com/image2.jpg", 
    serialNumber: 2,
    eventData: {
      id: "event2",
      timestamp: "2025-07-11T10:01:00Z",
      camera: "camera2"
    },
    processed: false,
    label: null
  }
]

const testPrompt = "Describe what you see in this image."

async function testImageProcessing() {
  console.log("🧪 Testing image processing with Events API data structure...")
  
  try {
    const result = await processImagesWithGPT(
      sampleImages,
      testPrompt,
      null, // Process all images
      "gemini", // Use Gemini model
      2, // Small batch size
      "gemini-2.5-flash" // Gemini model
    )
    
    console.log("✅ Image processing test successful!")
    console.log("Result:", JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("❌ Image processing test failed:", error)
    console.error("Error stack:", error.stack)
  }
}

testImageProcessing()
