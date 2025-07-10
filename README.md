# ScoutAI Playground

*AI-powered image analysis platform for restaurant and retail environments*

## Overview

ScoutAI Playground is a Next.js-based web application that provides AI-powered visual analysis using Google Gemini and OpenAI GPT models. It supports multiple data sources including ScoutAI API, Events API, DriveThru API, and manual uploads for comprehensive image analysis in operational environments.

## Key Features

- **Multi-Model AI Support**: Google Gemini (default: 2.5 Flash, plus 2.0 Flash, 1.5 Flash, 2.5 Flash-Lite) and ChatGPT
- **Multiple Data Sources**: ScoutAI API, Events API, DriveThru API, and manual file uploads
- **Developer Mode**: Advanced features with password protection (`ScoutAI@567`)
- **Cost Calculator**: Real-time cost estimation and tracking
- **Comprehensive Logging**: Gemini API response logging with privacy protection
- **Dark/Light Theme**: Persistent theme preferences

## Quick Start

### Prerequisites
- Node.js 18+ 
- API keys for Google AI and/or OpenAI

### Environment Setup
```bash
# Required environment variables
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key

# Optional - API version selection (default: legacy for stability)
GEMINI_API_VERSION=legacy  # or 'new' to use @google/genai
```

### Installation
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Usage

### Basic Mode
1. Select input type (ScoutAI API, Events API, DriveThru API, or Manual Upload)
2. Configure data source parameters
3. Choose a pre-defined prompt or create custom prompt
4. Process images with AI analysis

### Developer Mode
- Enable with password: `ScoutAI@567`
- Access to model selection, detailed logs, cost tracking
- Advanced debugging and configuration options

## Cost Structure (Current Pricing)

### Gemini Models
- **2.5 Flash**: $0.30/1M input, $2.50/1M output
- **2.5 Flash-Lite**: $0.10/1M input, $0.40/1M output  
- **2.0 Flash**: $0.10/1M input, $0.40/1M output
- **1.5 Flash**: $0.075/1M input, $0.30/1M output

### ChatGPT
- **GPT-4**: $0.40/1M input, $1.60/1M output

## Technical Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Radix UI
- **AI Integration**: Google Generative AI, OpenAI SDK
- **Authentication**: API key-based for external services
- **Data Export**: JSON/CSV download capabilities

## Use Cases

- Restaurant safety compliance monitoring
- Retail operational efficiency analysis  
- Quality control automation
- DriveThru journey analysis
- Custom visual inspection workflows

## Documentation

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Comprehensive project documentation
- [GEMINI_LOGGING.md](./GEMINI_LOGGING.md) - API logging system details
- [events-api-v2.md](./events-api-v2.md) - Events API integration guide

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test-logging # Test Gemini logging system
```