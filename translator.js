import translations from './languages.js';

class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.init();
    }

    init() {
        // Set the initial language
        this.setLanguage(this.currentLanguage);
        
        // Add event listeners to radio buttons
        document.querySelectorAll('.language-switch input[name="language"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        });
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        
        // Update the checked radio button
        document.getElementById(`lang-${lang}`).checked = true;
        
        // Update all translatable elements
        this.updatePageContent();
    }

    updatePageContent() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.getText(key);
            
            if (element.tagName === 'INPUT') {
                element.placeholder = text;
            } else if (element.tagName === 'H1' && element.closest('.page-content')) {
                // Special handling for h1 elements to preserve animation
                this.updateH1WithAnimation(element, text);
            } else {
                element.textContent = text;
            }
        });
        
        // Update HTML content for elements with data-i18n-html
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const html = this.getText(key);
            element.innerHTML = html;
        });
    }

    updateH1WithAnimation(h1, text) {
        // Clear existing content
        h1.textContent = '';
        
        // Recreate the animated character spans
        text.split('').forEach((char) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.className = 'char';
            
            // Random duration between 2s and 4s for the breathing effect
            const duration = 2 + Math.random() * 2;
            span.style.animationDuration = `${duration}s`;
            
            // Random negative delay to ensure they start at different points in the cycle
            const delay = -Math.random() * duration;
            span.style.animationDelay = `${delay}s`;
            
            h1.appendChild(span);
        });
    }

    getText(key) {
        const keys = key.split('.');
        let value = translations[this.currentLanguage];
        
        for (let k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }
        
        return value || key;
    }
}

// Initialize on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LanguageManager();
    });
} else {
    new LanguageManager();
}

export default LanguageManager;
