import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  // GitHub API token
  githubToken: process.env.GITHUB_TOKEN || '',
  
  // DeepSeek organization and repository details
  organization: process.env.ORGANIZATION || 'deepseek-ai',
  repository: process.env.REPOSITORY || '',
  
  // Processing options
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  
  // Output directory for processed data
  outputDir: process.env.OUTPUT_DIR || path.resolve(__dirname, '../output'),
  
  // Rate limiting options (to avoid GitHub API rate limits)
  rateLimitDelay: parseInt(process.env.RATE_LIMIT_DELAY || '1000', 10),
  
  // DeepSeek API configuration
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekApiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  
  // Enable AI analysis
  enableAiAnalysis: process.env.ENABLE_AI_ANALYSIS !== 'false',
};

// Validate required configuration
if (!config.githubToken) {
  throw new Error('GitHub token is required. Please set the GITHUB_TOKEN environment variable.');
}

if (!config.repository) {
  throw new Error('Repository name is required. Please set the REPOSITORY environment variable.');
}

// Validate DeepSeek API configuration if AI analysis is enabled
if (config.enableAiAnalysis && !config.deepseekApiKey) {
  console.warn('Warning: DeepSeek API key is not set. AI analysis will be disabled.');
  config.enableAiAnalysis = false;
}
