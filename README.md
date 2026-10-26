# 橡果远征 · Acorn Expedition

**拉满树枝弹弓，带着橡宝穿过森林，夺回橡心王国的冬粮。**

由 [myflww](https://github.com/myflww) 独立制作的物理弹射冒险游戏。本仓库是从 Luma 中独立整理的桌面游戏源码公开版，使用 HTML5 Canvas、原生 JavaScript 和 Web Audio；运行游戏无需安装 Luma，也不需要 API 密钥或账号。

[English](README.en.md) · [运行与操作](#开始游戏) · [署名与来源](ATTRIBUTION.md) · [非商业使用许可](LICENSE)

**源码公开 · 仅限非商业使用 · 必须保留原作者 myflww 与原项目来源。** 本项目采用 PolyForm Noncommercial License 1.0.0，属于 source-available，不是 OSI 标准开源许可。

## 远征内容

- 18 关主线、5 个秘境篇章中的 20 个小关、无尽远征和每日三段挑战。
- 用不同橡宝的主动能力应对敌人、材质、连接结构与环境规则。
- 升级与融合天赋，搭配天赋专属橡宝、金橡果补给及星级评价。
- 分别保存主线、无尽、每日与秘境的关卡起点检查点。
- 在远征档案中记录图鉴故事、成就、星级、秘境契约和挑战成绩。

## 开始游戏

准备 [Node.js 20 或更新版本](https://nodejs.org/)，然后下载本仓库的 **Code → Download ZIP** 并解压；也可以使用 Git：

```bash
git clone https://github.com/myflww/acorn-expedition.git
cd acorn-expedition
npm run dev
```

浏览器打开 **[http://127.0.0.1:4187/](http://127.0.0.1:4187/)**。项目没有第三方 npm 依赖，直接运行即可，无需先执行 `npm install`。

不要直接双击 `index.html`；浏览器可能阻止 `file://` 下的 ES Modules。游戏服务默认仅监听本机回环地址。端口被占用时，可在 macOS/Linux 使用 `ACORN_PORT=4188 npm run dev`，或在 PowerShell 先运行 `$env:ACORN_PORT=4188` 再运行 `npm run dev`，并打开对应端口。

### 操作

| 输入 | 动作 |
| --- | --- |
| 鼠标拖拽弹弓上的橡宝，松开 | 瞄准并发射 |
| 飞行时点击，或按 `Space` | 使用当前橡宝的主动能力 |
| 方向键 / `Enter` | 键盘调整瞄准 / 发射 |
| `P` / `R` / `Esc` | 暂停 / 重开本关 / 打开设置与暂停菜单 |
| 滚轮 / `M` | 缩放 / 切换静音 |

推荐 1280×720 或更大的桌面窗口。设置中可以调整弹道提示、音乐和音效；档案、目标、天赋和弹药面板可收起。

### 存档与隐私

游戏使用当前浏览器来源的 `localStorage` 保存进度，不包含云存档、登录、统计或在线模型调用。游戏画面和声音在浏览器本地生成，生产游戏代码不发起外部网络请求。

改变域名、端口、浏览器或浏览器配置文件，会使用不同的存档空间；Luma 内的游戏窗口与此独立版也分别保存。清理网站数据可能删除进度。页面中的作者与项目链接只有在你主动点击时才会打开 GitHub。

## 源码结构

```text
index.html       游戏页面、界面结构与作者来源
styles.css       桌面布局与视觉样式
src/             游戏逻辑、关卡、绘制、音频与存档
tests/           使用 Node 内建测试框架的测试和辅助文件
serve.mjs        本机静态资源服务器
LICENSE          PolyForm Noncommercial 1.0.0 完整许可证
NOTICE           原作者和项目来源声明
ATTRIBUTION.md   中文署名说明与示例
```

图形由 Canvas、SVG 和 CSS 绘制，音效由 Web Audio 合成；此仓库不打包 Luma 的角色、场景、模型或其他游戏。

## 开发与检查

```bash
npm test
npm run check
```

检查包含 JavaScript 语法及游戏既有测试，涉及关卡、结构碰撞、能力天赋、检查点、存档和浏览器隔离。自动检查不能代替实际游玩与平衡性测试。

修复或新增功能欢迎通过 Issue / Pull Request 提交。参见 [贡献说明](CONTRIBUTING.md)。

## 非商业许可与标明来源

Copyright 2026 **myflww**。本仓库代码和随附的第一方游戏内容采用未修改的 **[PolyForm Noncommercial License 1.0.0](LICENSE)**，源码公开供非商业游玩、学习、修改和分享；**商业使用未获授权**。售卖游戏、付费分发、广告变现、集成到商业产品，通常属于商业用途。具体范围以完整英文许可证为准。

再分发本项目的任何部分时，须向接收者一并提供完整许可条款或[官方许可 URL](https://polyformproject.org/licenses/noncommercial/1.0.0)，并保留随附的所有 `Required Notice:` 纯文本行。本项目的来源声明在 [NOTICE](NOTICE)：

```text
Required Notice: Copyright 2026 myflww; Acorn Expedition / 橡果远征; Original source: https://github.com/myflww/acorn-expedition
```

只下载来自用游玩，无需另外发帖、注册或提交署名证明；请保留下载包内的许可与来源文件。详细说明见 [ATTRIBUTION.md](ATTRIBUTION.md)。

本次授权仅覆盖此仓库的《橡果远征》。Luma Companion 主程序及仓库外内容不因此获得授权。

作者：[myflww](https://github.com/myflww) · 业务联系：[1805680363@qq.com](mailto:1805680363@qq.com)
