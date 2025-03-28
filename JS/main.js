document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const form = document.getElementById('generator-form');
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');
    const previewIframe = document.getElementById('preview-iframe');
    const downloadBtn = document.getElementById('download-btn');
    const htmlCode = document.getElementById('html-code');
    const cssCode = document.getElementById('css-code');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    // Deepseek API configuration
    const DEEPSEEK_API_KEY = 'sk-5caad4ac968449598680cbd1c1fa7f93';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
    
    // Form submission handling
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 获取表单数据
        const topic = document.getElementById('topic').value;
        const style = document.getElementById('style').value;
        const posterRatio = document.getElementById('poster-ratio').value;
        const additionalInfo = document.getElementById('additional-info').value;
        
        // 显示加载状态
        loadingSection.style.display = 'block';
        resultSection.style.display = 'none';
        
        try {
            // 调用Deepseek API生成HTML和CSS
            const generatedCode = await generateCode(topic, style, posterRatio, additionalInfo);
            
            // 显示生成的代码
            displayGeneratedCode(generatedCode);
            
            // 隐藏加载状态，显示结果
            loadingSection.style.display = 'none';
            resultSection.style.display = 'block';
        } catch (error) {
            console.error('Error generating poster:', error);
            alert('Error generating poster. Please try again later.');
            loadingSection.style.display = 'none';
        }
    });
    
    // 调用Deepseek API生成代码
    async function generateCode(topic, style, posterRatio, additionalInfo) {
        // 调用Worker API而不是直接调用Deepseek API
        try {
            const response = await fetch('https://aipostergenapi.lonelygray666.workers.dev', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic,
                    style,
                    posterRatio,
                    additionalInfo
                })
            });
            debugger
            if (!response.ok) {
                throw new Error(`Worker API请求失败: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Worker API请求出错:', error);
            console.warn('API请求失败，使用模拟数据');
            return getMockData(topic, style, posterRatio);
        }
    }
    
    // 显示生成的代码
    function displayGeneratedCode(generatedCode) {
        if (!generatedCode || typeof generatedCode !== 'object') {
            console.error('生成的代码格式不正确');
            return;
        }
        
        const html = generatedCode.html || '';
        const css = generatedCode.css || '';
        
        // 显示代码到代码区域
        if (htmlCode) htmlCode.textContent = html;
        if (cssCode) cssCode.textContent = css;
        
        // 在iframe中预览
        if (previewIframe) {
            try {
                const safeHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { margin: 0; padding: 0; }
                            ${css}
                        </style>
                        <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
                    </head>
                    <body>
                        ${html}
                        <script>
                            window.onload = function() {
                                const poster = document.querySelector('.poster');
                                if (poster) {
                                    window.parent.postMessage({
                                        type: 'posterHeight',
                                        height: poster.offsetHeight
                                    }, '*');
                                }
                            };

                            window.addEventListener('message', async function(event) {
                                if (event.data && event.data.type === 'downloadPoster') {
                                    const poster = document.querySelector('.poster');
                                    if (poster) {
                                        try {
                                            const canvas = await html2canvas(poster, {
                                                scale: 2,
                                                useCORS: true,
                                                allowTaint: true,
                                                backgroundColor: null
                                            });
                                            
                                            canvas.toBlob(function(blob) {
                                                window.parent.postMessage({
                                                    type: 'posterBlob',
                                                    blob: blob
                                                }, '*');
                                            }, 'image/png', 1.0);
                                        } catch (error) {
                                            window.parent.postMessage({
                                                type: 'downloadError',
                                                error: error.message
                                            }, '*');
                                        }
                                    }
                                }
                            });
                        </script>
                    </body>
                    </html>`;
                
                const blob = new Blob([safeHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                previewIframe.src = url;
                
                previewIframe.onload = function() {
                    URL.revokeObjectURL(url);
                };
            } catch (error) {
                console.error('预览iframe时出错:', error);
            }
        }
    }

    // 删除重复的下载按钮声明和事件监听器
    // 删除文件末尾的这段代码
    /*
    // 获取下载按钮
    const downloadBtn = document.getElementById('download-btn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function() {
            const iframe = document.getElementById('preview-iframe');
            if (!iframe || !iframe.contentWindow) {
                alert('预览内容未准备好，请稍后再试');
                return;
            }
            
            try {
                // 获取海报元素
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const posterElement = iframeDoc.querySelector('.poster');
                
                if (!posterElement) {
                    throw new Error('未找到海报元素');
                }
                
                // 使用html2canvas转换为图片
                html2canvas(posterElement, {
                    scale: 2, // 提高图片质量
                    useCORS: true, // 允许跨域图片
                    allowTaint: true, // 允许跨域
                    backgroundColor: null // 保持背景透明
                }).then(canvas => {
                    // 创建下载链接
                    canvas.toBlob(function(blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${document.getElementById('topic').value}-海报.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 'image/png', 1.0);
                });
            } catch (error) {
                console.error('下载海报时出错:', error);
                alert('下载海报时出错，请稍后重试');
            }
        });
    }
    */

    // 只保留文件中间的这个下载按钮处理逻辑
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const iframe = document.getElementById('preview-iframe');
            if (!iframe || !iframe.contentWindow) {
                alert('Preview not ready. Please try again later.');
                return;
            }

            // 检测是否为移动设备
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            const messageHandler = function(event) {
                if (event.data && event.data.type === 'posterBlob') {
                    const blob = event.data.blob;
                    const url = URL.createObjectURL(blob);
                    
                    if (isMobile) {
                        try {
                            // 移动端：打开新窗口显示图片
                            const newWindow = window.open();
                            if (newWindow) {
                                newWindow.document.write(`
                                    <html>
                                        <head>
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            <title>Download Poster</title>
                                        </head>
                                        <body style="margin:0;display:flex;flex-direction:column;align-items:center;background:#f5f5f5;">
                                            <img src="${url}" style="max-width:100%;height:auto;margin:10px;">
                                            <p style="font-family:Arial;color:#666;text-align:center;">
                                                Long press the image to save
                                            </p>
                                        </body>
                                    </html>
                                `);
                                newWindow.document.close();
                            } else {
                                throw new Error('Unable to open preview window');
                            }
                        } catch (error) {
                            console.error('Error showing poster:', error);
                            alert('Please try saving the image directly from the preview.');
                        }
                    } else {
                        // PC端：使用常规下载方式
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${document.getElementById('topic').value}-poster.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                    
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 3000); // 增加超时时间，确保图片加载完成
                    window.removeEventListener('message', messageHandler);
                } else if (event.data && event.data.type === 'downloadError') {
                    console.error('Error processing poster:', event.data.error);
                    alert('Unable to process the poster. Please try again.');
                    window.removeEventListener('message', messageHandler);
                }
            };
            
            window.addEventListener('message', messageHandler);

            iframe.contentWindow.postMessage({
                type: 'downloadPoster'
            }, '*');
        });
    }
    
    // 标签切换功能
    if (tabButtons && tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                const targetPane = document.getElementById(`${tabId}-pane`);
                
                if (!targetPane) return;
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                this.classList.add('active');
                targetPane.classList.add('active');
            });
        });
    }
    
    // 复制代码功能
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            try {
                const targetId = this.getAttribute('data-target');
                const codeElement = document.getElementById(targetId);
                
                if (!codeElement) {
                    throw new Error('未找到目标代码元素');
                }
                
                const textarea = document.createElement('textarea');
                textarea.value = codeElement.textContent;
                document.body.appendChild(textarea);
                
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                const originalText = this.textContent;
                this.textContent = '已复制!';
                
                setTimeout(() => {
                    this.textContent = originalText;
                }, 2000);
            } catch (error) {
                console.error('复制代码时出错:', error);
                alert('复制失败，请手动复制');
            }
        });
    });
    
    // 模拟数据（当API密钥未设置时使用）
    function getMockData(topic, style, posterRatio) {
        const isHorizontal = posterRatio === 'horizontal';
        
        return {
            html: `
<div class="poster ${posterRatio}">
    <div class="poster-header">
        <h1>${topic}</h1>
    </div>
    
    <div class="poster-content">
        <div class="poster-image">
            <div class="placeholder-image"></div>
        </div>
        
        <div class="poster-text">
            <h2>${topic} Poster</h2>
            <p>Beautiful poster designed in ${style} style</p>
            <div class="poster-details">
                <div class="detail">
                    <span class="detail-label">Design Style</span>
                    <span class="detail-value">${style}</span>
                </div>
                <div class="detail">
                    <span class="detail-label">Created Date</span>
                    <span class="detail-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="detail">
                    <span class="detail-label">Generated By</span>
                    <span class="detail-value">Deepseek AI</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="poster-footer">
        <p>AI Poster Generator &copy; 2023</p>
    </div>
</div>
                `,
            css: `
body {
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
    font-family: 'Arial', sans-serif;
}

.poster {
    width: ${isHorizontal ? '1200px' : '800px'};
    height: ${isHorizontal ? '800px' : '1200px'};
    margin: 0 auto;
    background-color: white;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.poster-header {
    background-color: #2c3e50;
    color: white;
    padding: 2rem;
    text-align: center;
}

.poster-header h1 {
    margin: 0;
    font-size: 3rem;
    letter-spacing: 2px;
    text-transform: uppercase;
}

.poster-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 2rem;
}

.poster-image {
    flex: ${isHorizontal ? '1' : '2'};
    margin-${isHorizontal ? 'right' : 'bottom'}: 2rem;
}

.placeholder-image {
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, #3498db, #9b59b6);
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 1.5rem;
    position: relative;
    overflow: hidden;
}

.placeholder-image::after {
    content: '${topic}';
    position: absolute;
    font-size: 3rem;
    opacity: 0.3;
    text-transform: uppercase;
}

.poster-text {
    flex: 1;
    padding: 2rem;
    background-color: #f9f9f9;
    border-radius: 8px;
}

.poster-text h2 {
    margin-top: 0;
    color: #2c3e50;
    font-size: 2.5rem;
}

.poster-text p {
    color: #7f8c8d;
    font-size: 1.2rem;
    margin-bottom: 2rem;
}

.poster-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}

.detail {
    flex: 1;
    min-width: 200px;
    padding: 1rem;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.detail-label {
    display: block;
    font-size: 0.9rem;
    color: #7f8c8d;
    margin-bottom: 0.5rem;
}

.detail-value {
    display: block;
    font-size: 1.1rem;
    font-weight: bold;
    color: #2c3e50;
}

.poster-footer {
    background-color: #2c3e50;
    color: white;
    padding: 1rem;
    text-align: center;
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    .poster {
        width: 100%;
        height: auto;
        min-height: ${isHorizontal ? '600px' : '800px'};
    }
    
    .poster-content {
        flex-direction: column;
    }
}
            `
        };
    }
});