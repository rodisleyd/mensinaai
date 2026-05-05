import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateCourseFromText = async (text?: string, pdfBase64?: string) => {
  const parts: any[] = [];

  if (pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64
      }
    });
  }

  const promptText = `Você é um Professor Universitário Especialista em Design Instrucional e Microlearning.
Sua missão é transformar o conteúdo fornecido em um curso estruturado, altamente didático e de fácil entendimento.

${text ? `TEXTO BASE:\n${text.length > 25000 ? text.substring(0, 25000) + "..." : text}` : 'O conteúdo para o curso está no arquivo PDF anexo.'}

INSTRUÇÕES DE PROCESSAMENTO:
1. Analise o conteúdo e divida-o em Módulos lógicos de aprendizagem.
2. Para cada Módulo, crie o conteúdo da aula. A linguagem deve ser clara, envolvente e eliminar jargões desnecessários (ou explicá-los imediatamente).
3. OBRIGATÓRIO: Inclua pelo menos 1 (um) "Exemplo Prático" ou "Analogia do Mundo Real" em cada módulo para facilitar o entendimento do aluno.
4. Ao final de cada Módulo, crie exatamente 5 questões de múltipla escolha (A, B, C, D) baseadas APENAS no conteúdo daquele módulo.

Retorne APENAS um objeto JSON no formato especificado.`;

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titulo_curso: { type: Type.STRING },
          modulos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ordem: { type: Type.INTEGER },
                titulo_modulo: { type: Type.STRING },
                conteudo_aula: { type: Type.STRING },
                exemplo_pratico: { type: Type.STRING },
                simulado: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      pergunta: { type: Type.STRING },
                      opcoes: {
                        type: Type.OBJECT,
                        properties: {
                          A: { type: Type.STRING },
                          B: { type: Type.STRING },
                          C: { type: Type.STRING },
                          D: { type: Type.STRING },
                        },
                        required: ["A", "B", "C", "D"],
                      },
                      resposta_correta: { type: Type.STRING },
                      explicacao_resposta: { type: Type.STRING },
                    },
                    required: ["pergunta", "opcoes", "resposta_correta", "explicacao_resposta"],
                  },
                },
              },
              required: ["ordem", "titulo_modulo", "conteudo_aula", "exemplo_pratico", "simulado"],
            },
          },
        },
        required: ["titulo_curso", "modulos"],
      },
    },
  });

  const rawJson = response.text;
  if (!rawJson) throw new Error("IA não retornou conteúdo.");
  return JSON.parse(rawJson);
};

export const getQuickExplanation = async (query: string, context: string) => {
  const prompt = `Você é um mentor acadêmico atencioso. 
O aluno está lendo o seguinte conteúdo:
"""
${context}
"""

Ele tem a seguinte dúvida ou quer entender melhor este termo: "${query}"

Explique de forma extremamente concisa (máximo 3 frases), clara e didática, focando no contexto do texto que ele está lendo. Use um tom amigável e encorajador.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
    }
  });

  return response.text || "Desculpe, não consegui processar sua dúvida no momento.";
};

export const generateDidacticLesson = async (topic: string, context: string) => {
  const prompt = `Você é um Professor IA Genial, especializado em transformar temas complexos em aulas simples, envolventes e altamente didáticas.

TEMA DA AULA: "${topic}"

CONTEXTO BASE:
"""
${context}
"""

SUA MISSÃO:
Crie uma aula completa sobre este tema, seguindo esta estrutura:
1. **Introdução Criativa**: Comece com algo que prenda a atenção (uma curiosidade ou uma pergunta instigante).
2. **Explicação Didática**: Explique o conceito central de forma clara, eliminando a "frieza" acadêmica. Use uma linguagem humana.
3. **Exemplos Práticos**: Traga pelo menos 2 exemplos reais de como esse conceito se aplica no dia a dia.
4. **Estudo de Caso (Case)**: Narre um pequeno cenário ou "história de sucesso" onde esse conhecimento fez a diferença.
5. **Resumo "Para não esquecer"**: Uma lista rápida com os pontos chave.

Use formatação Markdown para deixar a aula bonita (títulos, negritos, listas). Seja inspirador!`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0.8,
    }
  });

  return response.text || "Desculpe, o Professor IA não conseguiu preparar a aula agora.";
};
