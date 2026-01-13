/**
 * Prokaiwa Website - Main JavaScript
 * Minimally Enhanced Version
 * 
 * Based on original working script with these additions:
 * - Better code comments and documentation
 * - ARIA attributes for accessibility
 * - Click outside to close menu
 * - Escape key to close menu
 */

'use strict';

// Wait for the page to fully load before running any code
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // ELEMENT SELECTORS
    // ==========================================================================
    
    const burgerMenu = document.querySelector('.burger-menu');
    const mainNav = document.querySelector('.main-nav');
    const langToggle = document.querySelector('.nav-lang-toggle');
    const yearSpan = document.getElementById('year');

    
    // ==========================================================================
    // LANGUAGE TOGGLE FUNCTIONALITY
    // ==========================================================================
    
    if (langToggle) {
        /**
         * Sets the active language and shows/hides content accordingly
         * @param {string} lang - The language code ('ja' or 'en')
         */
        function setLanguage(lang) {
            // Save user's language preference
            localStorage.setItem('prokaiwaLang', lang);

            const isJapanese = lang === 'ja';
            
            // Update HTML lang attribute for accessibility and SEO
            document.documentElement.lang = lang;

            // Get all elements with language attributes
            const allLangElements = document.body.querySelectorAll('[lang="ja"], [lang="en"]');
            
            allLangElements.forEach(el => {
                // Skip the language toggle buttons themselves
                if (el.closest('.nav-lang-toggle')) return;

                if (el.getAttribute('lang') === lang) {
                    // Show elements in selected language
                    el.style.display = '';
                    el.removeAttribute('aria-hidden'); // ARIA: Make visible to screen readers
                    
                    if (el.classList.contains('lang-section')) {
                        el.classList.add('show');
                    }
                } else {
                    // Hide elements in other language
                    el.style.display = 'none';
                    el.setAttribute('aria-hidden', 'true'); // ARIA: Hide from screen readers
                    
                    if (el.classList.contains('lang-section')) {
                        el.classList.remove('show');
                    }
                }
            });

            // Update button states
            const jaButton = langToggle.querySelector('[data-lang="ja"]');
            const enButton = langToggle.querySelector('[data-lang="en"]');
            
            jaButton.classList.toggle('active', isJapanese);
            enButton.classList.toggle('active', !isJapanese);
            
            // ARIA: Update button pressed states for screen readers
            jaButton.setAttribute('aria-pressed', isJapanese ? 'true' : 'false');
            enButton.setAttribute('aria-pressed', isJapanese ? 'false' : 'true');
        }

        // Language button click handler
        langToggle.addEventListener('click', event => {
            const button = event.target.closest('button[data-lang]');
            if (button) {
                setLanguage(button.dataset.lang);
            }
        });

        // Initialize language on page load
        const savedLang = localStorage.getItem('prokaiwaLang');
        if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
            // Use saved preference
            setLanguage(savedLang);
        } else {
            // Auto-detect from browser settings
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            setLanguage(userLang === 'ja' ? 'ja' : 'en');
        }
    }
    
    
    // ==========================================================================
    // BURGER MENU FUNCTIONALITY
    // ==========================================================================
    
    if (burgerMenu && mainNav) {
        /**
         * Toggles the mobile menu open/closed
         */
        function toggleMenu() {
            const isOpen = mainNav.classList.toggle('open');
            
            // ARIA: Update expanded state for screen readers
            burgerMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            
            // Toggle the hamburger/close icon
            const burgerIcon = burgerMenu.querySelector('i');
            if (burgerIcon) {
                burgerIcon.classList.toggle('fa-bars');
                burgerIcon.classList.toggle('fa-times');
            }
        }
        
        // Click burger menu to toggle
        burgerMenu.addEventListener('click', toggleMenu);
        
        // NEW FEATURE: Click outside menu to close it
        document.addEventListener('click', (event) => {
            // Only run if menu is currently open
            if (mainNav.classList.contains('open')) {
                // Check if click was outside both the menu and burger button
                if (!mainNav.contains(event.target) && !burgerMenu.contains(event.target)) {
                    // Close the menu
                    mainNav.classList.remove('open');
                    burgerMenu.setAttribute('aria-expanded', 'false');
                    
                    const burgerIcon = burgerMenu.querySelector('i');
                    if (burgerIcon) {
                        burgerIcon.classList.remove('fa-times');
                        burgerIcon.classList.add('fa-bars');
                    }
                }
            }
        });
        
        // NEW FEATURE: Press Escape key to close menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('open')) {
                // Close the menu
                mainNav.classList.remove('open');
                burgerMenu.setAttribute('aria-expanded', 'false');
                
                const burgerIcon = burgerMenu.querySelector('i');
                if (burgerIcon) {
                    burgerIcon.classList.remove('fa-times');
                    burgerIcon.classList.add('fa-bars');
                }
                
                // Return focus to burger button for keyboard users
                burgerMenu.focus();
            }
        });
    }
    
    
    // ==========================================================================
    // FOOTER YEAR
    // ==========================================================================
    
    if (yearSpan) {
        // Automatically display current year in footer
        yearSpan.textContent = new Date().getFullYear();
    }

    
    // ==========================================================================
    // FAQ ACCORDION FUNCTIONALITY
    // ==========================================================================
    
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions.length > 0) {
        // Get all FAQ answers once for performance
        const allAnswers = document.querySelectorAll('.faq-answer');
        
        faqQuestions.forEach((question, index) => {
            const answer = question.nextElementSibling;
            
            // Set up ARIA attributes for accessibility
            const answerId = `faq-answer-${index}`;
            answer.id = answerId;
            
            // ARIA: Make FAQ keyboard accessible
            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');
            question.setAttribute('aria-controls', answerId);
            
            /**
             * Toggles FAQ answer open/closed
             */
            function toggleFAQ() {
                const wasOpen = answer.classList.contains('open');
                
                // Close all FAQ answers
                allAnswers.forEach(ans => {
                    ans.style.maxHeight = null;
                    ans.classList.remove('open');
                });
                
                // Update all questions' ARIA states
                faqQuestions.forEach(q => {
                    q.setAttribute('aria-expanded', 'false');
                });
                
                // If this FAQ wasn't already open, open it
                if (!wasOpen) {
                    answer.classList.add('open');
                    answer.style.maxHeight = (answer.scrollHeight + 40) + 'px';
                    
                    // ARIA: Update expanded state
                    question.setAttribute('aria-expanded', 'true');
                }
            }
            
            // Handle mouse clicks
            question.addEventListener('click', toggleFAQ);
            
            // Handle keyboard navigation (Enter and Space keys)
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); // Prevent page scroll on Space
                    toggleFAQ();
                }
            });
        });
    }
    
    
