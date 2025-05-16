// @ts-ignore - 解决类型声明问题
import fs from 'fs';
// @ts-ignore - 解决类型声明问题
import path from 'path';
import { GitHubService } from './github-service';
import { config } from './config';
import { ProcessedIssue, ProcessOptions, BatchProcessResult } from './types';

// 全局变量，用于跟踪当前处理状态
let currentResult: BatchProcessResult | null = null;
let isProcessing = false;
let currentBatch = 0;
let totalBatches = 0;

export class IssuesProcessor {
  private githubService: GitHubService;
  
  constructor(githubToken = config.githubToken) {
    this.githubService = new GitHubService(githubToken);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // 设置中断处理逻辑
    this.setupInterruptHandler();
  }
  
  /**
   * 设置中断处理逻辑，捕获SIGINT信号（Control+C）
   */
  private setupInterruptHandler(): void {
    process.on('SIGINT', async () => {
      console.log('\n\n⚠️ 进程被中断！');
      
      if (isProcessing && currentResult) {
        console.log(`📊 已处理 ${currentBatch}/${totalBatches} 批次 (${currentResult.totalProcessed} issues)`);
        console.log('💾 正在保存当前已处理数据...');
        
        try {
          // 保存中断时的结果
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filePrefix = `interrupted_${timestamp}`;
          
          // 保存为JSON文件
          await this.saveResults(currentResult, filePrefix);
          console.log('✅ JSON数据已保存');
          
          // 生成并保存MD报告
          console.log('📝 正在生成Markdown报告...');
          try {
            // 动态导入AI分类模块，避免循环依赖
            const { generateMarkdownReport } = await import('./ai-categorize');
            
            // 确保输出结构和类型正确
            const reportData = {
              metadata: {
                repository: `${config.organization}/${config.repository}`,
                timestamp: new Date().toISOString(),
                totalProcessed: currentResult.totalProcessed,
                successful: currentResult.successful,
                failed: currentResult.failed,
                errorCount: currentResult.errors.length
              },
              // 为每个issue添加html_url字段
              issues: currentResult.issues.map(issue => ({
                ...issue,
                html_url: issue.url || `https://github.com/${config.organization}/${config.repository}/issues/${issue.number}`
              }))
            };
            
            // 保存中断结果数据到与正常结果相同的目录结构
            const now = new Date();
            const date = now.toISOString().split('T')[0]; // 获取日期部分
            
            // 创建仓库目录
            const repoDir = path.join(config.outputDir, config.repository);
            if (!fs.existsSync(repoDir)) {
              fs.mkdirSync(repoDir, { recursive: true });
            }
            
            // 创建日期目录
            const dateDir = path.join(repoDir, date);
            if (!fs.existsSync(dateDir)) {
              fs.mkdirSync(dateDir, { recursive: true });
            }
            
            // 使用固定名称，以便同一天内的执行会覆盖之前的文件
            const mdFilename = `issues_${config.repository}_${date}_interrupted.md`;
            const mdOutputPath = path.join(dateDir, mdFilename);
            await generateMarkdownReport(reportData, mdOutputPath);
            console.log('✅ Markdown报告已生成');
          } catch (mdError) {
            console.error('❌ 生成Markdown报告时发生错误:', mdError);
          }
        } catch (error) {
          console.error('❌ 保存数据时发生错误:', error);
        }
      } else {
        console.log('ℹ️ 没有需要保存的数据');
      }
      
      console.log('👋 程序退出');
      process.exit(0);
    });
  }
  
  /**
   * Process all issues in batches
   */
  async processAllIssues(options: ProcessOptions = {}): Promise<BatchProcessResult> {
    // 初始化结果对象
    const result: BatchProcessResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      issues: [],
    };
    
    // 更新全局处理状态
    currentResult = result;
    isProcessing = true;
    
