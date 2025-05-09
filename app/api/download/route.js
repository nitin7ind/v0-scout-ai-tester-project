import { NextResponse } from "next/server"

export async function POST(request) {
  const formData = await request.formData()
  const dataStr = formData.get("data")
  const format = formData.get("format")

  if (!dataStr) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 })
  }

  const data = JSON.parse(dataStr)

  if (format === "json") {
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": 'attachment; filename="results.json"',
      },
    })
  } else if (format === "csv") {
    // Create CSV content
    const csvRows = [["Image", "Label"], ...data.map((item) => [item.image, item.label])]

    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="results.csv"',
      },
    })
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
}
