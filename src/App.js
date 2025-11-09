import React, { useState, useEffect, useRef, useCallback } from 'react';
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
        // Define width and height to match A4 landscape in pixels (approx. 300 DPI for better quality and larger text)
        // A4 landscape: 297mm x 210mm. 1mm = ~5.67px at 300 DPI
        const targetWidthPx = 297 * 5.67; // Approx. 1684 pixels
        const targetHeightPx = 210 * 5.67; // Approx. 1191 pixels

        

        tempDiv.style.width = `${targetWidthPx}px`;
        tempDiv.style.minHeight = `${targetHeightPx}px`;
        tempDiv.style.height = `${targetHeightPx}px`; // Fixed height to fill page
        tempDiv.style.boxSizing = 'border-box'; // Ensures padding and border are included in width/height
        
        // Copy main styles from the visible container for consistency
        tempDiv.className = "w-full max-w-4xl bg-white shadow-lg rounded-xl p-6 mb-8";
        tempDiv.style.maxWidth = 'unset'; // Remove max-width restriction for PDF
        tempDiv.style.background = '#FFFFFF';
        tempDiv.style.padding = '4px 8px 8px 8px'; // Minimal top padding, more on sides/bottom
        tempDiv.style.paddingTop = '4px'; // Very minimal top padding
        tempDiv.style.borderRadius = '8px';
        tempDiv.style.boxShadow = 'none'; // Remove shadow for cleaner PDF
        tempDiv.style.display = 'flex';
        tempDiv.style.flexDirection = 'column';

        // Create header container for month name and weekdays
        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.flexDirection = 'column';
        headerContainer.style.flexShrink = '0';
        headerContainer.style.width = '100%';
        headerContainer.style.marginBottom = '0.5rem';
        
        // Month name container
        const monthNameDiv = document.createElement('div');
        monthNameDiv.style.display = 'flex';
        monthNameDiv.style.justifyContent = 'center';
        monthNameDiv.style.alignItems = 'center';
        monthNameDiv.style.width = '100%';
        monthNameDiv.style.padding = '0.5rem 0.25rem';
        monthNameDiv.style.margin = '0';
        monthNameDiv.style.marginBottom = '0.75rem'; // Increased spacing below month name
        
        const monthNameH2 = document.createElement('h2');
        monthNameH2.style.fontSize = '2.8rem';
        monthNameH2.style.fontWeight = 'bold';
        monthNameH2.style.textAlign = 'center';
        monthNameH2.style.width = '100%';
        monthNameH2.style.margin = '0';
        monthNameH2.style.padding = '0';
        monthNameH2.style.lineHeight = '1.2';
        monthNameH2.style.color = '#1f2937';
        monthNameH2.textContent = `${monthNames[month]} ${year}`;
        
        monthNameDiv.appendChild(monthNameH2);
        headerContainer.appendChild(monthNameDiv);
        
        // Weekdays container
        const weekdaysDiv = document.createElement('div');
        weekdaysDiv.style.display = 'grid';
        weekdaysDiv.style.gridTemplateColumns = 'repeat(7, 1fr)';
        weekdaysDiv.style.textAlign = 'center';
        weekdaysDiv.style.fontSize = '1.9rem';
        weekdaysDiv.style.fontWeight = '600';
        weekdaysDiv.style.color = '#4b5563';
        weekdaysDiv.style.margin = '0';
        weekdaysDiv.style.marginBottom = '0.25rem';
        weekdaysDiv.style.flexShrink = '0';
        weekdaysDiv.style.gap = '2px';
        weekdaysDiv.style.width = '100%';
        
        weekdayNames.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.style.padding = '0.4rem 0.2rem';
            dayDiv.style.backgroundColor = '#e5e7eb';
            dayDiv.style.borderRadius = '0.375rem';
            dayDiv.textContent = day;
            weekdaysDiv.appendChild(dayDiv);
        });
        
        headerContainer.appendChild(weekdaysDiv);
        tempDiv.appendChild(headerContainer);

        const gridContainer = document.createElement('div');
        gridContainer.className = "grid grid-cols-7";
        gridContainer.style.flex = '1'; // Take remaining space
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(7, 1fr)'; // 7 equal columns
        gridContainer.style.gridTemplateRows = 'repeat(6, 1fr)'; // 6 rows with equal height
        gridContainer.style.height = '100%'; // Fill available height
        gridContainer.style.gap = '2px'; // Minimal gap between cells
        gridContainer.style.width = '100%'; // Full width
        gridContainer.style.overflow = 'hidden'; // Prevent overflow

        calendarDays.forEach(dayInfo => {
            const dayDiv = document.createElement('div');
            dayDiv.className = `
                min-h-[8rem] p-2 rounded-lg border border-gray-200 flex flex-col
                ${dayInfo.isCurrentMonth ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400'}
                ${dayInfo.dateString === formatDate(new Date()) ? 'border-2 border-blue-500' : ''}
            `;
            dayDiv.style.boxSizing = 'border-box';
            dayDiv.style.width = '100%'; // Full width of grid cell
            dayDiv.style.height = '100%'; // Fill grid cell height
            dayDiv.style.minHeight = '0'; // Allow flex to work
            dayDiv.style.minWidth = '0'; // Allow grid to shrink if needed
            dayDiv.style.padding = '0.6rem'; // Optimized padding for more space
            dayDiv.style.position = 'relative'; // Make it a positioning context for absolute children
            dayDiv.style.display = 'flex';
            dayDiv.style.flexDirection = 'column';
            dayDiv.style.overflow = 'hidden'; // Prevent content overflow

            const dateSpan = document.createElement('span');
            dateSpan.className = "font-bold text-lg mb-1";
            dateSpan.textContent = dayInfo.date.getDate();
            dateSpan.style.fontSize = '3.2rem'; // Larger date font size in PDF
            dateSpan.style.position = 'absolute'; // Position date absolutely
            dateSpan.style.top = '0.4rem'; // Distance from top
            dateSpan.style.left = '0.4rem'; // Distance from left
            dateSpan.style.zIndex = '1'; // Ensure date is above the note
            dateSpan.style.fontWeight = 'bold';
            dayDiv.appendChild(dateSpan);

            const noteDiv = document.createElement('div');
            noteDiv.className = `
                w-full flex-grow overflow-hidden text-sm
                ${dayInfo.isCurrentMonth ? 'bg-gray-50' : 'bg-gray-100'}
            `;
            noteDiv.style.boxSizing = 'border-box';
            noteDiv.style.padding = '0.8rem'; // Increased padding for note content
            noteDiv.style.fontSize = '1.8rem'; // Larger font size for notes
            noteDiv.style.wordWrap = 'break-word';
            noteDiv.style.whiteSpace = 'pre-wrap';
            noteDiv.style.marginTop = '3.2rem'; // Push note down to make space for the date
            noteDiv.style.lineHeight = '1.6'; // Better line spacing
            noteDiv.style.minHeight = '0'; // Allow flex to work
            noteDiv.style.flex = '1'; // Take remaining space in cell
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
                scale: 2, // Reduced scale for smaller file size while maintaining good quality
                useCORS: true,
                logging: false,
                width: tempCalendarElement.offsetWidth,
                height: tempCalendarElement.offsetHeight,
                // Ensure full element is captured
            });

            // Use JPEG with quality 0.85 for smaller file size (PNG is uncompressed and much larger)
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            // Change to landscape ('l') and use A4 landscape dimensions (297x210 mm)
            const pdf = new window.jspdf.jsPDF('l', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth(); // Will be 297mm
            const pdfHeight = pdf.internal.pageSize.getHeight(); // Will be 210mm

            // Calculate image dimensions to fit the PDF page, maintaining aspect ratio
            const imgCanvasWidth = canvas.width;
            const imgCanvasHeight = canvas.height;

            const ratio = imgCanvasWidth / imgCanvasHeight;

            let imgPdfWidth = pdfWidth * 0.99; // Occupy 99% of PDF width (minimal margins, maximum space)
            let imgPdfHeight = imgPdfWidth / ratio;

            // If the image is still too tall for the page, adjust by height
            if (imgPdfHeight > pdfHeight * 0.99) { // Occupy 99% of height (minimal margins, maximum space)
                imgPdfHeight = pdfHeight * 0.99;
                imgPdfWidth = imgPdfHeight * ratio;
            }

            // Center the image on the page
            const xOffset = (pdfWidth - imgPdfWidth) / 2;
            const yOffset = (pdfHeight - imgPdfHeight) / 2;

            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgPdfWidth, imgPdfHeight);

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
