const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parse URL to remove query strings
    let urlPath = req.url.split('?')[0];
    
    // Default to index.html if root
    let filePath = urlPath === '/' ? '/pages/index.html' : urlPath;
    
    // Build file path
    filePath = path.join(__dirname, filePath);
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found - try in /pages/ directory
                const pagesPath = path.join(__dirname, 'pages', path.basename(urlPath));
                fs.readFile(pagesPath, (err2, content2) => {
                    if (err2) {
                        // Try adding .html extension
                        if (!ext) {
                            fs.readFile(filePath + '.html', (err3, content3) => {
                                if (err3) {
                                    res.writeHead(404, { 'Content-Type': 'text/html' });
                                    res.end('<h1>404 - Page Not Found</h1>', 'utf-8');
                                } else {
                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                    res.end(content3, 'utf-8');
                                }
                            });
                        } else {
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end('<h1>404 - Page Not Found</h1>', 'utf-8');
                        }
                    } else {
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(content2, 'utf-8');
                    }
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Frontend server running at http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop`);
});
