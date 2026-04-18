# Smart Money Monitor

实时监控聪明钱前50钱包动向，支持 Solana + BSC 双链。

## 功能

- 输入代币 CA 地址，自动获取前50持仓钱包
- 交叉对比 GMGN 聪明钱榜单，标记聪明钱钱包
- 实时检测出货、买入、转移交易所行为
- 自动警报：出货钱包增加时触发提示
- 30秒自动刷新

## 部署到 Vercel（一步步）

### 第一步：上传代码到 GitHub

1. 去 https://github.com/new 新建一个 repo（名字如 `smart-money-monitor`）
2. 把这个文件夹的代码上传（可以用 GitHub Desktop 或命令行）

```bash
cd smart-money-monitor
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/smart-money-monitor.git
git push -u origin main
```

### 第二步：部署到 Vercel

1. 去 https://vercel.com，用 GitHub 账号登录
2. 点击 "New Project" → 选择你的 repo
3. Framework 会自动识别为 **Next.js**
4. 点击 **Deploy** — 等待约 1 分钟

### 第三步：（可选）设置环境变量

如果 GMGN 之后要求 API key：

1. Vercel 项目设置 → Environment Variables
2. 添加 `GMGN_API_KEY` = 你的 key

## 本地运行

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

## 使用方法

1. 选择链（SOL / BSC）
2. 输入代币合约地址（CA）
3. 可选填写备注名
4. 点击「+ 添加」
5. Dashboard 自动加载持仓数据，每30秒刷新

## 技术说明

- 数据来源：GMGN.ai 公开接口
- 聪明钱判断：前50盈利钱包榜单交叉对比
- 出货判断：持仓余额变化 < -5% 标记为出货
- 转交易所：检测已知交易所充值地址

## 注意

GMGN API 有 Cloudflare 防护，如果出现 403 错误，说明请求被拦截。
建议：在 Vercel 的 Serverless Functions 里加代理或使用官方 API key。
