import * as pdfjsLib from 'pdfjs-dist';

// Setting up the worker for PDF.js to function locally without breaking on CDN restrictions
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const extractTextFromPdf = async (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result);
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = "";

        // Iterate through each page to extract text
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + "\\n";
        }
        
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = function() {
      reject(new Error("Failed to read file"));
    };

    fileReader.readAsArrayBuffer(file);
  });
};
