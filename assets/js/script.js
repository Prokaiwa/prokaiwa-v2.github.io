/**
 * Prokaiwa - Optimized JavaScript
 * Single unified script for all pages
 * Improvements: localStorage error handling, keyboard accessibility, smoother animations
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ELEMENT SELECTORS
    // ==========================================
    const burgerMenu = document.querySelector('.burger-menu');
    const mainNav = document.querySelector('.main-nav');
    const langToggle = document.querySelector('.nav-lang-toggle');
    const yearSpan = document.getElementById('year');
    const faqQuestions = document.querySelectorAll('.faq-question');

    // ==========================================
    // LANGUAGE TOGGLE FUNCTIONALITY
    // ==========================================
    if (langToggle) {
        /**
         * Sets the active language and shows/hides appropriate content
         * IMPROVED: Added localStorage error handling + smooth transitions
         */
        function setLanguage(lang) {
            // Try to save language preference (with error handling)
            try {
                localStorage.setItem('prokaiwaLang', lang);
            } catch (e) {
                console.warn('Unable to save language preference:', e);
                // Continue even if localStorage fails
            }

            const isJapanese = lang === 'ja';
            document.documentElement.lang = lang;

            // Add loading class for smooth transition
            document.body.classList.add('lang-switching');

            // Hide/show language-specific elements
            const allLangElements = document.body.querySelectorAll('[lang="ja"], [lang="en"]');
            allLangElements.forEach(el => {
                // Skip language toggle buttons themselves
                if (el.closest('.nav-lang-toggle')) return;

                if (el.getAttribute('lang') === lang) {
                    el.style.display = '';
                    if (el.classList.contains('lang-section')) {
                        el.classList.add('show');
                    }
                } else {
                    el.style.display = 'none';
                    if (el.classList.contains('lang-section')) {
                        el.classList.remove('show');
                    }
                }
            });

            // Update active state on toggle buttons
            const jaBtn = langToggle.querySelector('[data-lang="ja"]');
            const enBtn = langToggle.querySelector('[data-lang="en"]');
            
            if (jaBtn && enBtn) {
                jaBtn.classList.toggle('active', isJapanese);
                enBtn.classList.toggle('active', !isJapanese);
                
                // IMPROVED: Update ARIA attributes for accessibility
                jaBtn.setAttribute('aria-pressed', isJapanese);
                enBtn.setAttribute('aria-pressed', !isJapanese);
            }

            // Remove loading class after transition
            setTimeout(() => {
                document.body.classList.remove('lang-switching');
            }, 300);
        }

        // Language toggle click handler
        langToggle.addEventListener('click', event => {
            const button = event.target.closest('button[data-lang]');
            if (button) {
                setLanguage(button.dataset.lang);
            }
        });

        // IMPROVED: Keyboard support for language toggle
        langToggle.addEventListener('keydown', event => {
            const button = event.target.closest('button[data-lang]');
            if (button && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                setLanguage(button.dataset.lang);
            }
        });

        // Initial language setup
        let savedLang = null;
        try {
            savedLang = localStorage.getItem('prokaiwaLang');
        } catch (e) {
            console.warn('Unable to read language preference:', e);
        }

        if (savedLang) {
            setLanguage(savedLang);
        } else {
            // Detect browser language preference
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            setLanguage(userLang === 'ja' ? 'ja' : 'en');
        }
    }

    // ==========================================
    // BURGER MENU FUNCTIONALITY
    // ==========================================
    if (burgerMenu && mainNav) {
        function toggleMenu() {
            const isOpen = mainNav.classList.toggle('open');
            const icon = burgerMenu.querySelector('i');
            
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }

            // IMPROVED: Update ARIA attributes
            burgerMenu.setAttribute('aria-expanded', isOpen);
            
            // IMPROVED: Trap focus in menu when open
            if (isOpen) {
                const firstLink = mainNav.querySelector('a, button');
                if (firstLink) {
                    firstLink.focus();
                }
            }
        }

        // Click handler
        burgerMenu.addEventListener('click', toggleMenu);

        // IMPROVED: Keyboard support (Enter/Space)
        burgerMenu.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMenu();
            }
        });

        // IMPROVED: Close menu with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('open')) {
                toggleMenu();
                burgerMenu.focus();
            }
        });

        // IMPROVED: Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (mainNav.classList.contains('open') && 
                !mainNav.contains(event.target) && 
                !burgerMenu.contains(event.target)) {
                toggleMenu();
            }
        });
    }

    // ==========================================
    // FOOTER YEAR AUTO-UPDATE
    // ==========================================
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // ==========================================
    // FAQ ACCORDION (IMPROVED)
    // ==========================================
    if (faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            // IMPROVED: Add ARIA attributes
            const answer = question.nextElementSibling;
            const answerId = `faq-answer-${Math.random().toString(36).substr(2, 9)}`;
            
            if (answer) {
                answer.id = answerId;
                question.setAttribute('aria-controls', answerId);
                question.setAttribute('aria-expanded', 'false');
            }

            // Click handler
            question.addEventListener('click', () => {
                toggleFAQ(question);
            });

            // IMPROVED: Keyboard support
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleFAQ(question);
                }
            });
        });

        function toggleFAQ(question) {
            const answer = question.nextElementSibling;
            if (!answer) return;

            const wasOpen = answer.classList.contains('open');

            // Close all other answers
            document.querySelectorAll('.faq-answer').forEach(ans => {
                ans.style.maxHeight = null;
                ans.classList.remove('open');
                const btn = ans.previousElementSibling;
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });

            // Toggle the clicked answer
            if (!wasOpen) {
                answer.classList.add('open');
                answer.style.maxHeight = (answer.scrollHeight + 40) + 'px';
                question.setAttribute('aria-expanded', 'true');
            }
        }
    }

    // ==========================================
    // FORM VALIDATION (if forms exist)
    // ==========================================
    const forms = document.querySelectorAll('form[id]');
    forms.forEach(form => {
        // IMPROVED: Real-time validation feedback
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateInput(input);
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) {
                    validateInput(input);
                }
            });
        });

        function validateInput(input) {
            if (input.validity.valid) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            } else {
                input.classList.remove('valid');
                input.classList.add('invalid');
            }
        }
    });

    // ==========================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return; // Skip empty anchors
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // IMPROVED: Update URL without jumping
                history.pushState(null, null, href);
            }
        });
    });

    // ==========================================
    // LOADING STATE MANAGEMENT
    // ==========================================
    // Add loaded class after all resources are ready
    window.addEventListener('load', () => {
        document.body.classList.add('page-loaded');
    });
});

// ==========================================
// UTILITY FUNCTIONS (available globally)
// ==========================================

/**
 * Show message box (for forms, alerts, etc.)
 */
window.showMessage = function(message, type = 'info') {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
    
    // Auto-scroll to message
    messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

/**
 * Hide message box
 */
window.hideMessage = function() {
    const messageBox = document.getElementById('message-box');
    if (messageBox) {
        messageBox.style.display = 'none';
    }
};

/**
 * Debounce function (useful for search, resize, etc.)
 */
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
