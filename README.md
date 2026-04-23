# Scrawl

A freeform drawing app inspired by Excalidraw with **automatic LaTeX rendering**. Type math expressions like `x^2`, `\frac{a}{b}`, or `\sqrt{x}` in text mode and they render as beautifully typeset math on the canvas.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **perfect-freehand** — pressure-sensitive freehand pen strokes
- **rough.js** — hand-drawn sketchy style for shapes
- **KaTeX** — fast LaTeX math rendering
- **zustand** — lightweight state management

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tools & Shortcuts

| Tool      | Shortcut | Description                              |
| --------- | -------- | ---------------------------------------- |
| Select    | `V`      | Click to select, drag to move elements   |
| Pen       | `P`      | Freehand drawing with pressure           |
| Rectangle | `R`      | Draw hand-drawn style rectangles         |
| Ellipse   | `O`      | Draw hand-drawn style ellipses           |
| Line      | `L`      | Draw straight lines                      |
| Arrow     | `A`      | Draw arrows                              |
| Text      | `T`      | Add text — auto-detects LaTeX            |
| Calculator| `C`      | Open built-in calculator                 |

### Other Shortcuts

- **Ctrl+Z** / **Cmd+Z** — Undo
- **Ctrl+Shift+Z** / **Cmd+Shift+Z** — Redo
- **C** — Toggle built-in calculator
- **Delete** / **Backspace** — Delete selected element
- **Space + Drag** or **Two-finger scroll** — Pan the canvas
- **Pinch** or **Ctrl + Scroll wheel** — Zoom in/out

## LaTeX Detection

When using the Text tool, the following patterns are automatically detected and rendered as math:

- Superscripts: `x^2`, `a^{n+1}`
- Subscripts: `x_1`, `a_{ij}`
- Commands: `\frac{a}{b}`, `\sqrt{x}`, `\sum`, `\int`, `\alpha`
- Dollar delimiters: `$E = mc^2$`

A live preview appears below the text input as you type, so you can see the rendered math before committing.
