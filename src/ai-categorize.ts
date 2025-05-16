import fs from 'fs';
import path from 'path';
import { config } from './config';
import { ProcessedIssue } from './types';
import { DeepSeekService } from './deepseek-service';

// 扩展ProcessedIssue类型，添加AI分析字段
interface Issue extends ProcessedIssue {
  ai_analysis?: {
    categories?: string[];
    summary?: string;
    sentiment?: string;
    urgency?: string;
  };
}

interface ProcessedData {
  metadata: {
    repository: string;
    timestamp: string;
    totalProcessed: number;
    successful: number;
    failed: number;
    errorCount: number;
  };
  issues: Issue[];
}

/**
 * 使用DeepSeek API或基于规则对Issue进行分析
 */
async function analyzeIssue(issue: Issue): Promise<Issue> {
  // 如果Issue已经有AI分析结果，直接返回
  if (issue.ai_analysis) {
    return issue;
  }
  
  // 初始化结果对象
  issue.ai_analysis = {
    categories: [],
    summary: '',
    sentiment: 'neutral',
    urgency: 'medium'
  };
  
  try {
    if (config.enableAiAnalysis && config.deepseekApiKey) {
      // 使用DeepSeek API进行分析
      console.log(`使用DeepSeek API分析Issue #${issue.number}: ${issue.title}`);
      
      const deepseekService = new DeepSeekService();
      
      // 并行调用多个API，加快处理
      try {
        // 提取标签名称
        const labelNames = (issue.labels || []).map(label => label.name || '').filter(Boolean);
        
        const [categories, summary, sentiment] = await Promise.all([
          // 分类
          deepseekService.categorizeIssue(issue.title, issue.body || '', labelNames),
          // 生成摘要
          deepseekService.summarizeIssue(issue.title, issue.body || ''),
          // 情感和紧急性分析
          deepseekService.analyzeIssueSentiment(issue.title, issue.body || '')
        ]);
        
        issue.ai_analysis.categories = categories;
        issue.ai_analysis.summary = summary;
        issue.ai_analysis.sentiment = sentiment.sentiment;
        issue.ai_analysis.urgency = sentiment.urgency;
      } catch (error) {
        console.error(`DeepSeek API分析Issue #${issue.number}时出错:`, error);
        // 失败时使用基于规则的分类
        issue.ai_analysis.categories = categorizeIssueByRules(issue);
      }
    } else {
      // 如果AI分析未启用或无API密钥，使用基于规则的分类
      console.log(`使用规则分析Issue #${issue.number}: ${issue.title}`);
      issue.ai_analysis.categories = categorizeIssueByRules(issue);
      
      // 生成简单的摘要
      const bodyPreview = issue.body ? issue.body.substring(0, 200) + (issue.body.length > 200 ? '...' : '') : '';
      issue.ai_analysis.summary = `${issue.title}. ${bodyPreview}`;
    }
  } catch (error) {
    console.error(`分析Issue #${issue.number}时出错:`, error);
    // 确保categories字段始终有值
    issue.ai_analysis.categories = issue.ai_analysis.categories?.length ? 
      issue.ai_analysis.categories : ['uncategorized'];
  }
  
  return issue;
}

/**
 * 基于规则对Issue进行分类
 */
function categorizeIssueByRules(issue: Issue): string[] {
  // 简单的基于关键词的分类
  const categories: string[] = [];
  const title = issue.title.toLowerCase();
  const body = issue.body ? issue.body.toLowerCase() : '';
  
  // 从现有标签中提取分类
  if (issue.labels && issue.labels.length > 0) {
    issue.labels.forEach(label => {
      if (label.name) categories.push(label.name);
    });
  }
  
  // 基于标题和内容的关键词分类
  if (title.includes('bug') || body.includes('bug') || 
      title.includes('error') || body.includes('error') ||
      title.includes('issue') || body.includes('not working') ||
      title.includes('broken') || body.includes('fails')) {
    if (!categories.includes('bug')) categories.push('bug');
  }
  
  if (title.includes('feature') || body.includes('feature') || 
      title.includes('enhancement') || body.includes('enhancement') ||
      title.includes('improve') || body.includes('improve') ||
      title.includes('add') || body.includes('would be nice')) {
    if (!categories.includes('enhancement')) categories.push('enhancement');
  }
  
  if (title.includes('documentation') || body.includes('documentation') || 
      title.includes('docs') || body.includes('docs')) {
    if (!categories.includes('documentation')) categories.push('documentation');
  }
  
  if (title.includes('question') || body.includes('question') || 
      body.includes('how to') || body.includes('help') ||
      title.includes('?') || title.startsWith('how')) {
    if (!categories.includes('question')) categories.push('question');
  }
  
  if (title.includes('performance') || body.includes('performance') ||
      title.includes('slow') || body.includes('slow') ||
      title.includes('speed') || body.includes('speed')) {
    if (!categories.includes('performance')) categories.push('performance');
  }
  
  // 如果没有分类，标记为"未分类"
  if (categories.length === 0) {
    categories.push('uncategorized');
  }
  
  return categories;
}

