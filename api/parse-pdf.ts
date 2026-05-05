import { VercelRequest, VercelResponse } from '@vercel/node';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to run middleware
const runMiddleware = (req: any, res: any, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export const config = {
  api: {
    bodyParser: false, // Disabling Vercel's body parser to let multer handle it
  },
};

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      await runMiddleware(req, res, upload.single('pdf'));
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      const data = await pdf(req.file.buffer);
      
      if (!data.text || data.text.trim().length === 0) {
        return res.status(400).json({ error: "O PDF parece estar vazio ou é apenas imagem." });
      }

      res.status(200).json({ text: data.text });
    } catch (error: any) {
      console.error("Erro no processamento do PDF:", error);
      res.status(500).json({ error: "Falha técnica ao ler PDF: " + error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
