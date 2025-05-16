# GitHub Issues 批量处理与分析工具

这是一个功能强大的工具，用于批量获取、处理和分析 GitHub 仓库的 Issues 数据。它不仅能收集历史 Issues 数据，还能利用 DeepSeek AI 进行高级分析，将结果以 JSON 和 Markdown 格式保存，便于后续数据挖掘与可视化。

## 功能特点

### 基础功能

- **批量获取** - 批量获取任意 GitHub 仓库的历史 Issues
- **灵活过滤** - 支持按状态、标签、时间范围等多维度过滤
- **完整数据** - 可选择性获取 Issues 的评论内容和反应(reactions)数据
- **分批处理** - 自动分批处理并保存中间结果，避免 GitHub API 速率限制
- **中断恢复** - 支持在处理过程中断时保存当前进度，避免数据丢失

### AI 分析功能

- **智能分类** - 使用 DeepSeek AI 自动对 Issues 进行主题分类
- **内容摘要** - 自动生成每个 Issue 的内容摘要
- **情感分析** - 分析 Issue 的情感倾向(积极/中性/消极)
- **紧急度评估** - 评估 Issue 的紧急程度(高/中/低)
- **可视化报告** - 生成结构化的 Markdown 分析报告

## 安装步骤

1. 克隆或下载此仓库
2. 安装依赖项：

```bash
npm install
```

## 环境配置

使用前需创建`.env`配置文件，可以基于示例文件修改：

```bash
cp .env.example .env
```

然后编辑`.env`文件，配置以下参数：

### 必填配置项

- `GITHUB_TOKEN` - GitHub 个人访问令牌，用于 API 访问
- `ORGANIZATION` - 目标 GitHub 组织名称
- `REPOSITORY` - 目标仓库名称

### DeepSeek API 配置项

启用 AI 分析功能时需要配置以下参数：

- `ENABLE_AI_ANALYSIS` - 是否启用 AI 分析，默认值：true
- `DEEPSEEK_API_KEY` - DeepSeek API 密钥（必填）
- `DEEPSEEK_API_URL` - DeepSeek API 地址，默认值：https://api.deepseek.com/v1
- `DEEPSEEK_MODEL` - 使用的 DeepSeek 模型，默认值：deepseek-chat

### 其他可选配置项

- `BATCH_SIZE` - 每批处理的 Issue 数量，默认值：50
- `OUTPUT_DIR` - 输出目录路径，默认值：./output
- `RATE_LIMIT_DELAY` - API 请求间隔(毫秒)，默认值：1000
- `ENABLE_AI_ANALYSIS` - 是否启用 AI 分析，默认值：true
- `DEEPSEEK_API_KEY` - DeepSeek API 密钥（启用 AI 分析时必填）
- `DEEPSEEK_API_URL` - DeepSeek API 地址，默认值：https://api.deepseek.com
- `DEEPSEEK_MODEL` - 使用的 DeepSeek 模型，默认值：deepseek-chat

### 获取 GitHub Token

1. 登录 GitHub 账户
2. 访问「Settings」→「Developer settings」→「Personal access tokens」→「Tokens (classic)」
3. 点击「Generate new token」
4. 选择至少「public_repo」权限（私有仓库需选择「repo」权限）
5. 生成并复制令牌到配置文件

### 获取 DeepSeek API 密钥

访问 DeepSeek 官网注册账户并生成 API 密钥（用于启用 AI 分析功能）。

## 使用方法

### 快速命令

项目提供了多个便捷命令运行不同功能：

**Issues 获取命令：**

```bash
# 基本获取
$ npm run fetch

# 仅获取开放的 Issues
$ npm run fetch:open

# 仅获取已关闭的 Issues
$ npm run fetch:closed

# 获取所有状态的 Issues
$ npm run fetch:all

# 获取最近 30 天的 Issues
$ npm run fetch:recent

# 使用批次大小为20批量获取
$ npm run fetch:batch

# 获取时不包含评论
$ npm run fetch:no-comments
```

**AI 分析命令：**

```bash
# 分析最新的数据
$ npm run analyze

# 分析特定 JSON 文件
$ npm run analyze:file /path/to/your/file.json

# 自动查找并分析最新的 Issues 数据
$ npm run analyze:latest
```

### 原生命令参数

你也可以使用原生命令和自定义参数：

```bash
$ npm start -- --state open --labels bug,enhancement --since 2023-01-01 --until 2023-12-31
```

#### 可用参数

