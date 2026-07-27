import { useEffect, useState } from "react";

interface LivePreviewPaneProps {
  code: string;
  isLightMode: boolean;
}

export function LivePreviewPane({ code, isLightMode }: LivePreviewPaneProps) {
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    // Inject asyncio and wrap the code in an async main function
    const indentedCode = code.split('\n').map(line => {
      // Prevent synchronous busy-waiting which freezes the browser tab
      if (line.includes("clock.tick(")) {
        line = line.replace(/clock\.tick\(/g, "# clock.tick(");
      }
      if (line.includes("pygame.display.flip()") || line.includes("pygame.display.update()")) {
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1] : "";
        return `    ${line}\n    ${indent}await asyncio.sleep(0)`;
      }
      return `    ${line}`;
    }).join('\n');

    const pythonCode = `import asyncio
import js

# Hide loading screen once Python starts executing
loading_el = js.document.getElementById("loading")
if loading_el:
    loading_el.style.display = "none"

async def main():
${indentedCode}

async def _run_safely():
    try:
        await main()
    except Exception as e:
        import traceback
        import js
        err_div = js.document.createElement("div")
        err_div.style.color = "red"
        err_div.style.padding = "20px"
        err_div.style.backgroundColor = "rgba(255,0,0,0.1)"
        err_div.style.zIndex = "9999"
        err_div.innerHTML = "<h3>Pygame Error:</h3><pre>" + str(traceback.format_exc()) + "</pre>"
        js.document.body.appendChild(err_div)
        js.console.error(str(traceback.format_exc()))

asyncio.run(_run_safely())
`;

    // Generate PyScript HTML. We use srcDoc to load it directly.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pygame Preview</title>
  <link rel="stylesheet" href="https://pyscript.net/releases/2025.2.1/core.css" />
  <script type="module" src="https://pyscript.net/releases/2025.2.1/core.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      background-color: ${isLightMode ? "#f8fafc" : "#0d1117"}; 
      color: ${isLightMode ? "#0f172a" : "#f8fafc"};
      display: flex; 
      flex-direction: column;
      align-items: center; 
      height: 100vh;
      overflow: auto;
      font-family: system-ui, sans-serif;
    }
    #canvas {
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      margin-top: 20px;
    }
    #loading {
      margin-top: 50px;
      font-weight: bold;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
  </style>
</head>
<body>
  <div id="loading">Loading Pygame Engine... (Downloads ~10MB on first run)</div>
  <canvas id="canvas" tabindex="0"></canvas>
  
  <!-- The user's code -->
  <script type="py" config='{"packages":["pygame-ce"]}'>
${pythonCode.replace(/</g, "\\x3c").replace(/>/g, "\\x3e")}
  </script>
</body>
</html>`;

    setHtmlContent(html);
  }, [code, isLightMode]);

  return (
    <div className="w-full h-full relative">
      <iframe
        srcDoc={htmlContent}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
        title="Live Pygame Preview"
      />
    </div>
  );
}
