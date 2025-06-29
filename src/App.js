import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas'; // Import html2canvas
import { jsPDF } from 'jspdf'; // Import jsPDF
import { Analytics } from "@vercel/analytics/react"
// Main App Component
function App() {
    // State to manage the currently displayed month and year
    const [currentDate, setCurrentDate] = useState(new Date());
    // State to store events/notes for each date
    // Format: { 'YYYY-MM-DD': 'Your note here' }
    const [events, setEvents] = useState({});
    // Ref to the calendar element for PDF generation (the visible one)
    const calendarRef = useRef(null);

    const [message, setMessage] = useState('');

    const [pdfLibsLoaded, setPdfLibsLoaded] = useState(false);
    // State to store the last generated PDF Blob for sharing
    const [lastPdfBlob, setLastPdfBlob] = useState(null);


    useEffect(() => {
        let html2canvasLoaded = false;
        let jspdfLoaded = false;

        const checkAllLoaded = () => {
            if (html2canvasLoaded && jspdfLoaded && typeof window.html2canvas !== 'undefined' && typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                setPdfLibsLoaded(true);
                setMessage('Bibliotecas de PDF carregadas! Pronto para gerar PDF.');
                setTimeout(() => setMessage(''), 3000);
            }
        };

        const loadScript = (src, id, onloadCallback) => {
            if (document.getElementById(id)) {
                if (onloadCallback) onloadCallback();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.onload = () => {
                onloadCallback();
                checkAllLoaded();
            };
            script.onerror = () => {
                console.error(`Falha ao carregar script: ${src}`);
                setMessage(`Erro ao carregar script: ${id}.`);
            };
            document.head.appendChild(script);
        };

        // Load html2canvas
        loadScript(
            'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
            'html2canvas-script',
            () => {
                if (typeof window.html2canvas === 'undefined') {
                    console.error('html2canvas não carregou corretamente.');
                }
                html2canvasLoaded = true;
            }
        );

        // Load jsPDF
        loadScript(
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'jspdf-script',
            () => {
                if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                    console.error('jsPDF não carregou corretamente ou seu construtor não está acessível.');
                }
                jspdfLoaded = true;
            }
        );

        setMessage('Carregando bibliotecas de PDF...');

    }, []);

    // Effect to handle browser refresh/close warning
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            // Check if there are any non-empty events
            const hasEvents = Object.values(events).some(note => note.trim() !== '');
            if (hasEvents) {
                // Standard way to trigger a confirmation dialog
                event.preventDefault(); // For older browsers
                event.returnValue = ''; // For modern browsers
                return ''; // For some older browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [events]); // Re-run effect if events change

    // Function to get the number of days in a given month and year
    const getDaysInMonth = useCallback((year, month) => {
        return new Date(year, month + 1, 0).getDate();
    }, []);

    // Function to get the first day of the month (0 for Sunday, 1 for Monday, etc.)
    const getFirstDayOfMonth = useCallback((year, month) => {
        return new Date(year, month, 1).getDay();
    }, []);

    // Function to change to the previous month
    const goToPreviousMonth = () => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(prevDate.getMonth() - 1);
            return newDate;
        });
    };

    // Function to change to the next month
    const goToNextMonth = () => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(prevDate.getMonth() + 1);
            return newDate;
        });
    };

    // Function to format a date to the ISO (YYYY-MM-DD) string
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const sec = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}-${sec}`;
    };

    // Function to handle changes in the event text for a specific date
    const handleEventChange = (dateString, text) => {
        setEvents(prevEvents => ({
            ...prevEvents,
            [dateString]: text,
        }));
    };

    // Array of month names for display
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Array of weekday names
    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Get current year and month from currentDate state
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calculate days in current, previous, and next month for calendar display
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const daysInPreviousMonth = getDaysInMonth(year, month - 1);

    // Create an array of all days to display in the calendar grid
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
        // Define width and height to match A4 landscape in pixels (approx. 200 DPI for good quality)
        // A4 landscape: 297mm x 210mm. 1mm = ~3.78px at 200 DPI
        const targetWidthPx = 297 * 3.78; // Approx. 1122 pixels
        const targetHeightPx = 210 * 3.78; // Approx. 794 pixels

        tempDiv.style.width = `${targetWidthPx}px`;
        tempDiv.style.minHeight = `${targetHeightPx}px`;
        tempDiv.style.boxSizing = 'border-box'; // Ensures padding and border are included in width/height
        
        // Copy main styles from the visible container for consistency
        tempDiv.className = "w-full max-w-4xl bg-white shadow-lg rounded-xl p-6 mb-8";
        tempDiv.style.maxWidth = 'unset'; // Remove max-width restriction for PDF
        tempDiv.style.background = '#FFFFFF';
        tempDiv.style.padding = '24px';
        tempDiv.style.borderRadius = '12px';
        tempDiv.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';

        const headerHtml = `
            <div class="flex justify-between items-center mb-6" style="padding: 0 1rem;">
                <h2 class="text-3xl font-bold text-gray-800 mb-2 " style="font-size: 2.5rem; text-align: center; width: 100%;">
                    ${monthNames[month]} ${year}
                </h2>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 mb-2" style="font-size: 1.1rem;">
                ${weekdayNames.map(day => `<div class="py-2 px-1 rounded-md bg-gray-200" style="padding: 0.5rem;">${day}</div>`).join('')}
            </div>
        `;
        tempDiv.innerHTML += headerHtml;

        const gridContainer = document.createElement('div');
        gridContainer.className = "grid grid-cols-7 gap-1";

        calendarDays.forEach(dayInfo => {
            const dayDiv = document.createElement('div');
            dayDiv.className = `
                min-h-[8rem] p-2 rounded-lg border border-gray-200 flex flex-col
                ${dayInfo.isCurrentMonth ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400'}
                ${dayInfo.dateString === formatDate(new Date()) ? 'border-2 border-blue-500' : ''}
            `;
            dayDiv.style.boxSizing = 'border-box';
            dayDiv.style.minHeight = '150px'; // Increase min-height for days in PDF
            dayDiv.style.padding = '0.75rem'; // Increase padding for days in PDF
            dayDiv.style.position = 'relative'; // Make it a positioning context for absolute children

            const dateSpan = document.createElement('span');
            dateSpan.className = "font-bold text-lg mb-1";
            dateSpan.textContent = dayInfo.date.getDate();
            dateSpan.style.fontSize = '1.5rem'; // Increase date font size in PDF
            dateSpan.style.position = 'absolute'; // Position date absolutely
            dateSpan.style.top = '0.5rem'; // Distance from top
            dateSpan.style.left = '0.5rem'; // Distance from left
            dateSpan.style.zIndex = '1'; // Ensure date is above the note
            dayDiv.appendChild(dateSpan);

            const noteDiv = document.createElement('div');
            noteDiv.className = `
                w-full flex-grow overflow-hidden text-sm
                ${dayInfo.isCurrentMonth ? 'bg-gray-50' : 'bg-gray-100'}
            `;
            noteDiv.style.boxSizing = 'border-box';
            noteDiv.style.padding = '0.5rem'; // Consistent padding for note content
            noteDiv.style.fontSize = '0.9rem'; // Consistent font size for notes
            noteDiv.style.wordWrap = 'break-word';
            noteDiv.style.whiteSpace = 'pre-wrap';
            noteDiv.style.marginTop = '2rem'; // Push note down to make space for the date
            noteDiv.innerHTML = (events[dayInfo.dateString] || '').replace(/\n/g, '<br/>');
            dayDiv.appendChild(noteDiv);

            gridContainer.appendChild(dayDiv);
        });

        tempDiv.appendChild(gridContainer);
        document.body.appendChild(tempDiv);
        return tempDiv;
    };


    // Function to generate the PDF of the calendar
    const generatePdf = async (save = true) => {
        setMessage('Gerando PDF... Por favor, aguarde.');

        if (!pdfLibsLoaded) {
            setMessage('As bibliotecas de PDF ainda não foram carregadas ou estão inacessíveis. Por favor, aguarde e tente novamente.');
            setTimeout(() => setMessage(''), 3000);
            return null;
        }

        if (!calendarRef.current) {
            setMessage('Erro: O elemento do calendário não foi encontrado.');
            return null;
        }

        let tempCalendarElement = null;
        try {
            tempCalendarElement = createStaticCalendarForPdf();

            // Capture the temporary element for the PDF
            const canvas = await window.html2canvas(tempCalendarElement, {
                scale: 2, // Increase scale for better resolution in PDF
                useCORS: true,
                logging: false,
                // Do not define width/height here, html2canvas will use the tempDiv style
            });

            const imgData = canvas.toDataURL('image/png');
            // Change to landscape ('l') and use A4 landscape dimensions (297x210 mm)
            const pdf = new window.jspdf.jsPDF('l', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth(); // Will be 297mm
            const pdfHeight = pdf.internal.pageSize.getHeight(); // Will be 210mm

            // Calculate image dimensions to fit the PDF page, maintaining aspect ratio
            const imgCanvasWidth = canvas.width;
            const imgCanvasHeight = canvas.height;

            const ratio = imgCanvasWidth / imgCanvasHeight;

            let imgPdfWidth = pdfWidth * 0.95; // Occupy 95% of PDF width for margins
            let imgPdfHeight = imgPdfWidth / ratio;

            // If the image is still too tall for the page, adjust by height
            if (imgPdfHeight > pdfHeight * 0.95) { // Occupy 95% of height
                imgPdfHeight = pdfHeight * 0.95;
                imgPdfWidth = imgPdfHeight * ratio;
            }

            // Center the image on the page
            const xOffset = (pdfWidth - imgPdfWidth) / 2;
            const yOffset = (pdfHeight - imgPdfHeight) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgPdfWidth, imgPdfHeight);

            const pdfFileName = `calendario-${formatDate(currentDate)}.pdf`;
            const pdfBlob = pdf.output('blob');

            if (save) {
                pdf.save(pdfFileName);
                setMessage('PDF gerado e baixado com sucesso!');
            } else {
                setMessage('PDF gerado com sucesso (pronto para compartilhar)!');
            }
            setLastPdfBlob(pdfBlob);

            return pdfBlob;
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            setMessage('Erro ao gerar PDF. Tente novamente.');
            return null;
        } finally {
            if (tempCalendarElement && tempCalendarElement.parentNode) {
                tempCalendarElement.parentNode.removeChild(tempCalendarElement);
            }
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Function to handle sharing the PDF
    const handleSharePdf = async () => {
        setMessage('Preparando para compartilhar PDF...');

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
            setMessage('Seu navegador/dispositivo não suporta compartilhamento direto de arquivos. O PDF foi baixado. Por favor, anexe-o manualmente via WhatsApp ou outro aplicativo.');
            if (!lastPdfBlob) {
                 const a = document.createElement('a');
                 document.body.appendChild(a);
                 a.style.display = 'none';
                 const url = window.URL.createObjectURL(pdfBlob);
                 a.href = url;
                 a.download = pdfFileName;
                 a.click();
                 window.URL.revokeObjectURL(url);
            }
            setTimeout(() => setMessage(''), 7000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-1 flex flex-col items-center justify-center font-sans">
            <Analytics/> 
            {/* The Tailwind CSS CDN and Inter font should be included in public/index.html */}
            {/* Example of how to include in public/index.html, inside the <head> tag:
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            */}
            
            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Styles to ensure content is not squeezed in the PDF (used in tempDiv) */
                .calendar-grid .min-h-\\[8rem\\] div.w-full.flex-grow {
                    word-wrap: break-word;
                    white-space: pre-wrap;
                }
                .calendar-grid .day-cell .font-bold.text-lg {
                    font-size: 1.125rem;
                }
                @media (max-width: 639px) {
                    .calendar-grid .day-cell .font-bold.text-lg {
                        font-size: 0.9rem;
                    }
                    .calendar-grid .day-cell textarea {
                        font-size: 0.75rem;
                    }
                }
                @media (max-width: 480px) {
                    .calendar-grid .day-cell .font-bold.text-lg {
                        font-size: 0.8rem;
                    }
                    .calendar-grid .day-cell textarea {
                        font-size: 0.65rem;
                    }
                    .calendar-grid .min-h-\\[8rem\\] {
                        min-height: 6rem;
                    }
                    .calendar-grid .p-1 {
                        padding: 0.25rem;
                    }
                    .calendar-grid .text-sm {
                         font-size: 0.7rem;
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
                    <h2 className="text-xl sm:text-3xl font-bold text-gray-800 my-2 mb-2 sm:my-0 text-center">
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
                        onClick={() => generatePdf(true)}
                        className={`
                            w-full sm:w-auto px-5 py-2.5 font-semibold rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 text-base sm:text-lg
                            ${pdfLibsLoaded ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}
                        `}
                        disabled={!pdfLibsLoaded}
                    >
                        Gerar PDF do Mês
                    </button>
                    <button
                        onClick={handleSharePdf}
                        className={`
                            w-full sm:w-auto px-5 py-2.5 font-semibold rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 text-base sm:text-lg
                            ${pdfLibsLoaded ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-300' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}
                        `}
                        disabled={!pdfLibsLoaded}
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
