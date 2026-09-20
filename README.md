# gacp-studio

一个为 [`gacp`](https://github.com/vivaxy/gacp) 工作流设计的本地浏览器可视化面板：在网页里查看 git 状态、用 Conventional Commits + Gitmoji 组装提交信息，然后一键执行 `git add` → `git commit` → `git push`。

零第三方依赖，仅需 Python 3.9+ 标准库和本机 `git`。

## 功能

- 浏览器可视化工作区状态：当前分支、远程、领先/落后、暂存/未暂存/未跟踪文件、最近提交。
- Conventional Commits 类型选择（feat / fix / docs / …），自动匹配 emoji。
- scope、subject、body、`BREAKING CHANGE` 实时预览。
- 一键 `add + commit + push`，或只提交不推送。
- 仓库路径与偏好自动保存到本地 `state.json`，刷新不丢失。
- 仅监听 `127.0.0.1`，不对外暴露。

## 目录结构

```
gacp-studio/
├── server.py           # 零依赖本地 HTTP 服务（静态文件 + JSON API）
├── start.cmd           # Windows 双击启动
├── start.sh            # macOS / Linux 启动
├── config.json         # 端口、git 路径等配置
├── requirements.txt    # 无第三方依赖说明
└── web/
    ├── index.html
    ├── app.js          # 无构建前端
    └── styles.css
```

## 环境要求

- Python 3.9+
- git（需在 `PATH` 中，或在 `config.json` 的 `git_path` 指定绝对路径）
- 一个现代浏览器

## 安装

无需安装依赖：

```bash
git clone <你的仓库地址>
cd gacp-studio
```

## 快速开始

Windows：双击 `start.cmd`，浏览器会自动打开 `http://127.0.0.1:8787/`。

macOS / Linux：

```bash
./start.sh
```

或手动启动：

```bash
python server.py          # Windows
python3 server.py         # macOS / Linux
```

启动后在页面顶部选择目标 git 仓库路径，点击“刷新状态”，填写提交信息后点击“提交并推送”。

## 参数与配置

`config.json`：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `git_path` | `""` | git 可执行文件绝对路径；为空时自动从 `PATH` 查找 |
| `host` | `127.0.0.1` | 监听地址，保持 localhost |
| `port` | `8787` | 监听端口 |
| `state_file` | `state.json` | 本地状态文件路径 |

`server.py` 命令行参数：

| 参数 | 说明 |
| --- | --- |
| `--host` | 覆盖监听地址 |
| `--port` | 覆盖监听端口 |
| `--no-browser` | 启动时不自动打开浏览器（用于测试/CI） |

## 输出

- 提交/推送过程与 git 输出实时显示在页面底部“输出”面板。
- 用户状态保存在项目根目录 `state.json`（已被 `.gitignore` 排除，不会提交）。

## 已知限制

- 单用户本地工具，不是多用户 Web 服务，请勿部署到公网。
- 只处理当前仓库工作区的整体提交，不提供逐文件暂存界面。
- 推送默认使用当前分支；未配置上游时会自动 `git push -u origin <branch>`。

## 许可证

许可证待定。

## 免责声明

本工具会执行真实的 `git add / commit / push` 命令，请在提交前确认预览信息与目标仓库无误。