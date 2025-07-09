# Gemini API Response Logging

This application now includes comprehensive logging for all Gemini API calls. When making requests to Google's Gemini AI model, the complete response is automatically logged to JSON files with timestamps.

## Features

### Automatic Logging
- **Complete Response Capture**: Logs the full Gemini API response including all candidates, prompt feedback, and metadata
- **Base64 Data Removal**: Automatically removes base64 image data from logged responses for privacy and file size optimization
- **Timestamp-based Filenames**: Each log file is named with a timestamp for easy organization
- **Error Logging**: Failed requests are also logged with error details
- **Performance Metrics**: Includes processing time and token usage estimates

### Log File Structure
Each log file contains:
```json
{
  "timestamp": "2025-07-09T12:34:56.789Z",
  "requestId": "unique-request-id",
  "model": "gemini-2.5-flash",
  "prompt": "Your analysis prompt",
  "imageSource": "Image URL or identifier",
  "response": {
    "candidates": [...],
    "promptFeedback": {...},
    "fullResponse": {...}
  },
  "metadata": {
    "success": true,
    "processingTime": 1234,
    "estimatedTokens": {
      "prompt": 360,
      "completion": 25,
      "total": 385
    },
    "imageSize": 50000
  },
  "error": null
}
```

### Accessing Logs

#### Developer Mode UI
In developer mode (password: `ScoutAI@567`), you'll see a "Gemini API Response Logs" section below the results grid that allows you to:
- View all log files with creation dates and sizes
- Preview log content in a formatted display
- Download individual log files

#### API Endpoints
- `GET /api/logs?action=list` - List all log files
- `GET /api/logs?action=view&filename={filename}` - View specific log content
- `GET /api/logs?action=download&filename={filename}` - Download log file

#### File System
Log files are stored in `/logs` directory with the naming pattern:
```
gemini-response-YYYY-MM-DD-HH-MM-SS-{requestId}.json
```

### Log Management

#### Automatic Cleanup
The system includes a cleanup function to remove old logs:
```javascript
import { cleanupOldLogs } from '@/lib/gemini-logger'

// Remove logs older than 30 days (default)
cleanupOldLogs(30)
```

#### Date Range Filtering
You can retrieve logs for specific date ranges:
```javascript
import { getLogFiles } from '@/lib/gemini-logger'

// Get logs from specific date range
const logs = getLogFiles('2025-07-01', '2025-07-09')
```

### Testing
Test the logging functionality:
```bash
npm run test-logging
```

This will create sample log files to verify the logging system is working correctly.

### Security & Privacy
- **No API Keys**: API keys are never logged
- **Image Data Protection**: Base64 image data is automatically removed and replaced with `[BASE64_IMAGE_DATA_REMOVED]` markers
- **Image URLs Only**: Only image URLs/sources are logged, not the actual image data
- **Git Ignored**: The `/logs` directory is automatically added to `.gitignore`
- **Local Storage**: All logs are stored locally and not transmitted

### Use Cases
- **Debugging**: Troubleshoot Gemini API issues
- **Performance Analysis**: Monitor response times and token usage
- **Quality Assurance**: Review AI responses for consistency
- **Cost Tracking**: Analyze token consumption patterns
- **Compliance**: Maintain audit trails of AI interactions

The logging system is designed to be lightweight and non-intrusive, automatically capturing all Gemini interactions without affecting application performance.
