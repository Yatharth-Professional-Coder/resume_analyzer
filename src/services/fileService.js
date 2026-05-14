import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Setting up the worker for PDF.js to function locally without breaking on CDN restrictions
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts text from a PDF file
 */
export const extractTextFromPdf = async (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + "\n";
        }
        
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = () => reject(new Error("Failed to read PDF file"));
    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * Extracts text from a Word file (.docx)
 */
export const extractTextFromDocx = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value); // The raw text
      } catch (err) {
        reject(new Error("Failed to extract text from Word document. Ensure it's a valid .docx file."));
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read Word file"));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Unified helper to extract text based on file type
 */
export const extractTextFromFile = async (file) => {
  if (file.type === 'application/pdf') {
    return await extractTextFromPdf(file);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDocx(file);
  } else if (file.type === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Failed to read text file"));
      reader.readAsText(file);
    });
  } else {
    throw new Error("Unsupported file type. Please upload PDF, Word (.docx), or Text files.");
  }
};