// ==========================================================================
// FAQ SCROLL FROM EXTERNAL PAGES
// ==========================================================================

/**
 * Handles scrolling to FAQ section when user clicks "View FAQ" 
 * from account settings or other pages
 */
if (sessionStorage.getItem('scrollToFAQ') === 'true') {
    sessionStorage.removeItem('scrollToFAQ');
    
    let timeoutId = null;
    
    // Wait for language section to be visible before scrolling
    const waitForFAQ = setInterval(() => {
        // Get current language from localStorage
        const currentLang = localStorage.getItem('prokaiwaLang') || 
                          (navigator.language || navigator.userLanguage).split('-')[0];
        const lang = currentLang === 'ja' ? 'ja' : 'en';
        
        // Try to find the FAQ section for current language
        const faqSection = document.getElementById(`${lang}-faq`);
        
        // Check if section exists AND is actually visible (has height)
        if (faqSection && faqSection.offsetHeight > 0) {
            clearInterval(waitForFAQ); // Stop checking
            clearTimeout(timeoutId); // Cancel the timeout warning
            
            console.log('✅ FAQ section found and visible, scrolling...');
            
            // Scroll to FAQ
            faqSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Add subtle highlight effect
            faqSection.style.transition = 'background-color 0.3s ease';
            const originalBg = window.getComputedStyle(faqSection).backgroundColor;
            faqSection.style.backgroundColor = 'rgba(0, 128, 128, 0.1)';
            
            setTimeout(() => {
                faqSection.style.backgroundColor = originalBg;
            }, 2000);
        }
    }, 100); // Check every 100ms
    
    // Safety: Stop checking after 5 seconds
    timeoutId = setTimeout(() => {
        clearInterval(waitForFAQ);
        console.warn('⏱️ FAQ scroll timeout - section not found or not visible');
    }, 5000);
}
    
    
    // ==========================================================================
    // DEVELOPMENT LOG
    // ==========================================================================
    
    // Console message for debugging (can be removed in production)
    console.log('✅ Prokaiwa script loaded successfully');
    
});