| 参数 | 说明 | 可选值 | 示例 |
|------|------|--------|------|
| `--no-comments` | 不获取Issue评论 | - | `--no-comments` |
| `--no-reactions` | 不获取Issue反应 | - | `--no-reactions` |
| `--state` | 按状态过滤 | `open`、`closed`、`all` | `--state open` |
| `--labels` | 按标签过滤（逗号分隔） | 任意标签名称 | `--labels bug,enhancement` |
| `--since` | 起始日期（ISO格式） | YYYY-MM-DD | `--since 2023-01-01` |
| `--until` | 结束日期（ISO格式） | YYYY-MM-DD | `--until 2023-12-31` |
| `--file` | 用于AI分析的指定JSON文件 | 文件路径 | `--file ./output/repo/date/file.json` |

### 输出目录结构

项目现在按以下层级结构组织输出文件：

```
output/
  ├── repository1/         # 仓库名称
  │    ├── 2025-05-16/    # 日期目录
  │    │    ├── issues_repository1_2025-05-16T12-00-00-000Z_final.json    # 原始数据
  │    │    └── issues_repository1_2025-05-16T12-00-00-000Z_final.md      # 分析报告
  │    └── 2025-05-15/    # 另一天的数据
  └── repository2/         # 另一个仓库
       └── 2025-05-16/
            ├── issues_repository2_2025-05-16T13-45-22-000Z_final.json
            └── issues_repository2_2025-05-16T13-45-22-000Z_final.md
```

这种结构使得数据更有组织性，方便按仓库和日期查看和对比结果。

### 中断处理

如果需要中断处理过程，可按`Ctrl+C`，系统将：

1. 显示当前处理进度
2. 自动保存已处理数据
3. 生成中断时的 Markdown 分析报告
4. 安全退出程序

### 仅执行 AI 分析

如果已有 JSON 数据文件，可以单独运行 AI 分析：

```bash
npx ts-node src/ai-categorize.ts
```

## 输出结果

处理完成后，输出目录（默认为`./output`）会包含以下文件：

1. **JSON 数据文件**：

   - 中间文件：`issues_<repository>_<timestamp>_batch_<number>_intermediate.json`
   - 最终文件：`issues_<repository>_<timestamp>_final.json`
   - 中断文件：`issues_<repository>_<timestamp>_interrupted_<timestamp>.json`

2. **Markdown 分析报告**：
   - 与同名 JSON 文件对应的`.md`文件

### JSON 数据结构

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
      "title": "Issue标题",
      "state": "open",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z",
      "closed_at": null,
      "body": "Issue内容...",
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
        "summary": "这个Issue描述了...",
        "sentiment": "negative",
        "urgency": "high"
      }
    }
  ]
}
```

### AI 分析字段说明

- **categories** - 分类标签，可能的值包括：

  - `bug` - 错误或问题报告
  - `enhancement` - 功能增强或改进
  - `feature-request` - 新功能请求
  - `documentation` - 文档相关问题
  - `question` - 提问或求助
  - `performance` - 性能相关问题
  - `ui` - 用户界面相关
  - `api` - API 相关问题
  - `security` - 安全相关问题
  - `uncategorized` - 未归类

- **sentiment** - 情感分析，可能的值：

  - `positive` - 积极的
  - `neutral` - 中立的
  - `negative` - 消极的

- **urgency** - 紧急程度，可能的值：
  - `high` - 高紧急性
  - `medium` - 中等紧急性
  - `low` - 低紧急性

## 高级功能

### 自定义 AI 分析模板

在`src/deepseek-service.ts`文件中可修改提示词模板，以定制 AI 分析行为。

### 数据流水线

可通过脚本连接其他工具，构建完整数据分析流水线：

```bash
# 例：处理Issues并导出CSV
npm start && node scripts/json-to-csv.js
```

## 常见问题

- **GitHub API 限流**：API 默认限制为每小时 5000 请求，可通过增加`RATE_LIMIT_DELAY`值减缓请求速率
- **大量 Issues 处理**：处理大型仓库可能需要较长时间，建议增加批处理大小以提高效率
- **中断后恢复**：如已有部分处理结果，可运行 AI 分析脚本单独分析 JSON 文件
- **DeepSeek API 异常**：如遇分析错误，系统会自动降级使用规则分类

## 开发者信息

如需添加新功能或报告问题，请在 GitHub 仓库提交 Issue 或 Pull Request。

---

祝您使用愉快！👋
