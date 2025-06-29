import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas'; // Importe html2canvas
import { jsPDF } from 'jspdf'; // Importe jsPDF

// Main App Component
function App() {
  // State to manage the currently displayed month and year
  const [currentDate, setCurrentDate] = useState(new Date());
  // State to store events/notes for each date
  // Format: { 'YYYY-MM-DD': 'Your note here' }
  const [events, setEvents] = useState({});
  // Ref to the calendar element for PDF generation (the visible one)
  const calendarRef = useRef(null);
  // State for managing messages to the user (e.g., PDF generation status)
  const [message, setMessage] = useState('');
  // State to store the last generated PDF Blob for sharing
  const [lastPdfBlob, setLastPdfBlob] = useState(null);

  // --- REMOVIDO: O useEffect para carregar CDNs não é mais necessário aqui ---
  // As bibliotecas são importadas diretamente no topo do arquivo.
  // O status de carregamento não precisa ser controlado, pois as imports garantem isso.

  // Function to get the number of days in a given month and year
  const getDaysInMonth = useCallback((year, month) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  // Function to get the first day of the month (0 for Sunday, 1 for Monday, etc.)
  const getFirstDayOfMonth = useCallback((year, month) => {
    return new Date(year, month, 1).getDay();
  }, []);

  // Function to handle changing to the previous month
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() - 1);
      return newDate;
    });
  };

  // Function to handle changing to the next month
  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + 1);
      return newDate;
    });
  };

  // Function to format a date to ISO (YYYY-MM-DD) string
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Function to handle changes in the event text for a specific date
  const handleEventChange = (dateString, text) => {
    setEvents(prevEvents => ({
      ...prevEvents,
      [dateString]: text,
    }));
  };

  // Array of month names for display (defined here for createStaticCalendarForPdf to access)
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Array of weekday names (defined here for createStaticCalendarForPdf to access)
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Get current year and month from currentDate state (defined here for createStaticCalendarForPdf to access)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate days in current, previous, and next month for calendar display (defined here for createStaticCalendarForPdf to access)
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month); // Day of the week for the 1st of the month (0=Sun, 6=Sat)
  const daysInPreviousMonth = getDaysInMonth(year, month - 1);

  // Create an array of all days to display in the calendar grid (defined here for createStaticCalendarForPdf to access)
  const calendarDays = [];

  // Add days from the previous month to fill the first week
  for (let i = firstDayIndex; i > 0; i--) {
    const date = new Date(year, month - 1, daysInPreviousMonth - i + 1);
    calendarDays.push({
      date: date,
      isCurrentMonth: false,
      dateString: formatDate(date)
    });
  }

  // Add days of the current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    calendarDays.push({
      date: date,
      isCurrentMonth: true,
      dateString: formatDate(date)
    });
  }

  // Add days from the next month to fill the last week(s)
  const totalCells = 42; // Max 6 weeks * 7 days (ensure enough cells for full grid)
  // If the last row is almost empty, ensure it is filled to avoid layout shifts.
  const currentTotalDays = calendarDays.length;
  const neededForFullGrid = Math.ceil(currentTotalDays / 7) * 7;
  const remainingCellsToAdd = neededForFullGrid - currentTotalDays > 0 ? neededForFullGrid - currentTotalDays : 0;

  for (let i = 1; i <= remainingCellsToAdd; i++) {
    const date = new Date(year, month + 1, i);
    calendarDays.push({
      date: date,
      isCurrentMonth: false,
      dateString: formatDate(date)
    });
  }


  // Helper function to create a static version of the calendar grid for PDF
  const createStaticCalendarForPdf = () => {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Position off-screen
    // Apply responsive classes to the temporary element for consistent rendering
    tempDiv.className = "w-full max-w-4xl bg-white shadow-lg rounded-xl p-6 mb-8";
    tempDiv.style.background = '#FFFFFF'; // Explicitly set background if not inherited
    tempDiv.style.padding = '24px'; // Match padding of the main container
    tempDiv.style.borderRadius = '12px'; // Match border-radius
    tempDiv.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; // Match shadow

    // Clone the calendar header (month/year)
    const headerHtml = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-gray-800">
                    ${monthNames[month]} ${year}
                </h2>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 mb-2">
                ${weekdayNames.map(day => `<div class="py-2 px-1 rounded-md bg-gray-200">${day}</div>`).join('')}
            </div>
        `;
    tempDiv.innerHTML += headerHtml;

    const gridContainer = document.createElement('div');
    gridContainer.className = "grid grid-cols-7 gap-1";

    calendarDays.forEach(dayInfo => {
      const dayDiv = document.createElement('div');
      // Apply responsive height for PDF capture
      dayDiv.className = `
                min-h-[8rem] p-2 rounded-lg border border-gray-200 flex flex-col
                ${dayInfo.isCurrentMonth ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400'}
                ${dayInfo.dateString === formatDate(new Date()) ? 'border-2 border-blue-500' : ''}
            `;

      const dateSpan = document.createElement('span');
      dateSpan.className = "font-bold text-lg mb-1";
      dateSpan.textContent = dayInfo.date.getDate();
      dayDiv.appendChild(dateSpan);

      // Use a div instead of textarea for static content
      const noteDiv = document.createElement('div');
      noteDiv.className = `
                w-full flex-grow overflow-hidden text-sm
                ${dayInfo.isCurrentMonth ? 'bg-gray-50' : 'bg-gray-100'}
            `;
      // Set innerHTML to preserve line breaks from textarea
      noteDiv.innerHTML = (events[dayInfo.dateString] || '').replace(/\n/g, '<br/>');
      dayDiv.appendChild(noteDiv);

      gridContainer.appendChild(dayDiv);
    });

    tempDiv.appendChild(gridContainer);
    document.body.appendChild(tempDiv);
    return tempDiv;
  };


  // Function to generate the PDF of the calendar
  const generatePdf = async (save = true) => { // Added 'save' parameter to control download
    setMessage('Gerando PDF... Por favor, aguarde.');

    // Com as imports diretas, não precisamos verificar pdfLibsLoaded aqui.
    // O build do React garante que as libs estão disponíveis.

    if (!calendarRef.current) {
      setMessage('Erro: O elemento do calendário não foi encontrado.');
      return null; // Return null if element not found
    }

    let tempCalendarElement = null;
    try {
      // Create a static version of the calendar for better PDF capture
      tempCalendarElement = createStaticCalendarForPdf();

      // Use html2canvas to capture the static calendar as an image
      const canvas = await html2canvas(tempCalendarElement, { // Usando html2canvas diretamente
        scale: 2, // Increase scale for better resolution in PDF
        useCORS: true, // Enable CORS if you have external images
        logging: false, // Disable logging for cleaner console
      });

      const imgData = canvas.toDataURL('image/png');
      // Access jsPDF constructor correctly (diretamente agora)
      const pdf = new jsPDF('p', 'mm', 'a4'); // Usando jsPDF diretamente

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft); // Adjust position for subsequent pages
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfFileName = `calendario-${formatDate(currentDate)}.pdf`;
      const pdfBlob = pdf.output('blob'); // Get the PDF as a Blob

      if (save) {
        pdf.save(pdfFileName); // Trigger download if save is true
        setMessage('PDF gerado e baixado com sucesso!');
      } else {
        setMessage('PDF gerado com sucesso (pronto para compartilhar)!');
      }
      setLastPdfBlob(pdfBlob); // Store the blob for sharing

      return pdfBlob; // Return the blob
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setMessage('Erro ao gerar PDF. Tente novamente.');
      return null;
    } finally {
      // Clean up the temporary element
      if (tempCalendarElement && tempCalendarElement.parentNode) {
        tempCalendarElement.parentNode.removeChild(tempCalendarElement);
      }
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    }
  };

  // Function to handle sharing the PDF
  const handleSharePdf = async () => {
    setMessage('Preparando para compartilhar PDF...');

    // First, ensure the PDF is generated and we have the blob
    let pdfBlob = lastPdfBlob;
    if (!pdfBlob) {
      pdfBlob = await generatePdf(false); // Generate PDF without immediately saving
      if (!pdfBlob) {
        setMessage('Não foi possível gerar o PDF para compartilhamento.');
        return;
      }
    }

    const pdfFileName = `calendario-${formatDate(currentDate)}.pdf`;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], pdfFileName, { type: 'application/pdf' })] })) {
      try {
        await navigator.share({
          files: [new File([pdfBlob], pdfFileName, { type: 'application/pdf' })],
          title: `Calendário - ${monthNames[month]} ${year}`,
          text: `Confira meu calendário do mês de ${monthNames[month]} de ${year} com minhas anotações!`,
        });
        setMessage('PDF compartilhado com sucesso!');
      } catch (error) {
        console.error('Erro ao compartilhar PDF:', error);
        setMessage('Compartilhamento falhou ou foi cancelado. Tente novamente.');
      }
    } else {
      // Fallback for browsers/devices that don't support file sharing via Web Share API
      setMessage('Seu navegador/dispositivo não suporta compartilhamento direto de arquivos. O PDF foi baixado. Por favor, anexe-o manualmente via WhatsApp ou outro aplicativo.');
      // Optionally, trigger a direct download if it wasn't already done.
      if (!lastPdfBlob) { // Only download if it wasn't already downloaded by generatePdf(false)
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        const url = window.URL.createObjectURL(pdfBlob);
        a.href = url;
        a.download = pdfFileName;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      setTimeout(() => setMessage(''), 7000); // Clear message after 7 seconds for longer instruction
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-1 flex flex-col items-center justify-center font-sans">
      {/* O CDN do Tailwind CSS ainda é necessário pois não estamos usando o PostCSS para processar o Tailwind */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>
        {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Ensure overflow is handled for notes inside PDF to prevent clipping */
                .calendar-grid .min-h-[8rem] div.w-full.flex-grow {
                    word-wrap: break-word; /* Allow long words to break */
                    white-space: pre-wrap; /* Preserve whitespace and line breaks */
                }
                /* Adjust font size for date numbers on smaller screens */
                .calendar-grid .day-cell .font-bold.text-lg {
                    font-size: 1.125rem; /* Default large */
                }
                @media (max-width: 639px) { /* Tailwind's 'sm' breakpoint is 640px */
                    .calendar-grid .day-cell .font-bold.text-lg {
                        font-size: 0.9rem; /* Smaller font size on mobile */
                    }
                    .calendar-grid .day-cell textarea {
                        font-size: 0.75rem; /* Smaller text area font on mobile */
                    }
                }
                @media (max-width: 480px) { /* Even smaller screens */
                    .calendar-grid .day-cell .font-bold.text-lg {
                        font-size: 0.8rem; /* Even smaller date font for tiny screens */
                    }
                    .calendar-grid .day-cell textarea {
                        font-size: 0.65rem; /* Even smaller text area font for tiny screens */
                    }
                    .calendar-grid .min-h-[8rem] {
                        min-height: 6rem; /* Reduce min height of cells for very small screens */
                    }
                    .calendar-grid .p-1 {
                        padding: 0.25rem; /* Reduce padding inside cells */
                    }
                    .calendar-grid .text-sm {
                         font-size: 0.7rem; /* Make weekday text smaller */
                    }
                }
                `}
      </style>

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-2 sm:p-4 mb-4 sm:mb-8">
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
          <button
            onClick={goToPreviousMonth}
            className="w-full sm:w-auto px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2 sm:mb-0 text-sm sm:text-base"
          >
            &lt; Mês Anterior
          </button>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-800 my-2 sm:my-0 text-center">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={goToNextMonth}
            className="w-full sm:w-auto px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 mt-2 sm:mt-0 text-sm sm:text-base"
          >
            Próximo Mês &gt;
          </button>
        </div>

        {/* Calendar Grid (Interactive) */}
        <div ref={calendarRef} className="calendar-grid">
          <div className="grid grid-cols-7 gap-0.5 text-center font-semibold text-gray-600 mb-1 sm:mb-2">
            {weekdayNames.map(day => (
              <div key={day} className="py-1 sm:py-2 px-0.5 sm:px-1 rounded-md bg-gray-200 text-xs sm:text-base">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((dayInfo, index) => (
              <div
                key={index}
                className={`
                                    day-cell min-h-[8rem] p-0.5 sm:p-1 rounded-lg border border-gray-200 flex flex-col
                                    ${dayInfo.isCurrentMonth ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400'}
                                    ${dayInfo.dateString === formatDate(new Date()) ? 'border-2 border-blue-500' : ''}
                                `}
              >
                <span className="font-bold text-lg mb-0.5">
                  {dayInfo.date.getDate()}
                </span>
                <textarea
                  className={`
                                        w-full flex-grow resize-none outline-none rounded-md p-0.5 text-sm overflow-y-auto
                                        ${dayInfo.isCurrentMonth ? 'bg-gray-50 hover:bg-gray-100 focus:bg-white' : 'bg-gray-100 cursor-not-allowed'}
                                        border border-transparent focus:border-blue-300 transition duration-150
                                    `}
                  placeholder={dayInfo.isCurrentMonth ? "Nota..." : ""}
                  value={events[dayInfo.dateString] || ''}
                  onChange={(e) => handleEventChange(dayInfo.dateString, e.target.value)}
                  disabled={!dayInfo.isCurrentMonth}
                ></textarea>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Generation and Share Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => generatePdf(true)} // Explicitly save the PDF
            className={`
                            w-full sm:w-auto px-5 py-2.5 font-semibold rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 text-base sm:text-lg
                            ${true ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}
                        `}
            disabled={false} // Botão sempre habilitado, pois as libs são importadas
          >
            Gerar PDF do Mês
          </button>
          <button
            onClick={handleSharePdf}
            className={`
                            w-full sm:w-auto px-5 py-2.5 font-semibold rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 text-base sm:text-lg
                            ${true ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-300' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}
                        `}
            disabled={false} // Botão sempre habilitado, pois as libs são importadas
          >
            Compartilhar PDF
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-gray-700 animate-pulse text-center">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;