/**
 * 生成Markdown报告
 */
export async function generateMarkdownReport(data: ProcessedData, outputPath: string): Promise<void> {
  let markdown = `# DeepSeek AI - GitHub Issues 分析报告\n\n`;
  
  // 添加元数据
  markdown += `## 项目信息\n\n`;
  markdown += `- **项目**: ${data.metadata.repository}\n`;
  markdown += `- **分析时间**: ${new Date(data.metadata.timestamp).toLocaleString()}\n`;
  markdown += `- **处理的Issues数量**: ${data.metadata.totalProcessed}\n\n`;
  
  // 按状态统计
  const openIssues = data.issues.filter(issue => issue.state === 'open').length;
  const closedIssues = data.issues.filter(issue => issue.state === 'closed').length;
  
  markdown += `## 统计概览\n\n`;
  markdown += `- **开放的Issues**: ${openIssues}\n`;
  markdown += `- **已关闭的Issues**: ${closedIssues}\n\n`;

  // 首先对所有Issues进行分析
  const analyzedIssues: Issue[] = [];
  for (const issue of data.issues) {
    // 如果已经AI分析了则直接使用，否则使用规则分类
    if (!issue.ai_analysis) {
      issue.ai_analysis = {
        categories: categorizeIssueByRules(issue),
        summary: issue.body ? `${issue.title}. ${issue.body.substring(0, 200)}...` : issue.title
      };
    }
    analyzedIssues.push(issue);
  }
  
  // 按分类组织Issues
  const categorizedIssues = new Map<string, Issue[]>();
  
  analyzedIssues.forEach(issue => {
    // 使用AI分析的分类或者基于规则的分类
    const categories = issue.ai_analysis?.categories || categorizeIssueByRules(issue);
    
    categories.forEach(category => {
      if (!categorizedIssues.has(category)) {
        categorizedIssues.set(category, []);
      }
      categorizedIssues.get(category)?.push(issue);
    });
  });
  
  // 生成分类报告
  markdown += `## Issues分类\n\n`;
  
  for (const [category, issues] of categorizedIssues.entries()) {
    markdown += `### ${category} (${issues.length})\n\n`;
    
    // 添加表格标题
    markdown += `| Issue # | 标题 | 状态 | 紧急性 | 创建时间 | 链接 |\n`;
    markdown += `| ------- | ---- | ---- | -------- | -------- | ---- |\n`;
    
    // 按紧急性和创建时间排序
    const sortedIssues = [...issues].sort((a, b) => {
      // 首先按紧急性排序
      const urgencyOrder = { "high": 0, "medium": 1, "low": 2 };
      const urgencyA = a.ai_analysis?.urgency || "medium";
      const urgencyB = b.ai_analysis?.urgency || "medium";
      const urgencyDiff = (urgencyOrder[urgencyA as keyof typeof urgencyOrder] || 1) - 
                        (urgencyOrder[urgencyB as keyof typeof urgencyOrder] || 1);
      
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // 然后按创建时间排序，最新的在前
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    sortedIssues.forEach(issue => {
      const created = new Date(issue.created_at).toISOString().split('T')[0];
      const urgency = issue.ai_analysis?.urgency || "medium";
      const urgencyEmoji = urgency === "high" ? "🔴" : urgency === "medium" ? "🟠" : "🟢";
      const htmlUrl = issue.html_url || `https://github.com/${data.metadata.repository}/issues/${issue.number}`;
      
      markdown += `| #${issue.number} | ${issue.title} | ${issue.state} | ${urgencyEmoji} ${urgency} | ${created} | [链接](${htmlUrl}) |\n`;
    });
    
    markdown += `\n`;
  }
  
  // 添加详细信息
  markdown += `## Issues详细信息\n\n`;
  
  analyzedIssues.forEach(issue => {
    const htmlUrl = issue.html_url || `https://github.com/${data.metadata.repository}/issues/${issue.number}`;
    
    markdown += `### #${issue.number}: ${issue.title}\n\n`;
    markdown += `**状态**: ${issue.state}  \n`;
    markdown += `**创建者**: ${issue.user.login}  \n`;
    markdown += `**创建时间**: ${new Date(issue.created_at).toLocaleString()}  \n`;
    
    // 添加AI分析结果
    if (issue.ai_analysis) {
      if (issue.ai_analysis.categories && issue.ai_analysis.categories.length > 0) {
        markdown += `**AI分类**: ${issue.ai_analysis.categories.join(', ')}  \n`;
      }
      
      if (issue.ai_analysis.sentiment) {
        const sentimentEmoji = 
          issue.ai_analysis.sentiment === 'positive' ? '😊' : 
          issue.ai_analysis.sentiment === 'negative' ? '😟' : '😐';
        markdown += `**情感值**: ${sentimentEmoji} ${issue.ai_analysis.sentiment}  \n`;
      }
      
      if (issue.ai_analysis.urgency) {
        const urgencyEmoji = 
          issue.ai_analysis.urgency === 'high' ? '🔴' : 
          issue.ai_analysis.urgency === 'low' ? '🟢' : '🟠';
        markdown += `**紧急性**: ${urgencyEmoji} ${issue.ai_analysis.urgency}  \n`;
      }
    }
    
    if (issue.labels && issue.labels.length > 0) {
      markdown += `**标签**: ${issue.labels.map(label => label.name).join(', ')}  \n`;
    }
    
    markdown += `**链接**: [${htmlUrl}](${htmlUrl})  \n\n`;
    
    // 优先使用AI生成的摘要
    if (issue.ai_analysis?.summary) {
      markdown += `**AI生成摘要**:  \n${issue.ai_analysis.summary}\n\n`;
    } else if (issue.body) {
      // 截取内容摘要
      const bodySummary = issue.body.length > 500 
        ? issue.body.substring(0, 500) + '...' 
        : issue.body;
      
      markdown += `**内容摘要**:  \n${bodySummary}\n\n`;
    }
    
    if (issue.comments_data && issue.comments_data.length > 0) {
      markdown += `**评论数**: ${issue.comments_data.length}  \n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  // 写入文件
  fs.writeFileSync(outputPath, markdown);
  console.log(`Markdown report generated: ${outputPath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('AI Issues Categorizer');
    console.log('===================');
    console.log(`DeepSeek API ${config.enableAiAnalysis ? '已启用' : '未启用'}`);
    
    // 获取命令行参数
    const args = process.argv.slice(2);
    let targetJsonPath = '';
    
    // 检查是否指定了输入文件
    const fileArgIndex = args.indexOf('--file');
    if (fileArgIndex !== -1 && args.length > fileArgIndex + 1) {
      targetJsonPath = args[fileArgIndex + 1];
      if (fs.existsSync(targetJsonPath)) {
        console.log(`使用指定文件: ${targetJsonPath}`);
      } else {
        throw new Error(`指定的文件不存在: ${targetJsonPath}`);
      }
    } else {
      // 如果没有指定文件，则按层级结构查找最新的
      console.log('正在搜索最新的JSON文件...');
      
      // 获取所有仓库目录
      const repoDirs = [];
      if (fs.existsSync(config.outputDir)) {
        const rootItems = fs.readdirSync(config.outputDir);
        for (const item of rootItems) {
          const itemPath = path.join(config.outputDir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            repoDirs.push(itemPath);
          }
        }
      }
      
      if (repoDirs.length === 0) {
        throw new Error('输出目录中未找到仓库文件夹');
      }

      // 按时间排序，优先使用最近修改的仓库目录
      repoDirs.sort((a, b) => {
        return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
      });
      
      // 获取最新的仓库目录中的日期目录
      const latestRepoDir = repoDirs[0];
      const dateDirs = fs.readdirSync(latestRepoDir)
        .map(item => path.join(latestRepoDir, item))
        .filter(item => fs.statSync(item).isDirectory());
      
      if (dateDirs.length === 0) {
        throw new Error(`仓库目录 ${latestRepoDir} 中未找到日期目录`);
      }
      
      // 按日期排序，获取最新的
      dateDirs.sort().reverse();
      const latestDateDir = dateDirs[0];
      
      // 在日期目录中获取JSON文件
      let jsonFiles = fs.readdirSync(latestDateDir)
        .filter(file => file.endsWith('.json') && file.includes('final'));
      
      if (jsonFiles.length === 0) {
        jsonFiles = fs.readdirSync(latestDateDir)
          .filter(file => file.endsWith('.json') && file.includes('interrupted'));
      }
      
      if (jsonFiles.length === 0) {
        jsonFiles = fs.readdirSync(latestDateDir)
          .filter(file => file.endsWith('.json'));
      }
      
      if (jsonFiles.length === 0) {
        throw new Error(`在日期目录 ${latestDateDir} 中找不到JSON文件`);
      }
      
      // 按文件名排序，获取最新的
      jsonFiles.sort().reverse();
      targetJsonPath = path.join(latestDateDir, jsonFiles[0]);
    }
    
    console.log(`正在处理文件: ${targetJsonPath}`);
    
    // 读取JSON文件
    const jsonData = fs.readFileSync(targetJsonPath, 'utf-8');
    const data: ProcessedData = JSON.parse(jsonData);
    
    // 生成输出文件路径
    const outputFilename = path.basename(targetJsonPath).replace('.json', '.md');
    // 保持与原始文件相同的目录结构
    const outputPath = path.join(path.dirname(targetJsonPath), outputFilename);
    
    console.log(`已找到 ${data.issues.length} 个 Issues`);
    
    // 如果启用了 DeepSeek API，对每个 Issue 进行分析
    if (config.enableAiAnalysis && config.deepseekApiKey) {
      console.log('正在使用 DeepSeek API 分析 Issues...');
      
      const deepseekService = new DeepSeekService();
      let processedCount = 0;
      
      // 使用Promise.all并行处理，但分批次以避免请求过多
      const batchSize = 5; // 每批处理 5 个以避免速率限制
      for (let i = 0; i < data.issues.length; i += batchSize) {
        const batch = data.issues.slice(i, i + batchSize);
        await Promise.all(batch.map(async (issue) => {
          try {
            // 提取标签名称
            const labelNames = (issue.labels || []).map(label => label.name || '').filter(Boolean);
            
            // 分析分类
            const categories = await deepseekService.categorizeIssue(
              issue.title, 
              issue.body || '', 
              labelNames
            );
            
            // 生成摘要
            const summary = await deepseekService.summarizeIssue(
              issue.title, 
              issue.body || ''
            );
            
            // 分析情感和紧急性
            const sentiment = await deepseekService.analyzeIssueSentiment(
              issue.title, 
              issue.body || ''
            );
            
            // 存储结果
            issue.ai_analysis = {
              categories,
              summary,
              sentiment: sentiment.sentiment,
              urgency: sentiment.urgency
            };
            
            processedCount++;
            if (processedCount % 5 === 0 || processedCount === data.issues.length) {
              console.log(`已处理 ${processedCount}/${data.issues.length} 个 Issues`);
            }
          } catch (error) {
            console.error(`分析 Issue #${issue.number} 时出错:`, error);
            // 失败时使用基于规则的分类
            issue.ai_analysis = {
              categories: categorizeIssueByRules(issue),
              summary: `${issue.title}. ${issue.body ? issue.body.substring(0, 200) : ''}`
            };
          }
        }));
        
        // 增加小停顿以断访问频率过高
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('使用规则分析 Issues...');
      // 使用基于规则的分类
      data.issues.forEach(issue => {
        issue.ai_analysis = {
          categories: categorizeIssueByRules(issue),
          summary: issue.body ? `${issue.title}. ${issue.body.substring(0, 200)}...` : issue.title
        };
      });
    }
    
    // 生成报告
    console.log('正在生成 Markdown 报告...');
    await generateMarkdownReport(data, outputPath);
    
    console.log('分析完成!');
    console.log(`报告已保存到: ${outputPath}`);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
