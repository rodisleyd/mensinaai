import { jsPDF } from 'jspdf';
import { Course, Module } from '../types';

const cleanMarkdown = (text: string) => {
  return text
    .normalize('NFC')
    .replace(/#{1,6}\s/g, '') // remove headers
    .replace(/\*\*/g, '')      // remove bold
    .replace(/\*/g, '')       // remove italics
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove links
    .replace(/^>\s?/gm, '')    // remove blockquotes
    .replace(/`{1,3}.*?`{1,3}/g, '') // remove code blocks
    .replace(/^-{3,}/gm, '')   // remove horizontal rules
    .replace(/\n{3,}/g, '\n\n') // normalize line breaks
    .trim();
};

export const exportCourseToPDF = async (course: Course, modules: Module[]) => {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(course.titulo.normalize('NFC'), margin, y, { maxWidth: contentWidth });
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} via Me Ensina Aí`, margin, y);
  y += 20;

  modules.forEach((mod) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Module Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Módulo ${mod.ordem}: ${mod.titulo}`.normalize('NFC'), margin, y, { maxWidth: contentWidth });
    y += 15;

    // Content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const cleanText = cleanMarkdown(mod.conteudo_aula);
    const lines = doc.splitTextToSize(cleanText, contentWidth);
    
    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });

    // Exemplo Prático
    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(10);
    doc.text('Exemplo Prático:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'italic');
    
    const exampleLines = doc.splitTextToSize(mod.exemplo_pratico.normalize('NFC'), contentWidth);
    exampleLines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    
    y += 15;
  });

  doc.save(`${course.titulo.replace(/\s+/g, '_')}.pdf`);
};

export const exportDidacticLessonToPDF = (topic: string, lesson: string) => {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`Aula do Professor AI`, margin, y);
  y += 12;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bolditalic');
  doc.text(topic.normalize('NFC'), margin, y, { maxWidth: contentWidth });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} via Me Ensina Aí`, margin, y);
  y += 15;

  // Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const cleanText = cleanMarkdown(lesson);
  const lines = doc.splitTextToSize(cleanText, contentWidth);
  
  lines.forEach((line: string) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 6.5;
  });

  doc.save(`Aula_AI_${topic.replace(/\s+/g, '_')}.pdf`);
};
