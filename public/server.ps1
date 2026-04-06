param(
    [int]$Port = 8080,
    [string]$Root = $PSScriptRoot
)

$Root = $Root.TrimEnd('\')

$mime = @{
    '.html'  = 'text/html;charset=utf-8'
    '.js'    = 'application/javascript'
    '.mjs'   = 'application/javascript'
    '.css'   = 'text/css'
    '.json'  = 'application/json'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.svg'   = 'image/svg+xml'
    '.mp3'   = 'audio/mpeg'
    '.ogg'   = 'audio/ogg'
    '.wav'   = 'audio/wav'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf'   = 'font/ttf'
    '.ico'   = 'image/x-icon'
    '.webp'  = 'image/webp'
}

$listener = New-Object System.Net.HttpListener

try {
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
} catch {
    Write-Host "[警告] 端口 $Port 被占用，尝试 $($Port+1)..."
    $Port = $Port + 1
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  服务器已启动: http://localhost:$Port"
Write-Host "  根目录: $Root"
Write-Host "  按 Ctrl+C 或关闭窗口停止"
Write-Host "=========================================="
Write-Host ""

Start-Process "http://localhost:$Port"

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $urlPath = $ctx.Request.Url.LocalPath

        if ($urlPath -eq '/') {
            $urlPath = '/index.html'
        }

        $relativePath = $urlPath -replace '/', '\'
        $filePath = Join-Path $Root $relativePath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            if ($mime.ContainsKey($ext)) {
                $ctx.Response.ContentType = $mime[$ext]
            } else {
                $ctx.Response.ContentType = 'application/octet-stream'
            }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "200: $urlPath"
        } else {
            Write-Host "404: $urlPath -> $filePath"
            $ctx.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $ctx.Response.ContentLength64 = $msg.Length
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
        }

        $ctx.Response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
