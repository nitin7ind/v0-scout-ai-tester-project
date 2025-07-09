import { NextResponse } from 'next/server'
import { getLogFiles, cleanupOldLogs } from '../../../lib/gemini-logger'
import fs from 'fs'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const filename = searchParams.get('filename')

    switch (action) {
      case 'list':
        const logFiles = getLogFiles(startDate, endDate)
        const fileList = logFiles.map(filePath => {
          const filename = filePath.split('/').pop()
          const stats = fs.statSync(filePath)
          return {
            filename,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          }
        })
        
        return NextResponse.json({ files: fileList })

      case 'download':
        if (!filename) {
          return NextResponse.json({ error: 'Filename required for download' }, { status: 400 })
        }
        
        const logFiles2 = getLogFiles(startDate, endDate)
        const targetFile = logFiles2.find(file => file.includes(filename))
        
        if (!targetFile) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const content = fs.readFileSync(targetFile, 'utf8')
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })

      case 'view':
        if (!filename) {
          return NextResponse.json({ error: 'Filename required for view' }, { status: 400 })
        }
        
        const logFiles3 = getLogFiles(startDate, endDate)
        const targetFile2 = logFiles3.find(file => file.includes(filename))
        
        if (!targetFile2) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const content2 = fs.readFileSync(targetFile2, 'utf8')
        const logData = JSON.parse(content2)
        return NextResponse.json(logData)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in logs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'reset':
        // Delete all log files by setting daysToKeep to 0
        cleanupOldLogs(0)
        return NextResponse.json({ success: true, message: 'All logs have been reset' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in logs DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
