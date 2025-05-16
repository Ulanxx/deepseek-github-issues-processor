# GitHub Issues Batch Processing and Analysis Tool

[中文文档](./README.md)

This is a powerful tool for batch retrieving, processing, and analyzing GitHub repository Issues data. It not only collects historical Issues data but also utilizes DeepSeek AI for advanced analysis, saving results in JSON and Markdown formats for subsequent data mining and visualization.


### Generate Result Example

[AUTOMA ISSUES](./public/automa/2025-05-16/issues_automa_2025-05-16T04-10-23-283Z_interrupted_2025-05-16T04-10-23-283Z.md)

## Features

### Basic Features
- **Batch Retrieval** - Bulk retrieve historical Issues from any GitHub repository
- **Flexible Filtering** - Filter by status, tags, time range, and other dimensions
- **Complete Data** - Optionally retrieve comments and reactions data for Issues
- **Batch Processing** - Automatically process in batches and save intermediate results to avoid GitHub API rate limits
- **Interrupt Recovery** - Support saving current progress when interrupted to prevent data loss

### AI Analysis Features
- **Intelligent Classification** - Automatically categorize Issues using DeepSeek AI
- **Content Summarization** - Generate summaries for each Issue
- **Sentiment Analysis** - Analyze the sentiment orientation of Issues (positive/neutral/negative)
- **Urgency Assessment** - Evaluate the urgency of Issues (high/medium/low)
- **Visualization Reporting** - Generate structured Markdown analysis reports

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

## Configuration

Create a `.env` configuration file before use, which can be modified based on the example file:

```bash
cp .env.example .env
```

Then edit the `.env` file to configure the following parameters:

### Required Configuration

- `GITHUB_TOKEN` - GitHub personal access token for API access
- `ORGANIZATION` - Target GitHub organization name
- `REPOSITORY` - Target repository name

### Optional Configuration

- `BATCH_SIZE` - Number of Issues processed per batch, default: 50
- `OUTPUT_DIR` - Output directory path, default: ./output
- `RATE_LIMIT_DELAY` - API request interval (milliseconds), default: 1000
- `ENABLE_AI_ANALYSIS` - Whether to enable AI analysis, default: true
- `DEEPSEEK_API_KEY` - DeepSeek API key (required when AI analysis is enabled)
- `DEEPSEEK_API_URL` - DeepSeek API address, default: https://api.deepseek.com
- `DEEPSEEK_MODEL` - DeepSeek model to use, default: deepseek-chat

### Obtaining a GitHub Token

1. Log in to your GitHub account
2. Go to "Settings" → "Developer settings" → "Personal access tokens" → "Tokens (classic)"
3. Click "Generate new token"
4. Select at least "public_repo" permissions (for private repositories, select "repo" permissions)
5. Generate and copy the token to the configuration file

### Obtaining a DeepSeek API Key

Visit the DeepSeek official website to register an account and generate an API key (for enabling AI analysis functionality).

## Usage

### Basic Usage

Execute the following command to start processing:

```bash
npm start
```

This will process all Issues using the configuration in the `.env` file.

### Command Line Arguments

You can override default configurations using command line arguments:

```bash
npm start -- --state open --labels bug,enhancement --since 2023-01-01 --until 2023-12-31
```

#### Available Parameters

| Parameter | Description | Possible Values | Example |
|-----------|-------------|----------------|---------|
| `--no-comments` | Do not retrieve Issue comments | - | `--no-comments` |
| `--no-reactions` | Do not retrieve Issue reactions | - | `--no-reactions` |
| `--state` | Filter by state | `open`, `closed`, `all` | `--state open` |
| `--labels` | Filter by labels (comma-separated) | Any label name | `--labels bug,enhancement` |
| `--since` | Start date (ISO format) | YYYY-MM-DD | `--since 2023-01-01` |
| `--until` | End date (ISO format) | YYYY-MM-DD | `--until 2023-12-31` |

### Handling Interruptions

If you need to interrupt the processing, press `Ctrl+C`, and the system will:
1. Display the current processing progress
2. Automatically save processed data
3. Generate a Markdown analysis report at the time of interruption
4. Exit the program safely

### Running AI Analysis Only

If you already have JSON data files, you can run AI analysis separately:

```bash
npx ts-node src/ai-categorize.ts
```

## Output Results

After processing, the output directory (default is `./output`) will contain the following files:

1. **JSON Data Files**:
   - Intermediate files: `issues_<repository>_<timestamp>_batch_<number>_intermediate.json`
   - Final file: `issues_<repository>_<timestamp>_final.json`
   - Interrupted file: `issues_<repository>_<timestamp>_interrupted_<timestamp>.json`

2. **Markdown Analysis Report**:
   - `.md` file corresponding to the JSON file with the same name

### JSON Data Structure

```json
{
  "metadata": {
    "repository": "organization/repository-name",
    "timestamp": "2025-05-16T03:06:18.608Z",
    "totalProcessed": 150,
    "successful": 148,
    "failed": 2,
    "errorCount": 2
  },
  "issues": [
    {
      "id": 12345,
      "number": 42,
      "title": "Issue Title",
      "state": "open",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z",
      "closed_at": null,
      "body": "Issue content...",
      "user": {
        "login": "username",
        "id": 123456
      },
      "labels": [
        {
          "id": 98765,
          "name": "bug",
          "color": "ff0000"
        }
      ],
      "comments": 5,
      "comments_data": [...],
      "reactions": {...},
      "ai_analysis": {
        "categories": ["bug", "performance"],
        "summary": "This Issue describes...",
        "sentiment": "negative",
        "urgency": "high"
      }
    }
  ]
}
```

### AI Analysis Field Descriptions

- **categories** - Classification tags, possible values include:
  - `bug` - Error or problem reports
  - `enhancement` - Feature enhancements or improvements
  - `feature-request` - New feature requests
  - `documentation` - Documentation-related issues
  - `question` - Questions or help requests
  - `performance` - Performance-related issues
  - `ui` - User interface related
  - `api` - API-related issues
  - `security` - Security-related issues
  - `uncategorized` - Unclassified

- **sentiment** - Sentiment analysis, possible values:
  - `positive` - Positive
  - `neutral` - Neutral
  - `negative` - Negative

- **urgency** - Urgency level, possible values:
  - `high` - High urgency
  - `medium` - Medium urgency
  - `low` - Low urgency

## Advanced Features

### Customizing AI Analysis Templates

You can modify the prompt templates in the `src/deepseek-service.ts` file to customize AI analysis behavior.

### Data Pipeline

Scripts can be connected to other tools to build a complete data analysis pipeline:

```bash
# Example: Process Issues and export to CSV
npm start && node scripts/json-to-csv.js
```

## Common Issues

- **GitHub API Rate Limiting**: The API default limit is 5000 requests per hour; you can slow down the request rate by increasing the `RATE_LIMIT_DELAY` value
- **Processing Large Numbers of Issues**: Processing large repositories may take a long time; consider increasing the batch size for better efficiency
- **Resuming After Interruption**: If you already have partial processing results, you can run the AI analysis script separately on the JSON file
- **DeepSeek API Exceptions**: In case of analysis errors, the system will automatically fall back to rule-based classification

## Developer Information

To add new features or report issues, please submit an Issue or Pull Request in the GitHub repository.

---

Enjoy using the tool! 👋
