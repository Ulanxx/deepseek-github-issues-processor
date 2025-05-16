// @ts-ignore - 解决类型声明问题
import { Octokit } from 'octokit';
import { config } from './config';
import { GitHubIssue, GitHubComment, ProcessOptions } from './types';

export class GitHubService {
  private octokit: Octokit;
  
  constructor(token = config.githubToken) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Fetch issues from a GitHub repository with pagination
   */
  async fetchIssues(options: ProcessOptions = {}): Promise<GitHubIssue[]> {
    const { filterState = 'all', filterLabels = [], since, until } = options;
    
    try {
      const issues: GitHubIssue[] = [];
      let page = 1;
      let hasMoreIssues = true;
      
      while (hasMoreIssues) {
        const response = await this.octokit.rest.issues.listForRepo({
          owner: config.organization,
          repo: config.repository,
          state: filterState,
          labels: filterLabels.length > 0 ? filterLabels.join(',') : undefined,
          since,
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc',
        });
        
        // Filter out pull requests which are also returned by the issues API
        const filteredIssues = response.data.filter((issue: any) => !('pull_request' in issue)) as unknown as GitHubIssue[];
        
        // Apply date filtering for 'until' if provided
        const dateFilteredIssues = until
          ? filteredIssues.filter(issue => new Date(issue.created_at) <= new Date(until))
          : filteredIssues;
          
        issues.push(...dateFilteredIssues);
        
        // Check if we need to fetch more pages
        hasMoreIssues = response.data.length === 100 && (!until || dateFilteredIssues.length === response.data.length);
        page++;
        
        // Apply rate limiting to avoid GitHub API limits
        if (hasMoreIssues) {
          await this.delay(config.rateLimitDelay);
        }
      }
      
      return issues;
    } catch (error) {
      console.error('Error fetching issues:', error);
      throw error;
    }
  }
  
  /**
   * Fetch comments for a specific issue
   */
  async fetchCommentsForIssue(issueNumber: number): Promise<GitHubComment[]> {
    try {
      const comments: GitHubComment[] = [];
      let page = 1;
      let hasMoreComments = true;
      
      while (hasMoreComments) {
        const response = await this.octokit.rest.issues.listComments({
          owner: config.organization,
          repo: config.repository,
          issue_number: issueNumber,
          per_page: 100,
          page,
        });
        
        comments.push(...response.data as unknown as GitHubComment[]);
        
        // Check if we need to fetch more pages
        hasMoreComments = response.data.length === 100;
        page++;
        
        // Apply rate limiting to avoid GitHub API limits
        if (hasMoreComments) {
          await this.delay(config.rateLimitDelay);
        }
      }
      
      return comments;
    } catch (error) {
      console.error(`Error fetching comments for issue #${issueNumber}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch reactions for a specific issue
   */
  async fetchReactionsForIssue(issueNumber: number): Promise<any> {
    try {
      const response = await this.octokit.rest.reactions.listForIssue({
        owner: config.organization,
        repo: config.repository,
        issue_number: issueNumber,
      });
      
      // Group reactions by type
      const reactions = {
        total_count: response.data.length,
        '+1': 0,
        '-1': 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      };
      
      response.data.forEach((reaction: any) => {
        const content = reaction.content as keyof typeof reactions;
        if (content in reactions) {
          reactions[content]++;
        }
      });
      
      return reactions;
    } catch (error) {
      console.error(`Error fetching reactions for issue #${issueNumber}:`, error);
      // Don't throw, just return empty reactions object
      return {
        total_count: 0,
        '+1': 0,
        '-1': 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      };
    }
  }
  
  /**
   * Utility method for implementing delay between API calls
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
