export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body: string | null;
  user: {
    login: string;
    id: number;
  };
  labels: {
    id: number;
    name: string;
    color: string;
  }[];
  comments: number;
  url?: string;        // API URL
  html_url?: string;   // Web URL for viewing in browser
  reactions?: {
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
}

export interface GitHubComment {
  id: number;
  body: string;
  user: {
    login: string;
    id: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ProcessedIssue extends GitHubIssue {
  comments_data?: GitHubComment[];
}

export interface ProcessOptions {
  includeComments?: boolean;
  includeReactions?: boolean;
  filterState?: 'open' | 'closed' | 'all';
  filterLabels?: string[];
  since?: string;
  until?: string;
}

export interface BatchProcessResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Error[];
  issues: ProcessedIssue[];
}
