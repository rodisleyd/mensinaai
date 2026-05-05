import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  const upload = multer({ dest: "uploads/" });

  app.use(express.json());

  // API Route: PDF Parsing
  app.post("/api/parse-pdf", upload.single("pdf"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      console.log(`Recebido arquivo: ${req.file.originalname}`);
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "O PDF parece estar vazio ou é apenas imagem (OCR não suportado)." });
      }

      console.log(`PDF processado com sucesso. Caracteres extraídos: ${data.text.length}`);
      
      // Limpar arquivo
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      res.json({ text: data.text });
    } catch (error: any) {
      console.error("Erro no processamento do PDF:", error);
      res.status(500).json({ error: "Falha técnica ao ler PDF: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
