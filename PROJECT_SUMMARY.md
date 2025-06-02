# ScoutAI Playground - Project Summary

## Overview

ScoutAI Playground is a Next.js-based web application that serves as a testing and demonstration platform for AI-powered image analysis using Generative AI models like Google Gemini and OpenAI GPT. The application enables users to analyze images from various data sources and generate insights using pre-defined or custom prompts.

## Key Features

### 🎯 Core Functionality
- **Multi-Source Image Analysis**: Support for three data sources:
  - **ScoutAI API**: Fetch images from Wobot's ScoutAI service
  - **Events API**: Access images through Wobot's Events API
  - **Manual Upload**: Direct image file uploads for analysis

- **AI Model Integration**: 
  - **Glacier-2.5 (Google Gemini)**: Default model for cost-effective analysis
  - **Comet-4.1 (OpenAI GPT-4)**: Alternative model available in developer mode

- **Prompt Management**: 
  - Pre-defined prompts for common use cases (SmartSafe monitoring, door blocking detection, etc.)
  - Custom prompt creation and editing capabilities
  - Task-specific analysis templates

### 🔧 Advanced Features

#### Developer Mode
- **Password Protection**: Secured with password `ScoutAI@567`
- **Enhanced Controls**: Access to additional configuration options
- **Model Selection**: Choose between Gemini and GPT models
- **Environment Selection**: Switch between production and staging APIs
- **Detailed Error Messages**: Comprehensive debugging information
- **API Call Visibility**: View curl commands and raw API responses
- **Batch Processing**: Configure batch sizes for image processing

#### Cost Calculator
- **Usage Estimation**: Calculate monthly costs based on:
  - Hours per day of operation
  - Days per month
  - Image capture frequency
  - Number of cameras
- **Model Comparison**: Side-by-side cost analysis for both AI models
- **Token Usage Tracking**: Real-time monitoring of API consumption

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface built with Tailwind CSS
- **Dark/Light Theme**: Toggle between themes with persistent preferences
- **Interactive Components**: Built using Radix UI components
- **Real-time Feedback**: Progress indicators and status updates
- **Image Gallery**: Grid view with selection capabilities
- **Results Display**: Structured presentation of analysis results

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15.2.4 with React 19
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI component library
- **State Management**: React hooks and context
- **Theme System**: next-themes for dark/light mode
- **Icons**: Lucide React icon library

### Backend Integration
- **Server Actions**: Next.js server actions for API calls
- **AI Services**:
  - Google Generative AI SDK
  - OpenAI SDK
- **API Endpoints**: RESTful integration with Wobot services
- **File Handling**: Support for image uploads and processing

### Data Sources

#### ScoutAI API
- **Endpoint**: `https://api-app-prod.wobot.ai/app/v1/scoutai/images/get`
- **Authentication**: Secret-based authentication
- **Parameters**: Company ID, Task ID, Date, Pagination
- **Response**: Paginated image URLs with metadata

#### Events API
- **Endpoint**: `https://api.wobot.ai/client/v2`
- **Authentication**: Bearer token authentication
- **Features**: Location, task, and camera filtering
- **Hierarchical Data**: Location → Task → Camera structure

## Use Cases & Applications

### Restaurant & QSR Monitoring
- **SmartSafe Enclosure**: Monitor if cash management systems are properly secured
- **Door Safety**: Detect blocked emergency exits or doorways
- **Food Safety**: Identify open drink containers near POS stations
- **Inventory Management**: Check product display levels and cleanliness
- **Table Maintenance**: Assess table cleanliness and occupancy status

### Retail & Commercial
- **Safety Compliance**: Automated safety violation detection
- **Operational Efficiency**: Monitor equipment and workspace conditions
- **Quality Control**: Consistent visual inspection standards

## Configuration & Setup

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
```

### Pre-defined Analysis Tasks
1. **SmartSafe Enclosure Open**: Detect if cash management enclosures are open
2. **Door Blocked**: Identify blocked doorways or exits
3. **Open Drink Container**: Find unsealed beverages near POS systems
4. **Product Display Empty**: Check inventory levels in display areas
5. **Table Clean**: Assess table cleanliness and occupancy

### Cost Structure
- **Gemini (Glacier-2.5)**:
  - Input: $0.15 per 1M tokens (~360 tokens per image)
  - Output: $0.60 per 1M tokens (~25 tokens per image)
- **GPT (Comet-4.1)**:
  - Input: $0.40 per 1M tokens (~500 tokens per image)
  - Output: $1.60 per 1M tokens (~25 tokens per image)

## Security Features
- **Password-Protected Developer Mode**: Prevents unauthorized access to advanced features
- **API Key Management**: Secure handling of authentication credentials
- **Error Message Sanitization**: Prevents sensitive information leakage in production
- **Environment Separation**: Clear distinction between production and staging environments

## Export & Integration
- **Data Export**: Results can be downloaded in JSON or CSV formats
- **API Integration**: RESTful endpoints for programmatic access
- **Batch Processing**: Support for processing multiple images efficiently
- **Real-time Monitoring**: Live progress tracking and statistics

## Development Features
- **TypeScript Support**: Type-safe development environment
- **Modern Tooling**: ESLint, PostCSS, and Tailwind configuration
- **Component Architecture**: Modular, reusable component design
- **Responsive Design**: Mobile-first approach with adaptive layouts

## Future Extensibility
The application is designed with modularity in mind, allowing for:
- Additional AI model integrations
- New data source connections
- Custom prompt templates
- Enhanced analytics and reporting
- Multi-tenant support
- Advanced user management

This playground serves as both a demonstration platform and a practical tool for businesses looking to implement AI-powered visual analysis in their operations, with particular strength in retail and restaurant environments. 