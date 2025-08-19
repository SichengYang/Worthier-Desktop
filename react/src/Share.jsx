import React, { useState, useEffect, useRef } from 'react';
import './Share.css';

function Share({ workingData }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allUsageDays, setAllUsageDays] = useState(new Set()); // Store ALL usage days
    const [totalUsageDays, setTotalUsageDays] = useState(0);
    const [totalUsageHours, setTotalUsageHours] = useState(0);
    const [shareMessage, setShareMessage] = useState('');
    const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
    const [showAllMonths, setShowAllMonths] = useState(true); // Toggle for all months vs current month
    const [timerSettings, setTimerSettings] = useState({
        focusTime: 60,
        focusUnit: 'minutes',
        restTime: 10,
        restUnit: 'minutes'
    });
    const textareaRef = useRef(null);
    const calendarRef = useRef(null);

    // Process ALL working data once when workingData changes
    useEffect(() => {
        if (!workingData || typeof workingData !== 'object') {
            console.log('No entireWorkingData available yet');
            setAllUsageDays(new Set());
            return;
        }

        console.log('Processing ALL entireWorkingData', workingData);
        
        // Process ALL records and store usage days
        const allDates = new Set();
        
        Object.keys(workingData).forEach(dateKey => {
            const record = workingData[dateKey];
            if (record && record.workingMinutes > 0) {
                const [year, month, day] = dateKey.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                const dateString = date.toDateString();
                allDates.add(dateString);
            }
        });
        
        setAllUsageDays(allDates);
        console.log(`Processed ${allDates.size} total active days across all months`);
    }, [workingData]);

    // Calculate current month stats whenever currentDate or allUsageDays change
    useEffect(() => {
        if (showAllMonths) {
            // Show stats for all months
            setTotalUsageDays(allUsageDays.size);
            
            // Calculate total hours for all months
            let totalMinutes = 0;
            Object.keys(workingData || {}).forEach(dateKey => {
                const record = workingData[dateKey];
                if (record && record.workingMinutes > 0) {
                    totalMinutes += record.workingMinutes;
                }
            });
            setTotalUsageHours(Math.round(totalMinutes / 60 * 10) / 10); // Round to 1 decimal place
            
            console.log(`All months: ${allUsageDays.size} total active days, ${totalMinutes} minutes (${Math.round(totalMinutes / 60 * 10) / 10} hours)`);
        } else {
            // Show stats for current month only
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            
            let monthActiveDays = 0;
            let monthTotalMinutes = 0;
            
            // Count active days and minutes for current month
            Object.keys(workingData || {}).forEach(dateKey => {
                if (dateKey.startsWith(monthPrefix)) {
                    const record = workingData[dateKey];
                    if (record && record.workingMinutes > 0) {
                        monthActiveDays++;
                        monthTotalMinutes += record.workingMinutes;
                    }
                }
            });
            
            setTotalUsageDays(monthActiveDays);
            setTotalUsageHours(Math.round(monthTotalMinutes / 60 * 10) / 10); // Round to 1 decimal place
            console.log(`Current month (${monthPrefix}): ${monthActiveDays} active days, ${monthTotalMinutes} minutes (${Math.round(monthTotalMinutes / 60 * 10) / 10} hours)`);
        }
    }, [currentDate, allUsageDays, workingData, showAllMonths]);

    // Fetch timer settings on component mount
    useEffect(() => {
        const fetchTimerSettings = async () => {
            try {
                if (window.electronAPI && window.electronAPI.getTimerSettings) {
                    const settings = await window.electronAPI.getTimerSettings();
                    console.log('Fetched timer settings:', settings);
                    setTimerSettings(settings);
                }
            } catch (error) {
                console.error('Error fetching timer settings:', error);
            }
        };
        fetchTimerSettings();
    }, []);

    // Initialize share message when totalUsageDays or timerSettings change
    useEffect(() => {
        const generateDefaultMessage = () => {
            // If user is just starting (less than 3 days or less than 1 hour), show starter message
            if (totalUsageDays < 3 || totalUsageHours < 1) {
                return "🌱 Just started my productivity journey with @Worthier! Ready to build better focus habits and unlock my potential. #ProductivityJourney #FocusMode #Worthier #NewBeginnings";
            }

            // Create more engaging and varied messages based on usage
            const getMotivationalPrefix = () => {
                if (totalUsageDays >= 25) return "🔥 Crushing my productivity goals! ";
                if (totalUsageDays >= 20) return "💪 On fire this month! ";
                if (totalUsageDays >= 15) return "🚀 Building momentum! ";
                if (totalUsageDays >= 10) return "⭐ Making it happen! ";
                if (totalUsageDays >= 5) return "📈 Growing stronger! ";
                return "🌱 Building my habits! ";
            };

            const getAchievementText = () => {
                const timeframe = showAllMonths ? "overall" : "this month";
                const hoursText = totalUsageHours >= 1 ? ` with ${totalUsageHours} focused hours` : "";
                
                if (totalUsageDays >= 25) return `${totalUsageDays} productive days${hoursText} and counting ${timeframe}`;
                if (totalUsageDays >= 15) return `${totalUsageDays} amazing days of focus${hoursText} ${timeframe}`;
                if (totalUsageDays >= 10) return `${totalUsageDays} solid days of productivity${hoursText} ${timeframe}`;
                if (totalUsageDays >= 5) return `${totalUsageDays} great days${hoursText} ${timeframe}`;
                return `${totalUsageDays} productive days${hoursText} ${timeframe}`;
            };

            const getMethodologyText = () => {
                if (timerSettings.focusTime && timerSettings.restTime) {
                    const focusEmoji = timerSettings.focusTime >= 60 ? "🧠" : "⚡";
                    const restEmoji = timerSettings.restTime >= 15 ? "🧘‍♂️" : "☕";
                    return ` My secret? ${focusEmoji} ${timerSettings.focusTime} ${timerSettings.focusUnit} of deep focus + ${restEmoji} ${timerSettings.restTime} ${timerSettings.restUnit} of rest.`;
                }
                return " Using the power of focused work sessions!";
            };

            const getCallToAction = () => {
                const ctas = [
                    "Who else is crushing their goals? 🙌",
                    "What's your productivity superpower? 💫",
                    "Join me on this productivity journey! 🎯",
                    "Let's build better habits together! 🤝",
                    "Ready to unlock your potential? ✨"
                ];
                return ctas[Math.floor(Math.random() * ctas.length)];
            };

            const hashtags = "#ProductivityHack #FocusMode #Worthier #GrowthMindset #DeepWork #TimeManagement";

            let message = getMotivationalPrefix();
            message += getAchievementText();
            message += " with @Worthier! 🎉";
            message += getMethodologyText();
            message += "\n\n" + getCallToAction();
            message += "\n\n" + hashtags;

            return message;
        };

        setShareMessage(generateDefaultMessage());
    }, [totalUsageDays, totalUsageHours, timerSettings, showAllMonths]);

    // Auto-resize textarea function
    const autoResizeTextarea = (textarea) => {
        if (textarea) {
            // Reset height to get accurate scrollHeight
            textarea.style.height = 'auto';
            // Set height based on scrollHeight with some padding
            const newHeight = Math.max(80, Math.min(textarea.scrollHeight, 300)); // Min 80px, max 300px
            textarea.style.height = newHeight + 'px';
        }
    };

    // Handle textarea change with auto-resize
    const handleTextareaChange = (e) => {
        setShareMessage(e.target.value);
        autoResizeTextarea(e.target);
    };

    // Auto-resize on message change (for initial load)
    useEffect(() => {
        if (textareaRef.current) {
            autoResizeTextarea(textareaRef.current);
        }
    }, [shareMessage]);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const formatWorkingTime = (minutes) => {
        if (minutes === 0) return '0 min';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours === 0) return `${mins}min`;
        if (mins === 0) return `${hours}hr`;
        return `${hours}hr ${mins}min`;
    };

    const handleDayHover = (day, event) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateKey = date.toISOString().split('T')[0];
        const dayData = workingData[dateKey];
        
        const workingMinutes = dayData ? dayData.workingMinutes : 0;
        const extendedSessions = dayData ? dayData.extendedSessions || 0 : 0;
        
        let content = formatWorkingTime(workingMinutes);
        if (extendedSessions > 0) {
            content += ` (${extendedSessions} extended sessions)`;
        }
        
        const rect = event.target.getBoundingClientRect();
        setTooltip({
            show: true,
            content: content,
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
    };

    const handleDayLeave = () => {
        setTooltip({ show: false, content: '', x: 0, y: 0 });
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() && 
               currentDate.getMonth() === today.getMonth() && 
               currentDate.getFullYear() === today.getFullYear();
    };

    const hasUsageData = (day) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const checkDateString = checkDate.toDateString();
        return allUsageDays.has(checkDateString);
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const shareToSocialMedia = (platform) => {
        // Generate engaging fallback message with timer settings
        const getEngagingFallback = () => {
            // If user is just starting, show starter message
            if (totalUsageDays < 3 || totalUsageHours < 1) {
                return "🌱 Just started my productivity journey with @Worthier! Ready to build better focus habits. #ProductivityJourney #Worthier";
            }

            const timeframe = showAllMonths ? "overall" : "this month";
            const motivationalPrefix = totalUsageDays >= 20 ? "🔥 Absolutely crushing it! " : totalUsageDays >= 10 ? "💪 Building momentum! " : "🌱 Growing stronger! ";
            const hoursText = totalUsageHours >= 1 ? ` and ${totalUsageHours} focused hours` : "";
            let fallbackMessage = motivationalPrefix + `${totalUsageDays} productive days${hoursText} ${timeframe} with @Worthier! 🎉`;
            
            if (timerSettings.focusTime && timerSettings.restTime) {
                const focusEmoji = timerSettings.focusTime >= 60 ? "🧠" : "⚡";
                const restEmoji = timerSettings.restTime >= 15 ? "🧘‍♂️" : "☕";
                fallbackMessage += ` My recipe: ${focusEmoji} ${timerSettings.focusTime} ${timerSettings.focusUnit} focus + ${restEmoji} ${timerSettings.restTime} ${timerSettings.restUnit} rest!`;
            }
            
            fallbackMessage += " #ProductivityHack #FocusMode #Worthier";
            return fallbackMessage;
        };
        
        const message = shareMessage || getEngagingFallback();
        
        let shareUrl = '';
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(message)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(message)}`;
                break;
            case 'instagram':
                // Instagram doesn't support direct URL sharing, so we'll copy to clipboard
                navigator.clipboard.writeText(message).then(() => {
                    alert('Message copied to clipboard! Paste it in your Instagram post.');
                });
                return;
            case 'tiktok':
                // TikTok doesn't support direct URL sharing, so we'll copy to clipboard
                navigator.clipboard.writeText(message).then(() => {
                    alert('Message copied to clipboard! Share it on TikTok!');
                });
                return;
            default:
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };

    const saveCalendarAsImage = async () => {
        if (!calendarRef.current) return;

        try {
            // Generate filename with current month/year
            const monthYear = `${monthNames[currentDate.getMonth()]}-${currentDate.getFullYear()}`;
            const defaultFileName = `Worthier-Calendar-${monthYear}.png`;

            // Show system save dialog
            const saveResult = await window.electronAPI.showSaveDialog({
                defaultPath: defaultFileName
            });

            // If user canceled the dialog, return early
            if (saveResult.canceled || !saveResult.filePath) {
                return;
            }

            // Use html2canvas to convert the calendar to canvas
            const html2canvas = (await import('html2canvas')).default;
            
            const canvas = await html2canvas(calendarRef.current, {
                backgroundColor: null, // Transparent background
                scale: 2, // Higher resolution
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // Convert canvas to blob
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        // Convert blob to array buffer
                        const arrayBuffer = await blob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Save file using Electron IPC
                        const writeResult = await window.electronAPI.writeFile(saveResult.filePath, uint8Array);
                        
                        if (writeResult.success) {
                            alert('Calendar saved successfully! 📅');
                        } else {
                            throw new Error(writeResult.error || 'Failed to write file');
                        }
                    } catch (writeError) {
                        console.error('Error writing file:', writeError);
                        alert('Failed to save calendar file. Please try again.');
                    }
                } else {
                    throw new Error('Failed to create image blob');
                }
            }, 'image/png');
            
        } catch (error) {
            console.error('Error saving calendar:', error);
            alert('Failed to save calendar. Please try again.');
        }
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Day headers
        dayNames.forEach(day => {
            days.push(
                <div key={day} className="calendar-day-header">
                    {day}
                </div>
            );
        });

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-${i}`} className="calendar-day empty"></div>
            );
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isCurrentDay = isToday(day);
            const hasUsage = hasUsageData(day);
            
            days.push(
                <div 
                    key={day} 
                    className={`calendar-day ${isCurrentDay ? 'today' : ''} ${hasUsage ? 'has-usage' : ''}`}
                    onMouseEnter={(e) => handleDayHover(day, e)}
                    onMouseLeave={handleDayLeave}
                >
                    <span className="day-number">{day}</span>
                    {hasUsage && <div className="usage-indicator"></div>}
                </div>
            );
        }

        return days;
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="share-container">
            <div className="share-header">
                <p className="usage-stats">
                    {totalUsageDays < 3 || totalUsageHours < 1 ? (
                        "Welcome to your productivity journey! 🌱"
                    ) : (
                        <>
                            You've been productive for <strong>{totalUsageDays}</strong> days 
                            {totalUsageHours >= 1 && (
                                <> and <strong>{totalUsageHours}</strong> hours</>
                            )} {showAllMonths ? 'overall' : 'this month'}! 🎉
                        </>
                    )}
                </p>
            </div>
            <div className="share-content">
                {/* Left Side - Share Function */}
                <div className="share-section">
                    <div className="share-section-header">
                        <h3>Share Your Progress</h3>
                        <div className="toggle-container">
                            <span className="toggle-label">Current Month</span>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={showAllMonths} 
                                    onChange={(e) => setShowAllMonths(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                            <span className="toggle-label">All Months</span>
                        </div>
                    </div>
                    <div className="message-editor">
                        <textarea
                            ref={textareaRef}
                            value={shareMessage}
                            onChange={handleTextareaChange}
                            placeholder="Write your custom message to share..."
                            className="share-textarea"
                            rows={1}
                        />
                        <div className="character-count">
                            {shareMessage.length} characters
                        </div>
                    </div>
                    
                    {/* Social Media Buttons */}
                    <div className="social-buttons">
                        <button 
                            className="social-button facebook"
                            onClick={() => shareToSocialMedia('facebook')}
                        >
                            <span className="social-icon">📘</span>
                            Facebook
                        </button>
                        
                        <button 
                            className="social-button twitter"
                            onClick={() => shareToSocialMedia('twitter')}
                        >
                            <span className="social-icon">🐦</span>
                            Twitter
                        </button>
                        
                        <button 
                            className="social-button linkedin"
                            onClick={() => shareToSocialMedia('linkedin')}
                        >
                            <span className="social-icon">💼</span>
                            LinkedIn
                        </button>
                        
                        <button 
                            className="social-button instagram"
                            onClick={() => shareToSocialMedia('instagram')}
                        >
                            <span className="social-icon">📷</span>
                            Instagram
                        </button>
                        
                        <button 
                            className="social-button tiktok"
                            onClick={() => shareToSocialMedia('tiktok')}
                        >
                            <span className="social-icon">🎵</span>
                            TikTok
                        </button>
                        
                        <button 
                            className="social-button save-calendar"
                            onClick={saveCalendarAsImage}
                        >
                            <span className="social-icon">📸</span>
                            Save Calendar
                        </button>
                    </div>
                </div>

                {/* Right Side - Calendar */}
                <div className="calendar-section" ref={calendarRef}>
                    <div className="calendar-header">
                        <button 
                            className="nav-button" 
                            onClick={() => navigateMonth(-1)}
                        >
                            ‹
                        </button>
                        <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                        <button 
                            className="nav-button" 
                            onClick={() => navigateMonth(1)}
                        >
                            ›
                        </button>
                    </div>

                    <div className="calendar-grid">
                        {renderCalendar()}
                    </div>

                    <div className="calendar-legend">
                        <div className="legend-item">
                            <div className="legend-dot today-dot"></div>
                            <span>Today</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-dot usage-dot"></div>
                            <span>Active Day</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Tooltip */}
            {tooltip.show && (
                <div 
                    className="calendar-tooltip"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
}

export default Share;
