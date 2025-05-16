import axios, { AxiosInstance } from 'axios';
import { config } from './config';

export interface DeepSeekResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private client: AxiosInstance;
  
  constructor(
    apiKey = config.deepseekApiKey, 
    apiUrl = config.deepseekApiUrl,
    model = config.deepseekModel
  ) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
    
    if (!this.apiKey) {
      throw new Error('DeepSeek API key is required. Set the DEEPSEEK_API_KEY in your .env file.');
    }
    
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }
  
  /**
   * 使用DeepSeek API对Issue进行分类
   */
  async categorizeIssue(title: string, body: string, labels: string[] = []): Promise<string[]> {
    try {
      const prompt = `
请分析以下GitHub Issue，并为其分配最合适的类别。回复格式必须是JSON数组，仅包含类别名称，不要包含其他内容。

Issue标题：${title}

Issue内容：
${body ? body.substring(0, 2000) : '无内容'}

${labels.length > 0 ? `现有标签：${labels.join(', ')}` : '无标签'}

请从以下类别中选择（可以选择多个）：
- bug（用于错误报告）
- enhancement（用于功能请求和改进）
- documentation（用于文档相关问题）
- question（用于提问和寻求帮助）
- feature-request（用于新功能请求）
- performance（用于性能相关问题）
- ui（用于用户界面问题）
- api（用于API相关问题）
- security（用于安全相关问题）

请以JSON数组格式回复，例如：["bug", "security"]
`;

      const response = await this.client.post<DeepSeekResponse>('/v1/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });
      
      let content = response.data.choices[0].message.content;
      
      try {
        // 处理可能的Markdown代码块格式
        // 移除```json和```标记
        content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        
        // 清理内容，确保它是有效的JSON
        content = content.trim();
        
        console.log('Processing DeepSeek API categories response:', content);
        
        // 尝试解析JSON响应
        const categories = JSON.parse(content) as string[];
        return Array.isArray(categories) ? categories : ['uncategorized'];
      } catch (error) {
        console.error('Error parsing DeepSeek API categories response:', error);
        console.error('Raw response:', content);
        return ['uncategorized'];
      }
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      return ['uncategorized'];
    }
  }
  
  /**
   * 使用DeepSeek API生成Issue的摘要
   */
  async summarizeIssue(title: string, body: string): Promise<string> {
    try {
      const prompt = `
请为以下GitHub Issue生成一个简短、清晰的摘要（不超过200个字）。摘要应该概括Issue的主要内容和要点。

Issue标题：${title}

Issue内容：
${body ? body.substring(0, 3000) : '无内容'}
      
请直接返回摘要内容，不要包含任何其他说明或前缀。
`;

      const response = await this.client.post<DeepSeekResponse>('/v1/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });
      
      let content = response.data.choices[0].message.content;
      
      // 处理可能的Markdown格式
      // 移除包裹在```中的内容
      content = content.replace(/```[\s\S]*?```/g, (match) => {
        // 保留代码块内容，去除标记
        return match.replace(/^```.*\n|```$/g, '');
      });
      
      // 清理其他可能的Markdown格式
      content = content.trim();
      
      console.log('Processing DeepSeek API summary response:', content);
      
      return content;
    } catch (error) {
      console.error('Error generating summary with DeepSeek API:', error);
      return '无法生成摘要';
    }
  }
  
  /**
   * 使用DeepSeek API分析Issue中的情感和紧急性
   */
  async analyzeIssueSentiment(title: string, body: string): Promise<{sentiment: string, urgency: string}> {
    try {
      const prompt = `
请分析以下GitHub Issue的情感和紧急性。回复格式必须是JSON，包含两个字段：sentiment和urgency。

Issue标题：${title}

Issue内容：
${body ? body.substring(0, 2000) : '无内容'}

情感(sentiment)分类：
- positive（积极的）
- neutral（中性的）
- negative（消极的）

紧急性(urgency)分类：
- low（低紧急性）
- medium（中等紧急性）
- high（高紧急性）

请以JSON格式回复，例如：{"sentiment": "neutral", "urgency": "medium"}
`;

      const response = await this.client.post<DeepSeekResponse>('/v1/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      });
      
      let content = response.data.choices[0].message.content;
      
      try {
        // 处理可能的Markdown代码块格式
        // 移除```json和```标记
        content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        
        // 清理内容，确保它是有效的JSON
        content = content.trim();
        
        // 记录处理后的内容以便调试
        console.log('Processing DeepSeek API response content:', content);
        
        // 尝试解析JSON响应
        const analysis = JSON.parse(content) as {sentiment: string, urgency: string};
        return {
          sentiment: analysis.sentiment || 'neutral',
          urgency: analysis.urgency || 'medium'
        };
      } catch (error) {
        console.error('Error parsing DeepSeek API sentiment analysis response:', error);
        console.error('Raw content:', content);
        return {sentiment: 'neutral', urgency: 'medium'};
      }
    } catch (error) {
      console.error('Error analyzing sentiment with DeepSeek API:', error);
      return {sentiment: 'neutral', urgency: 'medium'};
    }
  }
}
