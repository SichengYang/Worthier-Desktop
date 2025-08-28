
import React, { useRef, useState, useEffect } from 'react';
import './FeedbackWindow.css';

function FeedbackWindow() {
    const editorRef = useRef(null);
    const [email, setEmail] = useState('');
    const [color, setColor] = useState('#222');

    useEffect(() => {
        // Restore saved content when component mounts
        const savedContent = localStorage.getItem('feedbackContent');
        if (savedContent && editorRef.current) {
            editorRef.current.innerHTML = savedContent;
        }
        
        return () => {
            // Save content when component unmounts
            if (editorRef.current) {
                localStorage.setItem('feedbackContent', editorRef.current.innerHTML);
            }
        };
    }, []);

    // Auto-save content periodically while typing
    useEffect(() => {
        const autoSaveInterval = setInterval(() => {
            if (editorRef.current) {
                const content = editorRef.current.innerHTML;
                localStorage.setItem('feedbackContent', content);
            }
        }, 2000); // Auto-save every 2 seconds

        return () => clearInterval(autoSaveInterval);
    }, []);

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };

    const handleToolbar = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current.focus();
    };

    const handleColorChange = (e) => {
        setColor(e.target.value);
        // Only apply color to selected text
        handleToolbar('foreColor', e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const feedback = editorRef.current.innerHTML;
        const contactEmail = email.trim();
        
        // Basic validation
        if (!feedback || feedback.trim() === '' || feedback === '<div><br></div>' || feedback === '<br>') {
            alert('Please enter your feedback before submitting.');
            return;
        }

        try {
            // Show loading state
            const submitButton = e.target.querySelector('.submit-btn');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            // Submit feedback via IPC
            const result = await window.electronAPI.submitFeedback({
                feedback: feedback,
                email: contactEmail || null
            });

            if (result.success) {
                alert('Thank you! Your feedback has been submitted successfully.');
                
                // Clear saved content after successful submission
                localStorage.removeItem('feedbackContent');
                if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                }
                setEmail('');
            } else {
                alert(`Failed to submit feedback: ${result.message}`);
            }

            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;

        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('An unexpected error occurred. Please try again later.');
            
            // Reset button state
            const submitButton = e.target.querySelector('.submit-btn');
            submitButton.textContent = 'Submit';
            submitButton.disabled = false;
        }
    };

    const handleClearContent = () => {
        if (confirm('Are you sure you want to clear all feedback content?')) {
            localStorage.removeItem('feedbackContent');
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
            setEmail('');
        }
    };

    return (
        <div className="feedback-window">
            <h2>Feedback</h2>
            <form className="feedback-form" onSubmit={handleSubmit}>
                <div className="feedback-details">
                    <div className="rich-toolbar">
                        <button type="button" className="toolbar-btn" title="Bold" onClick={() => handleToolbar('bold')}><b>B</b></button>
                        <button type="button" className="toolbar-btn" title="Italic" onClick={() => handleToolbar('italic')}><i>I</i></button>
                        <label className="toolbar-color-label" title="Text Color">
                            <span style={{marginRight: '6px'}}>A</span>
                            <input type="color" value={color} onChange={handleColorChange} className="toolbar-color" />
                        </label>
                    </div>
                    <div
                        className="rich-editor"
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning={true}
                        placeholder="Type your feedback here..."
                        style={{ minHeight: '120px', border: '1px solid #ccc', borderRadius: '6px', padding: '12px', background: '#fff', marginBottom: '12px' }}
                    ></div>
                    
                    <div className="email-section">
                        <label htmlFor="contact-email">Contact Email (optional):</label>
                        <input
                            id="contact-email"
                            type="email"
                            value={email}
                            onChange={handleEmailChange}
                            placeholder="your.email@example.com"
                            className="email-input"
                            style={{ 
                                width: 'calc(100% - 24px)', 
                                maxWidth: '400px',
                                padding: '8px 12px', 
                                border: '1px solid #ccc', 
                                borderRadius: '6px', 
                                marginBottom: '8px',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div className="privacy-note">
                            <small style={{ color: '#666', fontStyle: 'italic' }}>
                                📝 Your feedback is anonymous without providing an email address.
                            </small>
                        </div>
                    </div>
                </div>
                <div className="feedback-actions">
                    <button className="submit-btn" type="submit">Submit</button>
                    <button className="clear-btn" type="button" onClick={handleClearContent}>Clear All</button>
                </div>
            </form>
        </div>
    );
}

export default FeedbackWindow;