    try {
      console.log(`Fetching issues for ${config.organization}/${config.repository}...`);
      const issues = await this.githubService.fetchIssues(options);
      console.log(`Found ${issues.length} issues to process`);
      
      // Process issues in batches to manage memory and API rate limits
      const batches = this.chunkArray(issues, config.batchSize);
      console.log(`Processing in ${batches.length} batches of ${config.batchSize} issues`);
      
      // 更新全局批次信息
      totalBatches = batches.length;
      
      for (let i = 0; i < batches.length; i++) {
        // 更新当前批次信息
        currentBatch = i + 1;
        
        const batch = batches[i];
        console.log(`Processing batch ${currentBatch}/${totalBatches} (${batch.length} issues)`);
        
        const batchResult = await this.processBatch(batch, options);
        
        // Merge batch results into overall results
        result.totalProcessed += batchResult.totalProcessed;
        result.successful += batchResult.successful;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);
        result.issues.push(...batchResult.issues);
        
        // Save intermediate results after each batch
        await this.saveResults(result, `batch_${currentBatch}_intermediate`);
      }
      
      // Save final results
      await this.saveResults(result, 'final');
      
      // 处理完成，重置状态
      isProcessing = false;
      
      return result;
    } catch (error) {
      console.error('Error processing issues:', error);
      result.errors.push(error as Error);
      
      // 发生错误时也要重置处理状态
      isProcessing = false;
      
      return result;
    }
  }
  
  /**
   * Process a batch of issues
   */
  private async processBatch(
    issues: ProcessedIssue[],
    options: ProcessOptions
  ): Promise<BatchProcessResult> {
    const result: BatchProcessResult = {
      totalProcessed: issues.length,
      successful: 0,
      failed: 0,
      errors: [],
      issues: [],
    };
    
    for (const issue of issues) {
      try {
        console.log(`Processing issue #${issue.number}: ${issue.title}`);
        
        // Fetch comments if requested
        if (options.includeComments) {
          issue.comments_data = await this.githubService.fetchCommentsForIssue(issue.number);
          console.log(`  Fetched ${issue.comments_data.length} comments`);
          
          // Add delay to avoid rate limiting
          await this.delay(config.rateLimitDelay);
        }
        
        // Fetch reactions if requested
        if (options.includeReactions) {
          issue.reactions = await this.githubService.fetchReactionsForIssue(issue.number);
          console.log(`  Fetched ${issue.reactions?.total_count} reactions`);
          
          // Add delay to avoid rate limiting
          await this.delay(config.rateLimitDelay);
        }
        
        result.successful++;
        result.issues.push(issue);
      } catch (error) {
        console.error(`Error processing issue #${issue.number}:`, error);
        result.failed++;
        result.errors.push(error as Error);
      }
    }
    
    return result;
  }
  
  /**
   * Save processed results to a JSON file
   * @returns The path to the saved file
   */
  private async saveResults(result: BatchProcessResult, suffix = ''): Promise<string> {
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const date = now.toISOString().split('T')[0]; // 获取日期部分，如 2025-05-16
      
      // 创建仓库名称的目录
      const repoDir = path.join(config.outputDir, config.repository);
      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir, { recursive: true });
      }
      
      // 创建日期目录
      const dateDir = path.join(repoDir, date);
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
      }
      
      // 使用不包含时间的文件名，所以同一天会覆盖
      let filename;
      if (suffix.includes('batch') || suffix.includes('intermediate')) {
        // 批处理文件仍需要保留时间戳以区分不同批次
        filename = `issues_${config.repository}_${timestamp}_${suffix}.json`;
      } else {
        // 最终文件或中断文件使用固定名称，让同一天的文件会被覆盖
        filename = `issues_${config.repository}_${date}_${suffix}.json`;
      }
      const outputPath = path.join(dateDir, filename);
      
      // Create a clean version of the results for saving
      const cleanResult = {
        metadata: {
          repository: `${config.organization}/${config.repository}`,
          timestamp: new Date().toISOString(),
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          errorCount: result.errors.length,
        },
        issues: result.issues,
      };
      
      await fs.promises.writeFile(
        outputPath,
        JSON.stringify(cleanResult, null, 2),
        'utf-8'
      );
      
      console.log(`Results saved to ${outputPath}`);
      return outputPath; // 返回保存的文件路径，方便后续使用
    } catch (error) {
      console.error('Error saving results:', error);
      throw error; // 抛出错误，让调用者知道保存失败
    }
  }
  
  /**
   * Split an array into chunks of a specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * Utility method for implementing delay between API calls
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
