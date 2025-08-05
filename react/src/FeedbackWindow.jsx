
import React, { useRef, useState, useEffect } from 'react';
import './FeedbackWindow.css';

function FeedbackWindow() {
    const editorRef = useRef(null);
    const [files, setFiles] = useState([]);
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

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
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

    const handleSubmit = (e) => {
        e.preventDefault();
        const feedback = editorRef.current.innerHTML;
        // Handle feedback and files submission logic here
        alert('Feedback submitted!');
        
        // Clear saved content after submission
        localStorage.removeItem('feedbackContent');
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
        setFiles([]);
    };

    const handleClearContent = () => {
        if (confirm('Are you sure you want to clear all feedback content?')) {
            localStorage.removeItem('feedbackContent');
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
            setFiles([]);
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
                        style={{ minHeight: '120px', border: '1px solid #ccc', borderRadius: '6px', padding: '12px', background: '#fff', marginBottom: '18px' }}
                    ></div>
                    <div className="file-upload-section">
                        <label htmlFor="feedback-files">Attach files:</label>
                        <input
                            id="feedback-files"
                            type="file"
                            multiple
                            onChange={handleFileChange}
                        />
                        {files.length > 0 && (
                            <ul className="file-list">
                                {files.map((file, idx) => (
                                    <li key={idx}>{file.name}</li>
                                ))}
                            </ul>
                        )}
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
