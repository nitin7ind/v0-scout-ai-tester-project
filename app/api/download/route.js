import { NextResponse } from "next/server"

export async function POST(request) {
  const formData = await request.formData()
  const dataStr = formData.get("data")
  const format = formData.get("format")
  const apiType = formData.get("apiType") || "unknown"

  if (!dataStr) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 })
  }

  const data = JSON.parse(dataStr)

  if (format === "json") {
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="${apiType}-results.json"`,
      },
    })
  } else if (format === "csv") {
    // Create comprehensive CSV content based on API type
    let csvRows = []
    
    if (apiType === "events") {
      // Events API CSV format
      csvRows = [
        [
          "Serial Number",
          "Event ID", 
          "UID",
          "Title",
          "Image URL",
          "Date",
          "Created At",
          "Detected At",
          "Task Time",
          "Location",
          "Location ID",
          "City",
          "Region",
          "Task",
          "Task ID",
          "Camera",
          "Camera ID",
          "Confidence",
          "Model Type",
          "Timezone",
          "AI Response",
          "Model Used",
          "Processed",
          "Error"
        ]
      ]
      
      data.forEach((item) => {
        // Helper function to format date/time
        const formatDateTime = (dateStr) => {
          if (!dateStr) return ""
          try {
            return new Date(dateStr).toLocaleString()
          } catch (e) {
            return dateStr
          }
        }

        csvRows.push([
          item.serialNumber || "",
          item.eventData?.eventId || "",
          item.eventData?.uid || "",
          item.eventData?.title || "",
          item.image || "",
          item.eventData?.date || "",
          formatDateTime(item.eventData?.createdAt),
          formatDateTime(item.eventData?.detectedAt),
          formatDateTime(item.eventData?.taskTime),
          item.eventData?.location || "",
          item.eventData?.locationId || "",
          item.eventData?.city || "",
          item.eventData?.region || "",
          item.eventData?.task || "",
          item.eventData?.taskId || "",
          item.eventData?.camera || "",
          item.eventData?.cameraId || "",
          item.eventData?.confidence || "",
          item.eventData?.modelType || "",
          item.eventData?.timezone || "",
          item.label || "",
          item.modelUsed || "",
          item.processed ? "Yes" : "No",
          item.error ? "Yes" : "No"
        ])
      })
    } else if (apiType === "drivethru") {
      // DriveThru API CSV format
      csvRows = [
        [
          "Serial Number",
          "Detection ID",
          "Journey ID",
          "UID", 
          "Image URL",
          "Date",
          "Time",
          "Created At",
          "Updated At",
          "Location",
          "Location ID",
          "City",
          "Region",
          "Type",
          "Station",
          "Station Type",
          "Order No",
          "License Plate",
          "LPR",
          "LPR Confidence",
          "Confidence Score",
          "Camera",
          "Camera ID",
          "Image Type",
          "Duration",
          "Transit Time",
          "Entry Time",
          "Exit Time",
          "Timezone",
          "Primary",
          "Halt",
          "Goal",
          "AI Response",
          "Model Used",
          "Processed",
          "Error"
        ]
      ]
      
      data.forEach((item) => {
        // Helper function to format date/time
        const formatDateTime = (dateStr) => {
          if (!dateStr) return ""
          try {
            return new Date(dateStr).toLocaleString()
          } catch (e) {
            return dateStr
          }
        }

        csvRows.push([
          item.serialNumber || "",
          item.driveThruData?.detectionId || "",
          item.driveThruData?.journeyId || "",
          item.driveThruData?.uid || "",
          item.image || "",
          item.driveThruData?.date || "",
          formatDateTime(item.driveThruData?.time),
          formatDateTime(item.driveThruData?.createdAt),
          formatDateTime(item.driveThruData?.updatedAt),
          item.driveThruData?.location || "",
          item.driveThruData?.locationId || "",
          item.driveThruData?.city || "",
          item.driveThruData?.region || "",
          item.driveThruData?.type || "",
          item.driveThruData?.station || "",
          item.driveThruData?.stationType || "",
          item.driveThruData?.orderNo || "",
          item.driveThruData?.lp || "",
          item.driveThruData?.lpr || "",
          item.driveThruData?.lprConfidence || "",
          item.driveThruData?.confidenceScore || "",
          item.driveThruData?.camera || "",
          item.driveThruData?.cameraId || "",
          item.driveThruData?.imageType || "",
          item.driveThruData?.duration || "",
          item.driveThruData?.transitTime || "",
          formatDateTime(item.driveThruData?.entryTime),
          formatDateTime(item.driveThruData?.exitTime),
          item.driveThruData?.timezone || "",
          item.driveThruData?.primary ? "Yes" : "No",
          item.driveThruData?.halt ? "Yes" : "No",
          item.driveThruData?.goal || "",
          item.label || "",
          item.modelUsed || "",
          item.processed ? "Yes" : "No",
          item.error ? "Yes" : "No"
        ])
      })
    } else if (apiType === "scoutai") {
      // ScoutAI API CSV format
      csvRows = [
        [
          "Serial Number",
          "Image ID",
          "Image URL",
          "Date",
          "Time",
          "Created At",
          "Company ID",
          "Task ID",
          "Location ID",
          "AI Response",
          "Model Used",
          "Processed",
          "Error"
        ]
      ]
      
      data.forEach((item) => {
        // Helper function to format date/time
        const formatDateTime = (dateStr) => {
          if (!dateStr) return ""
          try {
            return new Date(dateStr).toLocaleString()
          } catch (e) {
            return dateStr
          }
        }

        csvRows.push([
          item.serialNumber || "",
          item.scoutData?.imageId || "",
          item.image || "",
          item.scoutData?.date || "",
          formatDateTime(item.scoutData?.time),
          formatDateTime(item.scoutData?.createdAt),
          item.scoutData?.companyId || "",
          item.scoutData?.taskId || "",
          item.scoutData?.locationId || "",
          item.label || "",
          item.modelUsed || "",
          item.processed ? "Yes" : "No",
          item.error ? "Yes" : "No"
        ])
      })
    } else {
      // Fallback CSV format for manual uploads or unknown types
      csvRows = [
        [
          "Serial Number",
          "Image URL",
          "AI Response",
          "Model Used",
          "Processed",
          "Error"
        ]
      ]
      
      data.forEach((item) => {
        csvRows.push([
          item.serialNumber || "",
          item.image || "",
          item.label || "",
          item.modelUsed || "",
          item.processed ? "Yes" : "No",
          item.error ? "Yes" : "No"
        ])
      })
    }

    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${apiType}-results.csv"`,
      },
    })
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
}
