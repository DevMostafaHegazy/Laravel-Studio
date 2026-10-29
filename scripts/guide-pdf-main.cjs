const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const [htmlPath, pdfPath] = process.argv.slice(2);

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const window = new BrowserWindow({
        show: false,
        width: 1240,
        height: 1754,
        backgroundColor: '#f5f6f8',
        webPreferences: {
            contextIsolation: true,
            sandbox: true
        }
    });
    await window.loadFile(htmlPath);
    await window.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
    const pdf = await window.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    });
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    fs.writeFileSync(pdfPath, pdf);
    window.destroy();
    app.quit();
}).catch(error => {
    console.error(error);
    app.quit();
    process.exitCode = 1;
});
