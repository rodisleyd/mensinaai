import { jsPDF } from 'jspdf';
import { Course, Module } from '../types';

export const exportCourseToPDF = async (course: Course, modules: Module[]) => {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(course.titulo, margin, y);
  y += 15;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} via Me Ensina Aí`, margin, y);
  y += 20;

  modules.forEach((mod, index) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Module Header
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text(`Módulo ${mod.ordem}: ${mod.titulo}`, margin, y);
    y += 10;

    // Content
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    
    // Simple text wrapping - stripping markdown characters for basic readability
    const cleanText = mod.conteudo_aula
      .replace(/#{1,6}\s/g, '') // strip headers
      .replace(/\*\*/g, '')      // strip bold
      .replace(/\*/g, '')       // strip italics
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // strip links

    const splitText = doc.splitTextToSize(cleanText, contentWidth);
    
    splitText.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });

    // Exemplo Prático
    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('times', 'italic');
    doc.text(`Exemplo Prático: ${mod.exemplo_pratico}`, margin, y, { maxWidth: contentWidth });
    y += 20;
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
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.text(`Aula do Professor AI`, margin, y);
  y += 10;
  
  doc.setFontSize(16);
  doc.setFont('times', 'italic');
  doc.text(topic, margin, y);
  y += 15;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} via Me Ensina Aí`, margin, y);
  y += 20;

  // Content
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  
  // Simple markdown stripping for PDF readability
  const cleanText = lesson
    .replace(/#{1,6}\s/g, '') 
    .replace(/\*\*/g, '')      
    .replace(/\*/g, '')       
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');

  const splitText = doc.splitTextToSize(cleanText, contentWidth);
  
  splitText.forEach((line: string) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 7;
  });

  doc.save(`Aula_AI_${topic.replace(/\s+/g, '_')}.pdf`);
};
