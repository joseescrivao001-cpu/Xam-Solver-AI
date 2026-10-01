export async function convertPdfToVerticalImage(file: File, maxPages: number = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Load PDF.js dynamically to avoid Next.js SSR/Webpack issues
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = async () => {
      try {
        // @ts-expect-error bypassing missing types for window object
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const numPages = Math.min(pdf.numPages, maxPages);
        const canvasList: HTMLCanvasElement[] = [];
        let totalHeight = 0;
        let maxWidth = 0;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          // Scale 1.5 is enough for AI OCR and keeps size manageable
          const viewport = page.getViewport({ scale: 1.5 }); 
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: ctx, viewport }).promise;
          
          canvasList.push(canvas);
          totalHeight += canvas.height;
          maxWidth = Math.max(maxWidth, canvas.width);
        }

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = maxWidth;
        finalCanvas.height = totalHeight;
        const finalCtx = finalCanvas.getContext('2d');
        
        if (finalCtx) {
          finalCtx.fillStyle = "white";
          finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          
          let currentY = 0;
          for (const canvas of canvasList) {
            finalCtx.drawImage(canvas, 0, currentY);
            currentY += canvas.height;
          }
        }

        resolve(finalCanvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        reject(err);
      } finally {
        document.head.removeChild(script);
      }
    };
    script.onerror = () => reject(new Error("Falha ao carregar motor de renderização de PDF."));
    document.head.appendChild(script);
  });
}
