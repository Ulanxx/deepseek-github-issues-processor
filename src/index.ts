// @ts-ignore - 解决Node.js类型声明问题
import { IssuesProcessor } from './issues-processor';
import { ProcessOptions } from './types';
import { config } from './config';

async function main() {
  try {
    console.log('DeepSeek AI GitHub Issues Processor');
    console.log('===================================');
    console.log(`Repository: ${config.organization}/${config.repository}`);
    console.log(`Output directory: ${config.outputDir}`);
    console.log('-----------------------------------');
    
    // Parse command line arguments
    const options: ProcessOptions = parseCommandLineArguments();
    
    console.log('Processing options:');
    console.log(` - Include comments: ${options.includeComments}`);
    console.log(` - Include reactions: ${options.includeReactions}`);
    console.log(` - Filter state: ${options.filterState}`);
    console.log(` - Since date: ${options.since || 'not specified'}`);
    console.log(` - Until date: ${options.until || 'not specified'}`);
    if (options.filterLabels && options.filterLabels.length > 0) {
      console.log(` - Labels filter: ${options.filterLabels.join(', ')}`);
    }
    console.log('-----------------------------------');
    
    // Create processor and start processing
    const processor = new IssuesProcessor();
    const startTime = Date.now();
    
    console.log('Starting processing...');
    const result = await processor.processAllIssues(options);
    
    // Display results
    const duration = (Date.now() - startTime) / 1000;
    console.log('===================================');
    console.log('Processing completed!');
    console.log(`Processed ${result.totalProcessed} issues in ${duration.toFixed(2)} seconds`);
    console.log(`Success: ${result.successful} | Failed: ${result.failed}`);
    console.log(`Results saved to ${config.outputDir}`);
    
    if (result.errors.length > 0) {
      console.log(`Encountered ${result.errors.length} errors during processing`);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    // @ts-ignore - process类型问题
    process.exit(1);
  }
}

/**
 * Parse command line arguments to configure processing options
 */
function parseCommandLineArguments(): ProcessOptions {
  const options: ProcessOptions = {
    includeComments: true,
    includeReactions: true,
    filterState: 'all',
  };
  
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-comments':
        options.includeComments = false;
        break;
        
      case '--no-reactions':
        options.includeReactions = false;
        break;
        
      case '--state':
        const state = args[++i];
        if (state === 'open' || state === 'closed' || state === 'all') {
          options.filterState = state;
        } else {
          console.warn(`Invalid state value: ${state}. Using default: 'all'`);
        }
        break;
        
      case '--labels':
        const labels = args[++i];
        options.filterLabels = labels.split(',').map((label: string) => label.trim());
        break;
        
      case '--since':
        options.since = args[++i];
        break;
        
      case '--until':
        options.until = args[++i];
        break;
        
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }
  
  return options;
}

// Start the application
main().catch(error => {
  console.error('Unhandled error:', error);
  // @ts-ignore - process类型问题
  process.exit(1);
});
